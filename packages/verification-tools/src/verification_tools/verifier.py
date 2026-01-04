"""
Game outcome verification utilities.

Provides functions for players to independently verify that
game outcomes match the committed values.
"""

import hashlib
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class VerificationResult:
    """Result of a verification check."""
    
    valid: bool
    commitment_matches: bool
    entropy_valid: bool
    positions_valid: bool
    error: Optional[str] = None
    details: Optional[dict] = None


def compute_commitment_hash(
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    timestamp_ms: int,
    positions: List[int],
) -> str:
    """
    Compute SHA-256 commitment hash.
    
    This is the same algorithm used by the server, allowing
    independent verification of commitments.
    
    Args:
        server_seed: Server's random seed
        entropy_hex: Derived entropy value
        nonce: Unique nonce for this commitment
        timestamp_ms: Commitment timestamp in milliseconds
        positions: Reel positions derived from entropy
        
    Returns:
        64-character hex hash
    """
    parts = [
        f"server_seed:{server_seed}",
        f"entropy:{entropy_hex}",
        f"nonce:{nonce}",
        f"timestamp:{timestamp_ms}",
        f"positions:{','.join(str(p) for p in positions)}",
    ]
    data = "|".join(parts)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def derive_entropy(seed: str) -> str:
    """
    Derive entropy from seed.
    
    This is the simplified entropy derivation used by the API.
    For production, this would use the physics-engine module.
    
    Args:
        seed: Server seed
        
    Returns:
        64-character hex entropy
    """
    return hashlib.sha256(seed.encode('utf-8')).hexdigest()


def derive_positions(entropy: str, num_reels: int, symbols_per_reel: int = 10) -> List[int]:
    """
    Derive reel positions from entropy.
    
    Args:
        entropy: 64-character hex entropy
        num_reels: Number of reels
        symbols_per_reel: Number of symbols per reel (default 10)
        
    Returns:
        List of positions for each reel
    """
    positions = []
    for i in range(num_reels):
        # Use different parts of entropy for each reel
        chunk = entropy[i*8:(i+1)*8]
        position = int(chunk, 16) % symbols_per_reel
        positions.append(position)
    return positions


def verify_commitment_hash(
    commitment_hash: str,
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    timestamp_ms: int,
    positions: List[int],
) -> bool:
    """
    Verify that a commitment hash matches the revealed data.
    
    Args:
        commitment_hash: Hash that was shown before the game
        server_seed: Revealed server seed
        entropy_hex: Revealed entropy
        nonce: Revealed nonce
        timestamp_ms: Revealed timestamp
        positions: Revealed positions
        
    Returns:
        True if hash matches, False otherwise
    """
    computed = compute_commitment_hash(
        server_seed=server_seed,
        entropy_hex=entropy_hex,
        nonce=nonce,
        timestamp_ms=timestamp_ms,
        positions=positions,
    )
    return computed == commitment_hash


def verify_entropy_derivation(
    server_seed: str,
    entropy_hex: str,
    positions: List[int],
    num_reels: int = 5,
    symbols_per_reel: int = 10,
) -> bool:
    """
    Verify that entropy and positions were correctly derived from seed.
    
    Args:
        server_seed: Server seed
        entropy_hex: Claimed entropy
        positions: Claimed positions
        num_reels: Number of reels
        symbols_per_reel: Symbols per reel
        
    Returns:
        True if derivation is correct, False otherwise
    """
    # Verify entropy
    expected_entropy = derive_entropy(server_seed)
    if expected_entropy != entropy_hex:
        return False
    
    # Verify positions
    expected_positions = derive_positions(entropy_hex, num_reels, symbols_per_reel)
    return expected_positions == positions


def verify_game_outcome(
    commitment_hash: str,
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    timestamp_ms: int,
    positions: List[int],
    num_reels: int = 5,
    symbols_per_reel: int = 10,
) -> VerificationResult:
    """
    Verify a complete game outcome.
    
    This is the main verification function that checks:
    1. Commitment hash matches revealed data
    2. Entropy was correctly derived from seed
    3. Positions were correctly derived from entropy
    
    Args:
        commitment_hash: Hash shown before game
        server_seed: Revealed server seed
        entropy_hex: Revealed entropy
        nonce: Revealed nonce
        timestamp_ms: Revealed timestamp
        positions: Revealed positions
        num_reels: Number of reels
        symbols_per_reel: Symbols per reel
        
    Returns:
        VerificationResult with detailed status
    """
    # Check commitment hash
    commitment_matches = verify_commitment_hash(
        commitment_hash=commitment_hash,
        server_seed=server_seed,
        entropy_hex=entropy_hex,
        nonce=nonce,
        timestamp_ms=timestamp_ms,
        positions=positions,
    )
    
    # Check entropy derivation
    expected_entropy = derive_entropy(server_seed)
    entropy_valid = expected_entropy == entropy_hex
    
    # Check positions derivation
    expected_positions = derive_positions(entropy_hex, num_reels, symbols_per_reel)
    positions_valid = expected_positions == positions
    
    # Overall validity
    valid = commitment_matches and entropy_valid and positions_valid
    
    # Build error message if invalid
    error = None
    if not valid:
        errors = []
        if not commitment_matches:
            errors.append("Commitment hash does not match revealed data")
        if not entropy_valid:
            errors.append(f"Entropy mismatch: expected {expected_entropy[:16]}..., got {entropy_hex[:16]}...")
        if not positions_valid:
            errors.append(f"Positions mismatch: expected {expected_positions}, got {positions}")
        error = "; ".join(errors)
    
    return VerificationResult(
        valid=valid,
        commitment_matches=commitment_matches,
        entropy_valid=entropy_valid,
        positions_valid=positions_valid,
        error=error,
        details={
            "expected_entropy": expected_entropy,
            "expected_positions": expected_positions,
            "computed_hash": compute_commitment_hash(
                server_seed=server_seed,
                entropy_hex=entropy_hex,
                nonce=nonce,
                timestamp_ms=timestamp_ms,
                positions=positions,
            ),
        },
    )
