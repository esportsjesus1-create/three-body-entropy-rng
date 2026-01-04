# Three-Body RNG Formal Threat Model

## Document Purpose

This document provides a formal threat model for the Three-Body RNG provably fair gambling system. It defines security properties, threat actors, attack vectors, and mitigations in a structured format suitable for security audit and compliance review.

---

## 1. System Overview

### 1.1 Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Player     │────▶│   Frontend   │────▶│   Backend    │        │
│  │   Browser    │◀────│   (Client)   │◀────│   (Server)   │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│         │                    │                    │                 │
│         │                    │                    ▼                 │
│         │                    │           ┌──────────────┐          │
│         │                    │           │ Three-Body   │          │
│         │                    │           │ RNG API      │          │
│         │                    │           └──────────────┘          │
│         │                    │                    │                 │
│         │                    ▼                    ▼                 │
│         │           ┌──────────────┐     ┌──────────────┐          │
│         │           │ Verification │     │ Transparency │          │
│         │           │ Code (JS)    │     │ Log          │          │
│         │           └──────────────┘     └──────────────┘          │
│         │                                        │                 │
│         │                                        ▼                 │
│         │                                ┌──────────────┐          │
│         └───────────────────────────────▶│ Blockchain   │          │
│                                          │ Anchor       │          │
│                                          └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

1. **Commitment Phase**: Server generates entropy, creates commitment, publishes to transparency log
2. **Client Input Phase**: Player provides client seed, places bet
3. **Execution Phase**: Server executes spin using committed entropy + client seed
4. **Reveal Phase**: Server reveals entropy, client verifies commitment
5. **Settlement Phase**: Funds transferred based on verified outcome

---

## 2. Security Properties (Formal Definitions)

### 2.1 Property P1: Commitment Binding

**Definition**: Once a commitment C is published at time T1, the server cannot produce a different value V' such that hash(V') = C, except with negligible probability.

**Formal Statement**:
```
∀ V, V' : V ≠ V' ⟹ Pr[SHA256(V) = SHA256(V')] ≤ 2^(-128)
```

**Assumption**: SHA-256 collision resistance holds.

### 2.2 Property P2: Commitment Hiding

**Definition**: Given commitment C = hash(V), an adversary cannot determine V with probability better than random guessing.

**Formal Statement**:
```
∀ adversary A : Pr[A(C) = V] ≤ 2^(-256) + ε
```

**Assumption**: SHA-256 preimage resistance holds, V has sufficient entropy.

### 2.3 Property P3: Outcome Unbiasability

**Definition**: The server cannot influence the outcome distribution beyond the expected house edge.

**Formal Statement**:
```
∀ server strategy S : |E[outcome | S] - E[outcome | random]| ≤ ε
```

**Assumption**: At least one input (client seed or external beacon) is unpredictable to server at commit time.

### 2.4 Property P4: Non-Selective Abort

**Definition**: The server cannot selectively abort unfavorable outcomes without detection.

**Formal Statement**:
```
∀ abort : abort ∈ TransparencyLog ∧ Refund(abort) = True
```

**Assumption**: Transparency log is append-only and publicly auditable.

### 2.5 Property P5: Public Verifiability

**Definition**: Any party can independently verify the correctness of an outcome given the complete transcript.

**Formal Statement**:
```
∀ transcript T : Verify(T) = Compute(T.serverSeed, T.clientSeed, T.nonce, T.params)
```

**Assumption**: Computation is deterministic across all environments.

### 2.6 Property P6: Timestamp Integrity

**Definition**: The ordering T1 < T2 < T3 < T4 is verifiable by third parties.

**Formal Statement**:
```
∀ commitment C : ∃ proof P : VerifyInclusion(C, P, MerkleRoot) = True
                           ∧ MerkleRoot.timestamp < T2
```

**Assumption**: Transparency log provides cryptographic inclusion proofs.

---

## 3. Threat Actors

### 3.1 TA1: Malicious Operator

**Capability Level**: CRITICAL
**Access**: Full server control, code modification, database access
**Motivation**: Increase house edge, steal funds, avoid payouts
**Resources**: Unlimited compute, insider knowledge

**Potential Actions**:
- Grind seeds before committing
- Selectively abort winning spins
- Modify verification code
- Manipulate timestamps
- Change game parameters

### 3.2 TA2: Compromised Employee

**Capability Level**: HIGH
**Access**: Partial server access, limited code modification
**Motivation**: Financial gain, coercion
**Resources**: Limited compute, partial insider knowledge

**Potential Actions**:
- Leak server seeds
- Modify specific outcomes
- Access player data

### 3.3 TA3: External Attacker

**Capability Level**: MEDIUM
**Access**: Network interception, client manipulation
**Motivation**: Exploit vulnerabilities, steal funds
**Resources**: Moderate compute, public information

**Potential Actions**:
- Man-in-the-middle attacks
- Client-side code injection
- Timing analysis
- Replay attacks

### 3.4 TA4: Colluding Player

**Capability Level**: LOW
**Access**: Multiple accounts, API access
**Motivation**: Beat the house unfairly
**Resources**: Limited compute, player-level access

**Potential Actions**:
- Timing analysis
- Pattern detection
- Multiple account exploitation

---

## 4. Attack Vectors (STRIDE Analysis)

### 4.1 Spoofing

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| S1 | Fake commitment | TA1 | Critical | Medium | Transparency log with signatures |
| S2 | Impersonate player | TA3 | High | Low | Authentication, session management |
| S3 | Fake verification result | TA1 | Critical | Medium | Independent verifier, SRI |

### 4.2 Tampering

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| T1 | Modify server seed after commit | TA1 | Critical | Low | SHA-256 binding |
| T2 | Modify game parameters | TA1 | Critical | Medium | Parameter binding in commitment |
| T3 | Modify verification code | TA1 | Critical | Medium | SRI, open source, reproducible builds |
| T4 | Modify transparency log | TA1 | Critical | Low | Append-only, blockchain anchoring |

### 4.3 Repudiation

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| R1 | Deny commitment existed | TA1 | High | Medium | Transparency log with proofs |
| R2 | Deny player bet | TA1 | High | Low | Signed bet receipts |
| R3 | Deny outcome | TA1 | High | Low | Public verification |

### 4.4 Information Disclosure

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| I1 | Leak server seed before reveal | TA2 | Critical | Low | HSM, access controls |
| I2 | Leak player data | TA2, TA3 | High | Medium | Encryption, anonymization |
| I3 | Timing side channel | TA3 | Medium | Low | Constant-time operations |

### 4.5 Denial of Service

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| D1 | Selective abort (winning spins) | TA1 | Critical | Medium | Auto-refund, public logging |
| D2 | DDoS on verification | TA3 | Medium | Medium | CDN, rate limiting |
| D3 | Transparency log unavailable | TA1, TA3 | High | Low | Redundancy, blockchain anchor |

### 4.6 Elevation of Privilege

| ID | Attack | Threat Actor | Impact | Likelihood | Mitigation |
|----|--------|--------------|--------|------------|------------|
| E1 | Gain operator access | TA3 | Critical | Low | MFA, access controls |
| E2 | Modify player balance | TA2 | Critical | Low | Audit logging, separation of duties |

---

## 5. Attack Trees

### 5.1 Attack Tree: Manipulate Outcome

```
[Manipulate Outcome]
├── [Grind Seeds] (AND)
│   ├── Generate candidate seed
│   ├── Compute outcome
│   ├── If unfavorable, repeat
│   └── Commit only favorable seed
│   MITIGATION: Seed chain, external beacon
│
├── [Change Seed After Commit] (AND)
│   ├── Find collision for SHA-256
│   └── Substitute seed
│   MITIGATION: SHA-256 collision resistance (infeasible)
│
├── [Manipulate Client Seed] (AND)
│   ├── Control client seed generation
│   └── Pre-compute outcomes
│   MITIGATION: WebCrypto, user override
│
├── [Change Game Parameters] (AND)
│   ├── Modify reel strips
│   ├── Modify mapping algorithm
│   └── Modify simulation parameters
│   MITIGATION: Parameter binding in commitment
│
└── [Selective Abort] (AND)
    ├── Compute outcome after commit
    ├── If player wins big, abort
    └── Claim "technical error"
    MITIGATION: Auto-refund, public logging, abort rate monitoring
```

### 5.2 Attack Tree: Bypass Verification

```
[Bypass Verification]
├── [Modify Verification Code] (AND)
│   ├── Serve modified JS to target
│   └── Always return "Verified"
│   MITIGATION: SRI, open source, independent verifier
│
├── [Fake Transparency Log] (AND)
│   ├── Control log server
│   └── Backdate entries
│   MITIGATION: Blockchain anchoring, third-party mirrors
│
├── [Exploit Non-Determinism] (AND)
│   ├── Simulation differs across environments
│   └── Claim "verification passed on server"
│   MITIGATION: Bit-for-bit deterministic simulation
│
└── [Social Engineering] (AND)
    ├── Convince player verification is optional
    └── Player doesn't verify
    MITIGATION: Automatic verification, education
```

---

## 6. Risk Assessment Matrix

| Risk ID | Description | Likelihood | Impact | Risk Level | Mitigation Status |
|---------|-------------|------------|--------|------------|-------------------|
| R-001 | Seed grinding | High | Critical | CRITICAL | Requires seed chain |
| R-002 | Selective abort | Medium | Critical | HIGH | Requires auto-refund |
| R-003 | Timestamp manipulation | Medium | High | HIGH | Requires transparency log |
| R-004 | Code injection | Low | Critical | MEDIUM | Requires SRI |
| R-005 | Parameter manipulation | Medium | Critical | HIGH | Requires full binding |
| R-006 | Client seed control | Medium | High | HIGH | Requires WebCrypto |
| R-007 | Non-deterministic sim | Medium | High | HIGH | Requires testing |
| R-008 | SHA-256 collision | Negligible | Critical | LOW | Inherent security |

---

## 7. Security Requirements

### 7.1 Mandatory Requirements (MUST)

| ID | Requirement | Property | Priority |
|----|-------------|----------|----------|
| SR-001 | Implement seed chain or external beacon | P3 | Critical |
| SR-002 | Deploy transparency log with inclusion proofs | P4, P6 | Critical |
| SR-003 | Bind all game parameters in commitment | P1, P3 | Critical |
| SR-004 | Generate client seed using WebCrypto | P3 | Critical |
| SR-005 | Implement automatic refund on abort | P4 | Critical |
| SR-006 | Open source verification code | P5 | Critical |
| SR-007 | Ensure bit-for-bit deterministic simulation | P5 | Critical |

### 7.2 Important Requirements (SHOULD)

| ID | Requirement | Property | Priority |
|----|-------------|----------|----------|
| SR-008 | Blockchain anchor transparency log | P6 | High |
| SR-009 | Implement SRI for verification scripts | P5 | High |
| SR-010 | Provide offline verification tool | P5 | High |
| SR-011 | Publish abort rate statistics | P4 | High |
| SR-012 | Conduct third-party security audit | All | High |

### 7.3 Enhanced Requirements (MAY)

| ID | Requirement | Property | Priority |
|----|-------------|----------|----------|
| SR-013 | Implement two-party commit protocol | P3 | Medium |
| SR-014 | Add zero-knowledge proofs | P5 | Medium |
| SR-015 | Deploy hardware security module | P2 | Medium |

---

## 8. Compliance Mapping

### 8.1 NIST Cybersecurity Framework

| Function | Category | Requirement Mapping |
|----------|----------|---------------------|
| Identify | Asset Management | Document all cryptographic assets |
| Protect | Data Security | SR-001, SR-003, SR-004 |
| Detect | Anomalies | Abort rate monitoring |
| Respond | Response Planning | Auto-refund procedures |
| Recover | Recovery Planning | Transparency log backup |

### 8.2 Cryptographic Standards

| Standard | Requirement | Status |
|----------|-------------|--------|
| NIST SP 800-175B | Use approved algorithms | SHA-256 (approved) |
| NIST SP 800-133 | Key generation | CSPRNG required |
| NIST SP 800-57 | Key management | Seed rotation policy |

---

## 9. Verification Checklist

### 9.1 Pre-Launch Security Checklist

- [ ] Seed chain implemented and tested
- [ ] Transparency log deployed with inclusion proofs
- [ ] All parameters bound in commitment structure
- [ ] Client seed generation uses WebCrypto
- [ ] Automatic refund on abort implemented
- [ ] Verification code open sourced
- [ ] Simulation determinism verified across browsers
- [ ] SRI implemented for all scripts
- [ ] Third-party security audit completed
- [ ] Bug bounty program established

### 9.2 Ongoing Security Checklist

- [ ] Monitor abort rate (alert if > 0.1%)
- [ ] Verify blockchain anchors weekly
- [ ] Review transparency log integrity monthly
- [ ] Update verification code hashes on release
- [ ] Conduct penetration testing quarterly
- [ ] Review access logs for anomalies

---

## 10. Incident Response

### 10.1 Security Incident Categories

| Category | Example | Response Time | Escalation |
|----------|---------|---------------|------------|
| Critical | Seed leak, mass manipulation | Immediate | CEO, Legal |
| High | Selective abort detected | 1 hour | CTO, Security |
| Medium | Verification code tampering | 4 hours | Security Team |
| Low | Suspicious pattern detected | 24 hours | Operations |

### 10.2 Response Procedures

**Critical Incident**:
1. Halt all new spins immediately
2. Preserve all logs and evidence
3. Notify affected players
4. Engage forensic analysis
5. Public disclosure within 72 hours

**High Incident**:
1. Investigate scope
2. Implement temporary mitigation
3. Root cause analysis
4. Permanent fix deployment
5. Post-incident review

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-04 | Devin AI | Initial threat model |

**Review Schedule**: Quarterly or after any security incident

**Approval Required**: Security Officer, CTO

---

## Appendix: Cryptographic Assumptions

This threat model assumes the following cryptographic primitives are secure:

1. **SHA-256**: Collision resistant, preimage resistant, second preimage resistant
2. **HMAC-SHA256**: Unforgeable under chosen message attack
3. **WebCrypto getRandomValues**: Cryptographically secure randomness
4. **ECDSA/EdDSA**: Existentially unforgeable under chosen message attack

If any of these assumptions are broken, the threat model must be revised.
