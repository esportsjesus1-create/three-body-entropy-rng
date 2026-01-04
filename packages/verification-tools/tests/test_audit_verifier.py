"""Tests for audit trail verification."""

import pytest
from verification_tools import (
    verify_audit_trail,
    verify_chain_integrity,
    AuditVerificationResult,
)
from verification_tools.audit_verifier import (
    compute_entry_hash,
    detect_sequence_gaps,
)


class TestComputeEntryHash:
    """Tests for entry hash computation."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 hex characters."""
        h = compute_entry_hash(
            entry_id=1,
            action="COMMIT_CREATED",
            commitment_hash="a" * 64,
            timestamp_ms=1000000,
            details={"test": "data"},
            previous_hash="genesis",
        )
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)
    
    def test_deterministic(self):
        """Test same inputs produce same hash."""
        args = {
            "entry_id": 1,
            "action": "COMMIT_CREATED",
            "commitment_hash": "a" * 64,
            "timestamp_ms": 1000000,
            "details": {"test": "data"},
            "previous_hash": "genesis",
        }
        h1 = compute_entry_hash(**args)
        h2 = compute_entry_hash(**args)
        assert h1 == h2
    
    def test_different_inputs_different_hash(self):
        """Test different inputs produce different hash."""
        base = {
            "entry_id": 1,
            "action": "COMMIT_CREATED",
            "commitment_hash": "a" * 64,
            "timestamp_ms": 1000000,
            "details": {"test": "data"},
            "previous_hash": "genesis",
        }
        h1 = compute_entry_hash(**base)
        
        # Change entry_id
        h2 = compute_entry_hash(**{**base, "entry_id": 2})
        assert h1 != h2
        
        # Change action
        h3 = compute_entry_hash(**{**base, "action": "COMMIT_REVEALED"})
        assert h1 != h3


class TestVerifyChainIntegrity:
    """Tests for chain integrity verification."""
    
    def test_empty_entries(self):
        """Test empty entries list is valid."""
        valid, errors = verify_chain_integrity([])
        assert valid
        assert len(errors) == 0
    
    def test_valid_chain(self):
        """Test valid chain verification."""
        # Build a valid chain
        entries = []
        previous_hash = "genesis"
        
        for i in range(3):
            entry = {
                "entry_id": i,
                "action": "COMMIT_CREATED",
                "commitment_hash": f"commit_{i}",
                "timestamp_ms": 1000000 + i * 1000,
                "details": {},
                "previous_hash": previous_hash,
            }
            entry["hash"] = compute_entry_hash(
                entry_id=entry["entry_id"],
                action=entry["action"],
                commitment_hash=entry["commitment_hash"],
                timestamp_ms=entry["timestamp_ms"],
                details=entry["details"],
                previous_hash=entry["previous_hash"],
            )
            entries.append(entry)
            previous_hash = entry["hash"]
        
        valid, errors = verify_chain_integrity(entries)
        assert valid
        assert len(errors) == 0
    
    def test_invalid_previous_hash(self):
        """Test detection of invalid previous hash."""
        entries = [
            {
                "entry_id": 0,
                "action": "COMMIT_CREATED",
                "commitment_hash": "commit_0",
                "timestamp_ms": 1000000,
                "details": {},
                "previous_hash": "wrong_genesis",  # Should be "genesis"
            },
        ]
        
        valid, errors = verify_chain_integrity(entries)
        assert not valid
        assert len(errors) == 1
        assert errors[0]["error"] == "previous_hash_mismatch"


class TestDetectSequenceGaps:
    """Tests for sequence gap detection."""
    
    def test_no_gaps(self):
        """Test no gaps when all commitments resolved."""
        entries = [
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_1", "timestamp_ms": 1000, "entry_id": 0},
            {"action": "COMMIT_REVEALED", "commitment_hash": "hash_1", "timestamp_ms": 2000, "entry_id": 1},
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_2", "timestamp_ms": 3000, "entry_id": 2},
            {"action": "COMMIT_EXPIRED", "commitment_hash": "hash_2", "timestamp_ms": 4000, "entry_id": 3},
        ]
        
        gaps = detect_sequence_gaps(entries)
        assert len(gaps) == 0
    
    def test_detect_unresolved(self):
        """Test detection of unresolved commitments."""
        entries = [
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_1", "timestamp_ms": 1000, "entry_id": 0},
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_2", "timestamp_ms": 2000, "entry_id": 1},
            {"action": "COMMIT_REVEALED", "commitment_hash": "hash_1", "timestamp_ms": 3000, "entry_id": 2},
            # hash_2 never resolved
        ]
        
        gaps = detect_sequence_gaps(entries)
        assert len(gaps) == 1
        assert gaps[0]["status"] == "unresolved"
    
    def test_multiple_gaps(self):
        """Test detection of multiple gaps."""
        entries = [
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_1", "timestamp_ms": 1000, "entry_id": 0},
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_2", "timestamp_ms": 2000, "entry_id": 1},
            {"action": "COMMIT_CREATED", "commitment_hash": "hash_3", "timestamp_ms": 3000, "entry_id": 2},
            # None resolved
        ]
        
        gaps = detect_sequence_gaps(entries)
        assert len(gaps) == 3


class TestVerifyAuditTrail:
    """Tests for complete audit trail verification."""
    
    def test_valid_trail(self):
        """Test valid audit trail verification."""
        # Build valid chain with resolved commitments
        entries = []
        previous_hash = "genesis"
        
        # Create commitment
        entry1 = {
            "entry_id": 0,
            "action": "COMMIT_CREATED",
            "commitment_hash": "commit_1",
            "timestamp_ms": 1000000,
            "details": {},
            "previous_hash": previous_hash,
        }
        entry1["hash"] = compute_entry_hash(**{k: v for k, v in entry1.items() if k != "hash"})
        entries.append(entry1)
        previous_hash = entry1["hash"]
        
        # Reveal commitment
        entry2 = {
            "entry_id": 1,
            "action": "COMMIT_REVEALED",
            "commitment_hash": "commit_1",
            "timestamp_ms": 1001000,
            "details": {},
            "previous_hash": previous_hash,
        }
        entry2["hash"] = compute_entry_hash(**{k: v for k, v in entry2.items() if k != "hash"})
        entries.append(entry2)
        
        result = verify_audit_trail(entries)
        
        assert result.valid
        assert result.chain_valid
        assert result.gaps_detected == 0
        assert result.total_entries == 2
        assert result.error is None
    
    def test_invalid_chain(self):
        """Test invalid chain detection."""
        entries = [
            {
                "entry_id": 0,
                "action": "COMMIT_CREATED",
                "commitment_hash": "commit_1",
                "timestamp_ms": 1000000,
                "details": {},
                "previous_hash": "wrong",  # Invalid
                "hash": "some_hash",
            },
        ]
        
        result = verify_audit_trail(entries)
        
        assert not result.valid
        assert not result.chain_valid
        assert "Chain integrity errors" in result.error
    
    def test_with_gaps(self):
        """Test gap detection in audit trail."""
        # Build valid chain but with unresolved commitment
        entries = []
        previous_hash = "genesis"
        
        entry = {
            "entry_id": 0,
            "action": "COMMIT_CREATED",
            "commitment_hash": "commit_1",
            "timestamp_ms": 1000000,
            "details": {},
            "previous_hash": previous_hash,
        }
        entry["hash"] = compute_entry_hash(**{k: v for k, v in entry.items() if k != "hash"})
        entries.append(entry)
        
        result = verify_audit_trail(entries)
        
        assert not result.valid
        assert result.chain_valid  # Chain is valid
        assert result.gaps_detected == 1  # But has gap
        assert "Sequence gaps detected" in result.error
    
    def test_empty_trail(self):
        """Test empty audit trail is valid."""
        result = verify_audit_trail([])
        
        assert result.valid
        assert result.chain_valid
        assert result.gaps_detected == 0
        assert result.total_entries == 0
