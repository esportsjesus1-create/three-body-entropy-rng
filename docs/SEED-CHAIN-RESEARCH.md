# Seed Chain Security Research

**Date**: 2026-01-04  
**Status**: RESEARCH COMPLETE - AWAITING APPROVAL  
**Author**: Devin AI  
**Reviewer**: Kai Lei

## Executive Summary

A **critical security flaw** was discovered in the current seed chain implementation. The forward HMAC derivation allows players to predict all future seeds once any seed is revealed. This document presents comprehensive research on industry-standard approaches and recommends a secure replacement.

**Current Flaw**: Forward derivation `seed[i+1] = HMAC(seed[i], "seed:{i}")` is predictable after reveal.

**Recommendation**: Implement **Option C (Merkle Tree Commitment)** with per-round verification, or **Option A (Industry Standard)** if delayed verification is acceptable.

---

## Table of Contents

1. [Critical Flaw Analysis](#1-critical-flaw-analysis)
2. [Threat Model](#2-threat-model)
3. [Industry Standards Research](#3-industry-standards-research)
4. [Option Analysis](#4-option-analysis)
5. [Security Proofs](#5-security-proofs)
6. [Integration Requirements](#6-integration-requirements)
7. [Recommendation](#7-recommendation)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Critical Flaw Analysis

### 1.1 Current Implementation

The current seed chain in `packages/seed-chain/src/seed_chain/chain.py` uses forward HMAC derivation:

```python
for i in range(config.length):
    seed = hmac.new(
        current.encode(),
        f"seed:{i}".encode(),
        hashlib.sha256,
    ).hexdigest()
    seeds.append(seed)
    current = seed
```

### 1.2 The Attack

When `/reveal` returns `server_seed` to players (line 387 in `api-server/app.py`), the following attack becomes possible:

```python
# Player receives seed_i from /reveal endpoint
revealed_seed = "abc123..."  # seed at index i

# Player can now compute ALL future seeds:
def predict_future_seeds(revealed_seed, start_index, count):
    current = revealed_seed
    future_seeds = []
    for i in range(start_index + 1, start_index + count + 1):
        next_seed = hmac.new(
            current.encode(),
            f"seed:{i}".encode(),
            hashlib.sha256,
        ).hexdigest()
        future_seeds.append(next_seed)
        current = next_seed
    return future_seeds

# Attack: predict next 100 game outcomes
future = predict_future_seeds(revealed_seed, current_index, 100)
```

### 1.3 Impact

- **Severity**: CRITICAL
- **Exploitability**: Trivial (3 lines of code)
- **Impact**: Complete compromise of RNG unpredictability
- **Affected**: All future game outcomes after any seed reveal

---

## 2. Threat Model

### 2.1 Actors

| Actor | Description | Capabilities |
|-------|-------------|--------------|
| **Honest Operator** | Casino running the system fairly | Full server access, generates seeds |
| **Malicious Operator** | Casino attempting to cheat players | Can choose seeds adversarially |
| **Honest Player** | Player using the system normally | Can verify revealed data |
| **Malicious Player** | Player attempting to predict outcomes | Can analyze revealed seeds |
| **External Auditor** | Third party verifying fairness | Can access public commitments and reveals |

### 2.2 Attack Vectors

| Attack | Attacker | Current Status | Required Mitigation |
|--------|----------|----------------|---------------------|
| **Seed Prediction** | Malicious Player | VULNERABLE | Reverse hash chain or Merkle tree |
| **Seed Grinding** | Malicious Operator | PARTIALLY MITIGATED | External entropy or anchoring |
| **Commitment Deletion** | Malicious Operator | MITIGATED (transparency-log) | Already implemented |
| **Timing Manipulation** | Malicious Operator | MITIGATED (timing enforcement) | Already implemented |
| **Sequence Skipping** | Malicious Operator | MITIGATED (gap detection) | Already implemented |

### 2.3 Security Properties Required

1. **Binding**: Operator cannot change committed seed after publication
2. **Hiding**: Player cannot predict seed before reveal
3. **Forward Secrecy**: Revealing seed[i] does not reveal seed[i+1]
4. **Verifiability**: Player can independently verify outcomes
5. **Non-skippability**: Operator cannot skip unfavorable seeds

---

## 3. Industry Standards Research

### 3.1 Stake.com / Roobet Model (Most Common)

**Architecture**:
```
1. Server generates random server_seed (64-char hex)
2. Publish hash(server_seed) as commitment
3. Player sets client_seed
4. Each bet: result = HMAC(server_seed, client_seed:nonce)
5. Nonce increments per bet
6. Server seed revealed ONLY on "rotation" (player ends session)
7. Player verifies all past bets after rotation
```

**Key Insight**: They do NOT use a "seed chain" at all. They use:
- Single server seed per session (not per round)
- Nonce for uniqueness per bet
- Client seed for player contribution
- Reveal only on rotation (not per round)

**Pros**:
- Simple, proven, widely adopted
- No chain exhaustion problem
- Player contributes entropy via client seed

**Cons**:
- Cannot verify individual rounds until session ends
- Requires trust during active session
- Malicious operator can grind before commitment (operational trust)

**Source**: https://stake.us/provably-fair/implementation

### 3.2 Bitcoin Block Hash Model

**Architecture**:
```
1. Use future Bitcoin block hash as entropy source
2. Commit to block height before game
3. Block hash is unpredictable until mined
4. Anyone can verify using blockchain
```

**Pros**:
- External, unpredictable entropy
- Publicly verifiable
- No operator grinding possible

**Cons**:
- Depends on external system
- ~10 minute block times
- Not suitable for high-frequency games

### 3.3 Reverse Hash Chain (Preimage Chain)

**Architecture**:
```
1. Generate terminal secret s_N
2. Compute backwards: s_{i} = H(s_{i+1})
3. Publish s_0 as commitment
4. Round 1: reveal s_1, verify H(s_1) = s_0
5. Round 2: reveal s_2, verify H(s_2) = s_1
6. Continue until chain exhausted
```

**Pros**:
- Per-round verification
- Mathematically elegant
- Forward secrecy guaranteed by preimage resistance

**Cons**:
- Must pre-generate all seeds
- Fixed chain length
- Chain exhaustion requires rotation

### 3.4 Merkle Tree Commitment

**Architecture**:
```
1. Pre-generate N seeds: [s_0, s_1, ..., s_{N-1}]
2. Build Merkle tree, publish root
3. Each round: reveal seed + Merkle proof
4. Verify proof against committed root
```

**Pros**:
- Per-round verification
- O(log N) proof size
- Flexible epoch sizes
- Clean rotation mechanism

**Cons**:
- More complex implementation
- Larger proofs than hash chain
- Must pre-generate seeds

---

## 4. Option Analysis

### Option A: Industry Standard (Stake.com Model)

**Implementation**:
```python
class SessionSeed:
    def __init__(self):
        self.server_seed = secrets.token_hex(32)
        self.server_seed_hash = hashlib.sha256(self.server_seed.encode()).hexdigest()
        self.nonce = 0
    
    def generate_outcome(self, client_seed: str) -> str:
        result = hmac.new(
            self.server_seed.encode(),
            f"{client_seed}:{self.nonce}".encode(),
            hashlib.sha256
        ).hexdigest()
        self.nonce += 1
        return result
    
    def rotate(self) -> str:
        """Reveal server seed and generate new session."""
        old_seed = self.server_seed
        self.__init__()  # Generate new session
        return old_seed
```

**Security Analysis**:
- Binding: SHA-256 preimage resistance
- Hiding: Server seed unknown until rotation
- Forward Secrecy: N/A (single seed per session)
- Verifiability: After rotation only
- Non-skippability: Nonce must increment

**Verdict**: ACCEPTABLE if delayed verification is OK

### Option B: Reverse Hash Chain

**Implementation**:
```python
class ReverseHashChain:
    def __init__(self, length: int = 10000):
        # Generate terminal secret
        self.terminal = secrets.token_bytes(32)
        
        # Compute chain backwards
        self.chain = [None] * length
        current = self.terminal
        for i in range(length - 1, -1, -1):
            self.chain[i] = current
            if i > 0:
                current = hashlib.sha256(current).digest()
        
        # Commitment is first element (head)
        self.commitment = self.chain[0]
        self.current_index = 0
    
    def get_commitment(self) -> bytes:
        return self.commitment
    
    def reveal_next(self) -> bytes:
        if self.current_index >= len(self.chain) - 1:
            raise IndexError("Chain exhausted")
        self.current_index += 1
        return self.chain[self.current_index]
    
    @staticmethod
    def verify(previous: bytes, revealed: bytes) -> bool:
        return hashlib.sha256(revealed).digest() == previous
```

**Security Analysis**:
- Binding: Commitment to chain head binds entire sequence
- Hiding: Preimage resistance prevents prediction
- Forward Secrecy: Revealing s_i doesn't reveal s_{i+1}
- Verifiability: Immediate per-round verification
- Non-skippability: Each reveal must hash to previous

**Verdict**: RECOMMENDED for per-round verification

### Option C: Merkle Tree Commitment

**Implementation**:
```python
class MerkleTreeSeeds:
    def __init__(self, num_seeds: int = 10000):
        # Generate all seeds
        self.seeds = [secrets.token_bytes(32) for _ in range(num_seeds)]
        
        # Build Merkle tree
        self.tree = self._build_tree(self.seeds)
        self.root = self.tree[0]
        self.current_index = 0
    
    def _build_tree(self, leaves: List[bytes]) -> List[bytes]:
        # Pad to power of 2
        n = 1
        while n < len(leaves):
            n *= 2
        padded = leaves + [b'\x00' * 32] * (n - len(leaves))
        
        # Build tree bottom-up
        tree = [None] * (2 * n - 1)
        tree[n-1:n-1+len(padded)] = [hashlib.sha256(leaf).digest() for leaf in padded]
        
        for i in range(n - 2, -1, -1):
            left = tree[2*i + 1]
            right = tree[2*i + 2]
            tree[i] = hashlib.sha256(left + right).digest()
        
        return tree
    
    def get_proof(self, index: int) -> List[Tuple[bytes, str]]:
        """Get Merkle proof for seed at index."""
        # Returns list of (sibling_hash, direction) pairs
        proof = []
        n = (len(self.tree) + 1) // 2
        node_index = n - 1 + index
        
        while node_index > 0:
            parent = (node_index - 1) // 2
            if node_index % 2 == 1:  # Left child
                sibling = self.tree[node_index + 1]
                proof.append((sibling, 'right'))
            else:  # Right child
                sibling = self.tree[node_index - 1]
                proof.append((sibling, 'left'))
            node_index = parent
        
        return proof
    
    @staticmethod
    def verify_proof(seed: bytes, index: int, proof: List[Tuple[bytes, str]], root: bytes) -> bool:
        current = hashlib.sha256(seed).digest()
        for sibling, direction in proof:
            if direction == 'right':
                current = hashlib.sha256(current + sibling).digest()
            else:
                current = hashlib.sha256(sibling + current).digest()
        return current == root
```

**Security Analysis**:
- Binding: Merkle root commits to all seeds
- Hiding: Collision resistance prevents forgery
- Forward Secrecy: Revealing one leaf doesn't reveal others
- Verifiability: Immediate per-round verification with proof
- Non-skippability: Index must be logged and monotonic

**Verdict**: RECOMMENDED for production (most flexible)

### Option D: Never-Reveal Master Key

**Implementation**:
```python
class MasterKeyRNG:
    def __init__(self):
        self.master_key = secrets.token_bytes(32)
        self.commitment = hashlib.sha256(self.master_key).hexdigest()
    
    def generate(self, round_id: int) -> bytes:
        return hmac.new(
            self.master_key,
            str(round_id).encode(),
            hashlib.sha256
        ).digest()
```

**Security Analysis**:
- Binding: Commitment exists but cannot be verified per-round
- Hiding: Master key never revealed
- Forward Secrecy: N/A
- Verifiability: **NONE** - players cannot verify
- Non-skippability: Cannot be verified

**Verdict**: NOT ACCEPTABLE - fails provably fair requirement

---

## 5. Security Proofs

### 5.1 Assumptions

All security arguments rely on standard cryptographic assumptions:

1. **SHA-256 Preimage Resistance**: Given H(x), finding x is computationally infeasible
2. **SHA-256 Collision Resistance**: Finding x, y where H(x) = H(y) is computationally infeasible
3. **HMAC-SHA256 PRF Security**: HMAC output is indistinguishable from random given unknown key

### 5.2 Option B Security Argument (Reverse Hash Chain)

**Theorem**: Given commitment s_0 and revealed seeds s_1, ..., s_i, an adversary cannot compute s_{i+1} without breaking SHA-256 preimage resistance.

**Proof Sketch**:
1. By construction, s_i = H(s_{i+1})
2. To compute s_{i+1} from s_i, adversary must find preimage of s_i
3. This requires breaking SHA-256 preimage resistance
4. Under standard assumptions, this is computationally infeasible

**Binding Property**:
- Commitment s_0 uniquely determines entire chain
- Changing any s_i would require finding collision or preimage
- Both are infeasible under standard assumptions

### 5.3 Option C Security Argument (Merkle Tree)

**Theorem**: Given Merkle root R and revealed seeds with proofs, an adversary cannot forge a valid proof for a different seed at the same index without breaking SHA-256 collision resistance.

**Proof Sketch**:
1. Valid proof requires path from leaf hash to root
2. Forging proof for different seed requires either:
   a. Finding collision at leaf level: H(s) = H(s')
   b. Finding collision at internal node
3. Both require breaking SHA-256 collision resistance
4. Under standard assumptions, this is computationally infeasible

### 5.4 Limitations

**What is NOT proven**:
- SHA-256 security itself (assumed)
- Protection against malicious operator grinding BEFORE commitment
- Cross-platform determinism of outcome mapping

**What IS proven** (under assumptions):
- Operator cannot change committed seeds after publication
- Player cannot predict unrevealed seeds
- Revealed seeds can be verified against commitment

---

## 6. Integration Requirements

### 6.1 Transparency-Log Integration

The seed chain must integrate with existing transparency-log for:

1. **Commitment Logging**: Log Merkle root / chain head at epoch start
2. **Reveal Logging**: Log each seed reveal with index
3. **Index Monotonicity**: Detect skipped indices
4. **Epoch Tracking**: Track chain/epoch transitions

**Schema Addition**:
```python
class SeedChainEntry:
    epoch_id: str           # Unique epoch identifier
    commitment: str         # Merkle root or chain head
    current_index: int      # Current seed index
    revealed_seed: str      # Revealed seed (if applicable)
    merkle_proof: str       # Proof (for Merkle option)
    timestamp_ms: int       # Timestamp
```

### 6.2 API Changes

**New Endpoints**:
```
GET /api/seed-chain/commitment
    Returns: { epoch_id, commitment, chain_length, current_index }

GET /api/seed-chain/verify/{index}
    Returns: { seed, proof, epoch_id, commitment }
```

**Modified Endpoints**:
```
POST /reveal
    Response adds: { seed_index, seed_proof, epoch_id }
```

### 6.3 Verification Tools Integration

Add to `packages/verification-tools`:

```python
def verify_seed_chain_reveal(
    seed: str,
    index: int,
    proof: List[Tuple[str, str]],
    commitment: str,
) -> bool:
    """Verify a seed reveal against Merkle commitment."""
    pass

def verify_reverse_chain_reveal(
    previous_seed: str,
    revealed_seed: str,
) -> bool:
    """Verify reverse hash chain linkage."""
    return hashlib.sha256(bytes.fromhex(revealed_seed)).hexdigest() == previous_seed
```

---

## 7. Recommendation

### 7.1 Primary Recommendation: Option C (Merkle Tree)

**Rationale**:
1. Supports per-round verification (matches current API behavior)
2. Flexible epoch sizes (no fixed chain length)
3. Clean rotation mechanism
4. Integrates well with transparency-log
5. Industry-proven (used in blockchain systems)

### 7.2 Alternative: Option A (Industry Standard)

**When to use**:
- If per-round verification is not required
- If simpler implementation is preferred
- If following exact industry standard is important

**Tradeoff**: Players cannot verify until session rotation

### 7.3 NOT Recommended

- **Option B (Reverse Hash Chain)**: Viable but less flexible than Merkle
- **Option D (Never Reveal)**: Fails provably fair requirement
- **Current Implementation**: CRITICAL FLAW - must be replaced

### 7.4 Additional Recommendations

1. **Add Client Seed**: Require player-provided entropy per round
2. **External Anchoring**: Consider blockchain timestamping of commitments (future)
3. **Epoch Rotation**: Implement clean epoch transitions with new commitments
4. **Audit Logging**: Log all seed operations to transparency-log

---

## 8. Implementation Plan

### Phase 1: Design Approval (Current)

- [x] Research industry standards
- [x] Analyze security options
- [x] Document threat model
- [x] Create this research document
- [ ] **AWAITING**: User approval of recommendation

### Phase 2: Implementation (After Approval)

1. Create `packages/seed-chain-v2/` with Merkle tree implementation
2. Add verification functions to `packages/verification-tools/`
3. Update `packages/api-server/` to use new seed chain
4. Integrate with `packages/transparency-log/`
5. Update frontend to display seed proofs

### Phase 3: Testing

1. Unit tests for Merkle tree operations
2. Integration tests for API changes
3. Security tests for attack vectors
4. Cross-platform verification tests

### Phase 4: Migration

1. Deprecate old seed chain
2. Deploy new implementation
3. Update documentation
4. Notify users of security improvement

---

## Appendix A: Test Vectors

### A.1 Reverse Hash Chain Test Vector

```
Terminal Secret: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Chain Length: 5

s_4 = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
s_3 = SHA256(s_4) = 0x...
s_2 = SHA256(s_3) = 0x...
s_1 = SHA256(s_2) = 0x...
s_0 = SHA256(s_1) = 0x... (commitment)

Verification:
- SHA256(s_1) == s_0 ? YES
- SHA256(s_2) == s_1 ? YES
- SHA256(s_3) == s_2 ? YES
- SHA256(s_4) == s_3 ? YES
```

### A.2 Merkle Tree Test Vector

```
Seeds: [s_0, s_1, s_2, s_3]
Leaf Hashes: [H(s_0), H(s_1), H(s_2), H(s_3)]
Internal Nodes:
  - N_01 = H(H(s_0) || H(s_1))
  - N_23 = H(H(s_2) || H(s_3))
Root: R = H(N_01 || N_23)

Proof for s_1:
  - Sibling: H(s_0), direction: left
  - Sibling: N_23, direction: right

Verification:
  - current = H(s_1)
  - current = H(H(s_0) || current) = N_01
  - current = H(current || N_23) = R
  - R == committed_root ? YES
```

---

## Appendix B: References

1. Stake.com Provably Fair Implementation: https://stake.us/provably-fair/implementation
2. Wikipedia - Commitment Scheme: https://en.wikipedia.org/wiki/Commitment_scheme
3. RFC 5869 - HKDF: https://tools.ietf.org/html/rfc5869
4. Merkle Trees - Ethereum Documentation: https://ethereum.org/en/developers/tutorials/merkle-proofs-for-offline-data-integrity/
5. Hash Chain - Wikipedia: https://en.wikipedia.org/wiki/Hash_chain

---

## Approval Required

**Before proceeding with implementation, please confirm**:

1. [ ] Recommendation approved (Option C: Merkle Tree)?
2. [ ] Alternative acceptable (Option A: Industry Standard with delayed verification)?
3. [ ] Additional requirements or constraints?
4. [ ] Timeline expectations?

**DO NOT IMPLEMENT** until this research is reviewed and approved.
