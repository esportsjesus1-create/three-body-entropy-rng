"""
Audit trail verification utilities.

Provides functions for verifying the integrity of the audit trail
and detecting any tampering or gaps in the commitment sequence.
"""

import hashlib
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class AuditVerificationResult:
    """Result of audit trail verification."""
    
    valid: bool
    chain_valid: bool
    gaps_detected: int
    total_entries: int
    error: Optional[str] = None
    gaps: Optional[List[dict]] = None


def compute_entry_hash(
    entry_id: int,
    action: str,
    commitment_hash: str,
    timestamp_ms: int,
    details: dict,
    previous_hash: str,
) -> str:
    """
    Compute hash for an audit entry.
    
    This creates a hash chain where each entry's hash depends
    on the previous entry, making tampering detectable.
    
    Args:
        entry_id: Sequential entry ID
        action: Action type (COMMIT_CREATED, COMMIT_REVEALED, etc.)
        commitment_hash: Hash of the commitment
        timestamp_ms: Entry timestamp
        details: Additional details
        previous_hash: Hash of previous entry (or "genesis" for first)
        
    Returns:
        64-character hex hash
    """
    import json
    
    data = json.dumps({
        "entry_id": entry_id,
        "action": action,
        "commitment_hash": commitment_hash,
        "timestamp_ms": timestamp_ms,
        "details": details,
        "previous_hash": previous_hash,
    }, sort_keys=True)
    
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def verify_chain_integrity(entries: List[Dict[str, Any]]) -> tuple:
    """
    Verify the hash chain integrity of audit entries.
    
    Checks that each entry's hash correctly chains to the previous
    entry, detecting any tampering or modification.
    
    Args:
        entries: List of audit entries with hash and previous_hash fields
        
    Returns:
        Tuple of (is_valid, errors)
    """
    if not entries:
        return True, []
    
    errors = []
    previous_hash = "genesis"
    
    for i, entry in enumerate(entries):
        # Check that previous_hash matches
        if entry.get("previous_hash") != previous_hash:
            errors.append({
                "entry_id": entry.get("entry_id", i),
                "error": "previous_hash_mismatch",
                "expected": previous_hash[:16] + "...",
                "actual": entry.get("previous_hash", "")[:16] + "...",
            })
        
        # Compute expected hash
        expected_hash = compute_entry_hash(
            entry_id=entry.get("entry_id", i),
            action=entry.get("action", ""),
            commitment_hash=entry.get("commitment_hash", ""),
            timestamp_ms=entry.get("timestamp_ms", 0),
            details=entry.get("details", {}),
            previous_hash=entry.get("previous_hash", "genesis"),
        )
        
        # Check that stored hash matches computed
        if entry.get("hash") and entry.get("hash") != expected_hash:
            errors.append({
                "entry_id": entry.get("entry_id", i),
                "error": "hash_mismatch",
                "expected": expected_hash[:16] + "...",
                "actual": entry.get("hash", "")[:16] + "...",
            })
        
        # Update previous hash for next iteration
        previous_hash = entry.get("hash", expected_hash)
    
    return len(errors) == 0, errors


def detect_sequence_gaps(entries: List[Dict[str, Any]]) -> List[dict]:
    """
    Detect gaps in the commitment sequence.
    
    Finds commitments that were created but never revealed or expired,
    which could indicate selective hiding of unfavorable outcomes.
    
    Args:
        entries: List of audit entries
        
    Returns:
        List of gap descriptions
    """
    # Track commitment states
    commitments: Dict[str, dict] = {}
    
    for entry in entries:
        action = entry.get("action", "")
        commitment_hash = entry.get("commitment_hash", "")
        
        if action == "COMMIT_CREATED":
            commitments[commitment_hash] = {
                "created_at": entry.get("timestamp_ms"),
                "entry_id": entry.get("entry_id"),
                "resolved": False,
            }
        elif action in ("COMMIT_REVEALED", "COMMIT_EXPIRED"):
            if commitment_hash in commitments:
                commitments[commitment_hash]["resolved"] = True
                commitments[commitment_hash]["resolved_at"] = entry.get("timestamp_ms")
                commitments[commitment_hash]["resolution"] = action
    
    # Find unresolved commitments
    gaps = []
    for commitment_hash, state in commitments.items():
        if not state["resolved"]:
            gaps.append({
                "commitment_hash": commitment_hash[:16] + "...",
                "created_at": state["created_at"],
                "entry_id": state["entry_id"],
                "status": "unresolved",
            })
    
    return gaps


def verify_audit_trail(entries: List[Dict[str, Any]]) -> AuditVerificationResult:
    """
    Verify a complete audit trail.
    
    Performs comprehensive verification including:
    1. Hash chain integrity
    2. Sequence gap detection
    
    Args:
        entries: List of audit entries
        
    Returns:
        AuditVerificationResult with detailed status
    """
    # Verify chain integrity
    chain_valid, chain_errors = verify_chain_integrity(entries)
    
    # Detect sequence gaps
    gaps = detect_sequence_gaps(entries)
    
    # Overall validity
    valid = chain_valid and len(gaps) == 0
    
    # Build error message
    error = None
    if not valid:
        errors = []
        if not chain_valid:
            errors.append(f"Chain integrity errors: {len(chain_errors)}")
        if gaps:
            errors.append(f"Sequence gaps detected: {len(gaps)}")
        error = "; ".join(errors)
    
    return AuditVerificationResult(
        valid=valid,
        chain_valid=chain_valid,
        gaps_detected=len(gaps),
        total_entries=len(entries),
        error=error,
        gaps=gaps if gaps else None,
    )
