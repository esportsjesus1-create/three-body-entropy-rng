# Transparency Specification: How Initial Parameters & Three-Body Simulation Work

**Purpose**: This document explains EXACTLY how initial parameters are derived, how the three bodies are set, and how every step is made transparent for clients to verify.

**Audience**: Casino operators, regulators, technical auditors, and curious players

---

## Table of Contents

1. [Overview: The Complete Flow](#overview)
2. [Initial Parameters: Server Seed & Entropy Data](#initial-parameters)
3. [Theta Calculation: The Core Security Mechanism](#theta-calculation)
4. [Three-Body Simulation: How the "Balls" Are Set](#three-body-simulation)
5. [Client Seed Integration: Player Influence](#client-seed-integration)
6. [Reel Position Derivation: From Chaos to Slot Outcome](#reel-position-derivation)
7. [Transparency Levels: What Data Is Logged](#transparency-levels)
8. [Verification: How Anyone Can Check Fairness](#verification)

---

## 1. Overview: The Complete Flow

Here's the high-level flow of how a single spin works:

```
[1] Server generates entropyData (from external source or three-body pre-run)
         ↓
[2] Server calculates THETA = SHA256(entropyData components)
         ↓
[3] Server creates COMMITMENT = SHA256(theta + sourceHash)
         ↓
[4] Commitment sent to player (BEFORE player provides clientSeed)
         ↓
[5] Player provides clientSeed (or uses auto-generated)
         ↓
[6] Server derives reel positions using HMAC(theta, clientSeed + nonce + reelIndex)
         ↓
[7] Server reveals: theta, entropyData, serverSeed, clientSeed
         ↓
[8] Player verifies: SHA256(revealed data) == commitment
```

**Key Security Property**: Server commits to theta BEFORE knowing clientSeed, so it cannot manipulate the outcome.

---

## 2. Initial Parameters: Server Seed & Entropy Data

### What Are "Initial Parameters"?

Initial parameters are the starting values that determine the randomness source. In our system, these are:

1. **Entropy Data** - The raw random data from which everything is derived
2. **Server Seed** (optional) - An additional random value for extra security
3. **Timestamp** - When the entropy was generated

### Entropy Data Structure

```typescript
interface EntropyData {
  hex: string;           // Hex representation of entropy
  value: number;         // Numeric value (0.0 - 1.0)
  sourceHash: string;    // SHA-256 hash of the source
  timestamp: number;     // Unix timestamp
}
```

### How Entropy Data Is Generated

There are two methods:

#### Method A: From Three-Body Pre-Simulation
```javascript
// Run a three-body simulation with random initial conditions
const simulation = runThreeBodySimulation({
  masses: [1, 1, 1],
  positions: [random3DVector(), random3DVector(), random3DVector()],
  velocities: [random3DVector(), random3DVector(), random3DVector()],
  timesteps: 1000
});

// Extract final positions as entropy
const finalPos = simulation.getFinalState();
const entropyHex = SHA256(JSON.stringify(finalPos));
const entropyValue = normalizeToFloat(entropyHex); // 0.0 - 1.0

const entropyData = {
  hex: entropyHex,
  value: entropyValue,
  sourceHash: SHA256(simulation.initialConditions),
  timestamp: Date.now()
};
```

#### Method B: From External Entropy Source
```javascript
// Use crypto.randomBytes for initial seed
const randomBytes = crypto.randomBytes(32);
const entropyData = {
  hex: randomBytes.toString('hex'),
  value: parseInt(randomBytes.toString('hex').substring(0, 8), 16) / 0xFFFFFFFF,
  sourceHash: SHA256(randomBytes),
  timestamp: Date.now()
};
```

**Transparency**: The `sourceHash` is committed to BEFORE the spin, so the server cannot change the entropy source retroactively.

---

## 3. Theta Calculation: The Core Security Mechanism

### What Is Theta?

"Theta" (θ) is a cryptographic hash derived from the entropy data. It serves as the "master seed" from which all reel positions are derived.

### Exact Formula (From theta.ts)

```javascript
export function calculateTheta(entropyData: EntropyData): string {
  const hash = createHash('sha256');
  
  // Combine all entropy components
  const data = [
    entropyData.hex,
    entropyData.sourceHash,
    entropyData.value.toExponential(15),  // Scientific notation for precision
    entropyData.timestamp.toString()
  ].join(':');
  
  hash.update(data);
  return hash.digest('hex');  // Returns 64-character hex string
}
```

### Example Calculation

```
Input entropyData:
  hex: "a3f5e8b2c9d1f7a6..."
  sourceHash: "7c4d9e2f1b8a3c5d..."
  value: 0.842731526374912
  timestamp: 1735776000000

Combined String:
  "a3f5e8b2c9d1f7a6...:7c4d9e2f1b8a3c5d...:8.427315263749120e-1:1735776000000"

Theta = SHA256(combined) = "9f2e5c7d3a1b8e4f..."
```

### Why Theta Is Secure

1. **One-way function**: Cannot reverse SHA-256 to get original entropy
2. **Commitment-based**: Server commits to theta BEFORE clientSeed is known
3. **Tamper-proof**: Changing any component of entropyData changes theta entirely

---

## 4. Three-Body Simulation: How the "Balls" Are Set

### Initial Conditions for Three Bodies

When entropy is used to seed a three-body simulation, the initial positions and velocities are derived deterministically from the entropy.

```javascript
// Simplified version (actual implementation may vary)
function deriveInitialConditions(entropyData) {
  const bodies = [];
  
  for (let i = 0; i < 3; i++) {
    // Derive angle (theta) for each body
    const theta = deriveAngle(entropyData, i);  // 0-360 degrees
    const radius = 1.0; // Fixed radius
    
    // Convert to Cartesian coordinates
    const x = radius * Math.cos(theta * Math.PI / 180);
    const y = radius * Math.sin(theta * Math.PI / 180);
    const z = 0; // Planar for simplicity
    
    // Derive velocities (perpendicular to position for orbit)
    const vx = -y * 0.5;
    const vy = x * 0.5;
    const vz = 0;
    
    bodies.push({
      mass: 1,
      position: { x, y, z },
      velocity: { vx, vy, vz }
    });
  }
  
  return bodies;
}
```

**Visual Representation**:

```
        Body 1 (θ₁ = 0°)
            •
           /|\n          / | \n         /  |  \n        /   |   \n       •----|----•
    Body 3      Body 2
   (θ₃=240°)  (θ₂=120°)
```

**Transparency**: The initial conditions are fully deterministic from entropyData. Players can re-derive these initial conditions to verify the simulation.

---

## 5. Client Seed Integration: Player Influence

### How Client Seed Affects the Outcome

The client seed directly affects the final reel positions via HMAC:

```javascript
export function deriveReelPositions(
  theta: string,
  clientSeed: string,
  nonce: number,
  reelCount: number,
  symbolsPerReel: number
): number[] {
  const positions = [];
  
  for (let reel = 0; reel < reelCount; reel++) {
    // Create HMAC for each reel using theta as key
    const hmac = createHmac('sha256', theta);
    hmac.update(`${clientSeed}:${nonce}:${reel}`);
    const reelHash = hmac.digest('hex');
    
    // Convert first 8 hex chars to number and mod by symbols
    const numericValue = parseInt(reelHash.substring(0, 8), 16);
    const position = numericValue % symbolsPerReel;
    positions.push(position);
  }
  
  return positions;
}
```

**Example**:
```
theta: "9f2e5c7d3a1b8e4f..."
clientSeed: "player_lucky_123"
nonce: 0
reelCount: 5
symbolsPerReel: 10

Reel 0: HMAC-SHA256(theta, "player_lucky_123:0:0") = "a7b3c2d1..." → parseInt("a7b3c2d1", 16) % 10 = 7
Reel 1: HMAC-SHA256(theta, "player_lucky_123:0:1") = "f3e8d4c9..." → parseInt("f3e8d4c9", 16) % 10 = 3
...

Final positions: [7, 3, 9, 2, 5]
```

**Why This Is Fair**:
- Player provides `clientSeed` AFTER commitment
- Changing clientSeed changes ALL reel positions
- Server cannot predict which clientSeed will be chosen

---

## 6. Transparency Levels: What Data Is Logged

### Level 1: Minimal (Default)
**Stored Data**:
- `commitment` (hash)
- `theta` (revealed after spin)
- `clientSeed`
- `nonce`
- `reelPositions`
- `resultHash`

**Use Case**: Standard play, minimal storage

### Level 2: Full Audit (Recommended)
**Additional Data**:
- `entropyData` (full object)
- `sourceHash`
- `timestamp`
- Initial simulation conditions (if applicable)

**Use Case**: Regulatory compliance, full verification

### Level 3: Complete Simulation Log
**Additional Data**:
- Every 100th timestep of three-body simulation
- Final state of all three bodies
- Total energy at each logged timestep

**Use Case**: Research, maximum transparency, forensic analysis

---

## 7. Verification: How Anyone Can Check Fairness

### Step-by-Step Verification

1. **Verify Commitment**:
```javascript
const expectedCommitment = SHA256(theta + ':' + sourceHash);
assert(expectedCommitment === commitment); // ✓ Server didn't change theta
```

2. **Verify Theta**:
```javascript
const data = [
  entropyData.hex,
  entropyData.sourceHash,
  entropyData.value.toExponential(15),
  entropyData.timestamp.toString()
].join(':');
const expectedTheta = SHA256(data);
assert(expectedTheta === theta); // ✓ Theta correctly derived
```

3. **Verify Reel Positions**:
```javascript
const positions = deriveReelPositions(theta, clientSeed, nonce, 5, 10);
assert(JSON.stringify(positions) === JSON.stringify(revealedPositions)); // ✓ Positions match
```

### Verification Tools

- **Web Tool**: https://three-body-entropy-rng.vercel.app/verify
- **CLI Tool**: `npm install -g @three-body-rng/verify-cli`
- **Browser Extension**: Coming soon

---

## Summary for Clients

When explaining to non-technical clients:

**"Think of it like a locked box:"**

1. Server puts a random number in a box and locks it (commitment)
2. Server gives you the locked box BEFORE you choose your lucky number
3. You choose your lucky number (client seed)
4. Server unlocks the box and shows you the original number
5. You can verify the lock wasn't tampered with
6. Your lucky number + server's number = slot outcome
7. You can re-calculate everything yourself to verify fairness

**Key Point**: The server can't cheat because it committed to its number BEFORE knowing yours.

---

## Technical Contact

For questions about this specification:
- GitHub Issues: https://github.com/esportsjesus1-create/three-body-entropy-rng/issues
- Documentation: See WHITEPAPER-THREE-BODY-ENTROPY-RNG.md

---

© 2026 Three-Body Entropy RNG Project
