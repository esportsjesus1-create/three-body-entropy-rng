# MODULES B-E: CONSOLIDATED SPECIFICATION

**Purpose**: Complete specification for remaining 4 modules (Hero, Fairness, Products, CTA) that Devin will build in parallel
**Parent Spec**: N7-FRONTEND-SHOWCASE-SPECIFICATION.md
**Target**: 4 parallel Devin sessions, integrate into unified B2B website

---

## MODULE B: HERO SECTION & VALUE PROPOSITION

**Devin Session**: 2 of 5  
**Dependencies**: N7A layout classes (`.section-container`, `.btn-primary`)  
**Location**: Homepage `/app/page.tsx`

### Build Requirements
1. **Hero Section** (full-width, dark gradient background)
   - Headline: "PROVABLY FAIR SLOTS" (h1-display class)
   - Subheadline: "Every Spin. Cryptographically Verified."
   - 3 Game Logos in row: Elemental Legends | KungFuWorld | KungFuGem
   - Primary CTA: "PLAY DEMO" (btn-primary)
   - Secondary CTA: "Verify a Spin" (btn-secondary)

2. **Visual Treatment**:
   - Subtle particle animation or three-body orbital visual (optional)
   - Dark gradient: `bg-gradient-to-b from-primary-bg to-secondary-bg`
   - Min height: 80vh
   - Centered content vertically

3. **Responsive**: Stack vertically on mobile, horizontal on desktop

### Devin Prompt
```
Build Module B: Hero Section from N7B-E-ALL-MODULES.md

Create homepage hero with:
- "PROVABLY FAIR SLOTS" headline (Pragmatic Play style)
- 3 game logo placeholders in row
- Dual CTAs (Play Demo + Verify Spin)
- Dark premium aesthetic with gradients
- Use N7A layout classes (.section-container, .btn-primary)

Reference: N7-FRONTEND-SHOWCASE-SPECIFICATION.md Section "PAGE 1: HOMEPAGE"
Location: /app/page.tsx (Hero component)
```

---

## MODULE C: FAIRNESS VERIFICATION INTEGRATION

**Devin Session**: 3 of 5  
**Dependencies**: NONE (fully independent)  
**Location**: `/app/verify/page.tsx`

### Build Requirements
1. **Reuse N6 Verification Tool** (complete specification in N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md)
   - JSON input textarea
   - "Load Example" button with working test data
   - Green check indicators for each verification step:
     - ✅ Server seed hash matches
     - ✅ HKDF derivation correct
     - ✅ RNG output matches
   - "Copy Audit Report" button

2. **Verification Logic** (client-side only):
   ```typescript
   // lib/verifier.ts
   - SHA-256 hash verification
   - HKDF key derivation (HMAC-based)
   - RNG output verification
   - All crypto operations in browser (Web Crypto API)
   ```

3. **Page Layout**:
   - Title: "VERIFY SPIN INTEGRITY"
   - Description: "Paste your spin verification bundle below"
   - Full-width textarea (JSON input)
   - Verification results with step-by-step checks

### Devin Prompt
```
Build Module C: Fairness Verification from N7B-E-ALL-MODULES.md

Create standalone verification page:
- Reuse complete spec from N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
- JSON input with "Load Example" button
- Client-side verification (SHA-256, HKDF, RNG check)
- Green check UI for each step
- Copy audit report functionality
- Works offline (no server calls)

Location: /app/verify/page.tsx + /lib/verifier.ts
Reference: N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md (complete spec)
```

---

## MODULE D: PRODUCT SHOWCASE & TECHNICAL FEATURES

**Devin Session**: 4 of 5  
**Dependencies**: N7A layout classes (`.grid-3-col`, `.grid-2-col`)  
**Location**: Homepage `/app/page.tsx`

### Build Requirements

#### Part 1: Game Portfolio (3-column grid)
Use `.grid-3-col` class from N7A

**3 Game Cards**:
1. **Elemental Legends**
   - Image: `photo_6192887158146796738_y.jpg` (from Google Drive)
   - RTP: 96.5% | 5 Reels | 25 Paylines
   - Description: "Mystical floating islands with elemental powers"
   - Badge: "PROVABLY FAIR ✓"
   - Buttons: "PLAY DEMO" + "LEARN MORE"

2. **KungFuWorld Slot**
   - Image: `photo_6192887158146796740_x.jpg`
   - RTP: 96.2% | 5 Reels | 20 Paylines
   - Description: "Martial arts mastery meets mystical Chinese mythology"
   - Badge: "PROVABLY FAIR ✓"

3. **KungFuGem Slot**
   - Image: `photo_6192887158146796739_x.jpg`
   - RTP: 96.8% | 5 Reels | 30 Paylines
   - Description: "Crystal-powered kung fu adventure"
   - Badge: "PROVABLY FAIR ✓"

**Card Design**:
- Hover-lift effect
- Glow on hover
- Premium gaming aesthetic
- Dark background with accent borders

#### Part 2: Fairness Comparison (2-column)
Use `.grid-2-col` class from N7A

**Title**: "PROVABLY FAIR - NOT JUST A PROMISE"

**LEFT Column - Traditional Slots ❌**:
```
❌ "Trust us" - No way to verify
❌ Hidden RNG algorithms
❌ No player input in randomness
❌ Results decided solely by house
❌ Impossible to audit independently
```

**RIGHT Column - Our Provably Fair Slots ✅**:
```
✅ Cryptographically verifiable
✅ You contribute to randomness (client seed)
✅ We commit BEFORE you play (server seed hash)
✅ Anyone can verify the math
✅ Open verification tools
```

**3-Step Explanation** (icons + text):
1. 🔒 **We Commit First**: "Before you spin, we publish a cryptographic 'fingerprint'"
2. 🎲 **You Add Randomness**: "Your browser generates its own random seed"
3. ✅ **You Can Verify**: "Check the math yourself using our verification tool"

### Devin Prompt
```
Build Module D: Product Showcase from N7B-E-ALL-MODULES.md

Create two sections:
1. Game Portfolio (3-column grid):
   - 3 game cards (Elemental Legends, KungFuWorld, KungFuGem)
   - Use placeholder images or request from Google Drive
   - RTP stats, paylines, descriptions
   - Hover effects, premium card design
   - Use N7A .grid-3-col class

2. Fair Comparison (2-column):
   - Traditional vs Provably Fair side-by-side
   - Checkmarks/X marks for each point
   - 3-step explanation with icons
   - Use N7A .grid-2-col class

Location: /app/page.tsx (GamePortfolio + FairComparison components)
Reference: N7-FRONTEND-SHOWCASE-SPECIFICATION.md Section "Section 2" and "Section 3"
```

---

## MODULE E: CTA SYSTEM & CONTACT INTERFACE

**Devin Session**: 5 of 5  
**Dependencies**: N7A button classes (`.btn-primary`, `.btn-secondary`)  
**Location**: Throughout site

### Build Requirements

1. **CTA Buttons** (strategically placed):
   - Bottom of Hero: "PLAY DEMO" + "Verify a Spin"
   - After Game Portfolio: "TRY ALL GAMES"
   - After Fairness Comparison: "Verify a Real Spin" → `/verify`
   - Use N7A button classes

2. **Footer CTA** (minimal):
   ```
   [18+ Icon] [Responsible Gaming Icon]
   "Ready to experience provably fair gaming?"
   [GET STARTED] button
   ```

3. **NO Contact Forms**:
   - ❌ Do NOT create contact page
   - ❌ Do NOT create newsletter signup
   - ❌ Do NOT create email forms
   - Simple footer with copyright only

4. **Button Behavior**:
   - "PLAY DEMO" → `/demo` (or modal with game selector)
   - "Verify Spin" → `/verify`
   - Smooth scroll to sections (use N7A `scrollToSection` helper)

### Devin Prompt
```
Build Module E: CTA System from N7B-E-ALL-MODULES.md

Add strategic CTAs throughout site:
- Hero: Dual CTAs (Play Demo + Verify)
- After each major section
- Footer CTA (minimal, no contact forms)
- Use N7A button classes (.btn-primary, .btn-secondary)
- Smooth scroll behavior

NO contact forms, NO newsletter, NO social links
Just clean CTAs linking to /demo and /verify pages

Location: /app/page.tsx + /components/CTA.tsx
```

---

## INTEGRATION PLAN

### Final Assembly
All 5 modules merge into:
```
/app
  /layout.tsx (Module A - Nav + Footer)
  /page.tsx (Modules B, D, E - Homepage sections)
  /verify/page.tsx (Module C - Verification)
  /demo/page.tsx (Future - game embeds)
```

### Integration Steps
1. Module A provides base framework
2. Module B creates Hero at top of `/app/page.tsx`
3. Module D creates GamePortfolio + FairComparison below Hero
4. Module E adds CTAs between sections
5. Module C creates standalone `/verify` page
6. All use N7A design system (colors, fonts, classes)
7. Deploy to Vercel as unified site

### Success Criteria
- Single cohesive B2B website
- All 5 modules integrated seamlessly
- Responsive across devices
- < 3s load time
- Match Pragmatic Play aesthetic
- NO language selector, news, contact forms

---

## MASTER DEVIN COMMAND

Launch all 5 Devin sessions simultaneously:

**Session 1 (Module A)**:
```
Build N7A-LAYOUT-NAVIGATION.md
Create: Nav, Footer, Tailwind config, layout structure
Repo: esportsjesus1-create/three-body-entropy-rng
Branch: devin/1765535998-complete-system
```

**Session 2 (Module B)**:
```
Build Module B from N7B-E-ALL-MODULES.md
Create: Hero section with game logos and CTAs
Depends on: N7A layout classes
```

**Session 3 (Module C)**:
```
Build Module C from N7B-E-ALL-MODULES.md
Create: Standalone verification page (reuse N6 spec)
Independent module
```

**Session 4 (Module D)**:
```
Build Module D from N7B-E-ALL-MODULES.md
Create: Game portfolio + Fairness comparison
Depends on: N7A grid classes
```

**Session 5 (Module E)**:
```
Build Module E from N7B-E-ALL-MODULES.md
Create: CTA buttons throughout site
Depends on: N7A button classes
```

**Final Integration**: Merge all modules into single Next.js app, deploy to Vercel

---

**STATUS**: Ready for parallel Devin execution  
**NEXT**: Launch all 5 Devin sessions → integrate → deploy
