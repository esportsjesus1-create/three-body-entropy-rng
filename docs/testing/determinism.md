# Cross-Platform Determinism Testing

This document explains the golden vector testing approach used to ensure bit-for-bit identical physics outputs across all supported platforms.

## Overview

The Three-Body Entropy RNG system relies on deterministic physics simulation to generate provably fair random numbers. For the system to be truly provably fair, the same initial conditions must produce exactly the same results on any platform where verification might occur.

## Why Cross-Platform Determinism Matters

In provably fair gaming systems, players and auditors must be able to independently verify game outcomes. This verification might happen on different hardware and operating systems than where the original simulation ran. If the physics simulation produces even slightly different results on different platforms, verification becomes impossible.

Common sources of cross-platform non-determinism include:

- **Floating-point operation ordering**: Different compilers may reorder floating-point operations, leading to different rounding errors
- **Math library implementations**: Functions like `sin()`, `cos()`, and `sqrt()` may have platform-specific implementations
- **SIMD optimizations**: Vectorized operations may produce different results than scalar operations
- **Compiler optimizations**: Aggressive optimizations can affect floating-point precision

## Golden Vector Testing Approach

Golden vectors are pre-computed reference outputs from the physics simulation. The testing approach works as follows:

1. **Generate reference outputs** on a single platform using known initial conditions
2. **Store the exact outputs** including all floating-point values at full precision
3. **Run the same simulation** on all target platforms
4. **Compare results exactly** - any difference, no matter how small, fails the test

This approach catches determinism issues that approximate comparisons would miss.

## Test Scenarios

The golden vector test suite includes 5 carefully chosen scenarios:

### Scenario 1: Figure-8 Orbit
A classic periodic solution to the three-body problem discovered by Moore in 1993. This configuration tests the integrator's ability to maintain periodic behavior.

### Scenario 2: Lagrange Equilateral Triangle
A stable configuration where three equal masses orbit their common center of mass while maintaining an equilateral triangle formation.

### Scenario 3: Asymmetric Configuration
Unequal masses in a triangular arrangement. Tests handling of asymmetric gravitational interactions.

### Scenario 4: High-Precision Short Duration
A very short simulation with a small time step (0.0001s). Tests precision at the limit of numerical accuracy.

### Scenario 5: Long Duration Chaotic Evolution
An extended 5-second simulation that allows chaotic behavior to develop. Tests numerical stability over many integration steps.

## Supported Platforms

The golden vector tests verify determinism across:

- **Linux amd64** (x86_64) - Primary development and server platform
- **Linux arm64** (aarch64) - ARM-based servers and containers
- **macOS arm64** (Apple Silicon) - Developer workstations

## Running the Tests

### Locally

```bash
# From repository root
npm run test:golden-vectors

# Or directly
cd tests/golden-vectors
npx vitest run
```

### In CI

The tests run automatically on all pull requests via GitHub Actions. The workflow is defined in `.github/workflows/golden-vectors.yml`.

## Regenerating Reference Outputs

Reference outputs should only be regenerated when physics engine changes are intentional and verified. To regenerate:

```bash
cd tests/golden-vectors
npx ts-node -O '{"module":"CommonJS"}' generate-reference-outputs.ts
```

After regenerating, verify that all platforms produce identical results before committing the new reference outputs.

## Interpreting Test Failures

### Single Platform Failure

If tests fail on one platform but pass on others, this indicates a cross-platform determinism issue. Investigation steps:

1. Compare the actual output to the expected output
2. Identify which values differ and by how much
3. Trace the difference back to specific operations
4. Consider whether compiler flags or math library differences are involved

### All Platforms Fail

If tests fail on all platforms with the same differences, this likely indicates an intentional physics engine change. Verify the change is correct and regenerate reference outputs.

### Intermittent Failures

Intermittent failures suggest non-determinism within a single platform, which is a serious issue. Possible causes:

- Use of `Math.random()` or other non-deterministic functions
- Race conditions in parallel code
- Uninitialized memory

## Conservation Laws

The test suite also verifies that physics conservation laws are maintained:

- **Energy conservation**: Total energy should remain constant (within numerical precision)
- **Angular momentum conservation**: Total angular momentum should remain constant

Small drift in these quantities is expected due to numerical integration, but large drift indicates problems with the integrator.

## Best Practices

1. **Never regenerate reference outputs to make tests pass** - Investigate the root cause first
2. **Run tests locally before pushing** - Catch issues early
3. **Review physics changes carefully** - Small changes can have large effects on determinism
4. **Document any intentional changes** - When regenerating reference outputs, explain why in the commit message

## Related Resources

- [Golden Vector Tests README](/tests/golden-vectors/README.md)
- [Physics Engine Documentation](/modules/physics-engine/README.md)
- [RK4 Integrator Implementation](/modules/physics-engine/src/integrator.ts)
