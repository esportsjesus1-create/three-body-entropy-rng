"""
Hash chain for audit trails.

Provides append-only hash chain linking for commitment audit trails.
"""

import hashlib
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import time


@dataclass
class ChainEntry:
    """
    An entry in the hash chain.
    
    Each entry contains a commitment and links to the previous
    entry via hash, creating an immutable audit trail.
    
    Attributes:
        index: Position in chain (0-indexed)
        commitment_hash: The commitment being recorded
        previous_hash: Hash of previous entry (None for genesis)
        entry_hash: Hash of this entry
        timestamp_ms: When entry was added
        metadata: Optional additional metadata
    """
    index: int
    commitment_hash: str
    previous_hash: Optional[str]
    entry_hash: str
    timestamp_ms: int
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        d = {
            "index": self.index,
            "commitment_hash": self.commitment_hash,
            "previous_hash": self.previous_hash,
            "entry_hash": self.entry_hash,
            "timestamp_ms": self.timestamp_ms,
        }
        if self.metadata is not None:
            d["metadata"] = self.metadata
        return d
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ChainEntry":
        """Create from dictionary."""
        return cls(
            index=d["index"],
            commitment_hash=d["commitment_hash"],
            previous_hash=d.get("previous_hash"),
            entry_hash=d["entry_hash"],
            timestamp_ms=d["timestamp_ms"],
            metadata=d.get("metadata"),
        )


def compute_entry_hash(
    index: int,
    commitment_hash: str,
    previous_hash: Optional[str],
    timestamp_ms: int,
) -> str:
    """
    Compute hash for a chain entry.
    
    Args:
        index: Entry index
        commitment_hash: The commitment hash
        previous_hash: Previous entry hash (or None)
        timestamp_ms: Entry timestamp
        
    Returns:
        SHA-256 hash of entry data
    """
    data = f"{index}|{commitment_hash}|{previous_hash or 'genesis'}|{timestamp_ms}"
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


class HashChain:
    """
    Append-only hash chain for commitment audit trails.
    
    Each entry links to the previous via hash, making it
    impossible to modify history without detection.
    
    Example:
        >>> chain = HashChain()
        >>> entry1 = chain.append("commitment_hash_1")
        >>> entry2 = chain.append("commitment_hash_2")
        >>> chain.verify()
        True
        >>> len(chain)
        2
    """
    
    def __init__(self):
        """Initialize empty hash chain."""
        self._entries: List[ChainEntry] = []
    
    def append(
        self,
        commitment_hash: str,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp_ms: Optional[int] = None,
    ) -> ChainEntry:
        """
        Append a new entry to the chain.
        
        Args:
            commitment_hash: The commitment hash to record
            metadata: Optional additional metadata
            timestamp_ms: Optional timestamp (uses current time if None)
            
        Returns:
            The new chain entry
        """
        if timestamp_ms is None:
            timestamp_ms = int(time.time() * 1000)
        
        index = len(self._entries)
        previous_hash = self._entries[-1].entry_hash if self._entries else None
        
        entry_hash = compute_entry_hash(
            index=index,
            commitment_hash=commitment_hash,
            previous_hash=previous_hash,
            timestamp_ms=timestamp_ms,
        )
        
        entry = ChainEntry(
            index=index,
            commitment_hash=commitment_hash,
            previous_hash=previous_hash,
            entry_hash=entry_hash,
            timestamp_ms=timestamp_ms,
            metadata=metadata,
        )
        
        self._entries.append(entry)
        return entry
    
    def verify(self) -> bool:
        """
        Verify the integrity of the entire chain.
        
        Checks that each entry's hash is correct and links
        properly to the previous entry.
        
        Returns:
            True if chain is valid, False if tampered
        """
        for i, entry in enumerate(self._entries):
            # Verify index
            if entry.index != i:
                return False
            
            # Verify previous hash link
            expected_previous = self._entries[i-1].entry_hash if i > 0 else None
            if entry.previous_hash != expected_previous:
                return False
            
            # Verify entry hash
            computed_hash = compute_entry_hash(
                index=entry.index,
                commitment_hash=entry.commitment_hash,
                previous_hash=entry.previous_hash,
                timestamp_ms=entry.timestamp_ms,
            )
            if entry.entry_hash != computed_hash:
                return False
        
        return True
    
    def get_entry(self, index: int) -> Optional[ChainEntry]:
        """
        Get entry by index.
        
        Args:
            index: Entry index
            
        Returns:
            ChainEntry or None if index out of range
        """
        if 0 <= index < len(self._entries):
            return self._entries[index]
        return None
    
    def get_latest(self) -> Optional[ChainEntry]:
        """
        Get the latest entry.
        
        Returns:
            Latest ChainEntry or None if chain is empty
        """
        return self._entries[-1] if self._entries else None
    
    def find_by_commitment(self, commitment_hash: str) -> Optional[ChainEntry]:
        """
        Find entry by commitment hash.
        
        Args:
            commitment_hash: The commitment hash to find
            
        Returns:
            ChainEntry or None if not found
        """
        for entry in self._entries:
            if entry.commitment_hash == commitment_hash:
                return entry
        return None
    
    def get_entries_since(self, index: int) -> List[ChainEntry]:
        """
        Get all entries since a given index.
        
        Args:
            index: Starting index (exclusive)
            
        Returns:
            List of entries after the given index
        """
        return self._entries[index + 1:]
    
    def __len__(self) -> int:
        """Get chain length."""
        return len(self._entries)
    
    def __iter__(self):
        """Iterate over entries."""
        return iter(self._entries)
    
    def to_list(self) -> List[Dict[str, Any]]:
        """Convert chain to list of dictionaries."""
        return [entry.to_dict() for entry in self._entries]
    
    @classmethod
    def from_list(cls, entries: List[Dict[str, Any]]) -> "HashChain":
        """
        Create chain from list of dictionaries.
        
        Note: This does not verify the chain integrity.
        Call verify() after loading to check.
        
        Args:
            entries: List of entry dictionaries
            
        Returns:
            New HashChain instance
        """
        chain = cls()
        chain._entries = [ChainEntry.from_dict(e) for e in entries]
        return chain
