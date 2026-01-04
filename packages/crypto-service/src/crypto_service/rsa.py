"""
RSA-4096 Key Management and Digital Signatures.

Provides RSA key generation, signing with PSS padding, and signature verification
for commitment integrity in the Three-Body RNG system.

Security Properties:
- 4096-bit RSA keys provide ~140 bits of security
- PSS padding with SHA-256 provides probabilistic signatures
- MGF1 mask generation function for additional security
"""

import base64
from typing import Optional, Tuple

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from cryptography.exceptions import InvalidSignature


class RSAKeyManager:
    """
    Manages RSA-4096 key pair for signing commitments.
    
    This class generates and manages RSA key pairs used to sign
    commitment hashes, providing non-repudiation and integrity
    guarantees for the provably fair system.
    
    Attributes:
        public_key_pem: The public key in PEM format for distribution.
        
    Example:
        >>> manager = RSAKeyManager()
        >>> signature = manager.sign(b"commitment_hash")
        >>> manager.verify(b"commitment_hash", signature)
        True
        >>> manager.verify(b"tampered_hash", signature)
        False
    """
    
    def __init__(self, private_key: Optional[RSAPrivateKey] = None):
        """
        Initialize RSA key manager.
        
        Args:
            private_key: Optional existing private key. If None, generates new 4096-bit key.
        """
        self._private_key: RSAPrivateKey
        self._public_key: RSAPublicKey
        self._public_key_pem: str
        
        if private_key is not None:
            self._private_key = private_key
            self._public_key = private_key.public_key()
        else:
            self._generate_keys()
        
        self._public_key_pem = self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
    
    def _generate_keys(self) -> None:
        """Generate new RSA-4096 key pair."""
        self._private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        self._public_key = self._private_key.public_key()
    
    def sign(self, data: bytes) -> bytes:
        """
        Sign data with RSA-4096 private key using PSS padding.
        
        Args:
            data: The data to sign (typically a commitment hash).
            
        Returns:
            Raw signature bytes (512 bytes for RSA-4096).
            
        Raises:
            TypeError: If data is not bytes.
        """
        if not isinstance(data, bytes):
            raise TypeError(f"data must be bytes, got {type(data).__name__}")
        
        signature = self._private_key.sign(
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature
    
    def sign_base64(self, data: bytes) -> str:
        """
        Sign data and return base64-encoded signature.
        
        Args:
            data: The data to sign.
            
        Returns:
            Base64-encoded signature string.
        """
        return base64.b64encode(self.sign(data)).decode('utf-8')
    
    def verify(self, data: bytes, signature: bytes) -> bool:
        """
        Verify signature against data using public key.
        
        Args:
            data: The original data that was signed.
            signature: The signature to verify.
            
        Returns:
            True if signature is valid, False otherwise.
        """
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
        except InvalidSignature:
            return False
        except Exception:
            return False
    
    def verify_base64(self, data: bytes, signature_b64: str) -> bool:
        """
        Verify base64-encoded signature against data.
        
        Args:
            data: The original data that was signed.
            signature_b64: Base64-encoded signature string.
            
        Returns:
            True if signature is valid, False otherwise.
        """
        try:
            signature = base64.b64decode(signature_b64)
            return self.verify(data, signature)
        except Exception:
            return False
    
    @property
    def public_key_pem(self) -> str:
        """Get public key in PEM format for distribution."""
        return self._public_key_pem
    
    @property
    def key_size(self) -> int:
        """Get the RSA key size in bits."""
        return self._private_key.key_size
    
    def export_private_key_pem(self, password: Optional[bytes] = None) -> str:
        """
        Export private key in PEM format.
        
        WARNING: Handle private keys with extreme care. Never log or expose them.
        
        Args:
            password: Optional password to encrypt the private key.
            
        Returns:
            PEM-encoded private key string.
        """
        encryption = (
            serialization.BestAvailableEncryption(password)
            if password
            else serialization.NoEncryption()
        )
        return self._private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=encryption
        ).decode('utf-8')
    
    @classmethod
    def from_private_key_pem(cls, pem_data: str, password: Optional[bytes] = None) -> "RSAKeyManager":
        """
        Create RSAKeyManager from existing PEM-encoded private key.
        
        Args:
            pem_data: PEM-encoded private key string.
            password: Password if the key is encrypted.
            
        Returns:
            New RSAKeyManager instance with the loaded key.
        """
        private_key = serialization.load_pem_private_key(
            pem_data.encode('utf-8'),
            password=password,
            backend=default_backend()
        )
        return cls(private_key=private_key)


def create_verifier_from_public_key(public_key_pem: str) -> "PublicKeyVerifier":
    """
    Create a verifier from a public key PEM string.
    
    This is useful for clients who only need to verify signatures
    without access to the private key.
    
    Args:
        public_key_pem: PEM-encoded public key string.
        
    Returns:
        PublicKeyVerifier instance for signature verification.
    """
    return PublicKeyVerifier(public_key_pem)


class PublicKeyVerifier:
    """
    Signature verifier using only the public key.
    
    This class is for clients who need to verify signatures
    but don't have access to the private key.
    """
    
    def __init__(self, public_key_pem: str):
        """
        Initialize verifier with public key.
        
        Args:
            public_key_pem: PEM-encoded public key string.
        """
        self._public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8'),
            backend=default_backend()
        )
        self._public_key_pem = public_key_pem
    
    def verify(self, data: bytes, signature: bytes) -> bool:
        """
        Verify signature against data.
        
        Args:
            data: The original data that was signed.
            signature: The signature to verify.
            
        Returns:
            True if signature is valid, False otherwise.
        """
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
        except InvalidSignature:
            return False
        except Exception:
            return False
    
    def verify_base64(self, data: bytes, signature_b64: str) -> bool:
        """
        Verify base64-encoded signature against data.
        
        Args:
            data: The original data that was signed.
            signature_b64: Base64-encoded signature string.
            
        Returns:
            True if signature is valid, False otherwise.
        """
        try:
            signature = base64.b64decode(signature_b64)
            return self.verify(data, signature)
        except Exception:
            return False
    
    @property
    def public_key_pem(self) -> str:
        """Get the public key in PEM format."""
        return self._public_key_pem
