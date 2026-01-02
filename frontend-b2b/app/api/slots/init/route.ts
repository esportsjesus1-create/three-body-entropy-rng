/**
 * POST /api/slots/init
 * 
 * Generates a server seed and commitment hash for a new spin.
 * The commitment is shown to the client BEFORE they provide their seed.
 * 
 * This implements the first step of the commit-reveal protocol:
 * 1. Server generates random serverSeed
 * 2. Server computes commitmentHash = SHA256(serverSeed)
 * 3. Server returns commitmentHash to client (keeps serverSeed secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { setCommitment, cleanupExpiredCommitments } from '@/lib/commitment-store';

const COMMITMENT_TTL = 300000;

function generateSpinId(): string {
  return `spin_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

function computeCommitmentHash(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    cleanupExpiredCommitments();

    const body = await request.json().catch(() => ({}));
    const { gameId } = body as { gameId?: string };

    const spinId = generateSpinId();
    const serverSeed = generateServerSeed();
    const commitmentHash = computeCommitmentHash(serverSeed);
    const timestamp = Date.now();
    const expiresAt = timestamp + COMMITMENT_TTL;

    setCommitment(spinId, {
      serverSeed,
      commitmentHash,
      timestamp,
      expiresAt,
      used: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        spinId,
        commitmentHash,
        timestamp: new Date(timestamp).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        gameId: gameId || 'default',
      },
    });
  } catch (error) {
    console.error('Error in /api/slots/init:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize spin',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
