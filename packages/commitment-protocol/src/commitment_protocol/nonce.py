"""
Nonce tracking for replay protection.

Provides nonce generation and tracking to prevent replay attacks.
"""

import threading
from typing import Set, Optional
import secrets


class NonceTracker:
    """
    Thread-safe nonce tracker for replay protection.
    
    Tracks used nonces to prevent replay attacks where an
    attacker tries to reuse a valid commitment.
    
    Attributes:
        max_nonces: Maximum number of nonces to track (oldest removed first)
        
    Example:
        >>> tracker = NonceTracker()
        >>> nonce = tracker.generate()
        >>> tracker.is_valid(nonce)
        True
        >>> tracker.mark_used(nonce)
        >>> tracker.is_valid(nonce)
        False
    """
    
    def __init__(self, max_nonces: int = 100000):
        """
        Initialize nonce tracker.
        
        Args:
            max_nonces: Maximum nonces to track before pruning
        """
        self._used_nonces: Set[int] = set()
        self._nonce_order: list = []
        self._max_nonces = max_nonces
        self._lock = threading.Lock()
        self._counter = 0
    
    def generate(self) -> int:
        """
        Generate a new unique nonce.
        
        Returns:
            Unique nonce value
        """
        with self._lock:
            # Combine counter with random bits for uniqueness
            self._counter += 1
            random_bits = secrets.randbits(32)
            nonce = (self._counter << 32) | random_bits
            return nonce
    
    def is_valid(self, nonce: int) -> bool:
        """
        Check if nonce is valid (not already used).
        
        Args:
            nonce: Nonce to check
            
        Returns:
            True if nonce has not been used
        """
        with self._lock:
            return nonce not in self._used_nonces
    
    def mark_used(self, nonce: int) -> bool:
        """
        Mark a nonce as used.
        
        Args:
            nonce: Nonce to mark as used
            
        Returns:
            True if nonce was valid and is now marked used,
            False if nonce was already used
        """
        with self._lock:
            if nonce in self._used_nonces:
                return False
            
            self._used_nonces.add(nonce)
            self._nonce_order.append(nonce)
            
            # Prune old nonces if we exceed max
            while len(self._used_nonces) > self._max_nonces:
                old_nonce = self._nonce_order.pop(0)
                self._used_nonces.discard(old_nonce)
            
            return True
    
    def check_and_mark(self, nonce: int) -> bool:
        """
        Atomically check if nonce is valid and mark it used.
        
        This is the preferred method for validation as it
        prevents race conditions.
        
        Args:
            nonce: Nonce to check and mark
            
        Returns:
            True if nonce was valid and is now marked used,
            False if nonce was already used
        """
        return self.mark_used(nonce)
    
    @property
    def used_count(self) -> int:
        """Get count of tracked used nonces."""
        with self._lock:
            return len(self._used_nonces)
    
    def clear(self) -> None:
        """Clear all tracked nonces."""
        with self._lock:
            self._used_nonces.clear()
            self._nonce_order.clear()
    
    def get_used_nonces(self) -> Set[int]:
        """
        Get copy of used nonces set.
        
        Returns:
            Copy of the used nonces set
        """
        with self._lock:
            return self._used_nonces.copy()
