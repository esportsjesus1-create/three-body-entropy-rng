"""
Cryptographic utilities for Three-Body RNG API.
Implements RSA-4096 digital signatures and HKDF entropy mixing per RFC 5869.
"""

import os
import time
import hashlib
import secrets
from typing import Tuple
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend


class RSAKeyManager:
    """Manages RSA-4096 key pair for signing commitments."""
    
    def __init__(self):
        self._private_key = None
        self._public_key = None
        self._public_key_pem = None
        self._generate_keys()
    
    def _generate_keys(self):
        """Generate RSA-4096 key pair."""
        self._private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        self._public_key = self._private_key.public_key()
        self._public_key_pem = self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
    
    def sign(self, data: bytes) -> bytes:
        """Sign data with RSA-4096 private key using PSS padding."""
        signature = self._private_key.sign(
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature
    
    def verify(self, data: bytes, signature: bytes) -> bool:
        """Verify signature with public key."""
        try:
            self._public_key.verify(
                signature,
                data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False
    
    @property
    def public_key_pem(self) -> str:
        """Get public key in PEM format."""
        return self._public_key_pem


class HKDFEntropyMixer:
    """
    HKDF-SHA256 entropy mixing per RFC 5869.
    Combines multiple entropy sources into cryptographically strong output.
    """
    
    @staticmethod
    def mix_entropy(
        random_bytes: bytes,
        hrtime_ns: int,
        system_entropy: bytes,
        info: bytes = b"three-body-rng-entropy",
        length: int = 32
    ) -> bytes:
        """
        Mix multiple entropy sources using HKDF-SHA256.
        
        Args:
            random_bytes: Output from crypto.randomBytes() or os.urandom()
            hrtime_ns: High-resolution time in nanoseconds
            system_entropy: Additional system entropy
            info: Context/application-specific info
            length: Output length in bytes
            
        Returns:
            Derived key material of specified length
        """
        # Combine all entropy sources into input key material (IKM)
        hrtime_bytes = hrtime_ns.to_bytes(8, byteorder='big')
        ikm = random_bytes + hrtime_bytes + system_entropy
        
        # Use SHA256 hash of combined sources as salt for additional mixing
        salt = hashlib.sha256(ikm).digest()
        
        # Apply HKDF
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=length,
            salt=salt,
            info=info,
            backend=default_backend()
        )
        
        return hkdf.derive(ikm)
    
    @staticmethod
    def generate_mixed_entropy(info: bytes = b"three-body-rng-entropy", length: int = 32) -> Tuple[bytes, dict]:
        """
        Generate mixed entropy from multiple sources.
        
        Returns:
            Tuple of (derived_entropy, source_info_dict)
        """
        # Source 1: Cryptographically secure random bytes
        random_bytes = secrets.token_bytes(32)
        
        # Source 2: High-resolution time (nanoseconds)
        hrtime_ns = time.time_ns()
        
        # Source 3: System entropy from /dev/urandom
        system_entropy = os.urandom(32)
        
        # Mix all sources
        derived = HKDFEntropyMixer.mix_entropy(
            random_bytes=random_bytes,
            hrtime_ns=hrtime_ns,
            system_entropy=system_entropy,
            info=info,
            length=length
        )
        
        source_info = {
            "random_bytes_hex": random_bytes.hex(),
            "hrtime_ns": hrtime_ns,
            "system_entropy_hex": system_entropy.hex(),
            "info": info.decode('utf-8'),
            "output_length": length
        }
        
        return derived, source_info


def sha256_hex(data: str) -> str:
    """Compute SHA-256 hash and return as hex string."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def sha256_bytes(data: bytes) -> str:
    """Compute SHA-256 hash of bytes and return as hex string."""
    return hashlib.sha256(data).hexdigest()


# Global key manager instance (keys regenerated on server restart)
key_manager = RSAKeyManager()
