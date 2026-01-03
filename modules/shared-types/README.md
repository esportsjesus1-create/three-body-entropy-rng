# Shared Types Module

Single source of truth for ALL TypeScript interfaces across the Three-Body Entropy RNG system.

## Purpose

This module consolidates types from all core modules to prevent duplication and ensure consistency across the codebase. All modules should import types from this package rather than defining their own.

## Organization

The types are organized into the following sections:

1. **Physics Engine Types** - Core simulation data structures (`Vector3D`, `Body`, `SystemConfiguration`, etc.)
2. **Entropy Oracle Types** - Entropy generation and validation (`RawEntropyResult`, `EntropyResponse`, etc.)
3. **Hash Chain Types** - Cryptographic verification (`ServerCommitment`, `HashChain`, `HKDFOptions`, etc.)
4. **Theta Protection Types** - Spin calculation security (`ThetaProof`, `ThetaSpinResult`, etc.)
5. **Session Types** - Game session management (`Session`, `SessionState`, `SessionEvent`, etc.)
6. **Commit-Reveal Types** - API response contracts (`CommitmentResponse`, `ExecuteSpinResponse`, etc.)
7. **Verification Types** - Fairness verification (`VerificationResult`, `VerificationCheck`, etc.)
8. **Slot Machine Types** - Game-specific types (`ReelConfiguration`, `SpinRecord`, etc.)
9. **Frontend Verification Types** - B2B portal types (`VerificationBundle`, `VerifyOutput`, etc.)

## Usage

### In Modules (Recommended: Package Dependency)

Add shared-types as a dependency in your module's `package.json`:

```json
{
  "dependencies": {
    "@three-body-entropy/shared-types": "file:../shared-types"
  }
}
```

Then run `npm install` and import:

```typescript
import { 
  Vector3D, 
  Body, 
  SystemConfiguration,
  SessionState,
  VerificationResult 
} from '@three-body-entropy/shared-types';
```

### In Frontend (Next.js)

For the frontend-b2b project, add the dependency:

```json
{
  "dependencies": {
    "@three-body-entropy/shared-types": "file:../modules/shared-types"
  }
}
```

Then import:

```typescript
import { 
  CommitmentResponse, 
  ExecuteSpinResponse,
  VerificationBundle 
} from '@three-body-entropy/shared-types';
```

### Direct Source Import (Alternative)

If you need to import directly from source (not recommended for production):

```typescript
// Only works if your tsconfig allows imports outside rootDir
import type { Vector3D } from '../../shared-types/src';
```

## Type Naming Conventions

To avoid conflicts between similar types from different domains, the following naming conventions are used:

| Domain | Prefix | Example |
|--------|--------|---------|
| Physics Engine | `Physics*` | `PhysicsInitialConditions`, `PhysicsEntropyResult` |
| Entropy Oracle | `Oracle*` | `OracleInitialConditions`, `OracleSimulationParams` |
| Theta Protection | `Theta*` | `ThetaProof`, `ThetaSpinResult`, `ThetaValidationResult` |
| Hash Chain | `HashChain*` | `HashChainVerificationResult` |
| Slot Machine | `Slot*` | `SlotSpinResult`, `SlotSymbol`, `SlotHashChainData` |
| Frontend | `Frontend*` | `FrontendInitialConditions` |

## Migration Guide

When migrating existing code to use shared-types:

1. Replace local type imports with shared-types imports
2. Update type names if they were renamed (see naming conventions above)
3. Remove duplicate type definitions from module-specific types.ts files
4. Keep module-specific types.ts as thin re-export layers if needed for backwards compatibility

## Contract Guarantees

Types in this module represent **contracts** between modules. Changes to these types should be:

1. **Backwards compatible** when possible
2. **Versioned** if breaking changes are necessary
3. **Documented** in the changelog
4. **Tested** via integration tests

## Building

```bash
npm install
npm run build
```

This generates the `dist/` folder with compiled JavaScript and type declarations.
