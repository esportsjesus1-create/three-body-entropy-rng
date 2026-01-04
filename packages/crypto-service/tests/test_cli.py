"""Tests for crypto-service CLI."""

import json
import pytest
import tempfile
from pathlib import Path

from crypto_service.cli import main, cmd_keygen, cmd_sign, cmd_verify, cmd_entropy, cmd_hash


class TestCmdKeygen:
    """Tests for keygen command."""
    
    def test_keygen_basic(self, capsys):
        """Test basic key generation."""
        result = main(["keygen"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert "public_key_pem" in output
        assert "key_size" in output
        assert output["key_size"] == 4096
        assert "private_key_pem" not in output
    
    def test_keygen_include_private(self, capsys):
        """Test key generation with private key."""
        result = main(["keygen", "--include-private"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert "private_key_pem" in output
        assert "-----BEGIN PRIVATE KEY-----" in output["private_key_pem"]
    
    def test_keygen_encrypted_private(self, capsys):
        """Test key generation with encrypted private key."""
        result = main(["keygen", "--include-private", "--password", "secret123"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert "private_key_pem" in output
        assert "encrypted" in output
        assert output["encrypted"] is True
    
    def test_keygen_output_file(self, capsys):
        """Test key generation to file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name
        
        try:
            result = main(["keygen", "--include-private", "--output", output_path])
            assert result == 0
            
            # Check file was written
            content = json.loads(Path(output_path).read_text())
            assert "public_key_pem" in content
            assert "private_key_pem" in content
        finally:
            Path(output_path).unlink(missing_ok=True)


class TestCmdSign:
    """Tests for sign command."""
    
    def test_sign_ephemeral_key(self, capsys):
        """Test signing with ephemeral key."""
        result = main(["sign", "test data"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert "signature" in output
        assert "data_hash" in output
        assert "public_key_pem" in output
    
    def test_sign_with_key_file(self, capsys):
        """Test signing with key file."""
        # First generate a key file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            key_path = f.name
        
        try:
            main(["keygen", "--include-private", "--output", key_path])
            
            # Now sign with that key
            result = main(["sign", "test data", "--key-file", key_path])
            assert result == 0
            
            captured = capsys.readouterr()
            output = json.loads(captured.out)
            assert "signature" in output
        finally:
            Path(key_path).unlink(missing_ok=True)


class TestCmdVerify:
    """Tests for verify command."""
    
    def test_verify_valid_signature(self, capsys):
        """Test verifying a valid signature."""
        # Generate key and sign
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            key_path = f.name
        
        try:
            main(["keygen", "--include-private", "--output", key_path])
            capsys.readouterr()  # Clear output
            
            main(["sign", "test data", "--key-file", key_path])
            sign_output = json.loads(capsys.readouterr().out)
            
            # Verify
            result = main([
                "verify", "test data", sign_output["signature"],
                "--key-file", key_path
            ])
            assert result == 0
            
            verify_output = json.loads(capsys.readouterr().out)
            assert verify_output["valid"] is True
        finally:
            Path(key_path).unlink(missing_ok=True)
    
    def test_verify_invalid_signature(self, capsys):
        """Test verifying an invalid signature."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            key_path = f.name
        
        try:
            main(["keygen", "--include-private", "--output", key_path])
            capsys.readouterr()
            
            main(["sign", "test data", "--key-file", key_path])
            sign_output = json.loads(capsys.readouterr().out)
            
            # Verify with wrong data
            result = main([
                "verify", "wrong data", sign_output["signature"],
                "--key-file", key_path
            ])
            assert result == 1  # Should fail
            
            verify_output = json.loads(capsys.readouterr().out)
            assert verify_output["valid"] is False
        finally:
            Path(key_path).unlink(missing_ok=True)
    
    def test_verify_no_key_provided(self, capsys):
        """Test verify without key file or public key."""
        result = main(["verify", "data", "signature"])
        assert result == 1


class TestCmdEntropy:
    """Tests for entropy command."""
    
    def test_entropy_random(self, capsys):
        """Test random entropy generation."""
        result = main(["entropy"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["mode"] == "random"
        assert "entropy_hex" in output
        assert len(output["entropy_hex"]) == 64  # 32 bytes
        assert "sources" in output
    
    def test_entropy_deterministic(self, capsys):
        """Test deterministic entropy generation."""
        result = main(["entropy", "--seed", "abc123"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["mode"] == "deterministic"
        assert output["seed"] == "abc123"
        assert "entropy_hex" in output
    
    def test_entropy_deterministic_reproducible(self, capsys):
        """Test that deterministic mode is reproducible."""
        main(["entropy", "--seed", "abc123"])
        output1 = json.loads(capsys.readouterr().out)
        
        main(["entropy", "--seed", "abc123"])
        output2 = json.loads(capsys.readouterr().out)
        
        assert output1["entropy_hex"] == output2["entropy_hex"]
    
    def test_entropy_custom_length(self, capsys):
        """Test entropy with custom length."""
        result = main(["entropy", "--length", "64"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert len(output["entropy_hex"]) == 128  # 64 bytes
    
    def test_entropy_custom_info(self, capsys):
        """Test entropy with custom info."""
        result = main(["entropy", "--info", "custom-context"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["length"] == 32


class TestCmdHash:
    """Tests for hash command."""
    
    def test_hash_string(self, capsys):
        """Test hashing a string."""
        result = main(["hash", "hello"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["algorithm"] == "SHA-256"
        assert output["hash"].startswith("2cf24dba5fb0a30e")
    
    def test_hash_known_vector(self, capsys):
        """Test hash against known vector."""
        result = main(["hash", "abc"])
        assert result == 0
        
        captured = capsys.readouterr()
        output = json.loads(captured.out)
        assert output["hash"] == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"


class TestMainHelp:
    """Tests for main help and error handling."""
    
    def test_no_command(self, capsys):
        """Test running without command shows help."""
        result = main([])
        assert result == 1
