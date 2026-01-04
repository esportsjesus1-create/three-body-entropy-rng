"""
Entropy extraction from three-body simulation.

Provides functions to extract deterministic entropy from the
chaotic final state of a three-body simulation.
"""

import hashlib
import math
from typing import List, Dict, Any

from .body import Body
from .simulation import ThreeBodySimulator, SimulationParams


def extract_entropy(bodies: List[Body], precision: int = 10) -> bytes:
    """
    Extract entropy from final body states.
    
    Uses quantized serialization of body states to ensure
    cross-platform reproducibility, then hashes with SHA-256.
    
    Args:
        bodies: Final body states from simulation
        precision: Decimal precision for quantization
        
    Returns:
        32-byte entropy value
    """
    # Serialize all bodies with fixed precision
    serialized = b""
    for body in bodies:
        serialized += body.serialize(precision)
    
    # Hash to produce entropy
    return hashlib.sha256(serialized).digest()


def compute_theta(bodies: List[Body]) -> float:
    """
    Compute characteristic angle from body configuration.
    
    This angle captures the geometric configuration of the
    three bodies and is highly sensitive to initial conditions.
    
    Args:
        bodies: List of three bodies
        
    Returns:
        Angle in radians
    """
    if len(bodies) != 3:
        raise ValueError(f"Expected 3 bodies, got {len(bodies)}")
    
    # Compute centroid
    cx = sum(b.x for b in bodies) / 3
    cy = sum(b.y for b in bodies) / 3
    
    # Compute angle of first body relative to centroid
    dx = bodies[0].x - cx
    dy = bodies[0].y - cy
    
    return math.atan2(dy, dx)


def normalize_theta(theta: float) -> float:
    """
    Normalize theta to [0, 1) range.
    
    Args:
        theta: Angle in radians
        
    Returns:
        Normalized value in [0, 1)
    """
    # Map [-pi, pi] to [0, 1)
    result = (theta + math.pi) / (2 * math.pi)
    # Handle edge case where theta == pi maps to exactly 1.0
    if result >= 1.0:
        result = result - 1.0
    return result


def generate_entropy_from_seed(
    seed_hex: str,
    params: SimulationParams = None,
) -> Dict[str, Any]:
    """
    Generate entropy from a seed using three-body physics simulation.
    
    This is the main entry point for entropy generation. It:
    1. Creates seeded initial conditions from the seed
    2. Runs RK4 simulation
    3. Extracts entropy from final state
    
    Args:
        seed_hex: Hexadecimal seed string
        params: Simulation parameters (uses defaults if None)
        
    Returns:
        Dictionary containing:
        - entropy_hex: 64-character hex string of entropy
        - entropy_bytes: Raw 32-byte entropy
        - theta: Characteristic angle
        - theta_normalized: Normalized angle [0, 1)
        - final_state: List of final body states as dicts
        - initial_state: List of initial body states as dicts
        - params: Simulation parameters used
        - seed: Input seed
        
    Example:
        >>> result = generate_entropy_from_seed("abc123def456")
        >>> len(result["entropy_hex"])
        64
        >>> 0 <= result["theta_normalized"] < 1
        True
    """
    params = params or SimulationParams()
    
    # Create seeded initial conditions
    initial_bodies = ThreeBodySimulator.create_seeded_initial_conditions(seed_hex)
    
    # Run simulation
    simulator = ThreeBodySimulator(params)
    final_bodies = simulator.simulate(initial_bodies)
    
    # Extract entropy
    entropy_bytes = extract_entropy(final_bodies)
    
    # Compute characteristic angle
    theta = compute_theta(final_bodies)
    theta_normalized = normalize_theta(theta)
    
    return {
        "entropy_hex": entropy_bytes.hex(),
        "entropy_bytes": entropy_bytes,
        "theta": theta,
        "theta_normalized": theta_normalized,
        "final_state": [b.to_dict() for b in final_bodies],
        "initial_state": [b.to_dict() for b in initial_bodies],
        "params": params.to_dict(),
        "seed": seed_hex,
    }
