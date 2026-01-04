"""
Commitment creation and management.

Provides the commit phase of the commit/reveal protocol.
"""

import hashlib
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
import secrets


@dataclass
class CommitmentData:
    """
    Data to be committed.
    
    This structure contains all the data that will be hashed
    to create the commitment. The commitment hash proves that
    this data existed at commitment time.
    
    Attributes:
        server_seed: Server's random seed (hex string)
        entropy_hex: Entropy from three-body simulation (hex string)
        nonce: Unique nonce for replay protection
        timestamp_ms: Commitment timestamp in milliseconds
        positions: Optional locked reel positions
        metadata: Optional additional metadata
    """
    server_seed: str
    entropy_hex: str
    nonce: int
    timestamp_ms: int
    positions: Optional[list] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_commitment_string(self) -> str:
        """
        Create deterministic string for hashing.
        
        The order and format must be consistent to ensure
        the same data always produces the same hash.
        
        Returns:
            Deterministic string representation
        """
        parts = [
            f"server_seed:{self.server_seed}",
            f"entropy:{self.entropy_hex}",
            f"nonce:{self.nonce}",
            f"timestamp:{self.timestamp_ms}",
        ]
        
        if self.positions is not None:
            positions_str = ",".join(str(p) for p in self.positions)
            parts.append(f"positions:{positions_str}")
        
        return "|".join(parts)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        d = {
            "server_seed": self.server_seed,
            "entropy_hex": self.entropy_hex,
            "nonce": self.nonce,
            "timestamp_ms": self.timestamp_ms,
        }
        if self.positions is not None:
            d["positions"] = self.positions
        if self.metadata is not None:
            d["metadata"] = self.metadata
        return d
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CommitmentData":
        """Create from dictionary."""
        return cls(
            server_seed=d["server_seed"],
            entropy_hex=d["entropy_hex"],
            nonce=d["nonce"],
            timestamp_ms=d["timestamp_ms"],
            positions=d.get("positions"),
            metadata=d.get("metadata"),
        )


@dataclass
class Commitment:
    """
    A cryptographic commitment.
    
    The commitment hash proves that the server committed to
    specific data before the player provided their input.
    
    Attributes:
        commitment_hash: SHA-256 hash of commitment data
        timestamp_ms: When commitment was created
        nonce: Unique identifier for this commitment
        data: The committed data (kept secret until reveal)
    """
    commitment_hash: str
    timestamp_ms: int
    nonce: int
    data: CommitmentData
    
    def to_public_dict(self) -> Dict[str, Any]:
        """
        Get public commitment info (without revealing data).
        
        This is what gets shown to the player before they
        provide their input.
        """
        return {
            "commitment_hash": self.commitment_hash,
            "timestamp_ms": self.timestamp_ms,
            "nonce": self.nonce,
        }
    
    def to_full_dict(self) -> Dict[str, Any]:
        """Get full commitment including data (for reveal phase)."""
        return {
            "commitment_hash": self.commitment_hash,
            "timestamp_ms": self.timestamp_ms,
            "nonce": self.nonce,
            "data": self.data.to_dict(),
        }
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Commitment":
        """Create from dictionary."""
        return cls(
            commitment_hash=d["commitment_hash"],
            timestamp_ms=d["timestamp_ms"],
            nonce=d["nonce"],
            data=CommitmentData.from_dict(d["data"]),
        )


def compute_commitment_hash(data: CommitmentData) -> str:
    """
    Compute SHA-256 hash of commitment data.
    
    Args:
        data: The commitment data to hash
        
    Returns:
        64-character lowercase hex string
    """
    commitment_string = data.to_commitment_string()
    return hashlib.sha256(commitment_string.encode('utf-8')).hexdigest()


def create_commitment(
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    positions: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None,
    timestamp_ms: Optional[int] = None,
) -> Commitment:
    """
    Create a new commitment.
    
    This is the main entry point for the commit phase.
    
    Args:
        server_seed: Server's random seed (hex string)
        entropy_hex: Entropy from three-body simulation
        nonce: Unique nonce for replay protection
        positions: Optional locked reel positions
        metadata: Optional additional metadata
        timestamp_ms: Optional timestamp (uses current time if None)
        
    Returns:
        New Commitment instance
        
    Example:
        >>> commitment = create_commitment(
        ...     server_seed="abc123",
        ...     entropy_hex="def456...",
        ...     nonce=1,
        ...     positions=[3, 7, 2, 5, 1],
        ... )
        >>> len(commitment.commitment_hash)
        64
    """
    if timestamp_ms is None:
        timestamp_ms = int(time.time() * 1000)
    
    data = CommitmentData(
        server_seed=server_seed,
        entropy_hex=entropy_hex,
        nonce=nonce,
        timestamp_ms=timestamp_ms,
        positions=positions,
        metadata=metadata,
    )
    
    commitment_hash = compute_commitment_hash(data)
    
    return Commitment(
        commitment_hash=commitment_hash,
        timestamp_ms=timestamp_ms,
        nonce=nonce,
        data=data,
    )


def generate_server_seed(length: int = 32) -> str:
    """
    Generate a cryptographically secure server seed.
    
    Args:
        length: Number of random bytes (default 32)
        
    Returns:
        Hex-encoded random seed
    """
    return secrets.token_hex(length)
