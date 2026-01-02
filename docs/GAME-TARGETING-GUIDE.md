# Game Targeting Guide: How to Identify Slot Games for Three-Body Entropy RNG Integration

**Purpose**: This guide helps you identify which existing slot games are the best candidates for integrating the Three-Body Entropy RNG, and how to approach game studios/operators for adoption.

---

## Table of Contents

1. [Target Game Characteristics](#target-game-characteristics)
2. [Ideal Integration Candidates](#ideal-integration-candidates)
3. [Integration Difficulty Assessment](#integration-difficulty-assessment)
4. [Targeting Strategy](#targeting-strategy)
5. [Pitch Template](#pitch-template)
6. [Technical Requirements Checklist](#technical-requirements-checklist)

---

## 1. Target Game Characteristics

### Games That Are IDEAL for Three-Body Entropy RNG

#### ✅ High-Value/High-Stakes Slots
**Why**: Players with large bets care most about fairness and verification.

**Examples**:
- VIP/High-Roller exclusive slots
- Progressive jackpot slots
- Cryptocurrency casino slots (Stake.com, Roobet, etc.)

**Characteristics**:
- Bet sizes: $10+ per spin
- Player demographics: Tech-savvy, skeptical of traditional RNGs
- Marketing angle: "Provably fair using real physics"

#### ✅ Asian Market Slots (Mahjong, Fa/Zhong/Bai Symbols)
**Why**: Our current slot adapter is already configured for Asian symbols!

**Target Games**:
- **Mahjong slots** (e.g., "Mahjong Ways" by PG Soft)
- **88 Fortunes** (Fa/Zhong/Bai symbols)
- **Dragon/Tiger themed slots**
- **Prosperity-themed Asian slots**

**Characteristics**:
- Symbol set matches our adapter: fa (發), zhong (中), bai (白)
- 5-reel configuration (our adapter supports 5 reels)
- Popular in Asian markets where players value feng shui and luck rituals

**Integration Advantage**: Our `slot-machine-adapter` already has the symbol mappings for these games!

#### ✅ Provably Fair Crypto Casinos
**Why**: These platforms already market "provably fair" but use inferior PRNGs.

**Target Platforms**:
- Stake.com
- Roobet
- Duelbits
- BC.Game
- Rollbit

**Pitch Angle**: "Upgrade from PRNG to physics-based provably fair. Marketing gold."

#### ✅ New Indie Slot Studios
**Why**: Easier to convince, hungry for competitive advantages.

**Characteristics**:
- Launched in last 2-3 years
- Don't have legacy RNG infrastructure
- Looking for unique selling propositions
- Active on social media / accessible founders

---

## 2. Ideal Integration Candidates

### Priority List (Ordered by Likelihood of Success)

#### Tier 1: Asian-Symbol Slots (Immediate Fit)

| Game | Studio | Why Target | Difficulty |
|------|--------|------------|------------|
| **Mahjong Ways 2** | PG Soft | Uses exact symbols we support | Medium |
| **88 Fortunes** | SG Interactive | Fa/Zhong/Bai symbols, huge player base | Hard |
| **Fortune Pai Gow** | Various | Asian-themed, provable fairness adds value | Easy |
| **Lucky Twins** | Microgaming | Chinese symbols, smaller studio | Medium |

**Action**: Start here—our adapter is ready.

#### Tier 2: Crypto Casino In-House Slots

| Platform | Why Target | Difficulty |
|----------|------------|------------|
| **Stake Originals** | Already claims "provably fair," physics-based is better | Medium |
| **BC.Game Originals** | Smaller platform, more open to partnerships | Easy |
| **Roobet Custom Games** | Large user base, tech-forward | Hard |

**Action**: Pitch as "the next evolution of provably fair."

#### Tier 3: High-RTP / Player-Friendly Studios

| Studio | Why Target | Difficulty |
|--------|------------|------------|
| **Hacksaw Gaming** | Known for transparency, high RTP | Medium |
| **Push Gaming** | Innovative mechanics, open to new tech | Medium |
| **Nolimit Limit** | Small indie, transparent operations | Easy |

---

## 3. Integration Difficulty Assessment

### Easy Integration (< 1 week)
**Characteristics**:
- Games built on common frameworks (Phaser, PixiJS, Unity WebGL)
- Access to source code or modular RNG layer
- Small team, direct access to lead developer
- Already using RNG as a service (easy to swap)

**Examples**: Indie studios, white-label slots, crypto casino originals

### Medium Integration (1-4 weeks)
**Characteristics**:
- Proprietary frameworks but documented RNG interface
- Need approval from multiple stakeholders
- Requires QA and testing phase
- Medium-sized studio with structured processes

**Examples**: Mid-tier studios like PG Soft, Pragmatic Play spin-offs

### Hard Integration (1-3 months)
**Characteristics**:
- Legacy codebase, tightly coupled RNG
- Requires regulatory re-certification
- Large organization with slow decision-making
- Custom proprietary RNG deeply embedded

**Examples**: Major studios like NetEnt, Microgaming, IGT

**Strategy**: Only target "Hard" if there's massive player base or partnership potential.

---

## 4. Targeting Strategy

### Phase 1: Quick Wins (Month 1-2)
**Target**: Asian-symbol slots + crypto casinos

**Actions**:
1. Contact PG Soft (Mahjong Ways developer) - LinkedIn + email to CTO
2. Reach out to BC.Game, Rollbit partnerships teams
3. Demo our existing mahjong-configured slot adapter
4. Offer free pilot integration (3 months)

**Goal**: Get 1-2 live integrations for case studies

### Phase 2: Build Credibility (Month 3-6)
**Target**: Indie studios + high-RTP focused developers

**Actions**:
1. Publish case studies from Phase 1
2. Present at iGB, SiGMA, or similar conferences
3. Create video demos showing verification flow
4. Reach out to 20 indie studios with proven track record

**Goal**: Establish brand recognition, get testimonials

### Phase 3: Enterprise (Month 6-12)
**Target**: Major studios looking for competitive edge

**Actions**:
1. Leverage success stories
2. Offer white-glove integration support
3. Provide regulatory compliance documentation
4. Partner with testing labs (eCOGRA, iTech Labs)

**Goal**: Land 1-2 major studio partnerships

---

## 5. Pitch Template

### Email Subject Lines That Work
- "Upgrade [Game Name] to Physics-Based Provably Fair RNG"
- "New RNG Tech for [Studio]: 10x Better Than Mersenne Twister"
- "Partnership: Make [Game] the First Truly Provably Fair Slot"

### Email Body Template

```
Hi [Name],

I'm reaching out because [Game/Studio] has a reputation for [transparency/innovation/player-first approach].

We've developed a next-generation RNG for slot machines that uses real physics (three-body gravitational chaos) instead of traditional PRNGs. 

Why this matters for [Game/Studio]:

1. **Marketing Advantage**: "First slot using real physics for RNG" is a powerful hook
2. **Player Trust**: Every spin is cryptographically verifiable (better than current "provably fair")
3. **Regulatory Gold Star**: Full audit trail, superior to Mersenne Twister

We already have the integration ready for [specific game type, e.g., "mahjong-themed slots"]. 

**Pilot Offer**: Free 3-month integration + technical support. Zero risk.

Would you be open to a 15-minute call to see a demo?

[Your Name]
[Link to whitepaper]
[Link to live demo]
```

### LinkedIn Cold Outreach

```
Hey [Name], saw your work on [Game] — huge fan of [specific feature].

I'm working on next-gen RNG tech (physics-based, fully verifiable) that could be a killer differentiator for your next release.

Quick question: Is [Studio] open to evaluating new RNG providers? Happy to share a technical demo.
```

---

## 6. Technical Requirements Checklist

Before targeting a game, verify it meets these requirements:

### ✅ Must-Haves
- [ ] Uses server-side RNG (not client-side)
- [ ] Has defined RNG interface/API
- [ ] Accepts external RNG providers or RNG-as-a-Service
- [ ] Team has technical capacity to integrate (at least 1 backend dev)

### ✅ Nice-to-Haves
- [ ] Already claims "provably fair" (easier to pitch upgrade)
- [ ] Uses 5-reel grid (matches our adapter)
- [ ] Has Asian symbol set (immediate compatibility)
- [ ] Written in Node.js/JavaScript (same stack as our system)
- [ ] Open to API-based RNG (our preferred integration method)

### ❌ Deal-Breakers
- [ ] Client-side only RNG (can't replace with server-side)
- [ ] Hard-coded random logic (no abstraction layer)
- [ ] No technical team (can't support integration)
- [ ] Regulatory locked (can't change RNG without full recertification)

---

## Summary: Your First 5 Targets

Based on this guide, here are your **immediate action items**:

1. **PG Soft (Mahjong Ways 2)**: Email CTO with demo. Emphasize ready-made Asian symbol compatibility.
2. **BC.Game**: Reach partnerships team. Pitch as "next evolution of provably fair."
3. **Hacksaw Gaming**: LinkedIn outreach to founders. Highlight player trust angle.
4. **Fortune Pai Gow (various operators)**: Smaller game, multiple operators, easier entry.
5. **Any new crypto casino launching in 2026**: Offer to be their RNG provider from day 1.

**Next Step**: Use the pitch template, attach the whitepaper, and start outreach this week.

---

## Resources

- **Technical Whitepaper**: [WHITEPAPER-THREE-BODY-ENTROPY-RNG.md](./WHITEPAPER-THREE-BODY-ENTROPY-RNG.md)
- **Integration Guide**: [INTEGRATION-PLAN.md](./INTEGRATION-PLAN.md)
- **API Documentation**: [API.md](./API.md)
- **Live Demo**: https://three-body-entropy-rng.vercel.app/
- **Verification Tool**: https://three-body-entropy-rng.vercel.app/verify

---

Good luck! Start with Tier 1 (Asian-symbol slots) where our adapter is already configured and ready to go.
