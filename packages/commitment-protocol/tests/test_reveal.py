"""Tests for reveal verification."""

import pytest
import time
from commitment_protocol.commitment import CommitmentData, create_commitment
from commitment_protocol.reveal import (
    RevealData,
    VerificationResult,
    verify_reveal,
    create_reveal_from_commitment,
)


class TestRevealData:
    """Tests for RevealData class."""
    
    def test_creation(self):
        """Test basic creation."""
        reveal = RevealData(
            commitment_hash="hash123",
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert reveal.commitment_hash == "hash123"
        assert reveal.server_seed == "abc123"
    
    def test_with_optional_fields(self):
        """Test creation with optional fields."""
        reveal = RevealData(
            commitment_hash="hash123",
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3],
            client_seed="client123",
            result={"win": True},
        )
        assert reveal.positions == [1, 2, 3]
        assert reveal.client_seed == "client123"
        assert reveal.result == {"win": True}
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        reveal = RevealData(
            commitment_hash="hash123",
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3],
        )
        d = reveal.to_dict()
        assert d["commitment_hash"] == "hash123"
        assert d["positions"] == [1, 2, 3]
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        d = {
            "commitment_hash": "hash123",
            "server_seed": "abc123",
            "entropy_hex": "def456",
            "nonce": 1,
            "timestamp_ms": 1000,
        }
        reveal = RevealData.from_dict(d)
        assert reveal.commitment_hash == "hash123"


class TestVerificationResult:
    """Tests for VerificationResult class."""
    
    def test_valid_result(self):
        """Test valid verification result."""
        result = VerificationResult(
            valid=True,
            commitment_matches=True,
            timestamp_valid=True,
            nonce_valid=True,
        )
        assert result.valid is True
    
    def test_invalid_result_with_error(self):
        """Test invalid result with error."""
        result = VerificationResult(
            valid=False,
            commitment_matches=False,
            timestamp_valid=True,
            nonce_valid=True,
            error="Hash mismatch",
        )
        assert result.valid is False
        assert result.error == "Hash mismatch"
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        result = VerificationResult(
            valid=True,
            commitment_matches=True,
            timestamp_valid=True,
            nonce_valid=True,
        )
        d = result.to_dict()
        assert d["valid"] is True
        assert "error" not in d


class TestVerifyReveal:
    """Tests for verify_reveal function."""
    
    def test_valid_reveal(self):
        """Test verification of valid reveal."""
        # Create commitment
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=int(time.time() * 1000),
        )
        
        # Create reveal from commitment
        reveal = RevealData(
            commitment_hash=commitment.commitment_hash,
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=commitment.timestamp_ms,
        )
        
        result = verify_reveal(reveal)
        assert result.valid is True
        assert result.commitment_matches is True
    
    def test_invalid_hash(self):
        """Test verification fails with wrong hash."""
        reveal = RevealData(
            commitment_hash="wrong_hash",
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=int(time.time() * 1000),
        )
        
        result = verify_reveal(reveal)
        assert result.valid is False
        assert result.commitment_matches is False
    
    def test_expired_timestamp(self):
        """Test verification fails with old timestamp."""
        old_timestamp = int(time.time() * 1000) - 600000  # 10 minutes ago
        
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=old_timestamp,
        )
        
        reveal = RevealData(
            commitment_hash=commitment.commitment_hash,
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=old_timestamp,
        )
        
        result = verify_reveal(reveal, max_age_ms=300000)  # 5 min max
        assert result.valid is False
        assert result.timestamp_valid is False
    
    def test_reused_nonce(self):
        """Test verification fails with reused nonce."""
        timestamp = int(time.time() * 1000)
        
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=timestamp,
        )
        
        reveal = RevealData(
            commitment_hash=commitment.commitment_hash,
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=timestamp,
        )
        
        used_nonces = {1}  # Nonce already used
        result = verify_reveal(reveal, used_nonces=used_nonces)
        assert result.valid is False
        assert result.nonce_valid is False
    
    def test_with_positions(self):
        """Test verification with positions."""
        timestamp = int(time.time() * 1000)
        
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            positions=[1, 2, 3, 4, 5],
            timestamp_ms=timestamp,
        )
        
        reveal = RevealData(
            commitment_hash=commitment.commitment_hash,
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=timestamp,
            positions=[1, 2, 3, 4, 5],
        )
        
        result = verify_reveal(reveal)
        assert result.valid is True


class TestCreateRevealFromCommitment:
    """Tests for create_reveal_from_commitment function."""
    
    def test_creates_reveal(self):
        """Test reveal creation from commitment."""
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        
        reveal = create_reveal_from_commitment(
            commitment_hash=commitment.commitment_hash,
            data=commitment.data,
            client_seed="client123",
        )
        
        assert reveal.commitment_hash == commitment.commitment_hash
        assert reveal.server_seed == "abc123"
        assert reveal.client_seed == "client123"
    
    def test_reveal_verifies(self):
        """Test created reveal passes verification."""
        timestamp = int(time.time() * 1000)
        
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=timestamp,
        )
        
        reveal = create_reveal_from_commitment(
            commitment_hash=commitment.commitment_hash,
            data=commitment.data,
        )
        
        result = verify_reveal(reveal)
        assert result.valid is True
