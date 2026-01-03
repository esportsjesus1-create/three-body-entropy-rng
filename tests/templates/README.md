# Integration Test Templates

This directory contains templates and patterns for writing integration tests in the Three-Body Entropy RNG system.

## Why Integration Tests Matter

Integration tests verify that modules work correctly together, catching issues that unit tests miss:

1. **Type Mismatches**: Ensures data structures passed between modules are compatible
2. **Contract Violations**: Catches when a module's output doesn't meet the consumer's expectations
3. **Pipeline Integrity**: Verifies the full data flow from physics simulation to game outcome
4. **Determinism**: Confirms that the same inputs produce identical outputs across the entire pipeline

## Using Shared Types

**CRITICAL**: Always import types from `@three-body-entropy/shared-types`, NOT from local module definitions.

```typescript
// CORRECT: Import from shared-types
import {
  SystemConfiguration,
  Vector3D,
  ThreeBodyState,
  EntropyData,
} from '@three-body-entropy/shared-types';

// INCORRECT: Don't import from local module types
// import { SystemConfiguration } from '../modules/physics-engine/src/types';
```

This ensures type consistency across the entire codebase and prevents subtle bugs from type drift.

## Template Structure

The `integration-test-template.ts` file demonstrates the standard pattern:

```
1. IMPORTS
   - Import test framework (vitest)
   - Import types from shared-types
   - Import module functions to test

2. MOCK IMPLEMENTATIONS (for template only)
   - Replace with actual module imports in real tests

3. INTEGRATION TESTS
   - Test data flow between modules
   - Verify type compatibility
   - Check determinism requirements
   - Validate contract compliance

4. TYPE VALIDATION TESTS
   - Ensure shared types are correctly structured
   - Catch type definition errors early
```

## Writing New Integration Tests

Follow this pattern when creating new integration tests:

### Step 1: Identify the Integration Point

Determine which modules are being integrated:
- Physics Engine → Entropy Oracle
- Entropy Oracle → Commit-Reveal Service
- Commit-Reveal Service → API Endpoints
- API Endpoints → Frontend Components

### Step 2: Import from Shared Types

```typescript
import { describe, it, expect } from 'vitest';
import {
  SystemConfiguration,
  EntropyData,
  CommitmentResponse,
} from '@three-body-entropy/shared-types';
```

### Step 3: Write Integration Tests

```typescript
describe('Integration: ModuleA → ModuleB', () => {
  it('should pass data correctly between modules', () => {
    // 1. Call ModuleA
    const outputA: TypeFromSharedTypes = moduleAFunction(input);
    
    // 2. Pass output to ModuleB
    const outputB: AnotherType = moduleBFunction(outputA);
    
    // 3. Verify the integration worked
    expect(outputB).toBeDefined();
    expect(outputB.requiredField).toBe(expectedValue);
  });

  it('should be deterministic', () => {
    // Run twice with same inputs
    const result1 = fullPipeline(input);
    const result2 = fullPipeline(input);
    
    // Results must be identical
    expect(result1).toEqual(result2);
  });
});
```

### Step 4: Test Edge Cases

```typescript
it('should handle edge cases', () => {
  // Test with boundary values
  // Test with minimal valid input
  // Test with maximum valid input
});
```

## Running Integration Tests

```bash
# Run all tests including integration tests
npm test

# Run only integration tests
npm test -- --grep "Integration:"

# Run with verbose output
npm test -- --reporter=verbose
```

## Integration Contracts Reference

See `/docs/INTEGRATION_CONTRACTS.md` for detailed contract definitions including:
- Physics Engine Output Contract
- Entropy Oracle Interface Contract
- Commit-Reveal API Response Contracts
- Module Directory Structure Contract

## Best Practices

1. **Test Real Modules**: Replace mock implementations with actual module imports
2. **Use Fixtures**: Store test data in `/tests/fixtures/` for reusability
3. **Test Determinism**: Always verify same inputs produce same outputs
4. **Check Energy Conservation**: Physics tests should verify energy drift is minimal
5. **Verify Timestamps**: Ensure timestamps are consistent across the pipeline
6. **Test Error Paths**: Integration tests should cover error handling too

## File Organization

```
/tests/
  /templates/
    integration-test-template.ts  # This template
    README.md                     # This file
  /fixtures/
    golden-vectors.json           # Reference test data
    test-states.json              # Sample physics states
  /integration/
    physics-entropy.test.ts       # Physics → Entropy tests
    entropy-commit.test.ts        # Entropy → Commit-Reveal tests
    api-frontend.test.ts          # API → Frontend tests
  /unit/
    # Unit tests for individual modules
```

## Troubleshooting

### "Cannot find module '@three-body-entropy/shared-types'"

The shared-types module needs to be linked. Add to your module's package.json:

```json
{
  "dependencies": {
    "@three-body-entropy/shared-types": "file:../shared-types"
  }
}
```

Then run `npm install` in your module directory.

### "Type 'X' is not assignable to type 'Y'"

This usually means the shared-types definitions have been updated. Check:
1. Is your shared-types dependency up to date?
2. Are you using the correct type name? (Some types were renamed to avoid conflicts)
3. See the type naming conventions in `/modules/shared-types/README.md`

### Tests Pass Locally But Fail in CI

Check:
1. Are all dependencies installed in CI?
2. Is the shared-types module built before running tests?
3. Are there any platform-specific issues (floating-point precision)?
