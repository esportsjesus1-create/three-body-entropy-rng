"""Tests for RSA-4096 key management and signatures."""

import base64
import pytest
from crypto_service.rsa import RSAKeyManager, PublicKeyVerifier, create_verifier_from_public_key


class TestRSAKeyManager:
    """Tests for RSAKeyManager class."""
    
    def test_key_generation(self):
        """Test that key generation produces 4096-bit key."""
        manager = RSAKeyManager()
        assert manager.key_size == 4096
    
    def test_public_key_pem_format(self):
        """Test that public key is in PEM format."""
        manager = RSAKeyManager()
        pem = manager.public_key_pem
        assert pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert pem.strip().endswith("-----END PUBLIC KEY-----")
    
    def test_sign_returns_bytes(self):
        """Test that sign returns bytes."""
        manager = RSAKeyManager()
        signature = manager.sign(b"test data")
        assert isinstance(signature, bytes)
        # RSA-4096 signature is 512 bytes
        assert len(signature) == 512
    
    def test_sign_requires_bytes(self):
        """Test that sign raises TypeError for non-bytes input."""
        manager = RSAKeyManager()
        with pytest.raises(TypeError):
            manager.sign("string data")
    
    def test_sign_base64(self):
        """Test that sign_base64 returns valid base64."""
        manager = RSAKeyManager()
        signature_b64 = manager.sign_base64(b"test data")
        assert isinstance(signature_b64, str)
        # Should be valid base64
        decoded = base64.b64decode(signature_b64)
        assert len(decoded) == 512
    
    def test_verify_valid_signature(self):
        """Test verification of valid signature."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        assert manager.verify(data, signature) is True
    
    def test_verify_invalid_signature(self):
        """Test verification of invalid signature."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        # Tamper with signature
        tampered = bytes([signature[0] ^ 0xFF]) + signature[1:]
        assert manager.verify(data, tampered) is False
    
    def test_verify_wrong_data(self):
        """Test verification with wrong data."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        assert manager.verify(b"wrong data", signature) is False
    
    def test_verify_base64_valid(self):
        """Test base64 signature verification."""
        manager = RSAKeyManager()
        data = b"test data"
        signature_b64 = manager.sign_base64(data)
        assert manager.verify_base64(data, signature_b64) is True
    
    def test_verify_base64_invalid(self):
        """Test base64 verification with invalid signature."""
        manager = RSAKeyManager()
        data = b"test data"
        assert manager.verify_base64(data, "invalid_base64!!!") is False
    
    def test_different_keys_different_signatures(self):
        """Test that different keys produce different signatures."""
        manager1 = RSAKeyManager()
        manager2 = RSAKeyManager()
        data = b"test data"
        sig1 = manager1.sign(data)
        sig2 = manager2.sign(data)
        assert sig1 != sig2
    
    def test_export_private_key_unencrypted(self):
        """Test exporting unencrypted private key."""
        manager = RSAKeyManager()
        pem = manager.export_private_key_pem()
        assert "-----BEGIN PRIVATE KEY-----" in pem
        assert "-----END PRIVATE KEY-----" in pem
    
    def test_export_private_key_encrypted(self):
        """Test exporting encrypted private key."""
        manager = RSAKeyManager()
        pem = manager.export_private_key_pem(password=b"secret")
        assert "-----BEGIN ENCRYPTED PRIVATE KEY-----" in pem
    
    def test_from_private_key_pem(self):
        """Test loading key from PEM."""
        manager1 = RSAKeyManager()
        pem = manager1.export_private_key_pem()
        
        manager2 = RSAKeyManager.from_private_key_pem(pem)
        
        # Should produce same signatures
        data = b"test data"
        sig1 = manager1.sign(data)
        # Note: PSS is probabilistic, so signatures differ
        # But both should verify
        assert manager2.verify(data, sig1) is True
    
    def test_from_private_key_pem_encrypted(self):
        """Test loading encrypted key from PEM."""
        manager1 = RSAKeyManager()
        password = b"secret123"
        pem = manager1.export_private_key_pem(password=password)
        
        manager2 = RSAKeyManager.from_private_key_pem(pem, password=password)
        
        data = b"test data"
        sig1 = manager1.sign(data)
        assert manager2.verify(data, sig1) is True
    
    def test_sign_empty_data(self):
        """Test signing empty data."""
        manager = RSAKeyManager()
        signature = manager.sign(b"")
        assert len(signature) == 512
        assert manager.verify(b"", signature) is True


class TestPublicKeyVerifier:
    """Tests for PublicKeyVerifier class."""
    
    def test_verify_valid_signature(self):
        """Test verification with valid signature."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        
        verifier = PublicKeyVerifier(manager.public_key_pem)
        assert verifier.verify(data, signature) is True
    
    def test_verify_invalid_signature(self):
        """Test verification with invalid signature."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        
        verifier = PublicKeyVerifier(manager.public_key_pem)
        tampered = bytes([signature[0] ^ 0xFF]) + signature[1:]
        assert verifier.verify(data, tampered) is False
    
    def test_verify_base64(self):
        """Test base64 verification."""
        manager = RSAKeyManager()
        data = b"test data"
        signature_b64 = manager.sign_base64(data)
        
        verifier = PublicKeyVerifier(manager.public_key_pem)
        assert verifier.verify_base64(data, signature_b64) is True
    
    def test_public_key_pem_property(self):
        """Test public_key_pem property."""
        manager = RSAKeyManager()
        verifier = PublicKeyVerifier(manager.public_key_pem)
        assert verifier.public_key_pem == manager.public_key_pem
    
    def test_cannot_verify_with_wrong_key(self):
        """Test that wrong public key fails verification."""
        manager1 = RSAKeyManager()
        manager2 = RSAKeyManager()
        
        data = b"test data"
        signature = manager1.sign(data)
        
        verifier = PublicKeyVerifier(manager2.public_key_pem)
        assert verifier.verify(data, signature) is False


class TestCreateVerifierFromPublicKey:
    """Tests for create_verifier_from_public_key function."""
    
    def test_creates_verifier(self):
        """Test that function creates a verifier."""
        manager = RSAKeyManager()
        verifier = create_verifier_from_public_key(manager.public_key_pem)
        assert isinstance(verifier, PublicKeyVerifier)
    
    def test_verifier_works(self):
        """Test that created verifier works."""
        manager = RSAKeyManager()
        data = b"test data"
        signature = manager.sign(data)
        
        verifier = create_verifier_from_public_key(manager.public_key_pem)
        assert verifier.verify(data, signature) is True
