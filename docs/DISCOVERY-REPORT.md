# Discovery Report: Three-Body Entropy RNG Repository

**Date**: January 8, 2026  
**Repository**: esportsjesus1-create/three-body-entropy-rng  
**Branch Analyzed**: devin/1767524050-kiro-rng-demo (PR #13)

## Executive Summary

This report documents the actual structure of the three-body-entropy-rng repository and identifies the critical mock data problem where the API server was using SHA256(seed) instead of real three-body physics simulation.

## Repository Structure

### Main Branch (main)
The main branch contains only:
- `frontend-b2b/` - B2B marketing website with fairness verification portal
- `docs/` - Documentation files
- `README.md`, `LICENSE`, `.gitignore`

**Note**: The main branch does NOT contain the backend packages or physics engine.

### PR #13 Branch (devin/1767524050-kiro-rng-demo)
This branch contains the complete system with modular backend packages:

```
three-body-entropy-rng/
├── backend/                    # Backend application
├── docs/                       # Documentation
├── frontend-b2b/               # B2B marketing website
├── packages/                   # Modular backend packages
│   ├── api-server/            # FastAPI server (94% coverage)
│   ├── commitment-protocol/   # Commit/reveal protocol (96% coverage)
│   ├── crypto-service/        # RSA-4096, HKDF (94% coverage)
│   ├── physics-engine/        # RK4 three-body simulation (98% coverage)
│   ├── seed-chain/            # HMAC-SHA256 seed derivation (96% coverage)
│   ├── transparency-log/      # SQLite audit log (98% coverage)
│   └── verification-tools/    # Independent verification (100% coverage)
└── .github/workflows/         # CI configuration
```

## Physics Engine Analysis

### Location
`packages/physics-engine/src/physics_engine/`

### Key Components
1. **simulation.py** - ThreeBodySimulator class with RK4 integration
   - `SimulationParams` dataclass for configuration
   - `_compute_accelerations()` - Gravitational force calculations
   - `_rk4_step()` - 4th-order Runge-Kutta integration
   - `simulate()` - Main simulation loop
   - `figure_8_initial_conditions()` - Stable periodic orbit
   - `create_seeded_initial_conditions()` - Deterministic seeding

2. **entropy.py** - Entropy extraction functions
   - `extract_entropy()` - SHA256 hash of quantized body states
   - `compute_theta()` - Characteristic angle calculation
   - `normalize_theta()` - Normalize to [0, 1) range
   - `generate_entropy_from_seed()` - Main entry point

3. **body.py** - Body dataclass with position, velocity, mass
4. **golden_vectors.py** - Test vectors for cross-platform verification

### Test Coverage
- 73 tests passing
- 98% code coverage
- Determinism verified across multiple test cases

## API Server Analysis

### Location
`packages/api-server/src/api_server/`

### Critical Finding: Mock Data Problem

**BEFORE FIX** (lines 98-116 of app.py):
```python
def generate_entropy(seed: str, num_reels: int) -> tuple:
    """
    Note: For production, use physics-engine module.
    This is a simplified version for standalone testing.
    """
    # Generate deterministic entropy from seed
    entropy = hashlib.sha256(seed.encode('utf-8')).hexdigest()  # <-- MOCK!
    ...
```

The API server was using a simple SHA256 hash of the seed instead of running the actual three-body physics simulation. This means:
- No real chaotic dynamics
- No sensitivity to initial conditions
- Entropy quality significantly reduced
- The "three-body" claim was not being fulfilled

### PR #13 Description Confirmation
The PR description explicitly stated:
> "CRITICAL: api-server uses simplified entropy - Uses SHA256(seed) instead of composing physics-engine. Needs refactoring before production."

## Live Demo Status

**URL**: https://three-body-slot-demo-griqkkb0.devinapps.com

**Status**: Service Temporarily Unavailable (sleeping Devin session)

The live demo was deployed from a previous Devin session and is currently unavailable. Based on code analysis, the demo was using the mock SHA256 entropy, not real physics.

## Security Packages Status

All Phase C security packages are present and tested:

| Package | Tests | Coverage | Status |
|---------|-------|----------|--------|
| seed-chain | 39 | 96% | Working |
| verification-tools | 31 | 100% | Working |
| transparency-log | - | 98% | Working |
| commitment-protocol | - | 96% | Working |
| crypto-service | - | 94% | Working |

## Conclusions

1. **Physics engine exists and works** - The RK4 three-body simulation is fully implemented and tested with 98% coverage.

2. **API server was NOT using physics** - The critical bug was that `generate_entropy()` used SHA256(seed) instead of calling the physics engine.

3. **Fix required** - Connect the physics-engine package to the api-server by:
   - Adding physics-engine as a dependency
   - Modifying `generate_entropy()` to call `generate_entropy_from_seed()`

4. **Security features intact** - All Phase C security packages are working correctly.

## Recommendations

1. Merge the physics engine integration fix
2. Update the live demo deployment
3. Add integration tests that verify physics engine is being used
4. Consider adding a health check endpoint that reports physics engine status
