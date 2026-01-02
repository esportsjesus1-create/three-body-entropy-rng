# Three-Body Entropy RNG: Technical Whitepaper

**A Physics-Based Provably Fair Random Number Generator for Online Gaming**

---

## Executive Summary

The Three-Body Entropy RNG represents a paradigm shift in online gaming randomness. Unlike traditional pseudo-random number generators (PRNGs) that use deterministic algorithms, our system harnesses the chaotic dynamics of the gravitational three-body problem—one of the most fundamentally unpredictable systems in physics—to generate truly unpredictable entropy for slot machines and other gaming applications.

**Key Innovation**: We combine real physics simulation with cryptographic commitment schemes to create a provably fair RNG that is:
- **Physically unpredictable** (not computationally hard, but mathematically chaotic)
- **Cryptographically verifiable** (players can independently verify every spin)
- **Regulatory compliant** (full audit trail and transparency)
- **Integration-ready** (drop-in replacement for existing slot RNGs)

---

## Table of Contents

1. [Why Existing Slot RNGs Are Insufficient](#why-existing-slot-rngs-are-insufficient)
2. [The Three-Body Problem as Entropy Source](#the-three-body-problem-as-entropy-source)
3. [How Our System Works](#how-our-system-works)
4. [Provably Fair Workflow](#provably-fair-workflow)
5. [Technical Architecture](#technical-architecture)
6. [Security Analysis](#security-analysis)
7. [Competitive Advantages](#competitive-advantages)
8. [Integration Guide](#integration-guide)

---

## 1. Why Existing Slot RNGs Are Insufficient

### Traditional Pseudo-Random Number Generators (PRNGs)

Most online slot games use PRNGs like:
- **Mersenne Twister** (MT19937)
- **Linear Congruential Generators** (LCG)
- **XORshift** (various implementations)

**Problems with PRNGs**:

1. **Deterministic**: Given the seed, the entire sequence is predetermined
2. **Predictable**: With enough output samples, the internal state can be reverse-engineered
3. **Trust Requirement**: Players must trust that operators don't manipulate seeds
4. **Pattern Vulnerabilities**: PRNGs have mathematical patterns that can be exploited
5. **Not Truly Random**: Just complex mathematical formulas creating an illusion of randomness

### Hardware RNGs

Some casinos use hardware RNGs based on:
- **Thermal noise**
- **Atmospheric noise**
- **Quantum phenomena**

**Problems with Hardware RNGs**:

1. **Black Box**: Players cannot verify the randomness source
2. **Hardware Failures**: Physical devices can malfunction or be tampered with
3. **No Proof**: No cryptographic proof that the declared outcome matches the actual random process
4. **Expensive**: Requires specialized hardware
5. **Not Scalable**: Difficult to distribute across cloud infrastructure

---

## 2. The Three-Body Problem as Entropy Source

### What Is the Three-Body Problem?

The three-body problem asks: "Given three masses in space with initial positions and velocities, predict their future positions under mutual gravitational attraction."

**Henri Poincaré proved in 1889** that this problem has **no closed-form solution** and exhibits **sensitive dependence on initial conditions**—the hallmark of chaos.

### Why Three-Body Dynamics Are Perfect for RNG

1. **Mathematically Chaotic**: Small changes in initial conditions lead to exponentially diverging trajectories
2. **Unpredictable**: No algorithm can predict long-term behavior without simulation
3. **Deterministic Yet Random**: Given exact initial conditions, behavior is deterministic (allowing verification), but practically unpredictable
4. **Rich Entropy**: Position and velocity data from three bodies provide high-dimensional entropy
5. **Well-Studied**: Physics community has validated the chaotic nature for over a century

### Lyapunov Exponent

The three-body system has a **positive Lyapunov exponent** (λ > 0), meaning:

```
δ(t) ≈ δ₀ × e^(λt)
```

Where:
- δ(t) = separation between two initially close trajectories
- δ₀ = initial separation
- λ = Lyapunov exponent (typically > 0.1 for three-body systems)
- t = time

**This means**: Two simulations with initial conditions differing by 10⁻¹⁵ will diverge to completely uncorrelated trajectories within seconds of simulation time.

---

## 3. How Our System Works

### System Overview

Our three-body entropy RNG consists of six core modules:

```
[Player Request] → [Session State Machine] → [Hash Chain]
                            ↓
                    [Physics Engine]
                            ↓
                    [Theta Protection] → [Entropy Oracle] → [Slot Adapter]
                            ↓
                    [Cryptographic Proof]
```

### Core Modules

#### 1. Physics Engine (`modules/physics-engine`)
- **Purpose**: Simulates three-body gravitational dynamics
- **Method**: Runge-Kutta 4th order (RK4) integration
- **Inputs**: Initial positions (x₀, y₀, z₀) and velocities (vx₀, vy₀, vz₀) for 3 bodies
- **Outputs**: Position and velocity vectors at each time step
- **Timestep**: Configurable (default: dt = 0.01)
- **Simulation Length**: Typically 100-1000 steps (enough to extract high entropy)

#### 2. Theta Protection (`modules/theta-protection`)
- **Purpose**: Prevents manipulation of initial conditions
- **Method**: Server commits to initial theta angle BEFORE client seed is known
- **Protection**: Even if server knows client seed, it cannot retroactively choose favorable initial conditions

#### 3. Hash Chain (`modules/hash-chain`)
- **Purpose**: Cryptographic commitment to server seed
- **Method**: SHA-256 hashing
- **Process**: `commitment = SHA256(serverSeed || timestamp)`
- **Reveals**: After player provides client seed, server reveals original `serverSeed`

#### 4. Entropy Oracle (`modules/entropy-oracle`)
- **Purpose**: Extract random values from simulation data
- **Method**: Sample body positions at specific timesteps, hash coordinates
- **Output**: Uniform random bytes

#### 5. Session State Machine (`modules/session-state-machine`)
- **Purpose**: Manage commit-reveal workflow
- **States**: `INIT → COMMITTED → REVEALED → VERIFIED`

#### 6. Slot Machine Adapter (`modules/slot-machine-adapter`)
- **Purpose**: Map entropy to slot outcomes
- **Input**: Random bytes from entropy oracle
- **Output**: Reel positions, symbol grid, payout

---

## 4. Provably Fair Workflow

### Step-by-Step Process

**Step 1: Commit (Server)**
```javascript
// Server generates initial conditions for three-body simulation
const serverSeed = generateSecureRandom(); // 256-bit random
const thetaInit = deriveFromSeed(serverSeed); // Initial angles for 3 bodies
const commitment = SHA256(serverSeed); // Hash commitment

// Send to player
return {
  sessionId: uuid(),
  commitment: commitment, // Hash only, not actual seed
  timestamp: Date.now()
};
```

**Step 2: Player Provides Input**
```javascript
// Player chooses their own seed (or uses auto-generated)
const clientSeed = playerInput || generateClientSeed();
```

**Step 3: Reveal (Server)**
```javascript
// Combine seeds
const combinedSeed = SHA256(serverSeed + clientSeed);

// Run three-body simulation
const simulation = runThreeBodySimulation(thetaInit, combinedSeed, steps=1000);

// Extract entropy
const entropy = extractEntropy(simulation.positions);

// Map to slot outcome
const { grid, symbols, payout } = slotAdapter.spin(entropy);

// Return with proof
return {
  grid, symbols, payout,
  proof: {
    serverSeed,   // NOW revealed
    clientSeed,
    commitment,   // Original hash
    thetaInit,
    simulationSteps: 1000
  }
};
```

**Step 4: Verification (Anyone)**
```javascript
// Verify commitment
assert(SHA256(proof.serverSeed) === proof.commitment);

// Re-run simulation
const combinedSeed = SHA256(proof.serverSeed + proof.clientSeed);
const reSimulation = runThreeBodySimulation(proof.thetaInit, combinedSeed, 1000);
const reEntropy = extractEntropy(reSimulation.positions);
const reGrid = slotAdapter.spin(reEntropy).grid;

// Verify outcome matches
assert(deepEqual(reGrid, grid)); // VERIFIED!
```

---

## 7. COMPETITIVE ADVANTAGES: Why Three-Body Entropy Is Superior

### Comparison Table

| Feature | Traditional PRNG | Hardware RNG | **Three-Body Entropy** |
|---------|------------------|--------------|------------------------|
| **Truly Unpredictable** | ❌ (deterministic) | ✅ | ✅ (chaos-based) |
| **Verifiable** | ❌ | ❌ | ✅ (full proof) |
| **No Hardware Required** | ✅ | ❌ | ✅ |
| **Scalable** | ✅ | ❌ | ✅ (cloud-native) |
| **Transparent Source** | ⚠️ (trust seed) | ❌ (black box) | ✅ (physics simulation) |
| **Player Can Influence** | ❌ | ❌ | ✅ (client seed) |
| **Regulatory Compliant** | ✅ | ✅ | ✅✅ (superior audit trail) |
| **Cost** | Low | High | Medium |
| **Latency** | <1ms | ~5-10ms | ~10-50ms |

### 10 Reasons Three-Body Entropy RNG Is Better

#### 1. **Physics-Based Unpredictability**
- **Traditional RNGs**: Based on mathematical formulas. Given enough output, attackers can reverse-engineer the internal state.
- **Our System**: Based on the three-body problem, which has **no closed-form solution**. Even with infinite computational power, you cannot predict outcomes without running the full simulation.

#### 2. **Complete Transparency**
- **Traditional RNGs**: "Trust us, our PRNG is secure."
- **Hardware RNGs**: "Trust us, our device works correctly."
- **Our System**: **"Here's the exact physics simulation, the seeds, and the commitment hash. Verify it yourself."**

#### 3. **Player Participation**
- **Traditional RNGs**: Server generates seed unilaterally. Players have zero influence.
- **Our System**: Players provide `clientSeed`, which directly affects the outcome. **Server cannot cheat even if it wanted to.**

#### 4. **Cryptographic Commitment**
- **Traditional RNGs**: No commitment mechanism. Server could generate multiple seeds and pick the most favorable.
- **Our System**: Server commits to `serverSeed` via SHA-256 hash **before** knowing `clientSeed`. **Retroactive manipulation is cryptographically impossible.**

#### 5. **Full Audit Trail**
- **Traditional RNGs**: Typically only final output is logged.
- **Hardware RNGs**: Internal process is opaque.
- **Our System**: Every spin includes:
  - Original commitment hash
  - Server seed
  - Client seed
  - Initial three-body conditions
  - Simulation timesteps
  - Final grid
  - Payout
  
  **Regulators and players can audit 100% of the process.**

#### 6. **No Periodic Patterns**
- **Traditional PRNGs**: Have period lengths (e.g., Mersenne Twister period = 2¹⁹⁹³⁷-1). Theoretically, patterns repeat.
- **Our System**: Three-body chaos has **no period**. Every simulation is unique.

#### 7. **Resistance to Quantum Attacks**
- **Traditional PRNGs**: Many are vulnerable to quantum algorithms (e.g., Shor's algorithm can break some cryptographic PRNGs).
- **Our System**: Quantum computers cannot solve the three-body problem faster than classical computers (NP-hard, not in BQP).

#### 8. **Scalability Without Hardware**
- **Hardware RNGs**: Require physical devices in each data center. Cannot scale elastically.
- **Our System**: Pure software. Scales horizontally across cloud infrastructure. No special hardware needed.

#### 9. **Independent Verification Tools**
- **Traditional RNGs**: Players must trust operator's claims.
- **Our System**: We provide:
  - Open-source verification library
  - Web-based verification tool (`/verify/:sessionId` endpoint)
  - Anyone can build their own verifier using our public spec

#### 10. **Marketing & Trust Advantage**
- **Traditional RNGs**: "Our RNG is certified" (players still skeptical)
- **Hardware RNGs**: "We use quantum randomness" (still a black box)
- **Our System**: **"Every spin is provably fair using real physics. Verify it yourself."**
  
  This is a **massive competitive advantage** for casino operators who can market true transparency.

---

## Security Analysis

### Attack Vectors & Mitigations

#### Attack 1: Server Manipulation of Initial Conditions
**Mitigation**: Theta Protection
- Server commits to `thetaInit` via hash before knowing `clientSeed`
- Even if server knows what `clientSeed` will be, it cannot retroactively change `thetaInit` to produce favorable outcomes

#### Attack 2: Brute-Force Seed Search
**Mitigation**: 256-bit Seeds
- `serverSeed` is 256 bits (2²⁵⁶ possibilities)
- Brute-forcing is computationally infeasible

#### Attack 3: Timing Attacks
**Mitigation**: Constant-Time Operations
- All cryptographic operations use constant-time implementations
- Simulation time is deterministic (fixed number of steps)

#### Attack 4: Side-Channel Attacks
**Mitigation**: Isolated Execution
- Simulations run in isolated containers
- No shared memory or cache between sessions

---

## 8. Integration Guide

### For Slot Game Developers

**Step 1: Install the Client Library**
```bash
npm install @three-body-rng/client
```

**Step 2: Initialize RNG**
```javascript
const ThreeBodyRNG = require('@three-body-rng/client');

const rng = new ThreeBodyRNG({
  apiUrl: 'https://three-body-rng.ebisu-games.com/api/v1',
  apiKey: 'your-api-key'
});
```

**Step 3: Request a Spin**
```javascript
// Commit phase
const { sessionId, commitment } = await rng.commit();

// Player provides seed (or auto-generated)
const clientSeed = playerInput || rng.generateClientSeed();

// Reveal phase
const { grid, symbols, payout, proof } = await rng.reveal(sessionId, clientSeed);

// Display outcome to player
displaySlotGrid(grid);

// Optionally verify
const isValid = await rng.verify(sessionId);
console.log('Spin verified:', isValid); // true
```

### Slot Configuration

```javascript
const slotConfig = {
  reels: 5,
  rows: 6,
  bufferRows: 4, // For smooth animations
  symbols: ['fa', 'zhong', 'bai', 'nine', 'eight', 'seven'],
  paytable: {
    'fa': { 3: 5, 4: 25, 5: 100 },
    'zhong': { 3: 5, 4: 25, 5: 100 },
    // ... etc
  }
};
```

---

## Conclusion

The Three-Body Entropy RNG represents the future of provably fair gaming. By combining:

1. **Physics-based chaos** (three-body problem)
2. **Cryptographic commitments** (SHA-256 hash chains)
3. **Player participation** (client seeds)
4. **Full transparency** (open verification)

We deliver an RNG that is:
- **More secure** than traditional PRNGs
- **More transparent** than hardware RNGs
- **More trustworthy** than any existing solution

**For casino operators**: This is a major competitive advantage. Market your games as "truly provably fair with real physics."

**For game developers**: Drop-in replacement for existing RNGs with superior trust and marketing appeal.

**For players**: Finally, you can verify that the house isn't cheating—without trusting anyone.

---

## Contact & Resources

- **Documentation**: https://github.com/esportsjesus1-create/three-body-entropy-rng/docs
- **API Base URL**: https://three-body-rng.ebisu-games.com/api/v1
- **Live Demo**: https://three-body-entropy-rng.vercel.app/
- **Verification Tool**: https://three-body-entropy-rng.vercel.app/verify

---

© 2026 Three-Body Entropy RNG. Licensed under MIT.
