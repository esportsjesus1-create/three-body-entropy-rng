"""
SHA-256 hashing utilities.

Provides consistent hashing functions used throughout the Three-Body RNG system
for commitment generation and verification.
"""

import hashlib
from typing import Union


def sha256_bytes(data: Union[str, bytes]) -> bytes:
    """
    Compute SHA-256 hash of data, returning raw bytes.
    
    Args:
        data: Input data as string or bytes. Strings are UTF-8 encoded.
        
    Returns:
        32-byte SHA-256 hash digest.
        
    Examples:
        >>> sha256_bytes("hello").hex()[:16]
        '2cf24dba5fb0a30e'
        >>> sha256_bytes(b"hello").hex()[:16]
        '2cf24dba5fb0a30e'
    """
    if isinstance(data, str):
        data = data.encode('utf-8')
    return hashlib.sha256(data).digest()


def sha256_hex(data: Union[str, bytes]) -> str:
    """
    Compute SHA-256 hash of data, returning hex string.
    
    Args:
        data: Input data as string or bytes. Strings are UTF-8 encoded.
        
    Returns:
        64-character lowercase hex string of SHA-256 hash.
        
    Examples:
        >>> sha256_hex("hello")[:16]
        '2cf24dba5fb0a30e'
        >>> len(sha256_hex("test"))
        64
    """
    return sha256_bytes(data).hex()
