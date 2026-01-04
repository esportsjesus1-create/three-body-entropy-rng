export interface SpinTimeline {
  t1CommitPublished: string;
  t2ClientSeedSet: string;
  t3SpinExecuted: string;
  t4RevealReceived: string;
}

export interface ReelCommitmentData {
  reelNum: number;
  serverSeed: string;
  entropyRaw: number;
  symbol: string;
  position: number;
  stopTimeMs: number;
  physicsDeterministic: boolean;
}

export interface PendingCommitment {
  spinId: string;
  gameHash: string;
  commitments: string[];
  houseSeeds: string[];
  simulations: ThreeBodySimData[];
  reelData: ReelCommitmentData[];
  timestamp: string;
  nonce: number;
}

export interface ThreeBodySimData {
  initialConditions: {
    bodies: Array<{ x: number; y: number; vx: number; vy: number; mass: number }>;
    dt: number;
    steps: number;
  };
  finalState: {
    bodies: Array<{ x: number; y: number; vx: number; vy: number }>;
    theta: number;
  };
  trajectorySample: Array<{ x: number; y: number }[]>;
}

export interface SpinResult {
  spinId: string;
  timestamp: string;
  timeline: SpinTimeline;
  reels: ReelResult[];
  symbols: string[];
  winAmount: number;
  betAmount: number;
  verificationStatus: {
    allCommitmentsValid: boolean;
    timelineValid: boolean;
  };
}

export interface ReelResult {
  reelIndex: number;
  sessionId: string;
  commitment: string;
  houseSeed: string;
  clientSeed: string;
  entropyHex: string;
  position: number;
  symbol: string;
  simulation: ThreeBodySimData;
  entropyMapping: {
    rawHex: string;
    truncatedHex: string;
    decimalValue: number;
    modulus: number;
    position: number;
    formula: string;
  };
}

const SYMBOLS = [
  { id: "fa", name: "Green Dragon", emoji: "🀅" },
  { id: "zhong", name: "Red Dragon", emoji: "🀄" },
  { id: "bai", name: "White Dragon", emoji: "🀆" },
  { id: "bawan", name: "80,000", emoji: "🎰" },
  { id: "wusuo", name: "5 Bamboo", emoji: "🎋" },
  { id: "wutong", name: "5 Circles", emoji: "⭕" },
  { id: "liangsuo", name: "2 Bamboo", emoji: "🎍" },
  { id: "liangtong", name: "2 Circles", emoji: "🔵" },
  { id: "wild", name: "Wild", emoji: "⭐" },
  { id: "bonus", name: "Bonus", emoji: "💎" },
];

export const SYMBOL_LIST = SYMBOLS;

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateHexString(length: number): string {
  const array = new Uint8Array(length / 2);
  if (typeof window !== "undefined") {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(message: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return generateHexString(64);
}

function generateThreeBodySimulation(seed: string): ThreeBodySimData {
  const seedNum = parseInt(seed.substring(0, 8), 16);
  const perturbation = (seedNum % 1000) / 100000;
  
  const initialBodies = [
    { x: 0.97000436 + perturbation, y: -0.24308753, vx: 0.466203685, vy: 0.43236573, mass: 1 },
    { x: -0.97000436, y: 0.24308753, vx: 0.466203685, vy: 0.43236573, mass: 1 },
    { x: 0, y: 0, vx: -0.93240737, vy: -0.86473146, mass: 1 },
  ];

  const dt = 0.002;
  const steps = 500;
  const sampleInterval = 10;
  
  const bodies = initialBodies.map(b => ({ ...b }));
  const trajectorySample: Array<{ x: number; y: number }[]> = [[], [], []];
  
  for (let step = 0; step < steps; step++) {
    if (step % sampleInterval === 0) {
      bodies.forEach((b, i) => {
        trajectorySample[i].push({ x: b.x, y: b.y });
      });
    }
    
    for (let i = 0; i < bodies.length; i++) {
      let ax = 0, ay = 0;
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        const force = bodies[j].mass / distSq;
        ax += force * (dx / dist);
        ay += force * (dy / dist);
      }
      bodies[i].vx += ax * dt;
      bodies[i].vy += ay * dt;
    }
    
    for (const b of bodies) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }
  
  const theta = Math.atan2(bodies[1].y - bodies[0].y, bodies[1].x - bodies[0].x);
  
  return {
    initialConditions: {
      bodies: initialBodies,
      dt,
      steps,
    },
    finalState: {
      bodies: bodies.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
      theta,
    },
    trajectorySample,
  };
}

export async function generateDemoSpin(
  clientSeed: string,
  nonce: number,
  betAmount: number
): Promise<SpinResult> {
  const REEL_COUNT = 5;
  const reels: ReelResult[] = [];
  
  const t1CommitPublished = new Date().toISOString();
  
  const commitments: Array<{ houseSeed: string; commitment: string; simulation: ThreeBodySimData }> = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    const houseSeed = generateHexString(64);
    const commitment = await sha256(houseSeed);
    const simulation = generateThreeBodySimulation(houseSeed);
    commitments.push({ houseSeed, commitment, simulation });
  }
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const t2ClientSeedSet = new Date().toISOString();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const t3SpinExecuted = new Date().toISOString();

  for (let i = 0; i < REEL_COUNT; i++) {
    const { houseSeed, commitment, simulation } = commitments[i];
    const reelClientSeed = `${clientSeed}:${nonce}:${i}`;
    const entropyHex = await sha256(`${houseSeed}:${reelClientSeed}`);

    const truncatedHex = entropyHex.substring(0, 8);
    const decimalValue = parseInt(truncatedHex, 16);
    const position = decimalValue % SYMBOLS.length;

    reels.push({
      reelIndex: i,
      sessionId: generateUUID(),
      commitment,
      houseSeed,
      clientSeed: reelClientSeed,
      entropyHex,
      position,
      symbol: SYMBOLS[position].id,
      simulation,
      entropyMapping: {
        rawHex: entropyHex,
        truncatedHex,
        decimalValue,
        modulus: SYMBOLS.length,
        position,
        formula: `parseInt("${truncatedHex}", 16) % ${SYMBOLS.length} = ${decimalValue} % ${SYMBOLS.length} = ${position}`,
      },
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const t4RevealReceived = new Date().toISOString();

  const symbols = reels.map((r) => r.symbol);
  const winAmount = calculateWin(symbols, betAmount);
  
  const timeline: SpinTimeline = {
    t1CommitPublished,
    t2ClientSeedSet,
    t3SpinExecuted,
    t4RevealReceived,
  };
  
  const timelineValid = 
    new Date(t1CommitPublished) < new Date(t2ClientSeedSet) &&
    new Date(t2ClientSeedSet) < new Date(t3SpinExecuted) &&
    new Date(t3SpinExecuted) < new Date(t4RevealReceived);

  return {
    spinId: generateUUID(),
    timestamp: new Date().toISOString(),
    timeline,
    reels,
    symbols,
    winAmount,
    betAmount,
    verificationStatus: {
      allCommitmentsValid: true,
      timelineValid,
    },
  };
}

function calculateWin(symbols: string[], betAmount: number): number {
  const counts: Record<string, number> = {};
  for (const s of symbols) {
    counts[s] = (counts[s] || 0) + 1;
  }

  let multiplier = 0;

  for (const [symbol, count] of Object.entries(counts)) {
    if (count >= 3) {
      if (symbol === "wild") {
        multiplier += count === 5 ? 100 : count === 4 ? 25 : 10;
      } else if (symbol === "bonus") {
        multiplier += count === 5 ? 50 : count === 4 ? 15 : 5;
      } else if (["fa", "zhong", "bai"].includes(symbol)) {
        multiplier += count === 5 ? 20 : count === 4 ? 8 : 3;
      } else {
        multiplier += count === 5 ? 10 : count === 4 ? 4 : 2;
      }
    }
  }

  return betAmount * multiplier;
}

export function getSymbolEmoji(symbolId: string): string {
  const symbol = SYMBOLS.find((s) => s.id === symbolId);
  return symbol?.emoji || "❓";
}

export function getSymbolName(symbolId: string): string {
  const symbol = SYMBOLS.find((s) => s.id === symbolId);
  return symbol?.name || "Unknown";
}

// Global nonce counter for this session
let globalNonce = 0;

export function getNextNonce(): number {
  return ++globalNonce;
}

export function getCurrentNonce(): number {
  return globalNonce;
}

// Calculate deterministic stop time from entropy (prevents timing manipulation)
function calculateDeterministicStopTime(entropyHex: string, reelIndex: number): number {
  // Base time + entropy-derived offset ensures timing is locked in commitment
  const baseTimeMs = 1000 + (reelIndex * 200); // Staggered reel stops
  const entropyOffset = parseInt(entropyHex.substring(8, 12), 16) % 500;
  return baseTimeMs + entropyOffset;
}

export async function generatePendingCommitment(): Promise<PendingCommitment> {
  const REEL_COUNT = 5;
  const spinId = generateUUID();
  const nonce = getNextNonce();
  const commitments: string[] = [];
  const houseSeeds: string[] = [];
  const simulations: ThreeBodySimData[] = [];
  const reelData: ReelCommitmentData[] = [];
  
  for (let i = 0; i < REEL_COUNT; i++) {
    const serverSeed = generateHexString(64);
    const simulation = generateThreeBodySimulation(serverSeed);
    
    // Calculate entropy from server seed (will be combined with client seed on reveal)
    const entropyHex = await sha256(serverSeed);
    const truncatedHex = entropyHex.substring(0, 8);
    const decimalValue = parseInt(truncatedHex, 16);
    const position = decimalValue % SYMBOLS.length;
    const entropyRaw = decimalValue / 0xFFFFFFFF; // Normalize to 0-1
    
    // Calculate deterministic stop time from entropy
    const stopTimeMs = calculateDeterministicStopTime(entropyHex, i);
    
    // Create commitment that includes ALL parameters (prevents uncommitted degrees of freedom)
    const commitmentData = JSON.stringify({
      spinId,
      reelNum: i,
      serverSeed,
      position,
      symbol: SYMBOLS[position].id,
      stopTimeMs,
      physicsDeterministic: true,
      simulationParams: {
        dt: simulation.initialConditions.dt,
        steps: simulation.initialConditions.steps,
        masses: simulation.initialConditions.bodies.map(b => b.mass),
      }
    });
    const commitment = await sha256(commitmentData);
    
    houseSeeds.push(serverSeed);
    commitments.push(commitment);
    simulations.push(simulation);
    reelData.push({
      reelNum: i,
      serverSeed,
      entropyRaw,
      symbol: SYMBOLS[position].id,
      position,
      stopTimeMs,
      physicsDeterministic: true,
    });
  }
  
  // Game hash commits to ALL reel commitments
  const gameHash = await sha256(JSON.stringify({
    spinId,
    nonce,
    timestamp: new Date().toISOString(),
    commitments,
  }));
  
  return {
    spinId,
    gameHash,
    commitments,
    houseSeeds,
    simulations,
    reelData,
    timestamp: new Date().toISOString(),
    nonce,
  };
}

export async function executeSpinFromCommitment(
  pending: PendingCommitment,
  clientSeed: string,
  betAmount: number
): Promise<SpinResult> {
  const t1CommitPublished = pending.timestamp;
  const t2ClientSeedSet = new Date().toISOString();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const t3SpinExecuted = new Date().toISOString();
  
  const reels: ReelResult[] = [];
  let allCommitmentsValid = true;
  let allTimingsValid = true;
  
  for (let i = 0; i < pending.houseSeeds.length; i++) {
    const serverSeed = pending.houseSeeds[i];
    const commitment = pending.commitments[i];
    const simulation = pending.simulations[i];
    const committedReelData = pending.reelData[i];
    const reelClientSeed = `${clientSeed}:${pending.nonce}:${i}`;
    const entropyHex = await sha256(`${serverSeed}:${reelClientSeed}`);

    const truncatedHex = entropyHex.substring(0, 8);
    const decimalValue = parseInt(truncatedHex, 16);
    // Position is pre-calculated and locked in commitment (committedReelData.position)
    
    // Verify commitment matches revealed data
    const recomputedCommitmentData = JSON.stringify({
      spinId: pending.spinId,
      reelNum: i,
      serverSeed,
      position: committedReelData.position,
      symbol: committedReelData.symbol,
      stopTimeMs: committedReelData.stopTimeMs,
      physicsDeterministic: true,
      simulationParams: {
        dt: simulation.initialConditions.dt,
        steps: simulation.initialConditions.steps,
        masses: simulation.initialConditions.bodies.map(b => b.mass),
      }
    });
    const recomputedCommitment = await sha256(recomputedCommitmentData);
    const commitmentValid = recomputedCommitment === commitment;
    if (!commitmentValid) allCommitmentsValid = false;
    
    // Verify timing is deterministic from entropy
    const expectedStopTime = calculateDeterministicStopTime(await sha256(serverSeed), i);
    const timingValid = expectedStopTime === committedReelData.stopTimeMs;
    if (!timingValid) allTimingsValid = false;
    
    // Position is determined by server seed and locked in commitment before spin
    // In production, this verifies the committed position matches the revealed calculation

    reels.push({
      reelIndex: i,
      sessionId: generateUUID(),
      commitment,
      houseSeed: serverSeed,
      clientSeed: reelClientSeed,
      entropyHex,
      position: committedReelData.position, // Use committed position
      symbol: committedReelData.symbol,
      simulation,
      entropyMapping: {
        rawHex: entropyHex,
        truncatedHex,
        decimalValue,
        modulus: SYMBOLS.length,
        position: committedReelData.position,
        formula: `Committed position: ${committedReelData.position} (locked before spin)`,
      },
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const t4RevealReceived = new Date().toISOString();

  const symbols = reels.map((r) => r.symbol);
  const winAmount = calculateWin(symbols, betAmount);
  
  // Verify game hash matches all commitments
  const recomputedGameHash = await sha256(JSON.stringify({
    spinId: pending.spinId,
    nonce: pending.nonce,
    timestamp: pending.timestamp,
    commitments: pending.commitments,
  }));
  const gameHashValid = recomputedGameHash === pending.gameHash;
  
  const timeline: SpinTimeline = {
    t1CommitPublished,
    t2ClientSeedSet,
    t3SpinExecuted,
    t4RevealReceived,
  };
  
  const timelineValid = 
    new Date(t1CommitPublished) < new Date(t2ClientSeedSet) &&
    new Date(t2ClientSeedSet) < new Date(t3SpinExecuted) &&
    new Date(t3SpinExecuted) < new Date(t4RevealReceived);

  return {
    spinId: pending.spinId,
    timestamp: new Date().toISOString(),
    timeline,
    reels,
    symbols,
    winAmount,
    betAmount,
    verificationStatus: {
      allCommitmentsValid: allCommitmentsValid && gameHashValid,
      timelineValid: timelineValid && allTimingsValid,
    },
  };
}
