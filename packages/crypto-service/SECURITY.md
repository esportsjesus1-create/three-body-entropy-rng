# Security Documentation

## Threat Model

### Assets Protected
1. **Commitment Integrity**: RSA signatures ensure commitments cannot be forged
2. **Entropy Quality**: HKDF mixing ensures high-quality randomness
3. **Private Keys**: Must never be exposed or logged

### Threat Actors
1. **Malicious Operator**: Could try to forge signatures or predict entropy
2. **External Attacker**: Could try to intercept or tamper with signatures
3. **Compromised System**: Could leak private keys or entropy sources

## Security Properties

### RSA-4096 Signatures

**Algorithm**: RSA-PSS with SHA-256

**Security Level**: ~140 bits (NIST recommends RSA-3072 minimum through 2030)

**Padding**: PSS (Probabilistic Signature Scheme)
- Provides provable security in the random oracle model
- Uses MGF1 with SHA-256 for mask generation
- Maximum salt length for optimal security

**Key Generation**:
- Public exponent: 65537 (standard, prevents certain attacks)
- Generated using `cryptography` library's secure defaults
- Keys are generated fresh on each `RSAKeyManager` instantiation unless loaded from PEM

### HKDF-SHA256 Entropy Mixing

**Standard**: RFC 5869

**Entropy Sources**:
1. `secrets.token_bytes(32)` - Python's cryptographically secure random
2. `time.time_ns()` - High-resolution timestamp (nanoseconds)
3. `os.urandom(32)` - System entropy from /dev/urandom

**Security Properties**:
- Even if one source is compromised, output remains secure if others provide sufficient entropy
- HKDF extract phase combines all sources into a pseudorandom key
- HKDF expand phase derives output of desired length
- Context-specific `info` parameter prevents cross-context attacks

### SHA-256 Hashing

**Algorithm**: SHA-256 (FIPS 180-4)

**Security Level**: 128 bits collision resistance, 256 bits preimage resistance

**Usage**: Commitment hashes, key fingerprints, data integrity

## Security Decisions

### Decision 1: RSA-4096 vs RSA-2048

**Choice**: RSA-4096

**Rationale**: 
- Real-money gambling system requires long-term security
- RSA-4096 provides security margin through 2030+
- Performance impact is acceptable for commitment signing (not high-frequency)

### Decision 2: PSS vs PKCS#1 v1.5 Padding

**Choice**: PSS

**Rationale**:
- PSS has provable security in random oracle model
- PKCS#1 v1.5 has known theoretical weaknesses
- PSS is recommended by NIST and modern standards

### Decision 3: Multiple Entropy Sources

**Choice**: Combine 3 sources via HKDF

**Rationale**:
- Defense in depth against single-source compromise
- HKDF provides cryptographically sound mixing
- Each source provides different entropy characteristics

## Known Limitations

### Key Persistence
- Current implementation generates new keys on each instantiation
- Production systems MUST persist keys securely
- Key rotation procedures should be implemented

### Entropy Source Quality
- `time.time_ns()` provides limited entropy (~20-30 bits)
- Primary entropy comes from `secrets` and `os.urandom`
- System entropy pool must be properly seeded

### Side-Channel Attacks
- No specific mitigations for timing attacks
- RSA operations use constant-time implementations from `cryptography` library
- Physical side-channels not addressed

## Recommendations for Production

1. **Key Storage**: Use HSM or secure key management service
2. **Key Rotation**: Implement regular key rotation with overlap period
3. **Audit Logging**: Log all signing operations (without exposing keys)
4. **Rate Limiting**: Prevent signature oracle attacks
5. **Monitoring**: Alert on unusual signing patterns
6. **Backup**: Secure key backup with split custody

## Incident Response

### Private Key Compromise
1. Immediately revoke compromised key
2. Generate new key pair
3. Re-sign all active commitments with new key
4. Notify affected parties
5. Investigate root cause

### Entropy Source Failure
1. System should fail closed (refuse to generate entropy)
2. Alert operations team
3. Investigate source of failure
4. Do not fall back to weaker entropy sources
