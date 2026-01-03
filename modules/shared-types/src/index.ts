/**
 * Shared Types Module
 * 
 * Single source of truth for ALL TypeScript interfaces across the Three-Body Entropy RNG system.
 * This module consolidates types from all core modules to prevent duplication and ensure consistency.
 * 
 * Organization:
 * 1. Physics Engine Types - Core simulation data structures
 * 2. Entropy Oracle Types - Entropy generation and validation
 * 3. Hash Chain Types - Cryptographic verification
 * 4. Theta Protection Types - Spin calculation security
 * 5. Session Types - Game session management
 * 6. Commit-Reveal Types - API response contracts
 * 7. Verification Types - Fairness verification
 * 8. Slot Machine Types - Game-specific types
 * 
 * @module shared-types
 * @version 1.0.0
 */

// ============================================================================
// SECTION 1: PHYSICS ENGINE TYPES
// Core data structures for three-body gravitational simulation
// ============================================================================

/**
 * Represents a 3D vector with x, y, z components.
 * Used for positions, velocities, and accelerations.
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a celestial body in the simulation.
 * Each body has mass, position, and velocity.
 */
export interface Body {
  /** Mass of the body (in arbitrary units) */
  mass: number;
  /** Current position vector */
  position: Vector3D;
  /** Current velocity vector */
  velocity: Vector3D;
}

/**
 * Configuration for the three-body system.
 * Contains all three bodies and simulation parameters.
 */
export interface SystemConfiguration {
  /** Array of exactly 3 bodies */
  bodies: [Body, Body, Body];
  /** Gravitational constant (default: 1.0) */
  gravitationalConstant: number;
  /** Softening parameter to prevent singularities */
  softeningParameter: number;
}

/**
 * State of the simulation at a given time.
 */
export interface SimulationState {
  /** Current time in the simulation */
  time: number;
  /** Current configuration of all bodies */
  configuration: SystemConfiguration;
  /** Total energy of the system (for validation) */
  totalEnergy: number;
  /** Number of integration steps performed */
  stepCount: number;
}

/**
 * Options for running the simulation.
 */
export interface SimulationOptions {
  /** Duration to simulate (in time units) */
  duration: number;
  /** Time step for integration */
  timeStep: number;
  /** Whether to use adaptive time stepping */
  adaptiveTimeStep?: boolean;
  /** Tolerance for adaptive time stepping */
  tolerance?: number;
}

/**
 * Result of entropy extraction from the simulation.
 */
export interface PhysicsEntropyResult {
  /** The raw entropy value (high-precision floating point) */
  value: number;
  /** Hexadecimal representation of the entropy */
  hex: string;
  /** The simulation state at extraction time */
  finalState: SimulationState;
  /** Hash of the initial conditions (for verification) */
  initialConditionsHash: string;
}

/**
 * Initial conditions for setting up the physics system (tuple format).
 * Used by the physics engine for precise type checking.
 */
export interface PhysicsInitialConditions {
  /** Masses of the three bodies */
  masses: [number, number, number];
  /** Initial positions of the three bodies */
  positions: [Vector3D, Vector3D, Vector3D];
  /** Initial velocities of the three bodies */
  velocities: [Vector3D, Vector3D, Vector3D];
}

// ============================================================================
// SECTION 2: ENTROPY ORACLE TYPES
// Entropy generation, validation, and oracle service types
// ============================================================================

/**
 * Initial conditions for the three-body simulation (array format).
 * Used by the entropy oracle for flexible configuration.
 */
export interface OracleInitialConditions {
  bodies: Body[];
  gravitationalConstant?: number;
  softeningParameter?: number;
}

/**
 * Simulation parameters for entropy oracle.
 */
export interface OracleSimulationParams {
  duration: number;
  timeStep: number;
  initialConditions?: OracleInitialConditions;
}

/**
 * Raw entropy result from physics simulation.
 */
export interface RawEntropyResult {
  value: number;
  hex: string;
  sourceHash: string;
  simulationId: string;
  timestamp: number;
  metadata: SimulationMetadata;
}

/**
 * Simulation metadata.
 */
export interface SimulationMetadata {
  duration: number;
  timeStep: number;
  steps: number;
  finalEnergy: number;
  energyDrift: number;
  lyapunovEstimate: number;
}

/**
 * Entropy request options.
 */
export interface EntropyRequestOptions {
  sessionId: string;
  clientSeed?: string;
  nonce?: number;
  simulationParams?: OracleSimulationParams;
}

/**
 * Entropy response with commitment.
 */
export interface EntropyResponse {
  requestId: string;
  commitment: string;
  entropy: RawEntropyResult;
  proof: EntropyProof;
  timestamp: number;
}

/**
 * Entropy proof for verification.
 */
export interface EntropyProof {
  proofId: string;
  simulationHash: string;
  entropyHash: string;
  signature: string;
  chainIndex?: number;
}

/**
 * Oracle configuration.
 */
export interface OracleConfig {
  defaultDuration: number;
  defaultTimeStep: number;
  defaultGravitationalConstant: number;
  defaultSofteningParameter: number;
  hashAlgorithm: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

/**
 * Entropy cache entry.
 */
export interface EntropyCacheEntry {
  entropy: RawEntropyResult;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Oracle statistics.
 */
export interface OracleStats {
  totalRequests: number;
  totalSimulations: number;
  cacheHits: number;
  cacheMisses: number;
  averageSimulationTime: number;
  uptime: number;
}

/**
 * Preset initial conditions for common scenarios.
 */
export interface PresetConditions {
  name: string;
  description: string;
  conditions: OracleInitialConditions;
}

// ============================================================================
// SECTION 3: HASH CHAIN TYPES
// Cryptographic verification and commitment schemes
// ============================================================================

/**
 * Represents a server commitment for provably fair verification.
 */
export interface ServerCommitment {
  /** The commitment hash (SHA-256 of server seed) */
  commitmentHash: string;
  /** Timestamp when commitment was created */
  timestamp: number;
  /** Optional nonce for additional entropy */
  nonce?: string;
}

/**
 * Represents a revealed server seed after game completion.
 */
export interface ServerReveal {
  /** The original server seed */
  serverSeed: string;
  /** The commitment hash for verification */
  commitmentHash: string;
  /** Timestamp of reveal */
  timestamp: number;
}

/**
 * Represents a single hash in the chain.
 */
export interface HashChainLink {
  /** The hash value */
  hash: string;
  /** Index in the chain (0 = terminal hash) */
  index: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a complete hash chain.
 */
export interface HashChain {
  /** The initial commitment (first revealed hash) */
  initialCommitment: string;
  /** Array of hashes in the chain */
  hashes: HashChainLink[];
  /** Total length of the chain */
  length: number;
  /** Algorithm used for hashing */
  algorithm: string;
}

/**
 * Options for HKDF key derivation.
 */
export interface HKDFOptions {
  /** Input key material */
  ikm: string | Buffer;
  /** Salt value (optional, defaults to zeros) */
  salt?: string | Buffer;
  /** Application-specific info */
  info?: string | Buffer;
  /** Desired output length in bytes */
  length: number;
  /** Hash algorithm to use */
  algorithm?: 'sha256' | 'sha384' | 'sha512';
}

/**
 * Result of HKDF derivation.
 */
export interface HKDFResult {
  /** Derived key as hex string */
  key: string;
  /** Derived key as Buffer */
  keyBuffer: Buffer;
  /** Parameters used for derivation */
  params: {
    saltHex: string;
    infoHex: string;
    length: number;
    algorithm: string;
  };
}

/**
 * Options for deriving the next hash in a chain.
 */
export interface DeriveHashOptions {
  /** Previous hash in the chain */
  previousHash: string;
  /** Client seed for combining */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Optional additional data */
  additionalData?: string;
}

/**
 * Result of hash derivation.
 */
export interface DeriveHashResult {
  /** The derived hash */
  hash: string;
  /** Input data used for derivation */
  inputs: {
    previousHash: string;
    clientSeed: string;
    nonce: string;
    additionalData?: string;
  };
}

/**
 * Options for generating a hash chain.
 */
export interface GenerateChainOptions {
  /** The terminal seed (end of chain) */
  terminalSeed: string;
  /** Number of hashes to generate */
  length: number;
  /** Hash algorithm to use */
  algorithm?: 'sha256' | 'sha384' | 'sha512';
}

/**
 * Combined seed data for final result calculation.
 */
export interface CombinedSeedData {
  /** Server seed */
  serverSeed: string;
  /** Client seed */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Combined hash result */
  combinedHash: string;
}

// ============================================================================
// SECTION 4: THETA PROTECTION TYPES
// Spin calculation security and tamper-proof validation
// ============================================================================

/**
 * Entropy data from the physics engine or entropy oracle.
 */
export interface ThetaEntropyData {
  /** The raw entropy value (normalized 0-1) */
  value: number;
  /** Hexadecimal representation of the entropy */
  hex: string;
  /** Hash of the initial conditions that generated this entropy */
  sourceHash: string;
  /** Timestamp when entropy was generated */
  timestamp: number;
  /** Optional metadata about the entropy source */
  metadata?: Record<string, unknown>;
}

/**
 * Theta proof for spin result validation.
 */
export interface ThetaProof {
  /** Unique identifier for this proof */
  proofId: string;
  /** The commitment hash (published before spin) */
  commitment: string;
  /** The theta value derived from entropy */
  theta: string;
  /** Client seed used in calculation */
  clientSeed: string;
  /** Nonce value (spin number) */
  nonce: number;
  /** The final spin result */
  result: ThetaSpinResult;
  /** Signature of the proof data */
  signature: string;
  /** Timestamp when proof was generated */
  timestamp: number;
  /** Version of the proof format */
  version: string;
}

/**
 * Spin result from theta protection (contains reel positions and outcome).
 */
export interface ThetaSpinResult {
  /** Array of reel stop positions */
  reelPositions: number[];
  /** Number of reels */
  reelCount: number;
  /** Symbols per reel */
  symbolsPerReel: number;
  /** Hash of the result for verification */
  resultHash: string;
}

/**
 * Theta validation result.
 */
export interface ThetaValidationResult {
  /** Whether the proof is valid */
  valid: boolean;
  /** Detailed validation checks */
  checks: ThetaValidationCheck[];
  /** Error message if invalid */
  error?: string;
  /** Timestamp of validation */
  timestamp: number;
}

/**
 * Individual theta validation check result.
 */
export interface ThetaValidationCheck {
  /** Name of the check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
  /** Additional details */
  details?: string;
}

/**
 * Options for generating a theta proof.
 */
export interface GenerateThetaProofOptions {
  /** Entropy data from the source */
  entropyData: ThetaEntropyData;
  /** Client-provided seed */
  clientSeed: string;
  /** Nonce value (spin number) */
  nonce: number;
  /** Number of reels in the slot machine */
  reelCount: number;
  /** Number of symbols per reel */
  symbolsPerReel: number;
  /** Optional server secret for signing */
  serverSecret?: string;
}

/**
 * Options for validating a theta proof.
 */
export interface ValidateThetaProofOptions {
  /** The proof to validate */
  proof: ThetaProof;
  /** Expected result (optional, for result verification) */
  expectedResult?: ThetaSpinResult;
  /** Server public key for signature verification (optional) */
  serverPublicKey?: string;
}

/**
 * Theta commitment data.
 */
export interface ThetaCommitment {
  /** The commitment hash */
  hash: string;
  /** Entropy source identifier */
  entropySourceId: string;
  /** Timestamp of commitment */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
}

/**
 * Theta reveal data.
 */
export interface ThetaReveal {
  /** The original commitment */
  commitment: ThetaCommitment;
  /** The revealed entropy data */
  entropyData: ThetaEntropyData;
  /** The theta value */
  theta: string;
  /** Timestamp of reveal */
  timestamp: number;
}

/**
 * Configuration for the theta protection system.
 */
export interface ThetaConfig {
  /** Hash algorithm to use */
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  /** Commitment expiration time in milliseconds */
  commitmentTTL: number;
  /** Whether to require signatures */
  requireSignatures: boolean;
  /** Proof format version */
  proofVersion: string;
}

// ============================================================================
// SECTION 5: SESSION STATE MACHINE TYPES
// Game session management and lifecycle handling
// ============================================================================

/**
 * Possible states for a game session.
 */
export enum SessionState {
  /** Initial state when session is created */
  INIT = 'INIT',
  /** Waiting for player to place a bet */
  AWAITING_BET = 'AWAITING_BET',
  /** Entropy has been requested from the oracle */
  ENTROPY_REQUESTED = 'ENTROPY_REQUESTED',
  /** Spin is in progress */
  SPINNING = 'SPINNING',
  /** Spin is complete, result available */
  COMPLETE = 'COMPLETE',
  /** An error occurred */
  ERROR = 'ERROR',
  /** Session has been cancelled */
  CANCELLED = 'CANCELLED',
  /** Session has expired */
  EXPIRED = 'EXPIRED'
}

/**
 * Events that trigger state transitions.
 */
export enum SessionEvent {
  /** Start the session */
  START = 'START',
  /** Place a bet */
  PLACE_BET = 'PLACE_BET',
  /** Request entropy */
  REQUEST_ENTROPY = 'REQUEST_ENTROPY',
  /** Entropy received */
  ENTROPY_RECEIVED = 'ENTROPY_RECEIVED',
  /** Start spinning */
  SPIN = 'SPIN',
  /** Spin completed */
  SPIN_COMPLETE = 'SPIN_COMPLETE',
  /** An error occurred */
  ERROR = 'ERROR',
  /** Cancel the session */
  CANCEL = 'CANCEL',
  /** Session expired */
  EXPIRE = 'EXPIRE',
  /** Reset the session */
  RESET = 'RESET'
}

/**
 * Represents a game session.
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Game identifier */
  gameId: string;
  /** Current state */
  state: SessionState;
  /** Session creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Session expiration timestamp */
  expiresAt: number;
  /** Session data/payload */
  data: SessionData;
  /** State transition history */
  history: StateTransition[];
  /** Error information if in ERROR state */
  error?: SessionError;
}

/**
 * Session data containing game-specific information.
 */
export interface SessionData {
  /** Bet amount */
  betAmount?: number;
  /** Currency */
  currency?: string;
  /** Entropy data */
  entropyData?: {
    value: number;
    hex: string;
    sourceHash: string;
  };
  /** Spin result */
  spinResult?: {
    reelPositions: number[];
    winAmount: number;
    multiplier: number;
  };
  /** Client seed */
  clientSeed?: string;
  /** Nonce */
  nonce?: number;
  /** Additional custom data */
  custom?: Record<string, unknown>;
}

/**
 * Represents a state transition.
 */
export interface StateTransition {
  /** Previous state */
  from: SessionState;
  /** New state */
  to: SessionState;
  /** Event that triggered the transition */
  event: SessionEvent;
  /** Timestamp of transition */
  timestamp: number;
  /** Payload data for the transition */
  payload?: Record<string, unknown>;
}

/**
 * Session error information.
 */
export interface SessionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Options for creating a session.
 */
export interface CreateSessionOptions {
  /** User identifier */
  userId: string;
  /** Game identifier */
  gameId: string;
  /** Session TTL in milliseconds */
  ttl?: number;
  /** Initial session data */
  initialData?: Partial<SessionData>;
}

/**
 * Options for transitioning state.
 */
export interface TransitionOptions {
  /** Session identifier */
  sessionId: string;
  /** Event to trigger */
  event: SessionEvent;
  /** Payload data */
  payload?: Record<string, unknown>;
}

/**
 * Result of a state transition.
 */
export interface TransitionResult {
  /** Whether the transition was successful */
  success: boolean;
  /** The session after transition */
  session: Session;
  /** Previous state */
  previousState: SessionState;
  /** New state */
  newState: SessionState;
  /** Error if transition failed */
  error?: string;
}

/**
 * Persistence layer interface for session storage.
 */
export interface SessionPersistence {
  /** Save a session */
  save(session: Session): Promise<void>;
  /** Load a session by ID */
  load(sessionId: string): Promise<Session | null>;
  /** Delete a session */
  delete(sessionId: string): Promise<void>;
  /** List sessions for a user */
  listByUser(userId: string): Promise<Session[]>;
  /** List sessions by state */
  listByState(state: SessionState): Promise<Session[]>;
}

/**
 * Event listener callback type.
 */
export type SessionEventListener = (
  session: Session,
  transition: StateTransition
) => void;

/**
 * State machine configuration.
 */
export interface StateMachineConfig {
  /** Default session TTL in milliseconds */
  defaultTTL: number;
  /** Maximum history entries to keep */
  maxHistorySize: number;
  /** Whether to emit events */
  emitEvents: boolean;
  /** Persistence layer (optional) */
  persistence?: SessionPersistence;
}

// ============================================================================
// SECTION 6: COMMIT-REVEAL API RESPONSE TYPES
// API contracts for the commit-reveal protocol
// ============================================================================

/**
 * Response from /api/slots/init endpoint.
 */
export interface CommitmentResponse {
  /** Unique spin identifier */
  spinId: string;
  /** SHA-256 hash of the server seed */
  commitmentHash: string;
  /** Timestamp when commitment was created */
  timestamp: number;
  /** When the commitment expires */
  expiresAt: number;
}

/**
 * Request to /api/slots/execute endpoint.
 */
export interface ExecuteSpinRequest {
  /** Spin ID from init response */
  spinId: string;
  /** Client-provided seed */
  clientSeed: string;
}

/**
 * Response from /api/slots/execute endpoint.
 */
export interface ExecuteSpinResponse {
  /** Spin ID */
  spinId: string;
  /** Revealed server seed */
  serverSeed: string;
  /** Client seed used */
  clientSeed: string;
  /** Nonce value */
  nonce: number;
  /** Combined seed (HKDF derived) */
  combinedSeed: string;
  /** Entropy hex from physics simulation */
  entropyHex: string;
  /** Reel stop positions */
  reelStops: number[];
  /** Commitment hash for verification */
  commitmentHash: string;
  /** Timestamp of execution */
  timestamp: number;
}

/**
 * Request to /api/slots/verify endpoint.
 */
export interface VerifySpinRequest {
  /** Server seed to verify */
  serverSeed: string;
  /** Client seed used */
  clientSeed: string;
  /** Nonce value */
  nonce: number;
  /** Expected commitment hash */
  commitmentHash: string;
  /** Expected entropy hex */
  entropyHex: string;
  /** Expected reel stops */
  reelStops: number[];
}

/**
 * Response from /api/slots/verify endpoint.
 */
export interface VerifySpinResponse {
  /** Whether verification passed */
  valid: boolean;
  /** Detailed verification checks */
  checks: {
    commitmentValid: boolean;
    entropyValid: boolean;
    reelsValid: boolean;
  };
  /** Replayed result for comparison */
  replayedResult?: {
    entropyHex: string;
    reelStops: number[];
  };
  /** Error message if invalid */
  error?: string;
}

// ============================================================================
// SECTION 7: VERIFICATION TYPES
// Fairness verification and validation
// ============================================================================

/**
 * Generic verification result.
 */
export interface VerificationResult {
  /** Whether verification passed */
  valid: boolean;
  /** Number of checks performed */
  checksPerformed: number;
  /** Number of checks passed */
  checksPassed: number;
  /** Detailed check results */
  checks: VerificationCheck[];
  /** Error message if invalid */
  error?: string;
  /** Timestamp of verification */
  timestamp: number;
}

/**
 * Individual verification check.
 */
export interface VerificationCheck {
  /** Name of the check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Expected value (if applicable) */
  expected?: string;
  /** Actual value (if applicable) */
  actual?: string;
  /** Additional details */
  details?: string;
}

/**
 * Hash chain verification result.
 */
export interface HashChainVerificationResult {
  /** Whether the chain is valid */
  valid: boolean;
  /** Number of hashes verified */
  verifiedCount: number;
  /** Index of first invalid hash (if any) */
  invalidIndex?: number;
  /** Error message if invalid */
  error?: string;
}

// ============================================================================
// SECTION 8: SLOT MACHINE TYPES
// Game-specific types for slot machine integration
// ============================================================================

/**
 * Reel count type (3-8 reels supported).
 */
export type ReelCount = 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Symbol on a reel.
 */
export interface SlotSymbol {
  id: string;
  name: string;
  value: number;
}

/**
 * Reel configuration.
 */
export interface ReelConfiguration {
  reelCount: ReelCount;
  symbolsPerReel: number;
  symbols: SlotSymbol[];
  paylines: Payline[];
}

/**
 * Payline definition.
 */
export interface Payline {
  id: number;
  positions: number[];
  multiplier: number;
}

/**
 * Spin record for history.
 */
export interface SpinRecord {
  spinId: string;
  nonce: number;
  bet: number;
  entropyValue: number;
  entropyHex: string;
  reelPositions: number[];
  symbols: string[];
  winAmount: number;
  timestamp: number;
  proof: SpinProof;
}

/**
 * Spin proof for verification.
 */
export interface SpinProof {
  proofId: string;
  commitment: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  signature: string;
}

/**
 * Hash chain data for slot session.
 */
export interface SlotHashChainData {
  serverCommitment: string;
  clientSeed: string;
  chainLength: number;
  currentIndex: number;
  hashes: string[];
}

/**
 * Spin request.
 */
export interface SpinRequest {
  sessionId: string;
  bet: number;
  clientSeed?: string;
}

/**
 * Spin result from slot machine.
 */
export interface SlotSpinResult {
  success: boolean;
  spinRecord?: SpinRecord;
  newBalance?: number;
  error?: string;
}

/**
 * Slot machine example configuration.
 */
export interface SlotExampleConfig {
  reelCount: ReelCount;
  initialBalance: number;
  defaultBet: number;
  serverSecret: string;
  simulationDuration: number;
  simulationTimeStep: number;
}

/**
 * Slot machine example result.
 */
export interface SlotExampleResult {
  success: boolean;
  totalSpins: number;
  totalWins: number;
  totalLosses: number;
  finalBalance: number;
  executionTime: number;
}

// ============================================================================
// SECTION 9: FRONTEND VERIFICATION TYPES
// Types specific to the B2B frontend verification portal
// ============================================================================

/**
 * Game information in the verification bundle.
 */
export interface GameInfo {
  id: string;
  mathVersion: string;
  reelStripsHash?: string;
}

/**
 * Spin information for verification.
 */
export interface SpinInfo {
  spinId: string;
  sessionId: string;
  timestamp: string;
  mode: 'real' | 'demo';
}

/**
 * Commitment data for provably fair verification.
 */
export interface CommitmentData {
  commitmentHash: string;
  hashAlg: string;
  publishedAt: string;
}

/**
 * Seed data for verification.
 */
export interface SeedData {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Mixing/derivation data.
 */
export interface MixingData {
  kdf: string;
  salt: string;
  info: string;
  combinedSeedHex: string;
}

/**
 * Payout information.
 */
export interface PayoutInfo {
  bet: number;
  win: number;
  currency: string;
}

/**
 * Spin result data for verification bundle.
 */
export interface ResultData {
  reelStops: number[];
  symbols: string[];
  payout: PayoutInfo;
}

/**
 * Server proof data (optional chain info).
 */
export interface ServerProof {
  commitChainPrev?: string;
  commitChainThis?: string;
}

/**
 * Initial conditions for verification (array format).
 */
export interface FrontendInitialConditions {
  masses: number[];
  positions: number[][];
  velocities: number[][];
}

/**
 * Outcome data (simplified format).
 */
export interface OutcomeData {
  reels: number[];
  symbols: string[];
  winAmount: number;
}

/**
 * Proof data (simplified format).
 */
export interface ProofData {
  signature: string;
  publicKey: string;
}

/**
 * Complete verification bundle (N6 format).
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
 * Simplified verification bundle.
 */
export interface SimplifiedVerificationBundle {
  spinId: string;
  timestamp: string;
  initialConditions?: FrontendInitialConditions;
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
 * Complete verification output.
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
 * File upload state for verification UI.
 */
export interface FileUploadState {
  isDragging: boolean;
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
}

/**
 * Verification page state.
 */
export interface VerificationState {
  bundle: VerificationBundle | SimplifiedVerificationBundle | null;
  result: VerifyOutput | null;
  isVerifying: boolean;
  error: string | null;
}
