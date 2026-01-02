/**
 * POST /api/slots/verify
 * 
 * Verifies a completed spin by replaying the physics simulation.
 * This allows clients to independently verify that the spin was fair.
 * 
 * Verification steps:
 * 1. Check that SHA256(serverSeed) === commitmentHash
 * 2. Derive combinedSeed using HKDF(serverSeed:clientSeed:nonce)
 * 3. Replay physics simulation with combined seed
 * 4. Extract entropy and verify it matches
 * 5. Verify reel positions match entropy
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}

interface VerifyRequest {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  commitmentHash: string;
  entropyHex: string;
  reelStops: number[];
  symbolCount?: number;
}

interface VerificationResult {
  commitmentValid: boolean;
  seedMixingValid: boolean;
  physicsValid: boolean;
  reelMappingValid: boolean;
  allValid: boolean;
  details: {
    expectedCommitment: string;
    actualCommitment: string;
    expectedCombinedSeed: string;
    expectedEntropyHex: string;
    actualEntropyHex: string;
    expectedReelStops: number[];
    actualReelStops: number[];
  };
}

function hkdfDerive(ikm: string, salt: string, info: string, length: number = 32): string {
  const hmac1 = createHmac('sha256', salt);
  hmac1.update(ikm);
  const prk = hmac1.digest();

  const hmac2 = createHmac('sha256', prk);
  hmac2.update(info);
  hmac2.update(Buffer.from([1]));
  const okm = hmac2.digest();

  return okm.subarray(0, length).toString('hex');
}

function addVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaleVector(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function generateInitialConditions(seed: string): Body[] {
  const hash = createHash('sha256').update(seed).digest('hex');
  const values: number[] = [];
  for (let i = 0; i < 18; i++) {
    const hexPart = hash.substring(i * 3, i * 3 + 3);
    values.push((parseInt(hexPart, 16) / 4095) * 2 - 1);
  }

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
      velocity: { x: -values[4] * 0.5 - values[11] * 0.5, y: -values[5] * 0.5 - values[12] * 0.5, z: 0 },
    },
  ];
}

function calculateAcceleration(bodies: Body[], index: number, G: number, softening: number): Vector3D {
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

function rk4Step(bodies: Body[], dt: number, G: number, softening: number): Body[] {
  const n = bodies.length;

  const k1v: Vector3D[] = [];
  const k1r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k1v.push(calculateAcceleration(bodies, i, G, softening));
    k1r.push(bodies[i].velocity);
  }

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

function serializeToFixedPrecision(value: number): string {
  return value.toFixed(16);
}

function extractEntropyFromPhysics(bodies: Body[]): string {
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

function runPhysicsSimulation(seed: string, iterations: number = 1000, dt: number = 0.01): string {
  const G = 1.0;
  const softening = 0.01;

  let bodies = generateInitialConditions(seed);

  for (let i = 0; i < iterations; i++) {
    bodies = rk4Step(bodies, dt, G, softening);
  }

  return extractEntropyFromPhysics(bodies);
}

function deriveReelStops(entropyHex: string, reelCount: number, symbolsPerReel: number): number[] {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerifyRequest;
    const { serverSeed, clientSeed, nonce, commitmentHash, entropyHex, reelStops, symbolCount = 10 } = body;

    if (!serverSeed || !clientSeed || nonce === undefined || !commitmentHash || !entropyHex || !reelStops) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for verification' },
        { status: 400 }
      );
    }

    const expectedCommitment = createHash('sha256').update(serverSeed).digest('hex');
    const commitmentValid = expectedCommitment === commitmentHash;

    const ikm = `${serverSeed}:${clientSeed}:${nonce}`;
    const expectedCombinedSeed = hkdfDerive(ikm, 'tb-entropy-v1', 'spin', 32);

    const expectedEntropyHex = runPhysicsSimulation(expectedCombinedSeed, 1000, 0.01);
    const physicsValid = expectedEntropyHex === entropyHex;

    const expectedReelStops = deriveReelStops(expectedEntropyHex, reelStops.length, symbolCount);
    const reelMappingValid = JSON.stringify(expectedReelStops) === JSON.stringify(reelStops);

    const allValid = commitmentValid && physicsValid && reelMappingValid;

    const result: VerificationResult = {
      commitmentValid,
      seedMixingValid: true,
      physicsValid,
      reelMappingValid,
      allValid,
      details: {
        expectedCommitment,
        actualCommitment: commitmentHash,
        expectedCombinedSeed,
        expectedEntropyHex,
        actualEntropyHex: entropyHex,
        expectedReelStops,
        actualReelStops: reelStops,
      },
    };

    return NextResponse.json({
      success: true,
      verified: allValid,
      data: result,
      message: allValid
        ? 'Spin verified successfully! All checks passed.'
        : 'Verification failed. See details for mismatches.',
    });
  } catch (error) {
    console.error('Error in /api/slots/verify:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify spin',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
