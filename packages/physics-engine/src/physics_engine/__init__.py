"""
Physics Engine - Three-Body RK4 Simulation for Deterministic Entropy

This module provides deterministic three-body physics simulation using
4th-order Runge-Kutta integration for entropy generation.

Key Features:
- Deterministic RK4 integration (same seed = same output)
- Figure-8 orbit initial conditions for bounded chaos
- Entropy extraction from chaotic final state
- Cross-platform reproducibility via quantized serialization
"""

from .body import Body
from .simulation import ThreeBodySimulator, SimulationParams
from .entropy import generate_entropy_from_seed, extract_entropy
from .golden_vectors import GOLDEN_VECTORS, verify_golden_vectors

__all__ = [
    "Body",
    "ThreeBodySimulator",
    "SimulationParams",
    "generate_entropy_from_seed",
    "extract_entropy",
    "GOLDEN_VECTORS",
    "verify_golden_vectors",
]

__version__ = "1.0.0"
