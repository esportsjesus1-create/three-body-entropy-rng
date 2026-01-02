/**
 * POST /api/slots/execute
 * 
 * Executes a spin after client provides their seed.
 * Reveals the server seed and all data needed for verification.
 * 
 * This implements the second step of the commit-reveal protocol:
 * 1. Client provides clientSeed
 * 2. Server retrieves stored serverSeed
 * 3. Server combines seeds using HKDF: combinedSeed = HKDF(serverSeed:clientSeed:nonce)
 * 4. Server runs physics simulation with combined seed
 * 5. Server extracts entropy and maps to reel positions
 * 6. Server reveals ALL data: serverSeed, combinedSeed, physics state, reels
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';
import { getCommitment, deleteCommitment } from '@/lib/commitment-store';

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

interface PhysicsState {
  bodies: Body[];
  totalEnergy: number;
  angularMomentum: Vector3D;
  steps: number;
}

interface ExecuteRequest {
  spinId: string;
  clientSeed: string;
  bet?: number;
  gameId?: string;
}

const GAME_SYMBOLS: Record<string, string[]> = {
  'elemental-legends': ['fire', 'water', 'earth', 'air', 'lightning', 'ice', 'nature', 'dark', 'light', 'wild'],
  'kungfu-world': ['dragon', 'tiger', 'crane', 'snake', 'monkey', 'master', 'scroll', 'temple', 'sword', 'wild'],
  'kungfu-gem': ['ruby', 'emerald', 'sapphire', 'diamond', 'amethyst', 'topaz', 'jade', 'pearl', 'gold', 'wild'],
  'default': ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'star', 'diamond', 'wild'],
};

const WIN_MULTIPLIERS: Record<string, number> = {
  'wild': 50, 'seven': 25, 'diamond': 20, 'gold': 20, 'master': 20,
  'lightning': 15, 'dragon': 15, 'ruby': 15, 'bar': 10, 'temple': 10,
  'emerald': 10, 'fire': 8, 'tiger': 8, 'sapphire': 8, 'bell': 5,
  'crane': 5, 'amethyst': 5, 'star': 3, 'snake': 3, 'topaz': 3,
  'cherry': 2, 'monkey': 2, 'jade': 2, 'default': 1,
};

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

function crossProduct(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
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

function calculateEnergy(bodies: Body[], G: number, softening: number): number {
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

function calculateAngularMomentum(bodies: Body[]): Vector3D {
  let L: Vector3D = { x: 0, y: 0, z: 0 };
  for (const body of bodies) {
    const p = scaleVector(body.velocity, body.mass);
    L = addVectors(L, crossProduct(body.position, p));
  }
  return L;
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

function runPhysicsSimulation(seed: string, iterations: number = 1000, dt: number = 0.01): { finalState: PhysicsState; entropyHex: string } {
  const G = 1.0;
  const softening = 0.01;

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

function calculateWin(symbols: string[], bet: number): { winAmount: number; multiplier: number; isWin: boolean } {
  const symbolCounts: Record<string, number> = {};
  symbols.forEach((s) => {
    symbolCounts[s] = (symbolCounts[s] || 0) + 1;
  });

  let maxCount = 0;
  let winningSymbol = '';
  Object.entries(symbolCounts).forEach(([symbol, count]) => {
    if (count > maxCount) {
      maxCount = count;
      winningSymbol = symbol;
    }
  });

  if (maxCount >= 3) {
    const baseMultiplier = WIN_MULTIPLIERS[winningSymbol] || WIN_MULTIPLIERS['default'];
    const multiplier = baseMultiplier * (maxCount - 2);
    return { winAmount: bet * multiplier, multiplier, isWin: true };
  }

  return { winAmount: 0, multiplier: 0, isWin: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExecuteRequest;
    const { spinId, clientSeed, bet = 10, gameId = 'default' } = body;

    if (!spinId || !clientSeed) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: spinId and clientSeed' },
        { status: 400 }
      );
    }

    const commitment = getCommitment(spinId);
    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Spin not found or expired' },
        { status: 404 }
      );
    }

    if (commitment.used) {
      return NextResponse.json(
        { success: false, error: 'Spin already executed' },
        { status: 400 }
      );
    }

    if (Date.now() > commitment.expiresAt) {
      deleteCommitment(spinId);
      return NextResponse.json(
        { success: false, error: 'Spin expired' },
        { status: 400 }
      );
    }

    commitment.used = true;

    const { serverSeed, commitmentHash } = commitment;
    const nonce = 1;

    const ikm = `${serverSeed}:${clientSeed}:${nonce}`;
    const combinedSeedHex = hkdfDerive(ikm, 'tb-entropy-v1', 'spin', 32);

    const { finalState, entropyHex } = runPhysicsSimulation(combinedSeedHex, 1000, 0.01);

    const gameSymbols = GAME_SYMBOLS[gameId] || GAME_SYMBOLS['default'];
    const reelStops = deriveReelStops(entropyHex, 5, gameSymbols.length);
    const symbols = reelStops.map((stop) => gameSymbols[stop]);

    const { winAmount, multiplier, isWin } = calculateWin(symbols, bet);

    return NextResponse.json({
      success: true,
      data: {
        spinId,
        serverSeed,
        clientSeed,
        nonce,
        commitmentHash,
        combinedSeedHex,
        physicsState: {
          finalBodies: finalState.bodies.map((b) => ({
            mass: b.mass,
            position: {
              x: serializeToFixedPrecision(b.position.x),
              y: serializeToFixedPrecision(b.position.y),
              z: serializeToFixedPrecision(b.position.z),
            },
            velocity: {
              x: serializeToFixedPrecision(b.velocity.x),
              y: serializeToFixedPrecision(b.velocity.y),
              z: serializeToFixedPrecision(b.velocity.z),
            },
          })),
          totalEnergy: finalState.totalEnergy,
          angularMomentum: finalState.angularMomentum,
          iterations: finalState.steps,
          dt: 0.01,
        },
        entropyHex,
        reelStops,
        symbols,
        bet,
        winAmount,
        multiplier,
        isWin,
        timestamp: new Date().toISOString(),
        verification: {
          commitmentCheck: 'SHA256(serverSeed) === commitmentHash',
          mixingCheck: 'HKDF(serverSeed:clientSeed:nonce, salt="tb-entropy-v1", info="spin") === combinedSeedHex',
          physicsCheck: 'RK4 simulation with N=1000, dt=0.01 produces entropyHex',
          reelCheck: 'Each reel = parseInt(entropyHex[i*8:(i+1)*8], 16) % symbolCount',
        },
      },
    });
  } catch (error) {
    console.error('Error in /api/slots/execute:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute spin',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
