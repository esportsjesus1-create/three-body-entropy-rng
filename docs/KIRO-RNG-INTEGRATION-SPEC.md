# Kiro Three-Body RNG Integration Specification

**Version**: 2.0  
**Date**: January 4, 2026  
**Purpose**: Complete specification for integrating Three-Body Entropy RNG into slot machine frontends

---

## 1. Infrastructure Overview

### 1.1 Complete Flow Diagram (Independent Reel Approach)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER CLICKS "SPIN"                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: PARALLEL COMMITS (5 concurrent API calls)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Reel 1      │ │ Reel 2      │ │ Reel 3      │ │ Reel 4      │ │ Reel 5      ││
│  │ POST /commit│ │ POST /commit│ │ POST /commit│ │ POST /commit│ │ POST /commit││
│  │ → session1  │ │ → session2  │ │ → session3  │ │ → session4  │ │ → session5  ││
│  │ → commit1   │ │ → commit2   │ │ → commit3   │ │ → commit4   │ │ → commit5   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                         Promise.all() - ~1 round trip                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PARALLEL REVEALS (5 concurrent API calls)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Reel 1      │ │ Reel 2      │ │ Reel 3      │ │ Reel 4      │ │ Reel 5      ││
│  │ POST /reveal│ │ POST /reveal│ │ POST /reveal│ │ POST /reveal│ │ POST /reveal││
│  │ session1    │ │ session2    │ │ session3    │ │ session4    │ │ session5    ││
│  │ clientSeed1 │ │ clientSeed2 │ │ clientSeed3 │ │ clientSeed4 │ │ clientSeed5 ││
│  │ → entropy1  │ │ → entropy2  │ │ → entropy3  │ │ → entropy4  │ │ → entropy5  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                         Promise.all() - ~1 round trip                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: ENTROPY TO REEL POSITION (Simple modulo - NO HMAC/HKDF)               │
│                                                                                  │
│  reel1Position = BigInt("0x" + entropy1) % BigInt(numSymbols)                   │
│  reel2Position = BigInt("0x" + entropy2) % BigInt(numSymbols)                   │
│  reel3Position = BigInt("0x" + entropy3) % BigInt(numSymbols)                   │
│  reel4Position = BigInt("0x" + entropy4) % BigInt(numSymbols)                   │
│  reel5Position = BigInt("0x" + entropy5) % BigInt(numSymbols)                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DISPLAY RESULT + STORE VERIFICATION DATA                                        │
│  (5 sessionIds, 5 commitments, 5 houseSeeds, 5 clientSeeds, 5 proofs)           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 API Base URL

**Production**: `https://three-body-rng.ebisu-games.com/api/v1`

### 1.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/spin/commit` | POST | Generate commitment for ONE reel |
| `/spin/reveal` | POST | Reveal entropy for ONE reel |
| `/verify/:sessionId` | GET | Get verification bundle for ONE reel |

### 1.4 Performance: 2 Round Trips per Spin

**Sequential approach (SLOW - DO NOT USE)**:
- 10 sequential API calls = 10 round trips
- Estimated latency: 10 x 200ms = 2000ms

**Concurrent approach (FAST - USE THIS)**:
- 5 parallel commits + 5 parallel reveals = 2 round trips
- Estimated latency: 2 x 200ms = 400ms

---

## 2. API Contract Details

### 2.1 POST /spin/commit

**Request Body**: Empty or minimal config
```json
{}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4-string",
    "commitment": "sha256-hash-of-house-seed",
    "expiresAt": "2026-01-04T12:00:00Z"
  }
}
```

### 2.2 POST /spin/reveal

**Request Body**:
```json
{
  "sessionId": "uuid-from-commit",
  "clientSeed": "user-provided-random-string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "houseSeed": "64-char-hex-revealed-house-seed",
    "entropyHex": "64-char-hex-final-entropy",
    "proof": {
      "proofId": "32-char-hex",
      "houseSeed": "64-char-hex",
      "clientSeed": "user-provided-seed",
      "nonce": 1,
      "entropyHex": "64-char-hex",
      "signature": "64-char-hex",
      "timestamp": 1704369600000
    }
  }
}
```

### 2.3 GET /verify/:sessionId

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "commitment": "sha256-hash",
    "houseSeed": "revealed-seed",
    "clientSeed": "user-seed",
    "entropyHex": "final-entropy",
    "proof": { ... },
    "physicsState": [...],
    "thetaAngles": [...],
    "createdAt": "ISO-8601",
    "revealedAt": "ISO-8601"
  }
}
```

---

## 3. Entropy Mapping Specification (CRITICAL)

### 3.1 Core Principle: Independent Entropy Per Reel

**MANDATORY APPROACH**: Each reel gets its own independent three-body physics simulation.

- NO HMAC-SHA256 expansion
- NO HKDF derivation
- NO splitting one entropy value across reels
- Each reel = 1 commit + 1 reveal = 1 independent entropy value

### 3.2 Entropy to Reel Position Formula

**Simple modulo operation**:

```javascript
// For each reel i (0 to 4):
const entropyHex = reelResults[i].entropyHex;  // 64-char hex from API
const entropyBigInt = BigInt("0x" + entropyHex);
const reelPosition = Number(entropyBigInt % BigInt(numSymbols));
const symbol = symbols[reelPosition];
```

### 3.3 Example Calculation

**Input for Reel 1**:
- `entropyHex`: `"3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d"`
- `numSymbols`: 10

**Calculation**:
```javascript
entropyBigInt = BigInt("0x3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d")
// = 28149809252802682310...n (very large number)

reelPosition = Number(entropyBigInt % BigInt(10))
// = 5

symbol = symbols[5]
// = "wutong" (5 Circles)
```

**Full 5-Reel Example**:

| Reel | Entropy (first 16 chars shown) | BigInt % 10 | Symbol |
|------|-------------------------------|-------------|--------|
| 1 | 3e23e816... | 5 | wutong |
| 2 | a7b2c3d4... | 2 | bai |
| 3 | 1f2e3d4c... | 8 | wild |
| 4 | 9a8b7c6d... | 1 | zhong |
| 5 | 5e6f7a8b... | 7 | liangtong |

### 3.4 Symbol Set (Default)

| Index | Symbol ID | Description |
|-------|-----------|-------------|
| 0 | fa | Green Dragon |
| 1 | zhong | Red Dragon |
| 2 | bai | White Dragon |
| 3 | bawan | 80,000 |
| 4 | wusuo | 5 Bamboo |
| 5 | wutong | 5 Circles |
| 6 | liangsuo | 2 Bamboo |
| 7 | liangtong | 2 Circles |
| 8 | wild | Wild Symbol |
| 9 | bonus | Bonus Symbol |

---

## 4. Implementation: Concurrent API Calls

### 4.1 Complete Spin Function

```javascript
const API_BASE = "https://three-body-rng.ebisu-games.com/api/v1";
const REEL_COUNT = 5;

async function performSpin(numSymbols) {
  // PHASE 1: Parallel commits for all reels
  const commitPromises = Array(REEL_COUNT).fill(0).map(() =>
    fetch(`${API_BASE}/spin/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then(res => res.json())
  );

  let commits;
  try {
    commits = await Promise.all(commitPromises);
  } catch (error) {
    throw new Error('SPIN_FAILED: One or more commits failed. Spin aborted.');
  }

  // Validate all commits succeeded
  if (commits.some(c => !c.success)) {
    throw new Error('SPIN_FAILED: Invalid commit response. Spin aborted.');
  }

  // Generate client seeds for each reel
  const clientSeeds = Array(REEL_COUNT).fill(0).map(() => generateClientSeed());

  // PHASE 2: Parallel reveals for all reels
  const revealPromises = commits.map((commit, i) =>
    fetch(`${API_BASE}/spin/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: commit.data.sessionId,
        clientSeed: clientSeeds[i]
      })
    }).then(res => res.json())
  );

  let reveals;
  try {
    reveals = await Promise.all(revealPromises);
  } catch (error) {
    // Retry failed reveals individually (we have valid commits)
    reveals = await retryFailedReveals(commits, clientSeeds, revealPromises);
  }

  // Validate all reveals succeeded
  if (reveals.some(r => !r.success)) {
    throw new Error('SPIN_FAILED: One or more reveals failed after retry.');
  }

  // PHASE 3: Convert entropy to reel positions (simple modulo)
  const reelPositions = reveals.map(reveal => {
    const entropyBigInt = BigInt("0x" + reveal.data.entropyHex);
    return Number(entropyBigInt % BigInt(numSymbols));
  });

  // Return complete result with verification data
  return {
    reelPositions,
    verificationData: commits.map((commit, i) => ({
      reelIndex: i,
      sessionId: commit.data.sessionId,
      commitment: commit.data.commitment,
      houseSeed: reveals[i].data.houseSeed,
      clientSeed: clientSeeds[i],
      entropyHex: reveals[i].data.entropyHex,
      proof: reveals[i].data.proof
    }))
  };
}

function generateClientSeed() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### 4.2 Error Handling Strategy

```javascript
async function retryFailedReveals(commits, clientSeeds, originalResults) {
  const MAX_RETRIES = 3;
  const results = [...originalResults];

  for (let i = 0; i < results.length; i++) {
    if (!results[i] || !results[i].success) {
      // Retry this specific reveal
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`${API_BASE}/spin/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: commits[i].data.sessionId,
              clientSeed: clientSeeds[i]
            })
          });
          const data = await response.json();

          if (data.success) {
            results[i] = data;
            break;
          }

          // Handle "already revealed" case - fetch from verify endpoint
          if (response.status === 409) {
            const verifyResponse = await fetch(
              `${API_BASE}/verify/${commits[i].data.sessionId}`
            );
            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              results[i] = {
                success: true,
                data: {
                  houseSeed: verifyData.data.houseSeed,
                  entropyHex: verifyData.data.entropyHex,
                  proof: verifyData.data.proof
                }
              };
              break;
            }
          }
        } catch (e) {
          // Continue to next retry attempt
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }
    }
  }

  return results;
}
```

### 4.3 Atomic Spin Semantics

**Critical Rule**: A spin is ALL-OR-NOTHING.

- Do NOT display partial results (e.g., 3 reels succeeded, 2 failed)
- Do NOT deduct bet until ALL 5 reels have valid entropy
- If ANY reel fails after retries, the entire spin fails
- On failure: show error message, do NOT change balance

```javascript
async function atomicSpin(betAmount, balance, numSymbols) {
  // Validate bet BEFORE making API calls
  if (betAmount > balance) {
    throw new Error('Insufficient balance');
  }

  try {
    // Attempt the spin (all 5 reels)
    const result = await performSpin(numSymbols);

    // SUCCESS: All 5 reels resolved
    // NOW deduct the bet and return result
    return {
      success: true,
      newBalance: balance - betAmount,
      reelPositions: result.reelPositions,
      verificationData: result.verificationData
    };

  } catch (error) {
    // FAILURE: Do NOT deduct bet
    return {
      success: false,
      newBalance: balance,  // Unchanged
      error: error.message
    };
  }
}
```

---

## 5. Verification Process

### 5.1 Per-Reel Verification

Each reel can be independently verified:

```javascript
async function verifyReel(reelData) {
  const { commitment, houseSeed, clientSeed, entropyHex } = reelData;

  // Step 1: Verify commitment = SHA256(houseSeed)
  const computedCommitment = await sha256(houseSeed);
  if (computedCommitment !== commitment) {
    return { valid: false, error: 'Commitment mismatch' };
  }

  // Step 2: Verify entropy derivation (server-side check)
  const verifyResponse = await fetch(
    `${API_BASE}/verify/${reelData.sessionId}`,
    { method: 'POST' }
  );
  const verifyResult = await verifyResponse.json();

  return {
    valid: verifyResult.success && verifyResult.data.verified,
    details: verifyResult.data
  };
}

async function verifyFullSpin(verificationData) {
  const results = await Promise.all(
    verificationData.map(reelData => verifyReel(reelData))
  );

  return {
    allValid: results.every(r => r.valid),
    reelResults: results
  };
}
```

### 5.2 Verification Bundle Schema (Per Spin)

```json
{
  "spinId": "client-generated-uuid",
  "timestamp": "ISO-8601",
  "reels": [
    {
      "reelIndex": 0,
      "sessionId": "uuid-1",
      "commitment": "sha256-hex",
      "houseSeed": "64-char-hex",
      "clientSeed": "64-char-hex",
      "entropyHex": "64-char-hex",
      "position": 5,
      "symbol": "wutong",
      "proof": { ... }
    },
    // ... 4 more reels
  ]
}
```

---

## 6. Performance Considerations

### 6.1 Latency Breakdown

| Phase | Sequential | Concurrent |
|-------|------------|------------|
| 5 Commits | 5 x 200ms = 1000ms | max(200ms) = 200ms |
| 5 Reveals | 5 x 200ms = 1000ms | max(200ms) = 200ms |
| **Total** | **2000ms** | **400ms** |

### 6.2 Optional: Pre-Commit Pool (Advanced)

For even lower latency, maintain a pool of pre-committed sessions:

```javascript
class CommitPool {
  constructor(poolSize = 10) {
    this.pool = [];
    this.poolSize = poolSize;
  }

  async initialize() {
    await this.refill();
  }

  async refill() {
    while (this.pool.length < this.poolSize) {
      const commit = await fetch(`${API_BASE}/spin/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).then(r => r.json());

      if (commit.success) {
        this.pool.push({
          ...commit.data,
          createdAt: Date.now()
        });
      }
    }
  }

  getCommits(count) {
    // Remove expired commits (older than 4 minutes)
    const now = Date.now();
    this.pool = this.pool.filter(c => now - c.createdAt < 240000);

    // Get requested commits
    const commits = this.pool.splice(0, count);

    // Trigger background refill
    this.refill();

    return commits;
  }
}
```

With pre-commit pool: **~200ms per spin** (reveals only)

---

## 7. Security Considerations

1. **Commitment Timing**: Each commitment MUST be received before its corresponding client seed is sent
2. **Independent Seeds**: Each reel gets its own unique client seed
3. **Client Seed Entropy**: Use `crypto.getRandomValues()` for secure randomness
4. **Session Expiry**: Sessions expire after ~5 minutes; handle gracefully
5. **HTTPS Only**: All API calls must use HTTPS
6. **No Seed Reuse**: Never reuse client seeds across spins or reels

---

## 8. Error Codes

| Error Code | Meaning | Action |
|------------|---------|--------|
| 400 | Invalid request | Check request format |
| 404 | Session not found | Session expired or invalid |
| 409 | Session already revealed | Fetch from /verify endpoint |
| 410 | Session expired | Create new session |
| 429 | Rate limited | Wait and retry with backoff |
| 500 | Server error | Retry with exponential backoff |

---

## 9. Integration Checklist

### 9.1 Frontend Changes Required

- [ ] Replace existing RNG calls with Three-Body RNG API
- [ ] Implement concurrent commit-reveal flow (Promise.all)
- [ ] Generate unique client seed per reel
- [ ] Store all 5 session IDs for verification
- [ ] Implement atomic spin semantics (all-or-nothing)
- [ ] Add retry logic for failed reveals
- [ ] Add verification UI/page

### 9.2 Educational Page Content

- [ ] Explain three-body problem and chaos theory
- [ ] Show how physics simulation generates entropy
- [ ] Explain commit-reveal protocol (why it's fair)
- [ ] Show that each reel has independent entropy
- [ ] Provide "Verify This Spin" button
- [ ] Display all 5 commitments, seeds, and proofs

---

## 10. Next Steps

1. **Get access to slot-machine-game repo** (fork to esportsjesus1-create)
2. **Pick frontend** (bamboo skin recommended)
3. **Identify current RNG integration points** in the frontend
4. **Implement Three-Body RNG integration** following this spec
5. **Create educational page** explaining the RNG system
6. **Deploy and test**
