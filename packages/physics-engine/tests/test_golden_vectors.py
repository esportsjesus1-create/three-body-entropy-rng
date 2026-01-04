"""Tests for golden vectors."""

import pytest
from physics_engine.golden_vectors import (
    GOLDEN_VECTORS,
    verify_golden_vectors,
    generate_golden_vector,
)
from physics_engine.simulation import SimulationParams


class TestGoldenVectors:
    """Tests for golden vector verification."""
    
    def test_golden_vectors_exist(self):
        """Test golden vectors are defined."""
        assert len(GOLDEN_VECTORS) > 0
    
    def test_golden_vectors_have_required_fields(self):
        """Test golden vectors have required fields."""
        for vector in GOLDEN_VECTORS:
            assert "name" in vector
            assert "seed" in vector
            assert "params" in vector
            assert "deterministic" in vector
    
    def test_verify_golden_vectors_passes(self):
        """Test all golden vectors pass verification."""
        result = verify_golden_vectors()
        
        assert result["passed"] is True
        assert len(result["failures"]) == 0
        assert result["passed_count"] == result["total"]
    
    def test_verify_returns_results(self):
        """Test verify returns detailed results."""
        result = verify_golden_vectors()
        
        assert "passed" in result
        assert "results" in result
        assert "failures" in result
        assert "total" in result
        assert "passed_count" in result
    
    def test_each_vector_deterministic(self):
        """Test each vector is deterministic."""
        result = verify_golden_vectors()
        
        for r in result["results"]:
            assert r["entropy_match"] is True
            assert r["theta_match"] is True


class TestGenerateGoldenVector:
    """Tests for generate_golden_vector function."""
    
    def test_returns_dict(self):
        """Test returns dictionary."""
        vector = generate_golden_vector("test", "abc123")
        assert isinstance(vector, dict)
    
    def test_has_required_fields(self):
        """Test has required fields."""
        vector = generate_golden_vector("test", "abc123")
        
        assert "name" in vector
        assert "seed" in vector
        assert "params" in vector
        assert "expected_entropy_hex" in vector
        assert "expected_theta" in vector
        assert "deterministic" in vector
    
    def test_name_preserved(self):
        """Test name is preserved."""
        vector = generate_golden_vector("my_test", "abc123")
        assert vector["name"] == "my_test"
    
    def test_seed_preserved(self):
        """Test seed is preserved."""
        vector = generate_golden_vector("test", "abc123def456")
        assert vector["seed"] == "abc123def456"
    
    def test_custom_params(self):
        """Test with custom params."""
        params = SimulationParams(steps=500)
        vector = generate_golden_vector("test", "abc123", params)
        assert vector["params"]["steps"] == 500
    
    def test_deterministic(self):
        """Test generated vector is deterministic."""
        v1 = generate_golden_vector("test", "abc123")
        v2 = generate_golden_vector("test", "abc123")
        
        assert v1["expected_entropy_hex"] == v2["expected_entropy_hex"]
        assert v1["expected_theta"] == v2["expected_theta"]
