"""Tests for hash chain."""

import pytest
from commitment_protocol.chain import (
    ChainEntry,
    HashChain,
    compute_entry_hash,
)


class TestChainEntry:
    """Tests for ChainEntry class."""
    
    def test_creation(self):
        """Test basic creation."""
        entry = ChainEntry(
            index=0,
            commitment_hash="commit123",
            previous_hash=None,
            entry_hash="entry123",
            timestamp_ms=1000,
        )
        assert entry.index == 0
        assert entry.commitment_hash == "commit123"
        assert entry.previous_hash is None
    
    def test_with_metadata(self):
        """Test creation with metadata."""
        entry = ChainEntry(
            index=0,
            commitment_hash="commit123",
            previous_hash=None,
            entry_hash="entry123",
            timestamp_ms=1000,
            metadata={"key": "value"},
        )
        assert entry.metadata == {"key": "value"}
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        entry = ChainEntry(
            index=0,
            commitment_hash="commit123",
            previous_hash=None,
            entry_hash="entry123",
            timestamp_ms=1000,
        )
        d = entry.to_dict()
        assert d["index"] == 0
        assert d["commitment_hash"] == "commit123"
    
    def test_from_dict(self):
        """Test creation from dictionary."""
        d = {
            "index": 0,
            "commitment_hash": "commit123",
            "previous_hash": None,
            "entry_hash": "entry123",
            "timestamp_ms": 1000,
        }
        entry = ChainEntry.from_dict(d)
        assert entry.index == 0


class TestComputeEntryHash:
    """Tests for compute_entry_hash function."""
    
    def test_returns_64_chars(self):
        """Test hash is 64 characters."""
        h = compute_entry_hash(0, "commit123", None, 1000)
        assert len(h) == 64
    
    def test_deterministic(self):
        """Test hash is deterministic."""
        h1 = compute_entry_hash(0, "commit123", None, 1000)
        h2 = compute_entry_hash(0, "commit123", None, 1000)
        assert h1 == h2
    
    def test_different_inputs_different_hash(self):
        """Test different inputs produce different hash."""
        h1 = compute_entry_hash(0, "commit123", None, 1000)
        h2 = compute_entry_hash(1, "commit123", None, 1000)
        assert h1 != h2


class TestHashChain:
    """Tests for HashChain class."""
    
    def test_empty_chain(self):
        """Test empty chain."""
        chain = HashChain()
        assert len(chain) == 0
        assert chain.get_latest() is None
    
    def test_append(self):
        """Test appending entry."""
        chain = HashChain()
        entry = chain.append("commit123", timestamp_ms=1000)
        
        assert entry.index == 0
        assert entry.commitment_hash == "commit123"
        assert entry.previous_hash is None
        assert len(chain) == 1
    
    def test_append_multiple(self):
        """Test appending multiple entries."""
        chain = HashChain()
        entry1 = chain.append("commit1", timestamp_ms=1000)
        entry2 = chain.append("commit2", timestamp_ms=2000)
        
        assert entry2.index == 1
        assert entry2.previous_hash == entry1.entry_hash
        assert len(chain) == 2
    
    def test_verify_empty(self):
        """Test verifying empty chain."""
        chain = HashChain()
        assert chain.verify() is True
    
    def test_verify_valid_chain(self):
        """Test verifying valid chain."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        chain.append("commit3", timestamp_ms=3000)
        
        assert chain.verify() is True
    
    def test_verify_tampered_chain(self):
        """Test verifying tampered chain."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        # Tamper with entry
        chain._entries[0] = ChainEntry(
            index=0,
            commitment_hash="tampered",
            previous_hash=None,
            entry_hash=chain._entries[0].entry_hash,  # Keep old hash
            timestamp_ms=1000,
        )
        
        assert chain.verify() is False
    
    def test_get_entry(self):
        """Test getting entry by index."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        entry = chain.get_entry(1)
        assert entry.commitment_hash == "commit2"
        
        assert chain.get_entry(99) is None
    
    def test_get_latest(self):
        """Test getting latest entry."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        latest = chain.get_latest()
        assert latest.commitment_hash == "commit2"
    
    def test_find_by_commitment(self):
        """Test finding entry by commitment hash."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        entry = chain.find_by_commitment("commit1")
        assert entry.index == 0
        
        assert chain.find_by_commitment("nonexistent") is None
    
    def test_get_entries_since(self):
        """Test getting entries since index."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        chain.append("commit3", timestamp_ms=3000)
        
        entries = chain.get_entries_since(0)
        assert len(entries) == 2
        assert entries[0].commitment_hash == "commit2"
    
    def test_iteration(self):
        """Test iterating over chain."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        entries = list(chain)
        assert len(entries) == 2
    
    def test_to_list(self):
        """Test conversion to list."""
        chain = HashChain()
        chain.append("commit1", timestamp_ms=1000)
        chain.append("commit2", timestamp_ms=2000)
        
        lst = chain.to_list()
        assert len(lst) == 2
        assert lst[0]["commitment_hash"] == "commit1"
    
    def test_from_list(self):
        """Test creation from list."""
        chain1 = HashChain()
        chain1.append("commit1", timestamp_ms=1000)
        chain1.append("commit2", timestamp_ms=2000)
        
        lst = chain1.to_list()
        chain2 = HashChain.from_list(lst)
        
        assert len(chain2) == 2
        assert chain2.verify() is True
    
    def test_with_metadata(self):
        """Test appending with metadata."""
        chain = HashChain()
        entry = chain.append(
            "commit1",
            metadata={"user": "test"},
            timestamp_ms=1000,
        )
        
        assert entry.metadata == {"user": "test"}
