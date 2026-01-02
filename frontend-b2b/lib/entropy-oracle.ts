/**
 * Entropy Oracle Module
 * 
 * Deterministic entropy extraction from three-body physics simulation.
 * This module contains all the core functions needed for provably fair RNG.
 * 
 * CRITICAL: All functions in this module MUST be deterministic.
 * Same inputs MUST always produce identical outputs.
 */

import { createHash, createHmac } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}

export interface PhysicsState {
  bodies: Body[];
  totalEnergy: number;
  angularMomentum: Vector3D;
  steps: number;
}

export interface EntropyResult {
  finalState: PhysicsState;
  entropyHex: string;
}

export interface SpinResult {
  combinedSeedHex: string;
  entropyHex: string;
  reelStops: number[];
  physicsState: PhysicsState;
}

// ============================================================================
// Constants
// ============================================================================

export const PHYSICS_CONSTANTS = {
  G: 1.0,
  SOFTENING: 0.01,
  DEFAULT_ITERATIONS: 1000,
  DEFAULT_DT: 0.01,
  PRECISION_DECIMALS: 16,
} as const;

export const HKDF_CONSTANTS = {
  SALT: 'tb-entropy-v1',
  INFO: 'spin',
  LENGTH: 32,
} as const;

// ============================================================================
// HKDF Key Derivation
// ============================================================================

/**
 * Derives a key using HKDF (HMAC-based Key Derivation Function).
 * This combines serverSeed, clientSeed, and nonce deterministically.
 */
export function hkdfDerive(
  ikm: string,
  salt: string = HKDF_CONSTANTS.SALT,
  info: string = HKDF_CONSTANTS.INFO,
  length: number = HKDF_CONSTANTS.LENGTH
): string {
  // Extract phase
  const hmac1 = createHmac('sha256', salt);
  hmac1.update(ikm);
  const prk = hmac1.digest();

  // Expand phase
  const hmac2 = createHmac('sha256', prk);
  hmac2.update(info);
  hmac2.update(Buffer.from([1]));
  const okm = hmac2.digest();

  return okm.subarray(0, length).toString('hex');
}

/**
 * Combines server seed, client seed, and nonce using HKDF.
 */
export function combineSeedsHKDF(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  const ikm = `${serverSeed}:${clientSeed}:${nonce}`;
  return hkdfDerive(ikm, HKDF_CONSTANTS.SALT, HKDF_CONSTANTS.INFO, HKDF_CONSTANTS.LENGTH);
}

// ============================================================================
// Vector Operations
// ============================================================================

export function addVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVector(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ============================================================================
// Initial Conditions Generation
// ============================================================================

/**
 * Generates deterministic initial conditions for three bodies from a seed.
 * Uses SHA-256 hash of the seed to derive positions and velocities.
 */
export function generateInitialConditions(seed: string): Body[] {
  const hash = createHash('sha256').update(seed).digest('hex');
  const values: number[] = [];
  
  // Extract 18 values from the hash (6 per body: mass factor, 3 position, 3 velocity)
  for (let i = 0; i < 18; i++) {
    const hexPart = hash.substring(i * 3, i * 3 + 3);
    values.push((parseInt(hexPart, 16) / 4095) * 2 - 1); // Normalize to [-1, 1]
  }

  // Third body velocity is set to conserve momentum (sum of velocities = 0)
  return [
    {
      mass: 1.0 + Math.abs(values[0]) * 0.5,
      position: { x: values[1], y: values[2], z: values[3] * 0.1 },
      velocity: { x: values[4] * 0.5, y: values[5] * 0.5, z: values[6] * 0.1 },
    },
    {
      mass: 1.0 + Math.abs(values[7]) * 0.5,
      position: { x: values[8], y: values[9], z: values[10] * 0.1 },
      velocity: { x: values[11] * 0.5, y: values[12] * 0.5, z: values[13] * 0.1 },
    },
    {
      mass: 1.0 + Math.abs(values[14]) * 0.5,
      position: { x: values[15], y: values[16], z: values[17] * 0.1 },
      velocity: { 
        x: -values[4] * 0.5 - values[11] * 0.5, 
        y: -values[5] * 0.5 - values[12] * 0.5, 
        z: 0 
      },
    },
  ];
}

// ============================================================================
// Physics Simulation (RK4 Integrator)
// ============================================================================

/**
 * Calculates gravitational acceleration on a body from all other bodies.
 */
export function calculateAcceleration(
  bodies: Body[],
  index: number,
  G: number = PHYSICS_CONSTANTS.G,
  softening: number = PHYSICS_CONSTANTS.SOFTENING
): Vector3D {
  let acceleration: Vector3D = { x: 0, y: 0, z: 0 };
  const body = bodies[index];

  for (let j = 0; j < bodies.length; j++) {
    if (j === index) continue;
    const other = bodies[j];
    const r = subtractVectors(other.position, body.position);
    const distSq = dotProduct(r, r) + softening * softening;
    const dist = Math.sqrt(distSq);
    const forceMag = (G * other.mass) / distSq;
    const forceDir = scaleVector(r, 1 / dist);
    acceleration = addVectors(acceleration, scaleVector(forceDir, forceMag));
  }

  return acceleration;
}

/**
 * Performs one RK4 integration step for the three-body system.
 * This is the core of the deterministic physics simulation.
 */
export function rk4Step(
  bodies: Body[],
  dt: number,
  G: number = PHYSICS_CONSTANTS.G,
  softening: number = PHYSICS_CONSTANTS.SOFTENING
): Body[] {
  const n = bodies.length;

  // k1
  const k1v: Vector3D[] = [];
  const k1r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k1v.push(calculateAcceleration(bodies, i, G, softening));
    k1r.push(bodies[i].velocity);
  }

  // k2
  const bodies2 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k1r[i], dt / 2)),
    velocity: addVectors(b.velocity, scaleVector(k1v[i], dt / 2)),
  }));
  const k2v: Vector3D[] = [];
  const k2r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k2v.push(calculateAcceleration(bodies2, i, G, softening));
    k2r.push(bodies2[i].velocity);
  }

  // k3
  const bodies3 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k2r[i], dt / 2)),
    velocity: addVectors(b.velocity, scaleVector(k2v[i], dt / 2)),
  }));
  const k3v: Vector3D[] = [];
  const k3r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k3v.push(calculateAcceleration(bodies3, i, G, softening));
    k3r.push(bodies3[i].velocity);
  }

  // k4
  const bodies4 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k3r[i], dt)),
    velocity: addVectors(b.velocity, scaleVector(k3v[i], dt)),
  }));
  const k4v: Vector3D[] = [];
  const k4r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k4v.push(calculateAcceleration(bodies4, i, G, softening));
    k4r.push(bodies4[i].velocity);
  }

  // Combine: y_{n+1} = y_n + (dt/6)(k1 + 2k2 + 2k3 + k4)
  return bodies.map((b, i) => ({
    ...b,
    position: addVectors(
      b.position,
      scaleVector(
        addVectors(
          addVectors(k1r[i], scaleVector(k2r[i], 2)),
          addVectors(scaleVector(k3r[i], 2), k4r[i])
        ),
        dt / 6
      )
    ),
    velocity: addVectors(
      b.velocity,
      scaleVector(
        addVectors(
          addVectors(k1v[i], scaleVector(k2v[i], 2)),
          addVectors(scaleVector(k3v[i], 2), k4v[i])
        ),
        dt / 6
      )
    ),
  }));
}

// ============================================================================
// Energy and Angular Momentum Calculations
// ============================================================================

/**
 * Calculates total energy (kinetic + potential) of the system.
 */
export function calculateEnergy(
  bodies: Body[],
  G: number = PHYSICS_CONSTANTS.G,
  softening: number = PHYSICS_CONSTANTS.SOFTENING
): number {
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < bodies.length; i++) {
    const v = bodies[i].velocity;
    kinetic += 0.5 * bodies[i].mass * dotProduct(v, v);

    for (let j = i + 1; j < bodies.length; j++) {
      const r = subtractVectors(bodies[j].position, bodies[i].position);
      const dist = Math.sqrt(dotProduct(r, r) + softening * softening);
      potential -= (G * bodies[i].mass * bodies[j].mass) / dist;
    }
  }

  return kinetic + potential;
}

/**
 * Calculates total angular momentum of the system.
 */
export function calculateAngularMomentum(bodies: Body[]): Vector3D {
  let L: Vector3D = { x: 0, y: 0, z: 0 };
  for (const body of bodies) {
    const p = scaleVector(body.velocity, body.mass);
    L = addVectors(L, crossProduct(body.position, p));
  }
  return L;
}

// ============================================================================
// Entropy Extraction
// ============================================================================

/**
 * Serializes a number to fixed precision (16 decimal places).
 * This ensures deterministic string representation across platforms.
 */
export function serializeToFixedPrecision(
  value: number,
  decimals: number = PHYSICS_CONSTANTS.PRECISION_DECIMALS
): string {
  return value.toFixed(decimals);
}

/**
 * Extracts entropy from the final physics state by hashing all body positions and velocities.
 * Uses 16 decimal place precision for deterministic serialization.
 */
export function extractEntropyFromPhysics(bodies: Body[]): string {
  const hash = createHash('sha256');
  for (const body of bodies) {
    hash.update(serializeToFixedPrecision(body.position.x));
    hash.update(serializeToFixedPrecision(body.position.y));
    hash.update(serializeToFixedPrecision(body.position.z));
    hash.update(serializeToFixedPrecision(body.velocity.x));
    hash.update(serializeToFixedPrecision(body.velocity.y));
    hash.update(serializeToFixedPrecision(body.velocity.z));
  }
  return hash.digest('hex');
}

// ============================================================================
// Main Simulation Function
// ============================================================================

/**
 * Runs the complete physics simulation and extracts entropy.
 * This is the main deterministic function that produces the RNG output.
 */
export function runPhysicsSimulation(
  seed: string,
  iterations: number = PHYSICS_CONSTANTS.DEFAULT_ITERATIONS,
  dt: number = PHYSICS_CONSTANTS.DEFAULT_DT
): EntropyResult {
  const G = PHYSICS_CONSTANTS.G;
  const softening = PHYSICS_CONSTANTS.SOFTENING;

  let bodies = generateInitialConditions(seed);

  for (let i = 0; i < iterations; i++) {
    bodies = rk4Step(bodies, dt, G, softening);
  }

  const totalEnergy = calculateEnergy(bodies, G, softening);
  const angularMomentum = calculateAngularMomentum(bodies);
  const entropyHex = extractEntropyFromPhysics(bodies);

  return {
    finalState: {
      bodies,
      totalEnergy,
      angularMomentum,
      steps: iterations,
    },
    entropyHex,
  };
}

// ============================================================================
// Reel Position Derivation
// ============================================================================

/**
 * Derives reel stop positions from entropy hex string.
 * Takes 4 bytes (8 hex chars) per reel and maps to symbol index.
 */
export function deriveReelStops(
  entropyHex: string,
  reelCount: number,
  symbolsPerReel: number
): number[] {
  const stops: number[] = [];
  const bytesPerReel = 4;

  for (let i = 0; i < reelCount; i++) {
    const start = i * bytesPerReel * 2;
    const end = start + bytesPerReel * 2;
    const chunk = entropyHex.substring(start, end);
    const value = parseInt(chunk, 16);
    const stop = value % symbolsPerReel;
    stops.push(stop);
  }

  return stops;
}

// ============================================================================
// Complete Spin Execution
// ============================================================================

/**
 * Executes a complete spin with all deterministic steps.
 * This is the main entry point for generating a provably fair spin result.
 */
export function executeSpinDeterministic(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelCount: number = 5,
  symbolsPerReel: number = 10
): SpinResult {
  // Step 1: Combine seeds using HKDF
  const combinedSeedHex = combineSeedsHKDF(serverSeed, clientSeed, nonce);

  // Step 2: Run physics simulation
  const { finalState, entropyHex } = runPhysicsSimulation(combinedSeedHex);

  // Step 3: Derive reel positions
  const reelStops = deriveReelStops(entropyHex, reelCount, symbolsPerReel);

  return {
    combinedSeedHex,
    entropyHex,
    reelStops,
    physicsState: finalState,
  };
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verifies that a commitment hash matches the server seed.
 */
export function verifyCommitment(serverSeed: string, commitmentHash: string): boolean {
  const expectedHash = createHash('sha256').update(serverSeed).digest('hex');
  return expectedHash === commitmentHash;
}

/**
 * Verifies the complete spin result by replaying the deterministic process.
 */
export function verifySpinResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedEntropyHex: string,
  expectedReelStops: number[],
  symbolsPerReel: number = 10
): { valid: boolean; replayedResult: SpinResult } {
  const replayedResult = executeSpinDeterministic(
    serverSeed,
    clientSeed,
    nonce,
    expectedReelStops.length,
    symbolsPerReel
  );

  const entropyMatches = replayedResult.entropyHex === expectedEntropyHex;
  const reelsMatch = replayedResult.reelStops.every(
    (stop, i) => stop === expectedReelStops[i]
  );

  return {
    valid: entropyMatches && reelsMatch,
    replayedResult,
  };
}
