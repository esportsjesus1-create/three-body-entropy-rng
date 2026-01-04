"""Tests for SHA-256 hashing utilities."""

import pytest
from crypto_service.hash import sha256_bytes, sha256_hex


class TestSha256Bytes:
    """Tests for sha256_bytes function."""
    
    def test_string_input(self):
        """Test hashing a string."""
        result = sha256_bytes("hello")
        assert len(result) == 32
        assert result.hex().startswith("2cf24dba5fb0a30e")
    
    def test_bytes_input(self):
        """Test hashing bytes."""
        result = sha256_bytes(b"hello")
        assert len(result) == 32
        assert result.hex().startswith("2cf24dba5fb0a30e")
    
    def test_string_and_bytes_equal(self):
        """Test that string and bytes produce same hash."""
        assert sha256_bytes("hello") == sha256_bytes(b"hello")
    
    def test_empty_string(self):
        """Test hashing empty string."""
        result = sha256_bytes("")
        # SHA-256 of empty string is well-known
        assert result.hex() == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    
    def test_empty_bytes(self):
        """Test hashing empty bytes."""
        result = sha256_bytes(b"")
        assert result.hex() == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    
    def test_unicode_string(self):
        """Test hashing unicode string."""
        result = sha256_bytes("hello 世界")
        assert len(result) == 32
    
    def test_different_inputs_different_hashes(self):
        """Test that different inputs produce different hashes."""
        assert sha256_bytes("hello") != sha256_bytes("world")
    
    def test_deterministic(self):
        """Test that same input always produces same hash."""
        assert sha256_bytes("test") == sha256_bytes("test")


class TestSha256Hex:
    """Tests for sha256_hex function."""
    
    def test_string_input(self):
        """Test hashing a string returns hex."""
        result = sha256_hex("hello")
        assert len(result) == 64
        assert result.startswith("2cf24dba5fb0a30e")
    
    def test_bytes_input(self):
        """Test hashing bytes returns hex."""
        result = sha256_hex(b"hello")
        assert len(result) == 64
    
    def test_lowercase_hex(self):
        """Test that output is lowercase hex."""
        result = sha256_hex("test")
        assert result == result.lower()
        assert all(c in "0123456789abcdef" for c in result)
    
    def test_empty_input(self):
        """Test hashing empty input."""
        result = sha256_hex("")
        assert result == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    
    def test_consistency_with_bytes(self):
        """Test that hex matches bytes.hex()."""
        data = "test data"
        assert sha256_hex(data) == sha256_bytes(data).hex()
    
    def test_known_vector(self):
        """Test against known SHA-256 test vector."""
        # NIST test vector
        result = sha256_hex("abc")
        assert result == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
