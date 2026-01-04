# Physics Engine

Three-body RK4 physics simulation for deterministic entropy generation.

## Features

- **RK4 Integration**: 4th-order Runge-Kutta numerical integration
- **Deterministic Simulation**: Same seed always produces same output
- **Figure-8 Orbit**: Stable initial conditions for bounded chaos
- **Entropy Extraction**: SHA-256 hash of quantized final state
- **Golden Vectors**: Test vectors for cross-platform determinism verification
- **CLI Tool**: Standalone command-line interface

## Installation

```bash
cd packages/physics-engine
poetry install
```

## Quick Start

### Python API

```python
from physics_engine import (
    ThreeBodySimulator,
    SimulationParams,
    generate_entropy_from_seed,
    verify_golden_vectors,
)

# Generate entropy from a seed
result = generate_entropy_from_seed("abc123def456")
print(f"Entropy: {result['entropy_hex']}")
print(f"Theta: {result['theta_normalized']}")

# Custom simulation parameters
params = SimulationParams(dt=0.001, steps=5000, G=1.0, softening=0.01)
result = generate_entropy_from_seed("abc123", params)

# Verify determinism with golden vectors
verification = verify_golden_vectors()
print(f"All vectors passed: {verification['passed']}")

# Low-level simulation
simulator = ThreeBodySimulator(params)
initial = ThreeBodySimulator.figure_8_initial_conditions()
final = simulator.simulate(initial)
```

### CLI Tool

```bash
# Run simulation
physics-cli simulate abc123def456
physics-cli simulate abc123 --steps 1000

# Verify golden vectors
physics-cli verify
physics-cli verify --verbose

# Generate new golden vector
physics-cli generate-vector my_test abc123

# List golden vectors
physics-cli list-vectors

# Show figure-8 initial conditions
physics-cli figure8
```

## How It Works

### Three-Body Problem

The three-body problem describes the motion of three gravitationally interacting bodies. Unlike the two-body problem, it has no general closed-form solution and exhibits chaotic behavior - small changes in initial conditions lead to dramatically different outcomes.

### Figure-8 Orbit

We use the figure-8 orbit discovered by Moore (1993) as our base initial conditions. This is a known stable periodic solution that provides bounded chaotic behavior when perturbed.

### RK4 Integration

The 4th-order Runge-Kutta method provides good accuracy and stability:

```
k1 = f(t, y)
k2 = f(t + dt/2, y + dt*k1/2)
k3 = f(t + dt/2, y + dt*k2/2)
k4 = f(t + dt, y + dt*k3)
y_new = y + (dt/6)(k1 + 2*k2 + 2*k3 + k4)
```

### Entropy Extraction

1. Seed creates small perturbations to figure-8 orbit
2. RK4 simulation runs for specified steps
3. Final body states are quantized to fixed precision
4. SHA-256 hash of serialized state produces 32-byte entropy

### Cross-Platform Determinism

To ensure identical results across platforms:
- Body states are quantized to 10 decimal places
- Serialization uses big-endian 64-bit integers
- SHA-256 hash is platform-independent

## API Reference

### SimulationParams

```python
@dataclass
class SimulationParams:
    dt: float = 0.001        # Time step
    steps: int = 10000       # Number of integration steps
    G: float = 1.0           # Gravitational constant
    softening: float = 0.01  # Softening to prevent singularities
```

### ThreeBodySimulator

```python
class ThreeBodySimulator:
    def __init__(self, params: Optional[SimulationParams] = None)
    def simulate(self, initial_bodies: List[Body]) -> List[Body]
    
    @staticmethod
    def figure_8_initial_conditions() -> List[Body]
    
    @staticmethod
    def create_seeded_initial_conditions(seed_hex: str) -> List[Body]
```

### generate_entropy_from_seed

```python
def generate_entropy_from_seed(
    seed_hex: str,
    params: SimulationParams = None,
) -> Dict[str, Any]:
    """
    Returns:
        entropy_hex: 64-character hex string
        entropy_bytes: Raw 32-byte entropy
        theta: Characteristic angle
        theta_normalized: Normalized angle [0, 1)
        final_state: Final body states
        initial_state: Initial body states
        params: Simulation parameters
        seed: Input seed
    """
```

## Golden Vectors

Golden vectors are test fixtures that verify determinism:

```python
from physics_engine import verify_golden_vectors

result = verify_golden_vectors()
if not result["passed"]:
    print(f"Failed vectors: {result['failures']}")
```

If any golden vector fails, it indicates a determinism bug that could compromise the provably fair system.

## Testing

```bash
# Run tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/test_simulation.py -v

# Check coverage report
poetry run pytest --cov-report=html
```

## Security Considerations

- **Determinism**: Critical for provably fair verification
- **Bounded Chaos**: Figure-8 orbit prevents escape to infinity
- **Quantization**: Fixed precision prevents floating-point drift
- **Golden Vectors**: Regression tests catch determinism bugs

## License

MIT
