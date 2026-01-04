# Verification Bundle Specification

This document defines the canonical format for verification bundles, ensuring cross-platform compatibility between Python backend and TypeScript frontend.

## Overview

The verification bundle contains all data needed for a client to independently verify that a spin result was predetermined and not manipulated.

## Verification Bundle Format

```typescript
interface VerificationBundle {
  // Commitment Phase (shown BEFORE player input)
  commitment_hash: string;      // SHA-256 hash (64 hex chars)
  timestamp_ms: number;         // Unix timestamp in milliseconds
  nonce: number;                // Unique identifier for this commitment
  expires_ms: number;           // Expiration timestamp
  
  // Reveal Phase (shown AFTER player input)
  server_seed: string;          // Server's random seed (64 hex chars)
  entropy_hex: string;          // Entropy from physics simulation (64 hex chars)
  positions: number[];          // Reel positions [0-9] for each reel
  
  // Optional
  client_seed?: string;         // Player's input seed
  signature?: string;           // RSA-PSS signature (base64)
  key_id?: string;              // Key identifier for signature verification
  algorithm_version: string;    // "v1.0" - for future compatibility
}
```

## Commitment Hash Computation

The commitment hash is computed using SHA-256 over a deterministic string format:

```
commitment_string = "server_seed:{server_seed}|entropy:{entropy_hex}|nonce:{nonce}|timestamp:{timestamp_ms}|positions:{pos1},{pos2},{pos3},{pos4},{pos5}"
commitment_hash = SHA256(commitment_string)
```

### Python Implementation

```python
import hashlib

def compute_commitment_hash(
    server_seed: str,
    entropy_hex: str,
    nonce: int,
    timestamp_ms: int,
    positions: list[int],
) -> str:
    parts = [
        f"server_seed:{server_seed}",
        f"entropy:{entropy_hex}",
        f"nonce:{nonce}",
        f"timestamp:{timestamp_ms}",
        f"positions:{','.join(str(p) for p in positions)}",
    ]
    data = "|".join(parts)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()
```

### TypeScript Implementation

```typescript
async function computeCommitmentHash(
  serverSeed: string,
  entropyHex: string,
  nonce: number,
  timestampMs: number,
  positions: number[],
): Promise<string> {
  const parts = [
    `server_seed:${serverSeed}`,
    `entropy:${entropyHex}`,
    `nonce:${nonce}`,
    `timestamp:${timestampMs}`,
    `positions:${positions.join(',')}`,
  ];
  const data = parts.join('|');
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## Entropy to Position Mapping

Each reel position is derived from a portion of the entropy hex string:

```
For reel i (0-indexed):
  chunk = entropy_hex[i*8 : (i+1)*8]  // 8 hex chars = 32 bits
  position = parseInt(chunk, 16) % symbol_count
```

### Python Implementation

```python
def entropy_to_positions(entropy_hex: str, num_reels: int = 5, symbol_count: int = 10) -> list[int]:
    positions = []
    for i in range(num_reels):
        chunk = entropy_hex[i*8:(i+1)*8]
        value = int(chunk, 16)
        position = value % symbol_count
        positions.append(position)
    return positions
```

### TypeScript Implementation

```typescript
function entropyToPositions(
  entropyHex: string,
  numReels: number = 5,
  symbolCount: number = 10,
): number[] {
  const positions: number[] = [];
  for (let i = 0; i < numReels; i++) {
    const chunk = entropyHex.slice(i * 8, (i + 1) * 8);
    const value = parseInt(chunk, 16);
    const position = value % symbolCount;
    positions.push(position);
  }
  return positions;
}
```

## Client Verification Algorithm

```typescript
async function verifySpinResult(bundle: VerificationBundle): Promise<VerificationResult> {
  // 1. Recompute commitment hash from revealed data
  const computedHash = await computeCommitmentHash(
    bundle.server_seed,
    bundle.entropy_hex,
    bundle.nonce,
    bundle.timestamp_ms,
    bundle.positions,
  );
  
  // 2. Check commitment matches
  const commitmentMatches = computedHash === bundle.commitment_hash;
  
  // 3. Verify positions match entropy
  const expectedPositions = entropyToPositions(bundle.entropy_hex);
  const positionsMatch = JSON.stringify(expectedPositions) === JSON.stringify(bundle.positions);
  
  // 4. Check timestamp validity (not too old)
  const currentTime = Date.now();
  const age = currentTime - bundle.timestamp_ms;
  const maxAge = 600000; // 10 minutes for verification
  const timestampValid = age >= 0 && age <= maxAge;
  
  return {
    valid: commitmentMatches && positionsMatch && timestampValid,
    commitmentMatches,
    positionsMatch,
    timestampValid,
    error: !commitmentMatches ? 'Commitment hash mismatch' :
           !positionsMatch ? 'Position calculation mismatch' :
           !timestampValid ? 'Timestamp out of range' : null,
  };
}
```

## Golden Vectors for Cross-Platform Testing

These test vectors MUST produce identical results in both Python and TypeScript:

### Vector 1: Zero Seed
```json
{
  "server_seed": "0000000000000000000000000000000000000000000000000000000000000000",
  "entropy_hex": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "nonce": 1,
  "timestamp_ms": 1704384000000,
  "positions": [14, 9, 10, 9, 6],
  "expected_hash": "..." // Compute and verify
}
```

### Vector 2: Sequential Seed
```json
{
  "server_seed": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "entropy_hex": "aabbccdd11223344556677889900aabbccddeeff00112233445566778899aabb",
  "nonce": 12345,
  "timestamp_ms": 1704384000000,
  "positions": [10, 1, 5, 6, 9],
  "expected_hash": "..."
}
```

## HKDF Entropy Mixing (Optional)

When combining multiple entropy sources:

```
ikm = server_seed_bytes + client_seed_bytes + physics_entropy_bytes
salt = b"three-body-rng-v1"
info = b"spin-entropy"
output = HKDF-SHA256(ikm, salt, info, length=32)
```

### Python Implementation

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def mix_entropy(server_seed: str, client_seed: str, physics_entropy: str) -> str:
    ikm = bytes.fromhex(server_seed) + client_seed.encode('utf-8') + bytes.fromhex(physics_entropy)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"three-body-rng-v1",
        info=b"spin-entropy",
    )
    return hkdf.derive(ikm).hex()
```

### TypeScript Implementation

```typescript
async function mixEntropy(
  serverSeed: string,
  clientSeed: string,
  physicsEntropy: string,
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Combine input key material
  const serverBytes = hexToBytes(serverSeed);
  const clientBytes = encoder.encode(clientSeed);
  const physicsBytes = hexToBytes(physicsEntropy);
  
  const ikm = new Uint8Array([...serverBytes, ...clientBytes, ...physicsBytes]);
  const salt = encoder.encode('three-body-rng-v1');
  const info = encoder.encode('spin-entropy');
  
  // Import key for HKDF
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  
  // Derive bits
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    256,
  );
  
  return bytesToHex(new Uint8Array(derived));
}
```

## API Response Format

All API responses that include verification data MUST include the full bundle:

```json
{
  "success": true,
  "data": {
    "result": { /* game result */ },
    "verification": {
      "commitment_hash": "abc123...",
      "server_seed": "def456...",
      "entropy_hex": "789abc...",
      "positions": [3, 7, 2, 5, 1],
      "nonce": 12345,
      "timestamp_ms": 1704384000000,
      "expires_ms": 1704384300000,
      "algorithm_version": "v1.0"
    }
  }
}
```

## Security Considerations

1. **Constant-Time Comparison**: Use `hmac.compare_digest` (Python) or timing-safe comparison for hash verification
2. **Timestamp Validation**: Reject commitments older than 5 minutes
3. **Nonce Uniqueness**: Each nonce must be used only once
4. **Algorithm Versioning**: Include version for future compatibility

## Testing Requirements

Before production deployment:

1. Generate 1000 verification bundles in Python
2. Verify all 1000 in TypeScript
3. Confirm 100% match rate
4. Test edge cases (empty strings, max values, special characters)

## Version History

- v1.0 (2026-01-04): Initial specification
