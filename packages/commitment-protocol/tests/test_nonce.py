"""Tests for nonce tracking."""

import pytest
import threading
from commitment_protocol.nonce import NonceTracker


class TestNonceTracker:
    """Tests for NonceTracker class."""
    
    def test_generate_unique(self):
        """Test generated nonces are unique."""
        tracker = NonceTracker()
        nonces = [tracker.generate() for _ in range(100)]
        assert len(set(nonces)) == 100
    
    def test_is_valid_new_nonce(self):
        """Test new nonce is valid."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        assert tracker.is_valid(nonce) is True
    
    def test_is_valid_used_nonce(self):
        """Test used nonce is invalid."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        tracker.mark_used(nonce)
        assert tracker.is_valid(nonce) is False
    
    def test_mark_used_returns_true(self):
        """Test mark_used returns True for new nonce."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        assert tracker.mark_used(nonce) is True
    
    def test_mark_used_returns_false_for_duplicate(self):
        """Test mark_used returns False for used nonce."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        tracker.mark_used(nonce)
        assert tracker.mark_used(nonce) is False
    
    def test_check_and_mark(self):
        """Test atomic check and mark."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        
        assert tracker.check_and_mark(nonce) is True
        assert tracker.check_and_mark(nonce) is False
    
    def test_used_count(self):
        """Test used count tracking."""
        tracker = NonceTracker()
        assert tracker.used_count == 0
        
        for i in range(5):
            tracker.mark_used(tracker.generate())
        
        assert tracker.used_count == 5
    
    def test_clear(self):
        """Test clearing tracked nonces."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        tracker.mark_used(nonce)
        
        tracker.clear()
        
        assert tracker.used_count == 0
        assert tracker.is_valid(nonce) is True
    
    def test_get_used_nonces(self):
        """Test getting copy of used nonces."""
        tracker = NonceTracker()
        nonce = tracker.generate()
        tracker.mark_used(nonce)
        
        used = tracker.get_used_nonces()
        assert nonce in used
        
        # Should be a copy
        used.add(999)
        assert 999 not in tracker.get_used_nonces()
    
    def test_max_nonces_pruning(self):
        """Test old nonces are pruned when max exceeded."""
        tracker = NonceTracker(max_nonces=10)
        
        nonces = []
        for _ in range(15):
            nonce = tracker.generate()
            tracker.mark_used(nonce)
            nonces.append(nonce)
        
        # Should only have 10 nonces
        assert tracker.used_count == 10
        
        # First 5 should be pruned
        for nonce in nonces[:5]:
            assert tracker.is_valid(nonce) is True
        
        # Last 10 should still be tracked
        for nonce in nonces[5:]:
            assert tracker.is_valid(nonce) is False
    
    def test_thread_safety(self):
        """Test thread-safe operations."""
        tracker = NonceTracker()
        results = []
        
        def worker():
            for _ in range(100):
                nonce = tracker.generate()
                success = tracker.check_and_mark(nonce)
                results.append(success)
        
        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # All operations should succeed (no duplicates)
        assert all(results)
        assert tracker.used_count == 1000
