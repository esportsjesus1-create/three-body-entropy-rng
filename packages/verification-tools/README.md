# Verification Tools

Standalone verification utilities for Three-Body RNG game outcomes.

## Overview

This package provides tools for players to independently verify that game outcomes match the committed values. It implements the same algorithms used by the server, allowing anyone to verify fairness without trusting the operator.

## Installation

```bash
cd packages/verification-tools
poetry install
```

## Usage

### Verify a Game Outcome

```python
from verification_tools import verify_game_outcome

result = verify_game_outcome(
    commitment_hash="abc123...",  # Hash shown before game
    server_seed="server_seed_value",
    entropy_hex="entropy_value",
    nonce=12345,
    timestamp_ms=1704067200000,
    positions=[3, 7, 2, 5, 1],
)

if result.valid:
    print("Game outcome is FAIR!")
else:
    print(f"Verification FAILED: {result.error}")
```

### Verify Commitment Hash Only

```python
from verification_tools import verify_commitment_hash

is_valid = verify_commitment_hash(
    commitment_hash="abc123...",
    server_seed="server_seed_value",
    entropy_hex="entropy_value",
    nonce=12345,
    timestamp_ms=1704067200000,
    positions=[3, 7, 2, 5, 1],
)
```

### Verify Audit Trail

```python
from verification_tools import verify_audit_trail

# Fetch audit entries from API
entries = [...]  # List of audit entries

result = verify_audit_trail(entries)

if result.valid:
    print("Audit trail is intact!")
else:
    print(f"Issues detected: {result.error}")
    if result.gaps:
        print(f"Unresolved commitments: {result.gaps}")
```

## Verification Process

### Game Outcome Verification

1. **Commitment Hash**: Verify the hash shown before the game matches the revealed data
2. **Entropy Derivation**: Verify entropy was correctly derived from the server seed
3. **Position Derivation**: Verify reel positions were correctly derived from entropy

### Audit Trail Verification

1. **Chain Integrity**: Verify the hash chain is intact (no tampering)
2. **Sequence Gaps**: Detect commitments that were never revealed (potential manipulation)

## API Reference

### verify_game_outcome()

Main verification function that checks all aspects of a game outcome.

Returns `VerificationResult` with:
- `valid`: Overall validity
- `commitment_matches`: Hash verification result
- `entropy_valid`: Entropy derivation result
- `positions_valid`: Position derivation result
- `error`: Error message if invalid
- `details`: Additional verification details

### verify_audit_trail()

Verifies the integrity of an audit trail.

Returns `AuditVerificationResult` with:
- `valid`: Overall validity
- `chain_valid`: Hash chain integrity
- `gaps_detected`: Number of unresolved commitments
- `total_entries`: Total audit entries
- `error`: Error message if invalid
- `gaps`: List of gap details

## Testing

```bash
poetry run pytest
```

## Security Properties

1. **Independent Verification**: Players can verify without trusting the operator
2. **Deterministic**: Same inputs always produce same outputs
3. **Tamper Detection**: Any modification to audit trail is detectable
4. **Gap Detection**: Selective hiding of outcomes is detectable

## License

MIT
