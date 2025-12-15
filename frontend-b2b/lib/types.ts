/**
 * TypeScript interfaces for fairness verification
 * Based on N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
 */

/**
 * Game information in the verification bundle
 */
export interface GameInfo {
  id: string;
  mathVersion: string;
  reelStripsHash?: string;
}

/**
 * Spin information
 */
export interface SpinInfo {
  spinId: string;
  sessionId: string;
  timestamp: string;
  mode: 'real' | 'demo';
}

/**
 * Commitment data for provably fair verification
 */
export interface CommitmentData {
  commitmentHash: string;
  hashAlg: string;
  publishedAt: string;
}

/**
 * Seed data for verification
 */
export interface SeedData {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Mixing/derivation data
 */
export interface MixingData {
  kdf: string;
  salt: string;
  info: string;
  combinedSeedHex: string;
}

/**
 * Payout information
 */
export interface PayoutInfo {
  bet: number;
  win: number;
  currency: string;
}

/**
 * Spin result data
 */
export interface ResultData {
  reelStops: number[];
  symbols: string[];
  payout: PayoutInfo;
}

/**
 * Server proof data (optional chain info)
 */
export interface ServerProof {
  commitChainPrev?: string;
  commitChainThis?: string;
}

/**
 * Initial conditions for three-body simulation (optional extended data)
 */
export interface InitialConditions {
  masses: number[];
  positions: number[][];
  velocities: number[][];
}

/**
 * Outcome data (simplified format from task spec)
 */
export interface OutcomeData {
  reels: number[];
  symbols: string[];
  winAmount: number;
}

/**
 * Proof data (simplified format from task spec)
 */
export interface ProofData {
  signature: string;
  publicKey: string;
}

/**
 * Complete verification bundle (N6 format)
 */
export interface VerificationBundle {
  version: string;
  game: GameInfo;
  spin: SpinInfo;
  commitment: CommitmentData;
  seeds: SeedData;
  mixing: MixingData;
  result: ResultData;
  serverProof?: ServerProof;
}

/**
 * Simplified verification bundle (task spec format)
 */
export interface SimplifiedVerificationBundle {
  spinId: string;
  timestamp: string;
  initialConditions?: InitialConditions;
  thetaValues?: number[];
  hashChain?: string[];
  outcome: OutcomeData;
  proof?: ProofData;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  commitmentHash?: string;
  combinedSeedHex?: string;
}

/**
 * Individual verification check result
 */
export interface VerificationCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  details: string;
}

/**
 * Complete verification output
 */
export interface VerifyOutput {
  ok: boolean;
  checks: {
    commitment: { ok: boolean; computed: string; details: string };
    mixing: { ok: boolean; computed: string; details: string };
    result: { ok: boolean; computedStops: number[]; details: string };
    hashChain?: { ok: boolean; details: string };
  };
  warnings: string[];
  summary: string;
}

/**
 * File upload state
 */
export interface FileUploadState {
  isDragging: boolean;
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
}

/**
 * Verification page state
 */
export interface VerificationState {
  bundle: VerificationBundle | SimplifiedVerificationBundle | null;
  result: VerifyOutput | null;
  isVerifying: boolean;
  error: string | null;
}
