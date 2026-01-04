"""Tests for commitment store."""

import pytest
import time
from transparency_log.database import Database, DatabaseConfig
from transparency_log.commitment_store import CommitmentStore, StoredCommitment


@pytest.fixture
def store():
    """Create commitment store with in-memory database."""
    db = Database(DatabaseConfig(db_path=":memory:"))
    db.initialize()
    return CommitmentStore(db)


class TestStoredCommitment:
    """Tests for StoredCommitment class."""
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        commitment = StoredCommitment(
            id=1,
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
            positions=[1, 2, 3],
            status="pending",
            created_at=1000,
        )
        d = commitment.to_dict()
        
        assert d["id"] == 1
        assert d["commitment_hash"] == "hash123"
        assert d["positions"] == [1, 2, 3]


class TestCommitmentStore:
    """Tests for CommitmentStore class."""
    
    def test_create(self, store):
        """Test creating commitment."""
        commitment = store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        assert commitment.id > 0
        assert commitment.commitment_hash == "hash123"
        assert commitment.status == "pending"
    
    def test_create_with_positions(self, store):
        """Test creating commitment with positions."""
        commitment = store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
            positions=[1, 2, 3, 4, 5],
        )
        
        assert commitment.positions == [1, 2, 3, 4, 5]
    
    def test_get(self, store):
        """Test getting commitment by hash."""
        store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        commitment = store.get("hash123")
        assert commitment is not None
        assert commitment.server_seed == "seed456"
    
    def test_get_not_found(self, store):
        """Test getting non-existent commitment."""
        assert store.get("nonexistent") is None
    
    def test_get_by_id(self, store):
        """Test getting commitment by ID."""
        created = store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        commitment = store.get_by_id(created.id)
        assert commitment is not None
        assert commitment.commitment_hash == "hash123"
    
    def test_mark_revealed(self, store):
        """Test marking commitment as revealed."""
        store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        result = store.mark_revealed("hash123")
        assert result is True
        
        commitment = store.get("hash123")
        assert commitment.status == "revealed"
        assert commitment.revealed_at is not None
    
    def test_mark_revealed_not_found(self, store):
        """Test marking non-existent commitment."""
        result = store.mark_revealed("nonexistent")
        assert result is False
    
    def test_mark_expired(self, store):
        """Test marking commitment as expired."""
        store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        result = store.mark_expired("hash123")
        assert result is True
        
        commitment = store.get("hash123")
        assert commitment.status == "expired"
    
    def test_expire_old_commitments(self, store):
        """Test expiring old commitments."""
        current_time = int(time.time() * 1000)
        
        # Create expired commitment
        store.create(
            commitment_hash="hash1",
            server_seed="seed1",
            entropy_hex="entropy1",
            nonce=1,
            timestamp_ms=current_time - 10000,
            expires_ms=current_time - 5000,  # Already expired
        )
        
        # Create valid commitment
        store.create(
            commitment_hash="hash2",
            server_seed="seed2",
            entropy_hex="entropy2",
            nonce=2,
            timestamp_ms=current_time,
            expires_ms=current_time + 300000,  # Not expired
        )
        
        count = store.expire_old_commitments()
        assert count == 1
        
        assert store.get("hash1").status == "expired"
        assert store.get("hash2").status == "pending"
    
    def test_list_pending(self, store):
        """Test listing pending commitments."""
        store.create(
            commitment_hash="hash1",
            server_seed="seed1",
            entropy_hex="entropy1",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        store.create(
            commitment_hash="hash2",
            server_seed="seed2",
            entropy_hex="entropy2",
            nonce=2,
            timestamp_ms=2000,
            expires_ms=3000,
        )
        store.mark_revealed("hash1")
        
        pending = store.list_pending()
        assert len(pending) == 1
        assert pending[0].commitment_hash == "hash2"
    
    def test_list_recent(self, store):
        """Test listing recent commitments."""
        store.create(
            commitment_hash="hash1",
            server_seed="seed1",
            entropy_hex="entropy1",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        store.create(
            commitment_hash="hash2",
            server_seed="seed2",
            entropy_hex="entropy2",
            nonce=2,
            timestamp_ms=2000,
            expires_ms=3000,
        )
        
        recent = store.list_recent()
        assert len(recent) == 2
    
    def test_count_by_status(self, store):
        """Test counting by status."""
        store.create(
            commitment_hash="hash1",
            server_seed="seed1",
            entropy_hex="entropy1",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        store.create(
            commitment_hash="hash2",
            server_seed="seed2",
            entropy_hex="entropy2",
            nonce=2,
            timestamp_ms=2000,
            expires_ms=3000,
        )
        store.mark_revealed("hash1")
        
        counts = store.count_by_status()
        assert counts["pending"] == 1
        assert counts["revealed"] == 1
    
    def test_delete(self, store):
        """Test deleting commitment."""
        store.create(
            commitment_hash="hash123",
            server_seed="seed456",
            entropy_hex="entropy789",
            nonce=1,
            timestamp_ms=1000,
            expires_ms=2000,
        )
        
        result = store.delete("hash123")
        assert result is True
        assert store.get("hash123") is None
    
    def test_delete_not_found(self, store):
        """Test deleting non-existent commitment."""
        result = store.delete("nonexistent")
        assert result is False
