# Commitment Protocol

Commit/reveal protocol for provably fair Three-Body RNG. This is a standalone library with no FastAPI dependencies.

## Features

- **Commitment Creation**: SHA-256 hashing of server seed, entropy, and positions
- **Reveal Verification**: Verify revealed data matches commitment
- **Timestamp Validation**: Prevent timing attacks with age limits
- **Nonce Tracking**: Thread-safe replay protection
- **Hash Chain**: Append-only audit trail with integrity verification

## Installation

```bash
cd packages/commitment-protocol
poetry install
```

## Quick Start

### Python API

```python
from commitment_protocol import (
    create_commitment,
    verify_reveal,
    RevealData,
    NonceTracker,
    HashChain,
)

# Create a commitment
commitment = create_commitment(
    server_seed="abc123def456...",
    entropy_hex="fedcba987654...",
    nonce=1,
    positions=[3, 7, 2, 5, 1],  # Locked reel positions
)

# Show public commitment to player (hash only)
public_info = commitment.to_public_dict()
# {"commitment_hash": "...", "timestamp_ms": ..., "nonce": 1}

# After player provides input, create reveal
reveal = RevealData(
    commitment_hash=commitment.commitment_hash,
    server_seed="abc123def456...",
    entropy_hex="fedcba987654...",
    nonce=1,
    timestamp_ms=commitment.timestamp_ms,
    positions=[3, 7, 2, 5, 1],
    client_seed="player_input_here",
)

# Verify the reveal
result = verify_reveal(reveal)
if result.valid:
    print("Verification passed!")
else:
    print(f"Failed: {result.error}")

# Track nonces for replay protection
tracker = NonceTracker()
nonce = tracker.generate()
if tracker.check_and_mark(nonce):
    print("Nonce is valid and now marked used")

# Build audit trail with hash chain
chain = HashChain()
chain.append(commitment.commitment_hash)
chain.append(another_commitment.commitment_hash)
assert chain.verify()  # Verify chain integrity
```

## How It Works

### Commit Phase

1. Server generates random seed and runs three-body simulation
2. Server creates commitment hash: `SHA256(server_seed|entropy|nonce|timestamp|positions)`
3. Server shows commitment hash to player BEFORE player input
4. Player cannot predict result because they don't know server seed

### Reveal Phase

1. Player provides their input (client seed)
2. Server reveals all committed data
3. Client verifies: `SHA256(revealed_data) == commitment_hash`
4. If match, server cannot have cheated (data was locked before player input)

### Timing Protection

- Commitments have maximum age (default 5 minutes)
- Prevents server from waiting to see player behavior
- Timestamp is included in commitment hash

### Replay Protection

- Each commitment has unique nonce
- NonceTracker prevents reuse of nonces
- Thread-safe for concurrent requests

### Audit Trail

- HashChain links commitments together
- Each entry includes hash of previous entry
- Tampering with history is detectable

## API Reference

### create_commitment

```python
def create_commitment(
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    positions: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None,
    timestamp_ms: Optional[int] = None,
) -> Commitment
```

### verify_reveal

```python
def verify_reveal(
    reveal: RevealData,
    max_age_ms: int = 300000,  # 5 minutes
    current_time_ms: Optional[int] = None,
    used_nonces: Optional[set] = None,
) -> VerificationResult
```

### NonceTracker

```python
class NonceTracker:
    def generate(self) -> int
    def is_valid(self, nonce: int) -> bool
    def mark_used(self, nonce: int) -> bool
    def check_and_mark(self, nonce: int) -> bool
```

### HashChain

```python
class HashChain:
    def append(self, commitment_hash: str, ...) -> ChainEntry
    def verify(self) -> bool
    def get_entry(self, index: int) -> Optional[ChainEntry]
    def find_by_commitment(self, hash: str) -> Optional[ChainEntry]
```

## Security Properties

- **Binding**: Server cannot change committed data after commitment
- **Hiding**: Player cannot determine result from commitment hash
- **Non-repudiation**: Server cannot deny what was committed
- **Replay Protection**: Each commitment is unique via nonce
- **Timing Protection**: Commitments expire to prevent timing attacks

## Testing

```bash
# Run tests with coverage
poetry run pytest

# Run specific test file
poetry run pytest tests/test_commitment.py -v

# Check coverage report
poetry run pytest --cov-report=html
```

## License

MIT
