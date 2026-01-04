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
    
    def test_detect_sequence_gaps_no_gaps(self, log):
        """Test gap detection with no gaps."""
        # Create and reveal all commitments
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        log.append(action=AuditAction.COMMIT_EXPIRED, commitment_hash="hash2")
        
        gaps = log.detect_sequence_gaps()
        assert gaps["total_created"] == 2
        assert gaps["total_revealed"] == 1
        assert gaps["total_expired"] == 1
        assert gaps["missing_count"] == 0
        assert gaps["gap_detected"] is False
    
    def test_detect_sequence_gaps_with_gaps(self, log):
        """Test gap detection with missing commitments."""
        # Create 3 commitments, only reveal 1
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash3")
        # hash2 and hash3 are never revealed or expired
        
        gaps = log.detect_sequence_gaps()
        assert gaps["total_created"] == 3
        assert gaps["total_revealed"] == 1
        assert gaps["missing_count"] == 2
        assert gaps["gap_detected"] is True
        assert "hash2" in gaps["missing_hashes"]
        assert "hash3" in gaps["missing_hashes"]
    
    def test_detect_sequence_gaps_empty(self, log):
        """Test gap detection with empty log."""
        gaps = log.detect_sequence_gaps()
        assert gaps["total_created"] == 0
        assert gaps["missing_count"] == 0
        assert gaps["gap_detected"] is False
    
    def test_get_commitment_lifecycle_full(self, log):
        """Test getting full commitment lifecycle."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        
        lifecycle = log.get_commitment_lifecycle("hash1")
        assert lifecycle["commitment_hash"] == "hash1"
        assert lifecycle["status"] == "revealed"
        assert lifecycle["created_at"] is not None
        assert lifecycle["resolved_at"] is not None
        assert len(lifecycle["entries"]) == 2
    
    def test_get_commitment_lifecycle_pending(self, log):
        """Test getting lifecycle of pending commitment."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        
        lifecycle = log.get_commitment_lifecycle("hash1")
        assert lifecycle["status"] == "pending"
        assert lifecycle["resolved_at"] is None
    
    def test_get_commitment_lifecycle_expired(self, log):
        """Test getting lifecycle of expired commitment."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_EXPIRED, commitment_hash="hash1")
        
        lifecycle = log.get_commitment_lifecycle("hash1")
        assert lifecycle["status"] == "expired"
        assert lifecycle["resolved_at"] is not None
    
    def test_get_commitment_lifecycle_unknown(self, log):
        """Test getting lifecycle of unknown commitment."""
        lifecycle = log.get_commitment_lifecycle("nonexistent")
        assert lifecycle["status"] == "unknown"
        assert lifecycle["entries"] == []
    
    def test_audit_summary(self, log):
        """Test generating audit summary."""
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_REVEALED, commitment_hash="hash1")
        log.append(action=AuditAction.COMMIT_CREATED, commitment_hash="hash2")
        
        summary = log.audit_summary()
        assert summary["total_entries"] == 3
        assert summary["chain_valid"] is True
        assert summary["sequence_gaps"]["total_created"] == 2
        assert summary["sequence_gaps"]["missing_count"] == 1  # hash2 not resolved
        assert summary["oldest_entry_ms"] is not None
        assert summary["newest_entry_ms"] is not None
    
    def test_audit_summary_empty(self, log):
        """Test audit summary with empty log."""
        summary = log.audit_summary()
        assert summary["total_entries"] == 0
        assert summary["chain_valid"] is True
        assert summary["sequence_gaps"]["gap_detected"] is False
