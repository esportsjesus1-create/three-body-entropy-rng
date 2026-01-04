"""Tests for game outcome verification."""

import pytest
from verification_tools import (
    verify_game_outcome,
    verify_commitment_hash,
    verify_entropy_derivation,
    VerificationResult,
)
from verification_tools.verifier import (
    compute_commitment_hash,
    derive_entropy,
    derive_positions,
)


class TestComputeCommitmentHash:
    """Tests for commitment hash computation."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 hex characters."""
        h = compute_commitment_hash(
            server_seed="test_seed",
            entropy_hex="a" * 64,
            nonce=12345,
            timestamp_ms=1000000,
            positions=[1, 2, 3, 4, 5],
        )
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)
    
    def test_deterministic(self):
        """Test same inputs produce same hash."""
        args = {
            "server_seed": "test_seed",
            "entropy_hex": "a" * 64,
            "nonce": 12345,
            "timestamp_ms": 1000000,
            "positions": [1, 2, 3, 4, 5],
        }
        h1 = compute_commitment_hash(**args)
        h2 = compute_commitment_hash(**args)
        assert h1 == h2
    
    def test_different_inputs_different_hash(self):
        """Test different inputs produce different hash."""
        base = {
            "server_seed": "test_seed",
            "entropy_hex": "a" * 64,
            "nonce": 12345,
            "timestamp_ms": 1000000,
            "positions": [1, 2, 3, 4, 5],
        }
        h1 = compute_commitment_hash(**base)
        
        # Change seed
        h2 = compute_commitment_hash(**{**base, "server_seed": "other_seed"})
        assert h1 != h2
        
        # Change nonce
        h3 = compute_commitment_hash(**{**base, "nonce": 99999})
        assert h1 != h3


class TestDeriveEntropy:
    """Tests for entropy derivation."""
    
    def test_returns_64_chars(self):
        """Test entropy is 64 hex characters."""
        entropy = derive_entropy("test_seed")
        assert len(entropy) == 64
        assert all(c in "0123456789abcdef" for c in entropy)
    
    def test_deterministic(self):
        """Test same seed produces same entropy."""
        e1 = derive_entropy("test_seed")
        e2 = derive_entropy("test_seed")
        assert e1 == e2
    
    def test_different_seeds_different_entropy(self):
        """Test different seeds produce different entropy."""
        e1 = derive_entropy("seed_a")
        e2 = derive_entropy("seed_b")
        assert e1 != e2


class TestDerivePositions:
    """Tests for position derivation."""
    
    def test_correct_count(self):
        """Test correct number of positions."""
        entropy = "a" * 64
        positions = derive_positions(entropy, 5)
        assert len(positions) == 5
    
    def test_within_range(self):
        """Test positions are within symbol range."""
        entropy = "f" * 64
        positions = derive_positions(entropy, 5, symbols_per_reel=10)
        for p in positions:
            assert 0 <= p < 10
    
    def test_deterministic(self):
        """Test same entropy produces same positions."""
        entropy = "abcdef" * 10 + "abcd"
        p1 = derive_positions(entropy, 5)
        p2 = derive_positions(entropy, 5)
        assert p1 == p2


class TestVerifyCommitmentHash:
    """Tests for commitment hash verification."""
    
    def test_valid_commitment(self):
        """Test valid commitment verification."""
        args = {
            "server_seed": "test_seed",
            "entropy_hex": "a" * 64,
            "nonce": 12345,
            "timestamp_ms": 1000000,
            "positions": [1, 2, 3, 4, 5],
        }
        commitment_hash = compute_commitment_hash(**args)
        
        assert verify_commitment_hash(commitment_hash, **args)
    
    def test_invalid_commitment(self):
        """Test invalid commitment verification."""
        args = {
            "server_seed": "test_seed",
            "entropy_hex": "a" * 64,
            "nonce": 12345,
            "timestamp_ms": 1000000,
            "positions": [1, 2, 3, 4, 5],
        }
        
        assert not verify_commitment_hash("wrong_hash", **args)


class TestVerifyEntropyDerivation:
    """Tests for entropy derivation verification."""
    
    def test_valid_derivation(self):
        """Test valid entropy derivation."""
        seed = "test_seed"
        entropy = derive_entropy(seed)
        positions = derive_positions(entropy, 5)
        
        assert verify_entropy_derivation(seed, entropy, positions)
    
    def test_invalid_entropy(self):
        """Test invalid entropy detection."""
        seed = "test_seed"
        positions = derive_positions(derive_entropy(seed), 5)
        
        assert not verify_entropy_derivation(seed, "wrong_entropy", positions)
    
    def test_invalid_positions(self):
        """Test invalid positions detection."""
        seed = "test_seed"
        entropy = derive_entropy(seed)
        
        assert not verify_entropy_derivation(seed, entropy, [9, 9, 9, 9, 9])


class TestVerifyGameOutcome:
    """Tests for complete game outcome verification."""
    
    def test_valid_outcome(self):
        """Test valid game outcome verification."""
        seed = "test_seed"
        entropy = derive_entropy(seed)
        positions = derive_positions(entropy, 5)
        nonce = 12345
        timestamp = 1000000
        
        commitment_hash = compute_commitment_hash(
            server_seed=seed,
            entropy_hex=entropy,
            nonce=nonce,
            timestamp_ms=timestamp,
            positions=positions,
        )
        
        result = verify_game_outcome(
            commitment_hash=commitment_hash,
            server_seed=seed,
            entropy_hex=entropy,
            nonce=nonce,
            timestamp_ms=timestamp,
            positions=positions,
        )
        
        assert result.valid
        assert result.commitment_matches
        assert result.entropy_valid
        assert result.positions_valid
        assert result.error is None
    
    def test_invalid_commitment_hash(self):
        """Test invalid commitment hash detection."""
        seed = "test_seed"
        entropy = derive_entropy(seed)
        positions = derive_positions(entropy, 5)
        
        result = verify_game_outcome(
            commitment_hash="wrong_hash",
            server_seed=seed,
            entropy_hex=entropy,
            nonce=12345,
            timestamp_ms=1000000,
            positions=positions,
        )
        
        assert not result.valid
        assert not result.commitment_matches
        assert result.entropy_valid
        assert result.positions_valid
        assert "Commitment hash does not match" in result.error
    
    def test_invalid_entropy(self):
        """Test invalid entropy detection."""
        seed = "test_seed"
        correct_entropy = derive_entropy(seed)
        positions = derive_positions(correct_entropy, 5)
        wrong_entropy = "b" * 64
        
        commitment_hash = compute_commitment_hash(
            server_seed=seed,
            entropy_hex=wrong_entropy,
            nonce=12345,
            timestamp_ms=1000000,
            positions=positions,
        )
        
        result = verify_game_outcome(
            commitment_hash=commitment_hash,
            server_seed=seed,
            entropy_hex=wrong_entropy,
            nonce=12345,
            timestamp_ms=1000000,
            positions=positions,
        )
        
        assert not result.valid
        assert result.commitment_matches  # Hash matches the wrong data
        assert not result.entropy_valid
        assert "Entropy mismatch" in result.error
    
    def test_result_includes_details(self):
        """Test result includes verification details."""
        seed = "test_seed"
        entropy = derive_entropy(seed)
        positions = derive_positions(entropy, 5)
        nonce = 12345
        timestamp = 1000000
        
        commitment_hash = compute_commitment_hash(
            server_seed=seed,
            entropy_hex=entropy,
            nonce=nonce,
            timestamp_ms=timestamp,
            positions=positions,
        )
        
        result = verify_game_outcome(
            commitment_hash=commitment_hash,
            server_seed=seed,
            entropy_hex=entropy,
            nonce=nonce,
            timestamp_ms=timestamp,
            positions=positions,
        )
        
        assert result.details is not None
        assert "expected_entropy" in result.details
        assert "expected_positions" in result.details
        assert "computed_hash" in result.details
