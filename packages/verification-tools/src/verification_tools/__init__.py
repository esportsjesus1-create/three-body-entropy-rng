"""
Verification Tools for Three-Body RNG.

Standalone utilities for players to independently verify game outcomes.
"""

from .verifier import (
    verify_game_outcome,
    verify_commitment_hash,
    verify_entropy_derivation,
    VerificationResult,
)
from .audit_verifier import (
    verify_audit_trail,
    verify_chain_integrity,
    AuditVerificationResult,
)

__all__ = [
    "verify_game_outcome",
    "verify_commitment_hash",
    "verify_entropy_derivation",
    "VerificationResult",
    "verify_audit_trail",
    "verify_chain_integrity",
    "AuditVerificationResult",
]
