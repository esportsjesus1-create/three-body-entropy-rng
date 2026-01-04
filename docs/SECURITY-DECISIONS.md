# Security Decision Rationale

This document explains the security decisions made for the Three-Body RNG system, including the rationale for each choice and the trade-offs involved.

## Overview

The Three-Body RNG system is designed for **provably fair** gambling applications where players must be able to verify that outcomes were not manipulated. The security model assumes a **malicious operator** threat - the operator themselves may try to cheat.

## Decision 1: Commit-Reveal Protocol

**Decision**: Use a two-phase commit-reveal protocol where the server commits to the outcome BEFORE the player provides input.

**Rationale**:
- Prevents "last revealer" attack where server sees player input and chooses favorable outcome
- Commitment hash proves the outcome was predetermined
- Player can verify hash(revealed_data) === commitment_hash

**Trade-offs**:
- Adds latency (two round trips instead of one)
- Requires commitment storage and expiration handling
- More complex implementation

**Alternative Considered**: Single-phase with signed timestamps
- Rejected because timestamps can be manipulated by operator

---

## Decision 2: Independent Entropy Per Reel

**Decision**: Each reel gets its own independent three-body physics simulation and commitment.

**Rationale**:
- Prevents correlation attacks between reels
- Each reel is independently verifiable
- Compromise of one reel doesn't affect others

**Trade-offs**:
- 5x more API calls (5 commits + 5 reveals per spin)
- Higher latency and server load
- More complex verification

**Alternative Considered**: Single entropy split via HKDF
- Rejected because single point of failure - if one entropy is compromised, all reels are predictable

---

## Decision 3: SHA-256 for Commitment Hashes

**Decision**: Use SHA-256 for all commitment hashes.

**Rationale**:
- Industry standard, widely audited
- 256-bit security level
- Collision resistance: ~2^128 operations to find collision
- Pre-image resistance: ~2^256 operations to reverse

**Trade-offs**:
- Slightly slower than SHA-1 or MD5
- Larger hash output (64 hex chars)

**Alternative Considered**: SHA-3 or BLAKE3
- SHA-256 chosen for broader compatibility and audit history

---

## Decision 4: RSA-4096 for Digital Signatures

**Decision**: Use RSA-4096 with PSS padding and SHA-256 for signing commitments.

**Rationale**:
- 4096-bit provides ~140-bit security level
- PSS padding is provably secure
- Widely supported across platforms
- Long-term security (estimated secure until 2030+)

**Trade-offs**:
- Slower than ECDSA or EdDSA
- Larger signatures (~512 bytes)
- Key generation is slow

**Alternative Considered**: Ed25519
- RSA chosen for broader compatibility with existing systems
- Ed25519 could be added as alternative in future

---

## Decision 5: HKDF for Entropy Mixing

**Decision**: Use HKDF-SHA256 to combine multiple entropy sources.

**Rationale**:
- Defense in depth: compromise of one source doesn't break security
- Combines: server seed + client seed + physics entropy
- Deterministic: same inputs always produce same output
- Standardized (RFC 5869)

**Trade-offs**:
- Additional computation step
- Requires all three inputs to be available

**Alternative Considered**: Simple concatenation + hash
- HKDF provides better security properties and key separation

---

## Decision 6: Token Bucket Rate Limiting

**Decision**: Use token bucket algorithm for rate limiting.

**Rationale**:
- Allows burst traffic while limiting sustained rate
- Per-IP tracking prevents single attacker from DoS
- Configurable burst size and refill rate

**Trade-offs**:
- Memory usage scales with unique IPs
- Can be bypassed with IP rotation
- Legitimate users behind NAT may be affected

**Alternative Considered**: Fixed window rate limiting
- Token bucket provides smoother rate limiting and better UX

---

## Decision 7: Append-Only Audit Log with Hash Chain

**Decision**: All commitment actions are logged to an append-only audit log with hash chain integrity.

**Rationale**:
- Detects tampering: any modification breaks hash chain
- Provides complete history of all commitments
- Enables sequence gap detection
- Supports regulatory compliance

**Trade-offs**:
- Storage grows indefinitely
- Cannot delete data (GDPR considerations)
- Verification requires reading entire chain

**Alternative Considered**: Merkle tree
- Hash chain chosen for simplicity; Merkle tree can be added for efficient proofs

---

## Decision 8: SQLite for Persistence

**Decision**: Use SQLite for commitment and audit log storage.

**Rationale**:
- Zero configuration, file-based
- ACID compliant
- Supports concurrent reads
- Easy backup (copy file)
- Suitable for single-server deployment

**Trade-offs**:
- Single writer limitation
- Not suitable for distributed deployment
- File locking can cause issues

**Alternative Considered**: PostgreSQL
- SQLite chosen for simplicity; PostgreSQL recommended for production scale

---

## Decision 9: Commitment Expiration

**Decision**: Commitments expire after 5 minutes if not revealed.

**Rationale**:
- Prevents resource exhaustion from abandoned commitments
- Limits window for timing attacks
- Encourages prompt completion of spins

**Trade-offs**:
- Players with slow connections may timeout
- Requires client-side countdown/warning
- Expired commitments still logged (for audit)

**Alternative Considered**: No expiration
- Rejected due to resource exhaustion risk

---

## Decision 10: Quantized Float Serialization

**Decision**: Use quantized serialization (struct.pack with rounded floats) for physics state.

**Rationale**:
- Ensures determinism across platforms (x86, ARM)
- Prevents floating-point drift between Python and JavaScript
- Enables cross-platform verification

**Trade-offs**:
- Slight loss of precision
- Must be applied at every RK4 sub-step
- More complex implementation

**Alternative Considered**: Fixed-point arithmetic
- Quantized floats chosen for compatibility with existing physics code

---

## Risk Acceptance

### Accepted Risks

1. **Nonce Counter Predictability**: The counter portion of nonces is predictable. This is accepted because:
   - Random bits prevent full prediction
   - Nonce prediction alone doesn't enable cheating
   - Nonces are not secret values

2. **Rate Limit IP Spoofing**: Rate limiting can be bypassed with IP rotation. This is accepted because:
   - Additional protections (CAPTCHA) can be added
   - Cost of IP rotation limits attack scale
   - Monitoring can detect abuse patterns

### Unaccepted Risks (Must Fix Before Production)

1. **Seed Grinding**: Operator can try many seeds to find favorable outcomes
   - **Mitigation**: Implement seed chain with pre-committed seeds

2. **Commitment Deletion**: Operator can delete unfavorable commitments
   - **Mitigation**: Integrate transparency-log with api-server

3. **Reveal Without Player Input**: API allows reveal without enforcing protocol
   - **Mitigation**: Require client_seed in reveal request

4. **Sequence Gaps**: No detection of hidden commitments in api-server
   - **Mitigation**: Use transparency-log sequence gap detection

---

## Security Checklist

Before production deployment:

- [ ] Integrate transparency-log with api-server
- [ ] Implement seed chain for anti-grinding
- [ ] Require client_seed in reveal requests
- [ ] Enable sequence gap detection alerts
- [ ] Add public commitment log for player visibility
- [ ] Implement key rotation procedures
- [ ] Set up monitoring for anomalous patterns
- [ ] Complete third-party security audit
- [ ] Document incident response procedures

---

## References

- RFC 5869: HKDF (HMAC-based Key Derivation Function)
- NIST SP 800-57: Key Management Recommendations
- PKCS #1 v2.2: RSA Cryptography Standard
- Provably Fair Gaming: Industry best practices
