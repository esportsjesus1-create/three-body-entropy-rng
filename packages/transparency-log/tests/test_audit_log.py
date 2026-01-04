"""Tests for audit log."""

import pytest
from transparency_log.database import Database, DatabaseConfig
from transparency_log.audit_log import (
    AuditLog,
    AuditEntry,
    AuditAction,
    compute_entry_hash,
)


@pytest.fixture
def log():
    """Create audit log with in-memory database."""
    db = Database(DatabaseConfig(db_path=":memory:"))
    db.initialize()
    return AuditLog(db)


class TestAuditAction:
    """Tests for AuditAction enum."""
    
    def test_values(self):
        """Test enum values."""
        assert AuditAction.COMMIT_CREATED.value == "commit_created"
        assert AuditAction.COMMIT_REVEALED.value == "commit_revealed"
        assert AuditAction.KEY_ROTATED.value == "key_rotated"


class TestAuditEntry:
    """Tests for AuditEntry class."""
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        entry = AuditEntry(
            id=1,
            timestamp_ms=1000,
            action="commit_created",
            commitment_hash="hash123",
            client_ip="192.168.1.1",
            details={"key": "value"},
            entry_hash="entryhash",
            previous_hash=None,
        )
        d = entry.to_dict()
        
        assert d["id"] == 1
        assert d["action"] == "commit_created"
        assert d["details"] == {"key": "value"}


class TestComputeEntryHash:
    """Tests for compute_entry_hash function."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 characters."""
        h = compute_entry_hash(1000, "action", "hash", None, None)
        assert len(h) == 64
    
    def test_deterministic(self):
        """Test hash is deterministic."""
        h1 = compute_entry_hash(1000, "action", "hash", None, None)
        h2 = compute_entry_hash(1000, "action", "hash", None, None)
        assert h1 == h2
    
    def test_different_inputs_different_hash(self):
        """Test different inputs produce different hash."""
        h1 = compute_entry_hash(1000, "action1", "hash", None, None)
        h2 = compute_entry_hash(1000, "action2", "hash", None, None)
        assert h1 != h2


class TestAuditLog:
    """Tests for AuditLog class."""
    
    def test_append(self, log):
        """Test appending entry."""
        entry = log.append(
            action=AuditAction.COMMIT_CREATED,
            commitment_hash="hash123",
        )
        
        assert entry.id > 0
        assert entry.action == "commit_created"
        assert entry.commitment_hash == "hash123"
        assert entry.previous_hash is None
    
    def test_append_with_details(self, log):
        """Test appending entry with details."""
        entry = log.append(
            action=AuditAction.COMMIT_CREATED,
            commitment_hash="hash123",
            client_ip="192.168.1.1",
            details={"key": "value"},
        )
        
        assert entry.client_ip == "192.168.1.1"
        assert entry.details == {"key": "value"}
    
    def test_append_chain(self, log):
        """Test entries form a chain."""
        entry1 = log.append(
            action=AuditAction.COMMIT_CREATED,
            commitment_hash="hash1",
        )
        entry2 = log.append(
            action=AuditAction.COMMIT_REVEALED,
            commitment_hash="hash1",
        )
        
        assert entry2.previous_hash == entry1.entry_hash
    
    def test_get(self, log):
        """Test getting entry by ID."""
        created = log.append(
            action=AuditAction.COMMIT_CREATED,
            commitment_hash="hash123",
        )
        
        entry = log.get(created.id)
        assert entry is not None
        assert entry.commitment_hash == "hash123"
    
    def test_get_not_found(self, log):
        """Test getting non-existent entry."""
        assert log.get(999) is None
    
    def test_list_recent(self, log):
        """Test listing recent entries."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        recent = log.list_recent(limit=2)
        assert len(recent) == 2
    
    def test_list_by_action(self, log):
        """Test listing entries by action."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        created = log.list_by_action(AuditAction.COMMIT_CREATED)
        assert len(created) == 2
    
    def test_list_by_commitment(self, log):
        """Test listing entries for a commitment."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        entries = log.list_by_commitment("hash1")
        assert len(entries) == 2
    
    def test_verify_chain_valid(self, log):
        """Test verifying valid chain."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        assert log.verify_chain() is True
    
    def test_verify_chain_empty(self, log):
        """Test verifying empty chain."""
        assert log.verify_chain() is True
    
    def test_count(self, log):
        """Test counting entries."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        
        assert log.count() == 2
    
    def test_count_by_action(self, log):
        """Test counting by action."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        counts = log.count_by_action()
        assert counts["commit_created"] == 2
        assert counts["commit_revealed"] == 1
