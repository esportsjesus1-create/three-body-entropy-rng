# Crypto Service

RSA-4096 digital signatures and HKDF-SHA256 entropy mixing for the Three-Body RNG system.

## Features

- **RSA-4096 Key Management**: Generate, export, and import RSA key pairs
- **Digital Signatures**: Sign and verify data using PSS-SHA256 padding
- **HKDF Entropy Mixing**: Combine multiple entropy sources per RFC 5869
- **SHA-256 Hashing**: Consistent hashing utilities
- **CLI Tool**: Standalone command-line interface for testing

## Installation

```bash
cd packages/crypto-service
poetry install
```

## Quick Start

### Python API

```python
from crypto_service import RSAKeyManager, HKDFEntropyMixer, sha256_hex

# Generate RSA-4096 key pair
manager = RSAKeyManager()

# Sign data
data = b"commitment_hash_here"
signature = manager.sign(data)

# Verify signature
is_valid = manager.verify(data, signature)
print(f"Signature valid: {is_valid}")

# Get public key for distribution
public_key_pem = manager.public_key_pem

# Generate mixed entropy
entropy, source_info = HKDFEntropyMixer.generate()
print(f"Entropy: {entropy.hex()}")

# Deterministic entropy from seed
seed = bytes.fromhex("abc123")
derived = HKDFEntropyMixer.derive_from_seed(seed)

# Hash data
hash_hex = sha256_hex("data to hash")
```

### CLI Tool

```bash
# Generate key pair
crypto-cli keygen --include-private --output keys.json

# Sign data
crypto-cli sign "data to sign" --key-file keys.json

# Verify signature
crypto-cli verify "data to sign" "base64_signature" --key-file keys.json

# Generate entropy
crypto-cli entropy
crypto-cli entropy --seed abc123  # Deterministic

# Hash data
crypto-cli hash "data to hash"
```

## API Reference

### RSAKeyManager

```python
class RSAKeyManager:
    def __init__(self, private_key: Optional[RSAPrivateKey] = None)
    def sign(self, data: bytes) -> bytes
    def sign_base64(self, data: bytes) -> str
    def verify(self, data: bytes, signature: bytes) -> bool
    def verify_base64(self, data: bytes, signature_b64: str) -> bool
    @property
    def public_key_pem(self) -> str
    @property
    def key_size(self) -> int
    def export_private_key_pem(self, password: Optional[bytes] = None) -> str
    @classmethod
    def from_private_key_pem(cls, pem_data: str, password: Optional[bytes] = None) -> "RSAKeyManager"
```

### HKDFEntropyMixer

```python
class HKDFEntropyMixer:
    @staticmethod
    def mix_entropy(
        random_bytes: bytes,
        hrtime_ns: int,
        system_entropy: bytes,
        info: bytes = b"three-body-rng-entropy",
        length: int = 32,
        salt: Optional[bytes] = None,
    ) -> bytes
    
    @classmethod
    def generate(
        info: bytes = b"three-body-rng-entropy",
        length: int = 32,
    ) -> Tuple[bytes, EntropySourceInfo]
    
    @staticmethod
    def derive_from_seed(
        seed: bytes,
        info: bytes = b"three-body-rng-entropy",
        length: int = 32,
    ) -> bytes
```

### Hash Functions

```python
def sha256_bytes(data: Union[str, bytes]) -> bytes
def sha256_hex(data: Union[str, bytes]) -> str
```

## Security Properties

### RSA-4096
- 4096-bit keys provide ~140 bits of security
- PSS padding with SHA-256 for probabilistic signatures
- MGF1 mask generation function

### HKDF-SHA256
- Follows RFC 5869 specification
- Combines three entropy sources for defense in depth
- Output is computationally indistinguishable from random

## Testing

```bash
# Run tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/test_rsa.py -v

# Check coverage report
poetry run pytest --cov-report=html
```

## License

MIT
