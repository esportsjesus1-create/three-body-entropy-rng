"""
Commitment Protocol - Commit/Reveal for Provably Fair RNG

This module provides the commit/reveal protocol for the Three-Body RNG system.
It is a standalone library with no FastAPI dependencies.

Key Features:
- Commitment creation with SHA-256 hashing
- Timestamp validation for timing attacks
- Nonce tracking for replay protection
- Hash chain linking for audit trails
"""

from .commitment import Commitment, CommitmentData, create_commitment
from .reveal import RevealData, verify_reveal
from .nonce import NonceTracker
from .chain import HashChain, ChainEntry

__all__ = [
    "Commitment",
    "CommitmentData",
    "create_commitment",
    "RevealData",
    "verify_reveal",
    "NonceTracker",
    "HashChain",
    "ChainEntry",
]

__version__ = "1.0.0"
