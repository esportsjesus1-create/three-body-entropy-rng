# Golden Vector Tests

Cross-platform determinism tests for the Three-Body Entropy RNG physics engine.

## Purpose

These tests ensure **bit-for-bit identical** physics outputs across all supported platforms:

- Linux amd64
- Linux arm64  
- macOS arm64

The three-body gravitational simulation must produce exactly the same results regardless of the platform it runs on. This is critical for provably fair gaming systems where verification must be reproducible.

## How It Works

Golden vectors are pre-computed reference outputs from the physics simulation. Each test scenario runs the same simulation with identical initial conditions and compares the final state against the stored reference output.

The comparison is **exact** - not approximate. Any difference, no matter how small, indicates a determinism issue that must be investigated.

## Test Scenarios

The test suite includes 5 scenarios covering different aspects of the physics simulation:

1. **Figure-8 Orbit Configuration** - Classic periodic orbit with equal masses (1.0s duration)
2. **Lagrange Equilateral Triangle** - Stable triangular configuration (2.0s duration)
3. **Custom Asymmetric Configuration** - Unequal masses in triangular arrangement (0.5s duration)
4. **High-Precision Short Duration** - Very small time step for precision testing (0.1s duration)
5. **Long Duration Chaotic Evolution** - Extended simulation for numerical stability (5.0s duration)

## Running the Tests

```bash
# From the repository root
npm run test:golden-vectors

# Or directly with vitest
cd tests/golden-vectors
npx vitest run
```

## Regenerating Reference Outputs

If the physics engine is intentionally modified, the reference outputs must be regenerated:

```bash
cd tests/golden-vectors
npx ts-node -O '{"module":"CommonJS"}' generate-reference-outputs.ts
```

**Warning**: Only regenerate reference outputs when physics changes are intentional. Regenerating masks potential determinism issues.

## CI Integration

The golden vector tests run automatically on all pull requests via GitHub Actions. The workflow tests on all three target platforms and fails if any platform produces different results.

See `.github/workflows/golden-vectors.yml` for the CI configuration.

## Troubleshooting

### Tests fail on one platform but pass on others

This indicates a cross-platform determinism issue. Common causes:

- Floating-point operation ordering differences
- Platform-specific math library implementations
- Compiler optimizations affecting floating-point precision

### Tests fail after physics engine changes

If changes to the physics engine are intentional:

1. Review the changes to ensure they're correct
2. Regenerate reference outputs on a single platform
3. Verify all platforms produce identical results with new outputs

### Energy drift warnings

Small energy drift (< 0.01%) is expected due to numerical integration. Larger drift indicates potential issues with the integrator or time step selection.

## File Structure

```
tests/golden-vectors/
├── README.md                           # This file
├── golden-vectors.test.ts              # Test suite
├── generate-reference-outputs.ts       # Reference output generator
├── fixtures/
│   └── reference-outputs.json          # Golden vector data
├── package.json                        # Dependencies
└── tsconfig.json                       # TypeScript configuration
```

## Related Documentation

- [Determinism Testing Guide](/docs/testing/determinism.md)
- [Physics Engine Documentation](/modules/physics-engine/README.md)
- [Shared Types Reference](/modules/shared-types/README.md)
