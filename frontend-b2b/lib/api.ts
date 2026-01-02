/**
 * API client for Three-Body Entropy RNG slot machine
 * Integrates with backend /api/commit, /api/reveal, /api/verify endpoints
 * 
 * Note: This is a client-side simulation for demo purposes.
 * In production, these functions would call the actual backend API endpoints.
 */

/**
 * Commitment response from /api/commit
 */
export interface CommitmentResponse {
  sessionId: string;
  commitmentHash: string;
  publishedAt: string;
  nonce: number;
}

/**
 * Reveal request to /api/reveal
 */
export interface RevealRequest {
  sessionId: string;
  clientSeed: string;
  bet: number;
  gameId: string;
}

/**
 * Spin result from /api/reveal
 */
export interface SpinResult {
  spinId: string;
  sessionId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  combinedSeedHex: string;
  reelStops: number[];
  symbols: string[];
  winAmount: number;
  multiplier: number;
  isWin: boolean;
  commitmentHash: string;
}

/**
 * Verification request to /api/verify
 */
export interface VerifyRequest {
  spinId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  commitmentHash: string;
  combinedSeedHex: string;
  reelStops: number[];
}

/**
 * Verification response from /api/verify
 */
export interface VerificationResponse {
  valid: boolean;
  checks: {
    commitment: boolean;
    mixing: boolean;
    result: boolean;
  };
  details: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

/**
 * Generate a random client seed
 */
export function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Simulated commitment - generates a server seed and commitment hash
 * In production, this would call the actual /api/commit endpoint
 */
export async function getCommitment(sessionId: string): Promise<CommitmentResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Generate server seed (in production this comes from the server)
  const serverSeedArray = new Uint8Array(32);
  crypto.getRandomValues(serverSeedArray);
  const serverSeed = Array.from(serverSeedArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Generate commitment hash (SHA-256 of server seed)
  const encoder = new TextEncoder();
  const data = encoder.encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const commitmentHash = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Store server seed temporarily (in production this is stored server-side)
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`serverSeed_${sessionId}`, serverSeed);
  }

  return {
    sessionId,
    commitmentHash,
    publishedAt: new Date().toISOString(),
    nonce: Math.floor(Math.random() * 1000000),
  };
}

/**
 * HKDF derivation for seed mixing
 */
async function hkdfDerive(
  ikm: string,
  salt: string,
  info: string,
  length: number = 32
): Promise<string> {
  const encoder = new TextEncoder();
  const ikmBuffer = encoder.encode(ikm);
  const saltBuffer = encoder.encode(salt);
  const infoBuffer = encoder.encode(info);

  const key = await crypto.subtle.importKey(
    'raw',
    ikmBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBuffer,
      info: infoBuffer,
    },
    key,
    length * 8
  );

  const hashArray = new Uint8Array(derivedBits);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive reel stops from combined seed
 */
function deriveReelStops(
  combinedSeedHex: string,
  reelCount: number,
  symbolsPerReel: number = 20
): number[] {
  const stops: number[] = [];
  const bytesPerReel = 4;

  for (let i = 0; i < reelCount; i++) {
    const start = i * bytesPerReel * 2;
    const end = start + bytesPerReel * 2;
    const chunk = combinedSeedHex.substring(start, end);
    const value = parseInt(chunk, 16);
    const stop = value % symbolsPerReel;
    stops.push(stop);
  }

  return stops;
}

/**
 * Symbol definitions for each game
 */
const GAME_SYMBOLS: Record<string, string[]> = {
  'elemental-legends': ['fire', 'water', 'earth', 'air', 'lightning', 'ice', 'nature', 'dark', 'light', 'wild'],
  'kungfu-world': ['dragon', 'tiger', 'crane', 'snake', 'monkey', 'master', 'scroll', 'temple', 'sword', 'wild'],
  'kungfu-gem': ['ruby', 'emerald', 'sapphire', 'diamond', 'amethyst', 'topaz', 'jade', 'pearl', 'gold', 'wild'],
  'default': ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'star', 'diamond', 'wild'],
};

/**
 * Win multipliers based on symbol combinations
 */
const WIN_MULTIPLIERS: Record<string, number> = {
  'wild': 50,
  'seven': 25,
  'diamond': 20,
  'gold': 20,
  'master': 20,
  'lightning': 15,
  'dragon': 15,
  'ruby': 15,
  'bar': 10,
  'temple': 10,
  'emerald': 10,
  'fire': 8,
  'tiger': 8,
  'sapphire': 8,
  'bell': 5,
  'crane': 5,
  'amethyst': 5,
  'star': 3,
  'snake': 3,
  'topaz': 3,
  'cherry': 2,
  'monkey': 2,
  'jade': 2,
  'default': 1,
};

/**
 * Calculate win amount based on symbols
 */
function calculateWin(symbols: string[], bet: number): { winAmount: number; multiplier: number; isWin: boolean } {
  // Check for matching symbols (simplified: 3+ matching = win)
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

  // Need at least 3 matching symbols to win
  if (maxCount >= 3) {
    const baseMultiplier = WIN_MULTIPLIERS[winningSymbol] || WIN_MULTIPLIERS['default'];
    const multiplier = baseMultiplier * (maxCount - 2); // 3 match = 1x, 4 match = 2x, 5 match = 3x
    return {
      winAmount: bet * multiplier,
      multiplier,
      isWin: true,
    };
  }

  return {
    winAmount: 0,
    multiplier: 0,
    isWin: false,
  };
}

/**
 * Reveal spin result - combines seeds and calculates outcome
 * In production, this would call the actual /api/reveal endpoint
 */
export async function revealSpin(request: RevealRequest): Promise<SpinResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get stored server seed (in production this comes from the server)
  let serverSeed = '';
  if (typeof window !== 'undefined') {
    serverSeed = sessionStorage.getItem(`serverSeed_${request.sessionId}`) || '';
  }

  if (!serverSeed) {
    // Generate a new server seed if not found
    const serverSeedArray = new Uint8Array(32);
    crypto.getRandomValues(serverSeedArray);
    serverSeed = Array.from(serverSeedArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Generate commitment hash
  const encoder = new TextEncoder();
  const data = encoder.encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const commitmentHash = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Generate nonce
  const nonce = Math.floor(Math.random() * 1000000);

  // Derive combined seed using HKDF
  const ikm = `${serverSeed}:${request.clientSeed}:${nonce}`;
  const combinedSeedHex = await hkdfDerive(ikm, 'tb-entropy-v1', 'spin', 32);

  // Derive reel stops
  const reelStops = deriveReelStops(combinedSeedHex, 5, 10);

  // Get symbols for the game
  const gameSymbols = GAME_SYMBOLS[request.gameId] || GAME_SYMBOLS['default'];
  const symbols = reelStops.map((stop) => gameSymbols[stop % gameSymbols.length]);

  // Calculate win
  const { winAmount, multiplier, isWin } = calculateWin(symbols, request.bet);

  return {
    spinId: `spin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    sessionId: request.sessionId,
    serverSeed,
    clientSeed: request.clientSeed,
    nonce,
    combinedSeedHex,
    reelStops,
    symbols,
    winAmount,
    multiplier,
    isWin,
    commitmentHash,
  };
}

/**
 * Verify a spin result
 * In production, this would call the actual /api/verify endpoint
 */
export async function verifySpin(request: VerifyRequest): Promise<VerificationResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Verify commitment (SHA-256 of server seed should equal commitment hash)
  const encoder = new TextEncoder();
  const data = encoder.encode(request.serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const computedCommitment = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const commitmentValid = computedCommitment.toLowerCase() === request.commitmentHash.toLowerCase();

  // Verify mixing (HKDF derivation should match combined seed)
  const ikm = `${request.serverSeed}:${request.clientSeed}:${request.nonce}`;
  const computedCombined = await hkdfDerive(ikm, 'tb-entropy-v1', 'spin', 32);
  const mixingValid = computedCombined.toLowerCase() === request.combinedSeedHex.toLowerCase();

  // Verify result (reel stops should be deterministically derived)
  const computedStops = deriveReelStops(request.combinedSeedHex, request.reelStops.length, 10);
  const resultValid = computedStops.every((stop, i) => stop === request.reelStops[i]);

  const valid = commitmentValid && mixingValid && resultValid;

  return {
    valid,
    checks: {
      commitment: commitmentValid,
      mixing: mixingValid,
      result: resultValid,
    },
    details: valid
      ? 'All verification checks passed - this spin is provably fair'
      : `Verification failed: ${!commitmentValid ? 'commitment invalid, ' : ''}${!mixingValid ? 'mixing invalid, ' : ''}${!resultValid ? 'result invalid' : ''}`.replace(/, $/, ''),
  };
}
