/**
 * Session Controller
 * 
 * Handles spin session lifecycle management
 */

import { SpinSession, VerificationLog } from '../database/models.js';
import { getRedisClient } from '../config/database.js';
import {
  generateHouseSeed,
  generateCommitment,
  mixEntropy,
  calculateSpinResult,
  generateProof,
  verifySpinResult
} from './entropyController.js';

// Session expiry time (5 minutes)
const SESSION_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Create a new spin session with commitment
 */
export async function createSession(config = {}) {
  // Generate house seed using three-body physics
  const { seed: houseSeed, physicsState, thetaAngles } = generateHouseSeed();
  
  // Generate commitment hash
  const commitment = generateCommitment(houseSeed);
  
  // Calculate expiry time
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  
  // Store in database
  const session = await SpinSession.create({
    commitment,
    houseSeed,
    physicsState,
    thetaAngles,
    expiresAt
  });
  
  // Cache in Redis for fast access
  try {
    const redis = await getRedisClient();
    await redis.setEx(
      `session:${session.id}`,
      Math.floor(SESSION_EXPIRY_MS / 1000),
      JSON.stringify({
        id: session.id,
        commitment,
        houseSeed,
        expiresAt: expiresAt.toISOString()
      })
    );
  } catch (error) {
    console.warn('Redis cache failed:', error.message);
  }
  
  return {
    sessionId: session.id,
    commitment,
    expiresAt: expiresAt.toISOString(),
    createdAt: session.created_at
  };
}

/**
 * Reveal spin result with client seed
 */
export async function revealSession(sessionId, clientSeed, config = {}) {
  // Try to get from Redis first
  let sessionData = null;
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(`session:${sessionId}`);
    if (cached) {
      sessionData = JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Redis fetch failed:', error.message);
  }
  
  // Fall back to database
  if (!sessionData) {
    const dbSession = await SpinSession.findById(sessionId);
    if (!dbSession) {
      throw new Error('Session not found');
    }
    sessionData = {
      id: dbSession.id,
      commitment: dbSession.commitment,
      houseSeed: dbSession.house_seed,
      expiresAt: dbSession.expires_at
    };
  }
  
  // Check if session is expired
  if (new Date(sessionData.expiresAt) < new Date()) {
    throw new Error('Session expired');
  }
  
  // Check if already revealed
  const isRevealed = await SpinSession.isRevealed(sessionId);
  if (isRevealed) {
    throw new Error('Session already revealed');
  }
  
  // Generate nonce (using session creation order)
  const nonce = Date.now();
  
  // Mix entropy
  const { entropyHex, physicsState, thetaAngles } = mixEntropy(
    sessionData.houseSeed,
    clientSeed,
    nonce
  );
  
  // Calculate spin result
  const { grid } = calculateSpinResult(entropyHex, config);
  
  // Generate proof
  const proof = generateProof(
    sessionData.houseSeed,
    clientSeed,
    nonce,
    entropyHex,
    sessionData.commitment
  );
  
  // Build result object
  const result = {
    grid,
    entropyHex,
    physicsState,
    thetaAngles
  };
  
  // Update database
  await SpinSession.reveal(sessionId, {
    clientSeed,
    result,
    proof
  });
  
  // Clear from Redis cache
  try {
    const redis = await getRedisClient();
    await redis.del(`session:${sessionId}`);
  } catch (error) {
    console.warn('Redis delete failed:', error.message);
  }
  
  return {
    sessionId,
    result: {
      grid,
      symbols: flattenGrid(grid, config.bufferRows || 4, config.rowCount || 6)
    },
    houseSeed: sessionData.houseSeed,
    proof,
    commitment: sessionData.commitment
  };
}

/**
 * Get session for verification
 */
export async function getSessionForVerification(sessionId) {
  const session = await SpinSession.findById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (!session.revealed_at) {
    throw new Error('Session not yet revealed');
  }
  
  return {
    sessionId: session.id,
    commitment: session.commitment,
    houseSeed: session.house_seed,
    clientSeed: session.client_seed,
    result: session.result,
    proof: session.proof,
    physicsState: session.physics_state,
    thetaAngles: session.theta_angles,
    createdAt: session.created_at,
    revealedAt: session.revealed_at
  };
}

/**
 * Verify a session
 */
export async function verifySession(sessionId, clientIp = null) {
  const session = await getSessionForVerification(sessionId);
  
  const verificationResult = verifySpinResult(
    session.proof,
    session.commitment
  );
  
  // Log verification request
  try {
    await VerificationLog.create({
      sessionId,
      verificationResult,
      clientIp
    });
  } catch (error) {
    console.warn('Verification log failed:', error.message);
  }
  
  return {
    sessionId,
    verification: verificationResult,
    session: {
      commitment: session.commitment,
      houseSeed: session.houseSeed,
      clientSeed: session.clientSeed,
      proof: session.proof,
      createdAt: session.createdAt,
      revealedAt: session.revealedAt
    }
  };
}

/**
 * Get session history
 */
export async function getSessionHistory(limit = 50, offset = 0) {
  return await SpinSession.getHistory(limit, offset);
}

/**
 * Get session statistics
 */
export async function getSessionStats() {
  return await SpinSession.getStats();
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  const count = await SpinSession.cleanupExpired();
  console.log(`Cleaned up ${count} expired sessions`);
  return count;
}

/**
 * Helper: Flatten grid to visible symbols array
 */
function flattenGrid(grid, bufferRows, rowCount) {
  const symbols = [];
  const visibleStart = bufferRows;
  const visibleEnd = visibleStart + rowCount - 1;
  
  for (let row = visibleStart; row <= visibleEnd; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (grid[col] && grid[col][row]) {
        symbols.push(grid[col][row]);
      }
    }
  }
  return symbols;
}

export default {
  createSession,
  revealSession,
  getSessionForVerification,
  verifySession,
  getSessionHistory,
  getSessionStats,
  cleanupExpiredSessions
};
