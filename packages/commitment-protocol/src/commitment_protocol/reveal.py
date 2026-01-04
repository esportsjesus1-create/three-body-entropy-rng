"""
Reveal phase of commit/reveal protocol.

Provides verification that revealed data matches commitment.
"""

import hashlib
from dataclasses import dataclass
from typing import Dict, Any, Optional

from .commitment import CommitmentData, compute_commitment_hash


@dataclass
class RevealData:
    """
    Data revealed after player input.
    
    This contains the original commitment data plus the
    player's input, allowing full verification.
    
    Attributes:
        commitment_hash: Original commitment hash
        server_seed: Server's random seed
        entropy_hex: Entropy from simulation
        nonce: Commitment nonce
        timestamp_ms: Commitment timestamp
        positions: Locked reel positions
        client_seed: Player's input seed
        result: Final game result
    """
    commitment_hash: str
    server_seed: str
    entropy_hex: str
    nonce: int
    timestamp_ms: int
    positions: Optional[list] = None
    client_seed: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        d = {
            "commitment_hash": self.commitment_hash,
            "server_seed": self.server_seed,
            "entropy_hex": self.entropy_hex,
            "nonce": self.nonce,
            "timestamp_ms": self.timestamp_ms,
        }
        if self.positions is not None:
            d["positions"] = self.positions
        if self.client_seed is not None:
            d["client_seed"] = self.client_seed
        if self.result is not None:
            d["result"] = self.result
        return d
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RevealData":
        """Create from dictionary."""
        return cls(
            commitment_hash=d["commitment_hash"],
            server_seed=d["server_seed"],
            entropy_hex=d["entropy_hex"],
            nonce=d["nonce"],
            timestamp_ms=d["timestamp_ms"],
            positions=d.get("positions"),
            client_seed=d.get("client_seed"),
            result=d.get("result"),
        )


@dataclass
class VerificationResult:
    """
    Result of commitment verification.
    
    Attributes:
        valid: Whether verification passed
        commitment_matches: Whether hash matches revealed data
        timestamp_valid: Whether timestamp is within acceptable range
        nonce_valid: Whether nonce is valid (not reused)
        error: Error message if verification failed
    """
    valid: bool
    commitment_matches: bool
    timestamp_valid: bool
    nonce_valid: bool
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        d = {
            "valid": self.valid,
            "commitment_matches": self.commitment_matches,
            "timestamp_valid": self.timestamp_valid,
            "nonce_valid": self.nonce_valid,
        }
        if self.error:
            d["error"] = self.error
        return d


def verify_reveal(
    reveal: RevealData,
    max_age_ms: int = 300000,  # 5 minutes default
    current_time_ms: Optional[int] = None,
    used_nonces: Optional[set] = None,
) -> VerificationResult:
    """
    Verify that revealed data matches commitment.
    
    This is the main verification function that checks:
    1. Commitment hash matches revealed data
    2. Timestamp is within acceptable range
    3. Nonce has not been reused
    
    Args:
        reveal: The revealed data to verify
        max_age_ms: Maximum age of commitment in milliseconds
        current_time_ms: Current time (uses actual time if None)
        used_nonces: Set of already-used nonces for replay protection
        
    Returns:
        VerificationResult with detailed status
        
    Example:
        >>> result = verify_reveal(reveal_data)
        >>> if result.valid:
        ...     print("Verification passed!")
        >>> else:
        ...     print(f"Failed: {result.error}")
    """
    import time
    
    if current_time_ms is None:
        current_time_ms = int(time.time() * 1000)
    
    # Check nonce
    nonce_valid = True
    if used_nonces is not None and reveal.nonce in used_nonces:
        return VerificationResult(
            valid=False,
            commitment_matches=False,
            timestamp_valid=False,
            nonce_valid=False,
            error=f"Nonce {reveal.nonce} has already been used",
        )
    
    # Check timestamp
    age_ms = current_time_ms - reveal.timestamp_ms
    timestamp_valid = 0 <= age_ms <= max_age_ms
    
    if not timestamp_valid:
        return VerificationResult(
            valid=False,
            commitment_matches=False,
            timestamp_valid=False,
            nonce_valid=nonce_valid,
            error=f"Commitment too old: {age_ms}ms (max {max_age_ms}ms)",
        )
    
    # Reconstruct commitment data and verify hash
    data = CommitmentData(
        server_seed=reveal.server_seed,
        entropy_hex=reveal.entropy_hex,
        nonce=reveal.nonce,
        timestamp_ms=reveal.timestamp_ms,
        positions=reveal.positions,
    )
    
    computed_hash = compute_commitment_hash(data)
    commitment_matches = computed_hash == reveal.commitment_hash
    
    if not commitment_matches:
        return VerificationResult(
            valid=False,
            commitment_matches=False,
            timestamp_valid=timestamp_valid,
            nonce_valid=nonce_valid,
            error="Commitment hash does not match revealed data",
        )
    
    return VerificationResult(
        valid=True,
        commitment_matches=True,
        timestamp_valid=timestamp_valid,
        nonce_valid=nonce_valid,
    )


def create_reveal_from_commitment(
    commitment_hash: str,
    data: CommitmentData,
    client_seed: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
) -> RevealData:
    """
    Create reveal data from a commitment.
    
    Args:
        commitment_hash: The original commitment hash
        data: The committed data
        client_seed: Player's input seed
        result: Final game result
        
    Returns:
        RevealData instance
    """
    return RevealData(
        commitment_hash=commitment_hash,
        server_seed=data.server_seed,
        entropy_hex=data.entropy_hex,
        nonce=data.nonce,
        timestamp_ms=data.timestamp_ms,
        positions=data.positions,
        client_seed=client_seed,
        result=result,
    )
