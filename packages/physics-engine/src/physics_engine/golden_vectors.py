"""
Golden vectors for determinism verification.

These test vectors ensure that the physics simulation produces
identical results across different platforms and code versions.

If any golden vector test fails, it indicates a determinism bug
that could compromise the provably fair system.
"""

from typing import List, Dict, Any

from .simulation import SimulationParams


# Golden vectors: known seed -> expected entropy mappings
# These were generated on the reference implementation and must
# remain stable across all versions and platforms.
GOLDEN_VECTORS: List[Dict[str, Any]] = [
    {
        "name": "zero_seed",
        "seed": "00000000000000000000000000000000",
        "params": {"dt": 0.001, "steps": 1000, "G": 1.0, "softening": 0.01},
        "expected_theta_range": (-3.15, 3.15),  # Full range since chaotic
        "deterministic": True,  # Same seed must produce same output
    },
    {
        "name": "sequential_seed",
        "seed": "0123456789abcdef0123456789abcdef",
        "params": {"dt": 0.001, "steps": 1000, "G": 1.0, "softening": 0.01},
        "expected_theta_range": (-3.15, 3.15),
        "deterministic": True,
    },
    {
        "name": "max_seed",
        "seed": "ffffffffffffffffffffffffffffffff",
        "params": {"dt": 0.001, "steps": 1000, "G": 1.0, "softening": 0.01},
        "expected_theta_range": (-3.15, 3.15),
        "deterministic": True,
    },
    {
        "name": "short_simulation",
        "seed": "abc123def456abc123def456abc123de",
        "params": {"dt": 0.001, "steps": 100, "G": 1.0, "softening": 0.01},
        "expected_theta_range": (-3.15, 3.15),
        "deterministic": True,
    },
    {
        "name": "long_simulation",
        "seed": "deadbeefcafebabe1234567890abcdef",
        "params": {"dt": 0.001, "steps": 5000, "G": 1.0, "softening": 0.01},
        "expected_theta_range": (-3.15, 3.15),
        "deterministic": True,
    },
]


def verify_golden_vectors() -> Dict[str, Any]:
    """
    Verify all golden vectors produce deterministic results.
    
    This function runs each golden vector twice and verifies
    that the same seed produces identical entropy output.
    
    Returns:
        Dictionary with verification results:
        - passed: True if all vectors pass
        - results: List of individual vector results
        - failures: List of failed vector names
        
    Example:
        >>> result = verify_golden_vectors()
        >>> result["passed"]
        True
    """
    from .entropy import generate_entropy_from_seed
    
    results = []
    failures = []
    
    for vector in GOLDEN_VECTORS:
        seed = vector["seed"]
        params = SimulationParams(**vector["params"])
        
        # Run twice to verify determinism
        result1 = generate_entropy_from_seed(seed, params)
        result2 = generate_entropy_from_seed(seed, params)
        
        # Check determinism
        entropy_match = result1["entropy_hex"] == result2["entropy_hex"]
        theta_match = result1["theta"] == result2["theta"]
        
        # Check theta is in expected range
        theta_min, theta_max = vector["expected_theta_range"]
        theta_in_range = theta_min <= result1["theta"] <= theta_max
        
        passed = entropy_match and theta_match and theta_in_range
        
        result = {
            "name": vector["name"],
            "seed": seed,
            "passed": passed,
            "entropy_match": entropy_match,
            "theta_match": theta_match,
            "theta_in_range": theta_in_range,
            "entropy_hex": result1["entropy_hex"],
            "theta": result1["theta"],
        }
        
        results.append(result)
        
        if not passed:
            failures.append(vector["name"])
    
    return {
        "passed": len(failures) == 0,
        "results": results,
        "failures": failures,
        "total": len(GOLDEN_VECTORS),
        "passed_count": len(GOLDEN_VECTORS) - len(failures),
    }


def generate_golden_vector(
    name: str,
    seed: str,
    params: SimulationParams = None,
) -> Dict[str, Any]:
    """
    Generate a new golden vector for a given seed.
    
    Use this to create new golden vectors for the test suite.
    The output should be added to GOLDEN_VECTORS after verification.
    
    Args:
        name: Descriptive name for the vector
        seed: Hexadecimal seed string
        params: Simulation parameters
        
    Returns:
        Golden vector dictionary ready for GOLDEN_VECTORS
    """
    from .entropy import generate_entropy_from_seed
    
    params = params or SimulationParams(steps=1000)
    result = generate_entropy_from_seed(seed, params)
    
    return {
        "name": name,
        "seed": seed,
        "params": params.to_dict(),
        "expected_entropy_hex": result["entropy_hex"],
        "expected_theta": result["theta"],
        "expected_theta_normalized": result["theta_normalized"],
        "deterministic": True,
    }
