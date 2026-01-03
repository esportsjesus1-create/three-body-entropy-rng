# Integration Contracts

This document defines the **contracts** between modules in the Three-Body Entropy RNG system. A contract specifies the data structures that flow between modules, ensuring consistent integration and preventing type mismatches.

## Purpose

Clear contract documentation serves several purposes:
- **Prevents accidental contract violations** during development
- **Enables parallel development** by defining clear boundaries
- **Simplifies debugging** by documenting expected data shapes
- **Facilitates testing** by providing reference structures

## Contract Overview

| Contract | Interface | Provider (Writer) | Consumer (Reader) |
|----------|-----------|-------------------|-------------------|
| Physics Engine Output | `SystemConfiguration` | physics-engine | entropy-oracle, theta-protection |
| Entropy Oracle Interface | `EntropyResponse` | entropy-oracle | commit-reveal, slot-adapter |
| Commit-Reveal API | `CommitmentResponse`, `ExecuteSpinResponse`, `VerifySpinResponse` | API routes | frontend, client-library |
| Module Directory Structure | N/A (convention) | All modules | All modules |

---

## Contract 1: Physics Engine Output

### Interface Definition

```typescript
interface SystemConfiguration {
  bodies: [Body, Body, Body];
  gravitationalConstant: number;
  softeningParameter: number;
}

interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface SimulationState {
  time: number;
  configuration: SystemConfiguration;
  totalEnergy: number;
  stepCount: number;
}
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bodies` | `[Body, Body, Body]` | Yes | Exactly 3 bodies (tuple) |
| `gravitationalConstant` | `number` | Yes | G constant (default: 1.0) |
| `softeningParameter` | `number` | Yes | Prevents singularities (default: 0.01) |

### Provider (Writer)

**Module:** `modules/physics-engine`

**Entry Point:** `src/simulation.ts`

```typescript
import { runSimulation } from '@three-body-entropy/physics-engine';

const result = runSimulation({
  duration: 10.0,
  timeStep: 0.01,
  initialConditions: { /* ... */ }
});

// result.finalState.configuration is SystemConfiguration
```

### Consumer (Reader)

**Modules:** `modules/entropy-oracle`, `modules/theta-protection`

```typescript
import { extractEntropy } from '@three-body-entropy/entropy-oracle';

// Receives SystemConfiguration from physics-engine
const entropy = extractEntropy(simulationResult.finalState.configuration);
```

### Integration Example

```typescript
// Full integration: physics-engine → entropy-oracle
import { runSimulation } from '@three-body-entropy/physics-engine';
import { extractEntropy } from '@three-body-entropy/entropy-oracle';

async function generateEntropy(seed: string): Promise<EntropyData> {
  // 1. Run physics simulation
  const simulation = runSimulation({
    duration: 10.0,
    timeStep: 0.01,
    seed: seed
  });
  
  // 2. Extract entropy from final state
  // CONTRACT: simulation.finalState.configuration must be SystemConfiguration
  const entropy = extractEntropy(simulation.finalState.configuration);
  
  return entropy;
}
```

---

## Contract 2: Entropy Oracle Interface

### Interface Definition

```typescript
interface EntropyResponse {
  requestId: string;
  commitment: string;
  entropy: RawEntropyResult;
  proof: EntropyProof;
  timestamp: number;
}

interface RawEntropyResult {
  value: number;        // Normalized 0-1
  hex: string;          // 64-char hex string
  sourceHash: string;   // SHA-256 of initial conditions
  simulationId: string;
  timestamp: number;
  metadata: SimulationMetadata;
}

interface EntropyProof {
  proofId: string;
  simulationHash: string;
  entropyHash: string;
  signature: string;
  chainIndex?: number;
}
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entropy.value` | `number` | Yes | Normalized entropy value (0-1) |
| `entropy.hex` | `string` | Yes | 64-character hex string |
| `entropy.sourceHash` | `string` | Yes | SHA-256 hash of initial conditions |
| `commitment` | `string` | Yes | SHA-256 commitment hash |
| `proof.signature` | `string` | Yes | Cryptographic signature |

### Provider (Writer)

**Module:** `modules/entropy-oracle`

**Entry Point:** `src/oracle.ts`

```typescript
import { EntropyOracle } from '@three-body-entropy/entropy-oracle';

const oracle = new EntropyOracle(config);
const response = await oracle.generateEntropy({
  sessionId: 'session-123',
  clientSeed: 'user-provided-seed',
  nonce: 1
});

// response is EntropyResponse
```

### Consumer (Reader)

**Modules:** `modules/commit-reveal`, `modules/slot-machine-adapter`

```typescript
import { CommitRevealService } from '@three-body-entropy/commit-reveal';

// Receives EntropyResponse from entropy-oracle
const spinResult = await commitReveal.executeWithEntropy(entropyResponse);
```

### Integration Example

```typescript
// Full integration: entropy-oracle → slot-machine-adapter
import { EntropyOracle } from '@three-body-entropy/entropy-oracle';
import { SlotMachineAdapter } from '@three-body-entropy/slot-machine-adapter';

async function executeSpin(sessionId: string, clientSeed: string): Promise<SpinResult> {
  const oracle = new EntropyOracle();
  const adapter = new SlotMachineAdapter({ reelCount: 5, symbolsPerReel: 20 });
  
  // 1. Generate entropy
  const entropyResponse = await oracle.generateEntropy({
    sessionId,
    clientSeed,
    nonce: 1
  });
  
  // 2. Map entropy to reel positions
  // CONTRACT: entropyResponse.entropy.hex must be 64-char hex string
  const reelPositions = adapter.mapEntropyToReels(entropyResponse.entropy.hex);
  
  return {
    reelPositions,
    entropyHex: entropyResponse.entropy.hex,
    proof: entropyResponse.proof
  };
}
```

---

## Contract 3: Commit-Reveal API Responses

### Interface Definitions

```typescript
// POST /api/slots/init
interface CommitmentResponse {
  spinId: string;
  commitmentHash: string;  // SHA-256(serverSeed)
  timestamp: number;
  expiresAt: number;
}

// POST /api/slots/execute
interface ExecuteSpinResponse {
  spinId: string;
  serverSeed: string;      // REVEALED after client provides seed
  clientSeed: string;
  nonce: number;
  combinedSeed: string;    // HKDF(serverSeed:clientSeed:nonce)
  entropyHex: string;
  reelStops: number[];
  commitmentHash: string;
  timestamp: number;
}

// POST /api/slots/verify
interface VerifySpinResponse {
  valid: boolean;
  checks: {
    commitmentValid: boolean;
    entropyValid: boolean;
    reelsValid: boolean;
  };
  replayedResult?: {
    entropyHex: string;
    reelStops: number[];
  };
  error?: string;
}
```

### Required Fields

**CommitmentResponse:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `spinId` | `string` | Yes | Unique identifier for this spin |
| `commitmentHash` | `string` | Yes | SHA-256 hash of server seed |
| `timestamp` | `number` | Yes | Unix timestamp (ms) |
| `expiresAt` | `number` | Yes | Expiration timestamp (ms) |

**ExecuteSpinResponse:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serverSeed` | `string` | Yes | Revealed server seed |
| `clientSeed` | `string` | Yes | Client-provided seed |
| `combinedSeed` | `string` | Yes | HKDF-derived combined seed |
| `entropyHex` | `string` | Yes | 64-char entropy hex |
| `reelStops` | `number[]` | Yes | Array of reel positions |

### Provider (Writer)

**Module:** `frontend-b2b/app/api/slots/`

**Entry Points:**
- `init/route.ts` → `CommitmentResponse`
- `execute/route.ts` → `ExecuteSpinResponse`
- `verify/route.ts` → `VerifySpinResponse`

### Consumer (Reader)

**Modules:** `frontend-b2b/components/`, `modules/client-library`

```typescript
// Frontend consuming API responses
const initResponse: CommitmentResponse = await fetch('/api/slots/init', {
  method: 'POST'
}).then(r => r.json());

// Display commitment to user BEFORE they provide their seed
console.log('Commitment:', initResponse.commitmentHash);
```

### Integration Example

```typescript
// Full provably fair flow
async function provablyFairSpin(): Promise<void> {
  // Step 1: Get commitment (server locks in their seed)
  const init: CommitmentResponse = await fetch('/api/slots/init', {
    method: 'POST'
  }).then(r => r.json());
  
  // CONTRACT: init.commitmentHash is SHA-256(serverSeed)
  console.log('Server committed:', init.commitmentHash);
  
  // Step 2: User provides their seed
  const clientSeed = generateClientSeed();
  
  // Step 3: Execute spin (server reveals their seed)
  const result: ExecuteSpinResponse = await fetch('/api/slots/execute', {
    method: 'POST',
    body: JSON.stringify({ spinId: init.spinId, clientSeed })
  }).then(r => r.json());
  
  // CONTRACT: SHA-256(result.serverSeed) === init.commitmentHash
  // CONTRACT: result.combinedSeed === HKDF(serverSeed:clientSeed:nonce)
  
  // Step 4: Verify (optional, client-side)
  const verification: VerifySpinResponse = await fetch('/api/slots/verify', {
    method: 'POST',
    body: JSON.stringify({
      serverSeed: result.serverSeed,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
      commitmentHash: init.commitmentHash,
      entropyHex: result.entropyHex,
      reelStops: result.reelStops
    })
  }).then(r => r.json());
  
  // CONTRACT: verification.valid === true if all checks pass
  console.log('Verified:', verification.valid);
}
```

---

## Contract 4: Module Directory Structure

### Convention

All modules in `modules/` follow the GameVerse standard directory structure:

```
modules/{module-name}/
├── src/
│   ├── index.ts          # Public exports
│   ├── types.ts          # Type definitions (or re-exports from shared-types)
│   └── {feature}.ts      # Feature implementations
├── tests/
│   ├── {feature}.test.ts # Unit tests
│   └── integration.test.ts # Integration tests
├── package.json          # Module metadata and dependencies
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Test configuration (if using Jest)
└── README.md             # Module documentation
```

### Required Files

| File | Required | Description |
|------|----------|-------------|
| `src/index.ts` | Yes | Public API exports |
| `src/types.ts` | Yes | Type definitions |
| `package.json` | Yes | Module metadata |
| `tsconfig.json` | Yes | TypeScript config |
| `README.md` | Yes | Documentation |
| `tests/` | Recommended | Test directory |

### Naming Conventions

- **Package names:** `@three-body-entropy/{module-name}`
- **Directory names:** lowercase with hyphens (e.g., `physics-engine`, `entropy-oracle`)
- **File names:** lowercase with hyphens for multi-word (e.g., `slot-machine.ts`)
- **Export names:** PascalCase for classes/interfaces, camelCase for functions

### Import Conventions

```typescript
// Preferred: Import from package name (after adding as dependency)
import { Vector3D, Body } from '@three-body-entropy/shared-types';

// Alternative: Relative import (for modules not yet migrated)
import { Vector3D, Body } from '../../shared-types/src';

// Avoid: Deep imports into module internals
import { something } from '@three-body-entropy/physics-engine/src/internal';
```

### Module Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                         frontend-b2b                             │
│  (Next.js app - can import from any module)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      modules/shared-types                        │
│  (Type definitions - imported by all modules)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  physics-engine │ │  entropy-oracle │ │   hash-chain    │
│  (simulation)   │ │  (orchestrator) │ │  (crypto)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      theta-protection                            │
│  (spin calculation security)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    slot-machine-adapter                          │
│  (game integration)                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Rules:**
1. `shared-types` has NO dependencies on other modules (leaf node)
2. `frontend-b2b` can import from any module
3. Modules should not have circular dependencies
4. Lower-level modules should not import from higher-level modules

---

## Versioning

Contract changes should follow semantic versioning:

- **PATCH:** Bug fixes, documentation updates
- **MINOR:** New optional fields, backwards-compatible additions
- **MAJOR:** Breaking changes to required fields, type changes

When making breaking changes:
1. Document the change in this file
2. Update the shared-types module version
3. Update all consuming modules
4. Add migration notes

---

## Related Documentation

- [Shared Types Module](/modules/shared-types/README.md) - Canonical type definitions
- [API Documentation](/docs/API.md) - Full API reference
- [Architecture](/docs/ARCHITECTURE.md) - System architecture overview
