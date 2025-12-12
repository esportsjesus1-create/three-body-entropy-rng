/**
 * Entropy Controller
 * 
 * Handles three-body physics simulation and entropy generation
 */

import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * Three-Body Physics Simulation
 * Generates chaotic entropy from gravitational dynamics
 */
class ThreeBodySimulation {
  constructor(seed) {
    this.G = 1.0;
    this.softening = 0.01;
    this.bodies = [];
    this.initializeFromSeed(seed);
  }

  initializeFromSeed(seed) {
    const hash = createHash('sha256').update(seed).digest();
    
    this.bodies = [];
    for (let i = 0; i < 3; i++) {
      const offset = i * 10;
      this.bodies.push({
        mass: 0.5 + (hash[offset % 32] / 255) * 1.5,
        position: {
          x: ((hash[(offset + 1) % 32] / 255) - 0.5) * 10,
          y: ((hash[(offset + 2) % 32] / 255) - 0.5) * 10,
          z: ((hash[(offset + 3) % 32] / 255) - 0.5) * 10
        },
        velocity: {
          x: ((hash[(offset + 4) % 32] / 255) - 0.5) * 2,
          y: ((hash[(offset + 5) % 32] / 255) - 0.5) * 2,
          z: ((hash[(offset + 6) % 32] / 255) - 0.5) * 2
        }
      });
    }
  }

  calculateAcceleration(bodyIndex) {
    const body = this.bodies[bodyIndex];
    let ax = 0, ay = 0, az = 0;

    for (let j = 0; j < 3; j++) {
      if (j === bodyIndex) continue;
      
      const other = this.bodies[j];
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      const dz = other.position.z - body.position.z;
      
      const distSq = dx * dx + dy * dy + dz * dz + this.softening * this.softening;
      const dist = Math.sqrt(distSq);
      const force = this.G * other.mass / distSq;
      
      ax += force * dx / dist;
      ay += force * dy / dist;
      az += force * dz / dist;
    }

    return { x: ax, y: ay, z: az };
  }

  rk4Step(dt) {
    const k1 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const originalBodies = JSON.parse(JSON.stringify(this.bodies));
    
    // k2
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + b.velocity.x * dt / 2,
        y: b.position.y + b.velocity.y * dt / 2,
        z: b.position.z + b.velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k1[i].x * dt / 2,
        y: b.velocity.y + k1[i].y * dt / 2,
        z: b.velocity.z + k1[i].z * dt / 2
      }
    }));
    const k2 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    // k3
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + this.bodies[i].velocity.x * dt / 2,
        y: b.position.y + this.bodies[i].velocity.y * dt / 2,
        z: b.position.z + this.bodies[i].velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k2[i].x * dt / 2,
        y: b.velocity.y + k2[i].y * dt / 2,
        z: b.velocity.z + k2[i].z * dt / 2
      }
    }));
    const k3 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    // k4
    const tempBodies3 = this.bodies;
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + tempBodies3[i].velocity.x * dt,
        y: b.position.y + tempBodies3[i].velocity.y * dt,
        z: b.position.z + tempBodies3[i].velocity.z * dt
      },
      velocity: {
        x: b.velocity.x + k3[i].x * dt,
        y: b.velocity.y + k3[i].y * dt,
        z: b.velocity.z + k3[i].z * dt
      }
    }));
    const k4 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    // Final update
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + (b.velocity.x + 2 * k1[i].x + 2 * k2[i].x + k3[i].x) * dt / 6,
        y: b.position.y + (b.velocity.y + 2 * k1[i].y + 2 * k2[i].y + k3[i].y) * dt / 6,
        z: b.position.z + (b.velocity.z + 2 * k1[i].z + 2 * k2[i].z + k3[i].z) * dt / 6
      },
      velocity: {
        x: b.velocity.x + (k1[i].x + 2 * k2[i].x + 2 * k3[i].x + k4[i].x) * dt / 6,
        y: b.velocity.y + (k1[i].y + 2 * k2[i].y + 2 * k3[i].y + k4[i].y) * dt / 6,
        z: b.velocity.z + (k1[i].z + 2 * k2[i].z + 2 * k3[i].z + k4[i].z) * dt / 6
      }
    }));
  }

  simulate(duration, timeStep = 0.01) {
    const steps = Math.floor(duration / timeStep);
    for (let i = 0; i < steps; i++) {
      this.rk4Step(timeStep);
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.bodies));
  }

  getStateString() {
    const components = [];
    for (const body of this.bodies) {
      components.push(
        body.position.x.toExponential(15),
        body.position.y.toExponential(15),
        body.position.z.toExponential(15),
        body.velocity.x.toExponential(15),
        body.velocity.y.toExponential(15),
        body.velocity.z.toExponential(15)
      );
    }
    return components.join(':');
  }

  getEntropyHex() {
    return createHash('sha256').update(this.getStateString()).digest('hex');
  }
}

/**
 * Calculate theta angles from physics state
 * Used for additional entropy mixing
 */
function calculateThetaAngles(bodies) {
  const angles = [];
  
  for (let i = 0; i < 3; i++) {
    const body = bodies[i];
    const r = Math.sqrt(
      body.position.x ** 2 + 
      body.position.y ** 2 + 
      body.position.z ** 2
    );
    
    const theta = Math.acos(body.position.z / (r || 1));
    const phi = Math.atan2(body.position.y, body.position.x);
    
    angles.push({ theta, phi, r });
  }
  
  return angles;
}

/**
 * Generate house seed using three-body physics
 */
export function generateHouseSeed() {
  const baseSeed = `${Date.now()}:${randomBytes(32).toString('hex')}`;
  const simulation = new ThreeBodySimulation(baseSeed);
  simulation.simulate(5.0, 0.01);
  
  return {
    seed: simulation.getEntropyHex(),
    physicsState: simulation.getState(),
    thetaAngles: calculateThetaAngles(simulation.getState())
  };
}

/**
 * Generate commitment hash from house seed
 */
export function generateCommitment(houseSeed) {
  return createHash('sha256').update(houseSeed).digest('hex');
}

/**
 * Mix client and house entropy
 */
export function mixEntropy(houseSeed, clientSeed, nonce) {
  const combinedSeed = `${houseSeed}:${clientSeed}:${nonce}`;
  const simulation = new ThreeBodySimulation(combinedSeed);
  simulation.simulate(3.0, 0.01);
  
  const serverSecret = process.env.API_SECRET_KEY || 'default-secret';
  const entropyHex = createHmac('sha256', serverSecret)
    .update(simulation.getStateString())
    .digest('hex');
  
  return {
    entropyHex,
    physicsState: simulation.getState(),
    thetaAngles: calculateThetaAngles(simulation.getState())
  };
}

/**
 * Calculate spin result from entropy
 */
export function calculateSpinResult(entropyHex, config = {}) {
  const {
    symbols = ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
    reelCount = 5,
    rowCount = 6,
    bufferRows = 4,
    spawnRates = { wildChance: 0.02, bonusChance: 0.03, goldChance: 0.15 },
    goldAllowedColumns = [1, 2, 3]
  } = config;

  const grid = [];
  const totalRows = rowCount + bufferRows;
  let positionCounter = 0;

  const getRandomValue = (position, max) => {
    const expandedEntropy = createHmac('sha256', entropyHex)
      .update(`position:${position}`)
      .digest('hex');
    return parseInt(expandedEntropy.substring(0, 8), 16) % max;
  };

  const getRandomFloat = (position) => {
    const expandedEntropy = createHmac('sha256', entropyHex)
      .update(`float:${position}`)
      .digest('hex');
    return parseInt(expandedEntropy.substring(0, 8), 16) / 0xffffffff;
  };

  const pool = symbols.filter(s => s !== 'wild' && s !== 'bonus');

  for (let col = 0; col < reelCount; col++) {
    grid[col] = [];
    let bonusCountInVisibleRows = 0;
    const fullyVisibleStart = bufferRows;
    const fullyVisibleEnd = fullyVisibleStart + (rowCount - 2);

    for (let row = 0; row < totalRows; row++) {
      const isVisibleRow = row >= fullyVisibleStart && row <= fullyVisibleEnd;
      let symbol;

      const posOffset = positionCounter * 4;

      if (getRandomFloat(posOffset) < spawnRates.wildChance) {
        symbol = 'wild';
      } else if (!(isVisibleRow && bonusCountInVisibleRows >= 1) && 
                 getRandomFloat(posOffset + 1) < spawnRates.bonusChance) {
        symbol = 'bonus';
        if (isVisibleRow) bonusCountInVisibleRows++;
      } else {
        const symbolIndex = getRandomValue(posOffset + 2, pool.length);
        symbol = pool[symbolIndex];

        if (getRandomFloat(posOffset + 3) < spawnRates.goldChance) {
          if (goldAllowedColumns.includes(col)) {
            symbol = symbol + '_gold';
          }
        }
      }

      grid[col][row] = symbol;
      positionCounter++;
    }
  }

  return { grid };
}

/**
 * Generate cryptographic proof
 */
export function generateProof(houseSeed, clientSeed, nonce, entropyHex, commitment) {
  const serverSecret = process.env.API_SECRET_KEY || 'default-secret';
  
  const proofId = createHash('sha256')
    .update(`${entropyHex}:${nonce}`)
    .digest('hex')
    .substring(0, 32);

  const signatureData = `${proofId}:${commitment}:${clientSeed}:${nonce}`;
  const signature = createHmac('sha256', serverSecret)
    .update(signatureData)
    .digest('hex');

  return {
    proofId,
    houseSeed,
    clientSeed,
    nonce,
    entropyHex,
    signature,
    timestamp: Date.now()
  };
}

/**
 * Verify a spin result
 */
export function verifySpinResult(proof, commitment, config = {}) {
  const serverSecret = process.env.API_SECRET_KEY || 'default-secret';
  const errors = [];
  const checks = {
    commitmentValid: false,
    entropyValid: false,
    signatureValid: false
  };

  // Verify commitment
  const expectedCommitment = generateCommitment(proof.houseSeed);
  checks.commitmentValid = expectedCommitment === commitment;
  if (!checks.commitmentValid) {
    errors.push('House seed does not match commitment');
  }

  // Verify entropy
  const { entropyHex: expectedEntropy } = mixEntropy(proof.houseSeed, proof.clientSeed, proof.nonce);
  checks.entropyValid = expectedEntropy === proof.entropyHex;
  if (!checks.entropyValid) {
    errors.push('Entropy does not match expected value');
  }

  // Verify signature
  const signatureData = `${proof.proofId}:${commitment}:${proof.clientSeed}:${proof.nonce}`;
  const expectedSignature = createHmac('sha256', serverSecret)
    .update(signatureData)
    .digest('hex');
  checks.signatureValid = expectedSignature === proof.signature;
  if (!checks.signatureValid) {
    errors.push('Signature verification failed');
  }

  return {
    valid: checks.commitmentValid && checks.entropyValid && checks.signatureValid,
    checks,
    errors
  };
}

export default {
  ThreeBodySimulation,
  generateHouseSeed,
  generateCommitment,
  mixEntropy,
  calculateSpinResult,
  generateProof,
  verifySpinResult,
  calculateThetaAngles
};
