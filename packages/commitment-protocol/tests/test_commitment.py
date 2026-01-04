"""Tests for commitment creation."""

import pytest
from commitment_protocol.commitment import (
    CommitmentData,
    Commitment,
    create_commitment,
    compute_commitment_hash,
    generate_server_seed,
)


class TestCommitmentData:
    """Tests for CommitmentData class."""
    
    def test_creation(self):
        """Test basic creation."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert data.server_seed == "abc123"
        assert data.entropy_hex == "def456"
        assert data.nonce == 1
        assert data.timestamp_ms == 1000
    
    def test_with_positions(self):
        """Test creation with positions."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3, 4, 5],
        )
        assert data.positions == [1, 2, 3, 4, 5]
    
    def test_to_commitment_string(self):
        """Test commitment string generation."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        s = data.to_commitment_string()
        assert "server_seed:abc123" in s
        assert "entropy:def456" in s
        assert "nonce:1" in s
        assert "timestamp:1000" in s
    
    def test_to_commitment_string_with_positions(self):
        """Test commitment string with positions."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3],
        )
        s = data.to_commitment_string()
        assert "positions:1,2,3" in s
    
    def test_to_commitment_string_deterministic(self):
        """Test commitment string is deterministic."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert data.to_commitment_string() == data.to_commitment_string()
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
            positions=[1, 2, 3],
        )
        d = data.to_dict()
        assert d["server_seed"] == "abc123"
        assert d["entropy_hex"] == "def456"
        assert d["nonce"] == 1
        assert d["timestamp_ms"] == 1000
        assert d["positions"] == [1, 2, 3]
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        d = {
            "server_seed": "abc123",
            "entropy_hex": "def456",
            "nonce": 1,
            "timestamp_ms": 1000,
            "positions": [1, 2, 3],
        }
        data = CommitmentData.from_dict(d)
        assert data.server_seed == "abc123"
        assert data.positions == [1, 2, 3]


class TestCommitment:
    """Tests for Commitment class."""
    
    def test_creation(self):
        """Test basic creation."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        commitment = Commitment(
            commitment_hash="hash123",
            timestamp_ms=1000,
            nonce=1,
            data=data,
        )
        assert commitment.commitment_hash == "hash123"
        assert commitment.nonce == 1
    
    def test_to_public_dict(self):
        """Test public dict excludes data."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        commitment = Commitment(
            commitment_hash="hash123",
            timestamp_ms=1000,
            nonce=1,
            data=data,
        )
        public = commitment.to_public_dict()
        assert "commitment_hash" in public
        assert "data" not in public
    
    def test_to_full_dict(self):
        """Test full dict includes data."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        commitment = Commitment(
            commitment_hash="hash123",
            timestamp_ms=1000,
            nonce=1,
            data=data,
        )
        full = commitment.to_full_dict()
        assert "commitment_hash" in full
        assert "data" in full
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        d = {
            "commitment_hash": "hash123",
            "timestamp_ms": 1000,
            "nonce": 1,
            "data": {
                "server_seed": "abc123",
                "entropy_hex": "def456",
                "nonce": 1,
                "timestamp_ms": 1000,
            },
        }
        commitment = Commitment.from_dict(d)
        assert commitment.commitment_hash == "hash123"
        assert commitment.data.server_seed == "abc123"


class TestComputeCommitmentHash:
    """Tests for compute_commitment_hash function."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 characters."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        hash_val = compute_commitment_hash(data)
        assert len(hash_val) == 64
    
    def test_deterministic(self):
        """Test hash is deterministic."""
        data = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        h1 = compute_commitment_hash(data)
        h2 = compute_commitment_hash(data)
        assert h1 == h2
    
    def test_different_data_different_hash(self):
        """Test different data produces different hash."""
        data1 = CommitmentData(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        data2 = CommitmentData(
            server_seed="xyz789",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert compute_commitment_hash(data1) != compute_commitment_hash(data2)


class TestCreateCommitment:
    """Tests for create_commitment function."""
    
    def test_creates_commitment(self):
        """Test basic commitment creation."""
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert isinstance(commitment, Commitment)
        assert len(commitment.commitment_hash) == 64
    
    def test_with_positions(self):
        """Test commitment with positions."""
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            positions=[1, 2, 3, 4, 5],
            timestamp_ms=1000,
        )
        assert commitment.data.positions == [1, 2, 3, 4, 5]
    
    def test_auto_timestamp(self):
        """Test automatic timestamp generation."""
        commitment = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
        )
        assert commitment.timestamp_ms > 0
    
    def test_deterministic_with_same_inputs(self):
        """Test same inputs produce same hash."""
        c1 = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        c2 = create_commitment(
            server_seed="abc123",
            entropy_hex="def456",
            nonce=1,
            timestamp_ms=1000,
        )
        assert c1.commitment_hash == c2.commitment_hash


class TestGenerateServerSeed:
    """Tests for generate_server_seed function."""
    
    def test_default_length(self):
        """Test default seed length."""
        seed = generate_server_seed()
        assert len(seed) == 64  # 32 bytes = 64 hex chars
    
    def test_custom_length(self):
        """Test custom seed length."""
        seed = generate_server_seed(16)
        assert len(seed) == 32  # 16 bytes = 32 hex chars
    
    def test_unique(self):
        """Test seeds are unique."""
        seed1 = generate_server_seed()
        seed2 = generate_server_seed()
        assert seed1 != seed2
    
    def test_valid_hex(self):
        """Test seed is valid hex."""
        seed = generate_server_seed()
        bytes.fromhex(seed)  # Should not raise
