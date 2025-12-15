# N6 - B2B WEBSITE & FAIRNESS PORTAL SPECIFICATION

**Document**: Three-Body Entropy RNG - Complete B2B Marketing Website with Integrated Fairness Verification

**Version**: 1.0

**Date**: December 14, 2025

**Purpose**: Complete specification for building a production-ready B2B slot provider website that showcases the Three-Body Entropy RNG system while providing integrated fairness verification capabilities.

---

## EXECUTIVE SUMMARY

This specification defines a dual-purpose website:

1. **B2B Marketing Site**: Professional platform targeting casino operators and gaming platforms
2. **Fairness Verification Portal**: Public tool for players and auditors to verify spin integrity

The site will follow established B2B iGaming provider patterns (Pragmatic Play, Evolution Gaming) while highlighting our unique provably fair technology.

**Key Principle**: Prove fairness through cryptographic transparency WITHOUT exposing proprietary three-body physics or theta algorithms.

---

## A. Finalize the deliverables list

### 1) Public marketing website (no login)

- Pages: Home, Technology, Games, Fairness, Integration, Partners, Company
- SEO: structured data, OpenGraph, sitemap.xml, robots.txt
- Compliance footer: 18+, Responsible Gaming, Terms/Privacy, licensing statements

### 2) Fairness verification portal (public)

- "How it Works" explainer + "Live Verification Tool"
- Open-source verifier library (client-side + npm package)
- Deterministic reference tests (golden vectors)

### 3) Client portal (login)

- Operator onboarding
- API keys + IP allowlist
- Webhook config
- Usage analytics (spins verified, latency, uptime)
- SDK downloads

---

## B. Fairness: define the "Verification Bundle" schema (JSON)

This is the single most important missing piece. You want a bundle that proves:

1. commitment was pre-published
2. reveal matches commitment
3. mixing is correct
4. outcome is deterministically derived

Here's a solid schema that avoids exposing your proprietary entropy method:

```json
{
  "version": "1.0",
  "game": {
    "id": "kungfu_gem",
    "mathVersion": "reels-v3",
    "reelStripsHash": "sha256:...optional..."
  },
  "spin": {
    "spinId": "123456",
    "sessionId": "abc-123-def",
    "timestamp": "2025-12-14T14:00:00Z",
    "mode": "real"
  },
  "commitment": {
    "commitmentHash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "hashAlg": "SHA-256",
    "publishedAt": "2025-12-14T13:59:59Z"
  },
  "seeds": {
    "serverSeed": "hello",
    "clientSeed": "world",
    "nonce": 1
  },
  "mixing": {
    "kdf": "HKDF-SHA256",
    "salt": "tb-entropy-v1",
    "info": "spin",
    "combinedSeedHex": "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d"
  },
  "result": {
    "reelStops": [5, 12, 3, 7, 19],
    "symbols": ["CHERRY", "K", "A", "WILD", "SCATTER"],
    "payout": {
      "bet": 100,
      "win": 250,
      "currency": "USD"
    }
  },
  "serverProof": {
    "commitChainPrev": "sha256:...optional...",
    "commitChainThis": "sha256:...optional..."
  }
}
```

**Notes**

- You're revealing `serverSeed` **after** the spin. That's fine as long as the **commitmentHash was published before** the clientSeed was known.
- `salt/info` are public constants; they don't leak the proprietary entropy source.
- `reelStripsHash` (optional) lets auditors confirm reelstrip integrity without exposing strips publicly unless you choose to.

---

## C. Reference verification algorithm (what the portal does)

### Check 1: Commitment validity

- Compute: `SHA256(serverSeed)` (or `SHA256(UTF8(serverSeed))`, but pick one and freeze it)
- Must equal `commitment.commitmentHash`

### Check 2: Seed mixing validity (HKDF)

- Derive `combinedSeed = HKDF_SHA256(ikm=serverSeed||clientSeed||nonce, salt, info, 32 bytes)`
  - Or: `ikm=serverSeed`, `salt=clientSeed`, `info=nonce` (also fine)
  - The key is: **pick one canonical method**, document it, and never change it without `version` bumps.
- Must equal `mixing.combinedSeedHex`

### Check 3: Deterministic result

- Derive reel stop indices from `combinedSeedHex` in a clearly-defined way:
  - Example: split into 4-byte chunks per reel:
    - reel1 uses bytes 0..3, reel2 uses 4..7, etc.
  - Convert chunk to uint32, then `stop = uint32 % reelLength`
- Compare to `result.reelStops`

### Output format (portal UX)

- Green checks + computed intermediates
- "Copy audit report" button (plain text + JSON)

---

## D. Client-side verifier implementation outline (JS/TS)

You'll want a shared library used by:

- the website fairness page widget
- npm package for partners/auditors
- unit tests (golden vectors)

Minimal API:

```typescript
type VerifyOutput = {
  ok: boolean;
  checks: {
    commitment: { ok: boolean; computed: string };
    mixing: { ok: boolean; computed: string };
    result: { ok: boolean; computedStops: number[] };
  };
  warnings: string[];
};

export function verifyBundle(bundle: any): VerifyOutput;
```

Implementation details to lock down:

- exact string encoding (UTF-8), hex casing, nonce type (integer), byte order (big-endian for uint32 is common)
- HKDF params: salt/info/length and whether inputs are concatenated vs separate fields

---

## E. Security & anti-abuse requirements (important in real deployments)

### Don't let verification become an oracle

- Verifier should operate only on **already completed spins** and public bundles
- No endpoint that accepts arbitrary seeds and returns outcomes

### Rate limits + WAF

- Public portal: basic IP rate limit + payload size limit (e.g., 64 KB)
- Server-side verify endpoint (if you add one): strict throttling

### Integrity of "published commitment"

To make "published before spin" credible:

- Publish commitments to an append-only log:
  - a public endpoint exposing a hash chain, **or**
  - periodic anchoring (daily/ hourly) to a public timestamp service / transparency log
- Your spec already hints at "tamper-proof hash chains" — formalize it:
  - `commitChainThis = SHA256(commitChainPrev || commitmentHash || publishedAt)`

---

## F. Website build recommendations (practical, fast, scalable)

### Frontend

- Next.js (App Router) + Tailwind
- i18n-ready (EN first, but structure for future)
- Animation: subtle WebGL/canvas for hero, but degrade gracefully

### Backend

- Marketing site can be static
- Client portal + API docs:
  - auth (OIDC or passwordless magic link)
  - API key issuance
  - docs hosting (OpenAPI + Redoc or Mintlify-style)

### Content management

- Headless CMS optional, but for v1: MDX content + a simple "Games" JSON config is enough.

---

## G. Concrete acceptance criteria (so you can QA it)

### Fairness tool must:

- Reject invalid JSON with helpful errors
- Show computed SHA-256 and HKDF outputs
- Recompute reel stops and match exactly
- Produce a downloadable/copyable report
- Include "Load Example" that passes

### Tech page must:

- Explain commitment-reveal + HKDF in plain language
- Never show three-body equations or theta internals
- Provide RFC5869 mention + SHA-256 mention (already in spec)

### Games page must:

- Use consistent fields (reels/paylines/RTP/max win)
- Demo mode clearly labeled "Demo (no real money)"
