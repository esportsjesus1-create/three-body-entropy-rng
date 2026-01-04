"""Tests for entropy extraction."""

import math
import pytest
from physics_engine.body import Body
from physics_engine.simulation import ThreeBodySimulator, SimulationParams
from physics_engine.entropy import (
    extract_entropy,
    compute_theta,
    normalize_theta,
    generate_entropy_from_seed,
)


class TestExtractEntropy:
    """Tests for extract_entropy function."""
    
    def test_returns_32_bytes(self):
        """Test entropy is 32 bytes."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        entropy = extract_entropy(bodies)
        assert len(entropy) == 32
    
    def test_deterministic(self):
        """Test entropy extraction is deterministic."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        e1 = extract_entropy(bodies)
        e2 = extract_entropy(bodies)
        assert e1 == e2
    
    def test_different_bodies_different_entropy(self):
        """Test different bodies produce different entropy."""
        bodies1 = ThreeBodySimulator.figure_8_initial_conditions()
        bodies2 = [
            Body(x=1.0, y=0.0, vx=0.0, vy=0.5, mass=1.0),
            Body(x=-1.0, y=0.0, vx=0.0, vy=-0.5, mass=1.0),
            Body(x=0.0, y=0.0, vx=0.0, vy=0.0, mass=1.0),
        ]
        
        e1 = extract_entropy(bodies1)
        e2 = extract_entropy(bodies2)
        assert e1 != e2


class TestComputeTheta:
    """Tests for compute_theta function."""
    
    def test_returns_float(self):
        """Test theta is a float."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        theta = compute_theta(bodies)
        assert isinstance(theta, float)
    
    def test_in_range(self):
        """Test theta is in [-pi, pi]."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        theta = compute_theta(bodies)
        assert -math.pi <= theta <= math.pi
    
    def test_wrong_body_count(self):
        """Test raises error for wrong body count."""
        with pytest.raises(ValueError):
            compute_theta([Body(0, 0, 0, 0)])
    
    def test_deterministic(self):
        """Test theta computation is deterministic."""
        bodies = ThreeBodySimulator.figure_8_initial_conditions()
        t1 = compute_theta(bodies)
        t2 = compute_theta(bodies)
        assert t1 == t2


class TestNormalizeTheta:
    """Tests for normalize_theta function."""
    
    def test_zero(self):
        """Test normalization of zero."""
        result = normalize_theta(0)
        assert 0 <= result < 1
    
    def test_pi(self):
        """Test normalization of pi."""
        result = normalize_theta(math.pi)
        assert 0 <= result < 1
    
    def test_negative_pi(self):
        """Test normalization of -pi."""
        result = normalize_theta(-math.pi)
        assert 0 <= result < 1
    
    def test_range(self):
        """Test output is in [0, 1)."""
        for theta in [-math.pi, -1, 0, 1, math.pi]:
            result = normalize_theta(theta)
            assert 0 <= result < 1


class TestGenerateEntropyFromSeed:
    """Tests for generate_entropy_from_seed function."""
    
    def test_returns_dict(self):
        """Test returns dictionary with expected keys."""
        result = generate_entropy_from_seed("abc123")
        
        assert "entropy_hex" in result
        assert "entropy_bytes" in result
        assert "theta" in result
        assert "theta_normalized" in result
        assert "final_state" in result
        assert "initial_state" in result
        assert "params" in result
        assert "seed" in result
    
    def test_entropy_hex_length(self):
        """Test entropy_hex is 64 characters."""
        result = generate_entropy_from_seed("abc123")
        assert len(result["entropy_hex"]) == 64
    
    def test_entropy_bytes_length(self):
        """Test entropy_bytes is 32 bytes."""
        result = generate_entropy_from_seed("abc123")
        assert len(result["entropy_bytes"]) == 32
    
    def test_theta_normalized_range(self):
        """Test theta_normalized is in [0, 1)."""
        result = generate_entropy_from_seed("abc123")
        assert 0 <= result["theta_normalized"] < 1
    
    def test_final_state_has_three_bodies(self):
        """Test final_state has three bodies."""
        result = generate_entropy_from_seed("abc123")
        assert len(result["final_state"]) == 3
    
    def test_deterministic(self):
        """Test same seed produces same entropy."""
        seed = "abc123def456"
        r1 = generate_entropy_from_seed(seed)
        r2 = generate_entropy_from_seed(seed)
        
        assert r1["entropy_hex"] == r2["entropy_hex"]
        assert r1["theta"] == r2["theta"]
    
    def test_different_seeds_different_entropy(self):
        """Test different seeds produce different entropy."""
        r1 = generate_entropy_from_seed("aabbccdd11223344")
        r2 = generate_entropy_from_seed("11223344aabbccdd")
        
        assert r1["entropy_hex"] != r2["entropy_hex"]
    
    def test_custom_params(self):
        """Test with custom simulation parameters."""
        params = SimulationParams(steps=100)
        result = generate_entropy_from_seed("abc123", params)
        
        assert result["params"]["steps"] == 100
    
    def test_seed_preserved(self):
        """Test seed is preserved in result."""
        seed = "abc123def456"
        result = generate_entropy_from_seed(seed)
        assert result["seed"] == seed


class TestDeterminismGoldenVectors:
    """Golden vector tests for determinism verification."""
    
    def test_zero_seed_deterministic(self):
        """Test zero seed produces consistent results."""
        seed = "00000000000000000000000000000000"
        params = SimulationParams(steps=100)
        
        r1 = generate_entropy_from_seed(seed, params)
        r2 = generate_entropy_from_seed(seed, params)
        
        assert r1["entropy_hex"] == r2["entropy_hex"]
    
    def test_max_seed_deterministic(self):
        """Test max seed produces consistent results."""
        seed = "ffffffffffffffffffffffffffffffff"
        params = SimulationParams(steps=100)
        
        r1 = generate_entropy_from_seed(seed, params)
        r2 = generate_entropy_from_seed(seed, params)
        
        assert r1["entropy_hex"] == r2["entropy_hex"]
    
    def test_sequential_seed_deterministic(self):
        """Test sequential seed produces consistent results."""
        seed = "0123456789abcdef0123456789abcdef"
        params = SimulationParams(steps=100)
        
        r1 = generate_entropy_from_seed(seed, params)
        r2 = generate_entropy_from_seed(seed, params)
        
        assert r1["entropy_hex"] == r2["entropy_hex"]
