"""
HKDF-SHA256 Entropy Mixing per RFC 5869.

Provides cryptographically secure entropy mixing by combining multiple
entropy sources using the HMAC-based Key Derivation Function (HKDF).

Security Properties:
- Combines multiple entropy sources for defense in depth
- Uses SHA-256 for both extraction and expansion phases
- Follows RFC 5869 specification exactly
- Output is computationally indistinguishable from random
"""

import hashlib
import os
import secrets
import time
from dataclasses import dataclass
from typing import Tuple, Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


@dataclass
class EntropySourceInfo:
    """Information about entropy sources used in mixing."""
    random_bytes_hex: str
    hrtime_ns: int
    system_entropy_hex: str
    info: str
    output_length: int
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "random_bytes_hex": self.random_bytes_hex,
            "hrtime_ns": self.hrtime_ns,
            "system_entropy_hex": self.system_entropy_hex,
            "info": self.info,
            "output_length": self.output_length,
        }


class HKDFEntropyMixer:
    """
    HKDF-SHA256 entropy mixing per RFC 5869.
    
    This class combines multiple entropy sources using HKDF to produce
    cryptographically secure derived keys. The mixing process ensures
    that even if one entropy source is compromised, the output remains
    secure as long as at least one source provides sufficient entropy.
    
    Entropy Sources:
    1. secrets.token_bytes() - Python's cryptographically secure random
    2. time.time_ns() - High-resolution timestamp (nanoseconds)
    3. os.urandom() - System entropy from /dev/urandom
    
    Example:
        >>> mixer = HKDFEntropyMixer()
        >>> entropy, info = mixer.generate()
        >>> len(entropy)
        32
        >>> isinstance(info, EntropySourceInfo)
        True
    """
    
    DEFAULT_INFO = b"three-body-rng-entropy"
    DEFAULT_LENGTH = 32
    
    @staticmethod
    def mix_entropy(
        random_bytes: bytes,
        hrtime_ns: int,
        system_entropy: bytes,
        info: bytes = DEFAULT_INFO,
        length: int = DEFAULT_LENGTH,
        salt: Optional[bytes] = None,
    ) -> bytes:
        """
        Mix multiple entropy sources using HKDF-SHA256.
        
        This implements the HKDF algorithm from RFC 5869:
        1. Extract: Combine all inputs into a pseudorandom key
        2. Expand: Derive output key material of desired length
        
        Args:
            random_bytes: Cryptographically secure random bytes.
            hrtime_ns: High-resolution timestamp in nanoseconds.
            system_entropy: System entropy bytes (e.g., from /dev/urandom).
            info: Context/application-specific info string.
            length: Desired output length in bytes (max 255 * 32 = 8160).
            salt: Optional salt for HKDF. If None, uses hash of combined inputs.
            
        Returns:
            Derived key material of specified length.
            
        Raises:
            ValueError: If length exceeds maximum (8160 bytes).
            
        Example:
            >>> result = HKDFEntropyMixer.mix_entropy(
            ...     random_bytes=b'\\x00' * 32,
            ...     hrtime_ns=1234567890,
            ...     system_entropy=b'\\x01' * 32,
            ... )
            >>> len(result)
            32
        """
        if length > 255 * 32:
            raise ValueError(f"length must be <= 8160, got {length}")
        
        # Convert hrtime to bytes (big-endian, 8 bytes)
        hrtime_bytes = hrtime_ns.to_bytes(8, byteorder='big')
        
        # Combine all entropy sources into input key material (IKM)
        ikm = random_bytes + hrtime_bytes + system_entropy
        
        # Use hash of combined sources as salt if not provided
        # This provides additional mixing before HKDF
        if salt is None:
            salt = hashlib.sha256(ikm).digest()
        
        # Apply HKDF-SHA256
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=length,
            salt=salt,
            info=info,
            backend=default_backend()
        )
        
        return hkdf.derive(ikm)
    
    @classmethod
    def generate(
        cls,
        info: bytes = DEFAULT_INFO,
        length: int = DEFAULT_LENGTH,
    ) -> Tuple[bytes, EntropySourceInfo]:
        """
        Generate mixed entropy from multiple fresh sources.
        
        This method gathers entropy from three independent sources
        and mixes them using HKDF-SHA256.
        
        Args:
            info: Context/application-specific info string.
            length: Desired output length in bytes.
            
        Returns:
            Tuple of (derived_entropy, source_info).
            
        Example:
            >>> entropy, info = HKDFEntropyMixer.generate()
            >>> len(entropy)
            32
            >>> info.output_length
            32
        """
        # Source 1: Cryptographically secure random bytes
        random_bytes = secrets.token_bytes(32)
        
        # Source 2: High-resolution time (nanoseconds)
        hrtime_ns = time.time_ns()
        
        # Source 3: System entropy from /dev/urandom
        system_entropy = os.urandom(32)
        
        # Mix all sources
        derived = cls.mix_entropy(
            random_bytes=random_bytes,
            hrtime_ns=hrtime_ns,
            system_entropy=system_entropy,
            info=info,
            length=length,
        )
        
        # Create source info for transparency/auditing
        source_info = EntropySourceInfo(
            random_bytes_hex=random_bytes.hex(),
            hrtime_ns=hrtime_ns,
            system_entropy_hex=system_entropy.hex(),
            info=info.decode('utf-8') if isinstance(info, bytes) else info,
            output_length=length,
        )
        
        return derived, source_info
    
    @staticmethod
    def generate_mixed_entropy(
        info: bytes = DEFAULT_INFO,
        length: int = DEFAULT_LENGTH,
    ) -> Tuple[bytes, dict]:
        """
        Generate mixed entropy and return source info as dict.
        
        Convenience method that returns source info as a dictionary
        for easy JSON serialization.
        
        Args:
            info: Context/application-specific info string.
            length: Desired output length in bytes.
            
        Returns:
            Tuple of (derived_entropy, source_info_dict).
        """
        derived, source_info = HKDFEntropyMixer.generate(info, length)
        return derived, source_info.to_dict()
    
    @staticmethod
    def derive_from_seed(
        seed: bytes,
        info: bytes = DEFAULT_INFO,
        length: int = DEFAULT_LENGTH,
    ) -> bytes:
        """
        Derive entropy deterministically from a seed.
        
        This is useful for reproducible entropy generation where
        the same seed should always produce the same output.
        
        Args:
            seed: Input seed bytes.
            info: Context/application-specific info string.
            length: Desired output length in bytes.
            
        Returns:
            Derived key material of specified length.
            
        Example:
            >>> seed = bytes.fromhex("abc123")
            >>> result1 = HKDFEntropyMixer.derive_from_seed(seed)
            >>> result2 = HKDFEntropyMixer.derive_from_seed(seed)
            >>> result1 == result2
            True
        """
        # Use fixed salt for deterministic derivation
        salt = hashlib.sha256(b"three-body-rng-deterministic-salt").digest()
        
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=length,
            salt=salt,
            info=info,
            backend=default_backend()
        )
        
        return hkdf.derive(seed)
