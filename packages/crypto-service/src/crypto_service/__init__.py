"""
Crypto Service - RSA-4096 Digital Signatures and HKDF-SHA256 Entropy Mixing

This module provides cryptographic primitives for the Three-Body RNG system:
- RSA-4096 key generation and PSS-SHA256 signing
- HKDF-SHA256 entropy mixing per RFC 5869
- SHA-256 hashing utilities
"""

from .rsa import RSAKeyManager
from .hkdf import HKDFEntropyMixer
from .hash import sha256_hex, sha256_bytes

__all__ = [
    "RSAKeyManager",
    "HKDFEntropyMixer",
    "sha256_hex",
    "sha256_bytes",
]

__version__ = "1.0.0"
