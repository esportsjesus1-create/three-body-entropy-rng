# N7 - FRONTEND SHOWCASE SPECIFICATION

**Document**: Three-Body Entropy Slots - Simple Product Showcase Website
**Version**: 1.0  
**Date**: December 14, 2025  
**Purpose**: Minimal, focused frontend to showcase provably fair slot products and highlight fairness advantage over competitors

---

## EXECUTIVE SUMMARY

**Goal**: Create a clean, simple website that:
1. Showcases your 3 slot games with visual appeal
2. Explains WHY you're more fair than competitors (without overwhelming technical details)
3. NO language selection, news, contact forms, or extra fluff
4. Focus ONLY on what makes you unique: **Provably Fair RNG**

**Design Philosophy**: Pragmatic Play aesthetic (dark, premium, gaming-focused) but simplified to essentials

---

## PAGES & STRUCTURE

### Simplified 3-Page Site

```
Homepage
  ├─ Hero: Our Games
  ├─ Game Portfolio (3 slots)
  └─ Why We're Fairer
  
Play Demo (optional)
  └─ Embedded game iframe

Verify Spin (from N6)
  └─ Fairness verification tool
```

**Navigation**: Minimal top bar
- Logo (left)
- "Our Games" | "Why Fair?" | "Verify Spin"
- NO language selector, NO news, NO contact

---

## DESIGN & STYLING REQUIREMENTS

### Extract from Pragmatic Play Images

**To Gemini**: Send screenshots of:
1. Pragmatic Play homepage hero (already captured)
2. Your 3 slot game images from Google Drive

**Extract**:
- Color palette (dark backgrounds, orange/gold accents)
- Typography (bold, modern sans-serif)
- Button styles (glossy, premium gaming buttons)
- Card layouts (game showcases with hover effects)
- Gradient/lighting effects

### Core Design System

**Colors** (from Pragmatic Play):
```css
--primary-bg: #1a1625 (dark purple-black)
--secondary-bg: #2d2640 (lighter purple)
--accent-orange: #ff6b1a (brand orange)
--accent-gold: #ffd700 (gold highlights)
--text-primary: #ffffff
--text-secondary: #b8b8d1
```

**Typography**:
- Headings: Bold, uppercase, dramatic (similar to "YOUR FAVOURITE EVERY TIME™")
- Body: Clean sans-serif, readable
- Accents: Stylized for game titles

**Components**:
- Hero: Full-width, dark background with gradient
- Game Cards: Hover-lift effect, glow on hover, prominent "Play Demo" button
- Fair Comparison: Side-by-side visual comparison table

---

## PAGE 1: HOMEPAGE

### Section 1: Hero

**Layout**: Full-width dark background with subtle particle animation or three-body orbital visual

**Content**:
```
PROVABLY FAIR SLOTS
Every Spin. Cryptographically Verified.

[Your 3 Game Logos/Icons in a row]

Elemental Legends | KungFuWorld | KungFuGem
```

**CTA**: Large glossy button: "PLAY DEMO" + smaller "Verify a Spin"

### Section 2: Game Portfolio

**Title**: "OUR GAMES"

**Layout**: 3-column grid (desktop) / vertical stack (mobile)

Each game card:
- Full game screenshot (from Google Drive)
- Game title overlay
- Quick stats: RTP 96.X% | 5 Reels | XX Paylines
- Badge: "PROVABLY FAIR ✓"
- Button: "PLAY DEMO" (primary) + "LEARN MORE" (secondary)

**Games**:
1. **Elemental Legends**
   - Image: `photo_6192887158146796738_y.jpg`
   - Description: "Mystical floating islands with elemental powers"
   - RTP: 96.5% | 5 Reels | 25 Paylines

2. **KungFuWorld Slot**
   - Image: `photo_6192887158146796740_x.jpg`
   - Description: "Martial arts mastery meets mystical Chinese mythology"
   - RTP: 96.2% | 5 Reels | 20 Paylines

3. **KungFuGem Slot**
   - Image: `photo_6192887158146796739_x.jpg`
   - Description: "Crystal-powered kung fu adventure"
   - RTP: 96.8% | 5 Reels | 30 Paylines

### Section 3: Why We're Fairer

**Title**: "PROVABLY FAIR - NOT JUST A PROMISE"

**Layout**: 2-column comparison (Our Slots vs Traditional Slots)

**Visual**: Side-by-side comparison boxes

#### LEFT: Traditional Slots ❌
```
❌ "Trust us" - No way to verify
❌ Hidden RNG algorithms
❌ No player input in randomness
❌ Results decided solely by house
❌ Impossible to audit independently
```

#### RIGHT: Our Provably Fair Slots ✅
```
✅ Cryptographically verifiable
✅ You contribute to randomness (client seed)
✅ We commit BEFORE you play (server seed hash)
✅ Anyone can verify the math
✅ Open verification tools
```

**Simple Explanation** (3 steps with icons):

1. **🔒 We Commit First**
   "Before you spin, we publish a cryptographic 'fingerprint' of our random number. We can't change it later."

2. **🎲 You Add Randomness**
   "Your browser generates its own random seed. We mix it with ours using standard cryptography (HKDF)."

3. **✅ You Can Verify**
   "After the spin, we reveal our original number. You can check the math yourself using our verification tool."

**CTA**: "Verify a Real Spin" button → links to Verify Spin page

---

## PAGE 2: VERIFY SPIN (Reuse from N6)

**Simply import the verification portal from N6 specification**

- JSON input textarea
- "Load Example" button
- Green check indicators for each verification step
- "Copy Audit Report" button

**No changes needed** - this is already fully specified in N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md

---

## PAGE 3: PLAY DEMO (Optional)

**Layout**: Full-screen game embed

- Game selector dropdown (Elemental Legends / KungFuWorld / KungFuGem)
- Embedded game iframe (demo mode)
- Sidebar: "Try other games" with thumbnails
- Footer: "This is demo mode - no real money"

**If games aren't ready**: Link to external demo or placeholder "Coming Soon"

---

## FOOTER (All Pages)

**Minimal footer**:
```
Logo | © 2025 Three-Body Entropy Slots

[18+ Icon] [Responsible Gaming Icon]

Built with Three-Body Entropy RNG™
```

**No**: Social media, newsletter signup, sitemap, privacy policy pages (keep it ultra-simple)

---

## TECHNICAL STACK (Same as N6)

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Verification Library**: Reuse from N6 (SHA-256 + HKDF verification)

---

## GEMINI PROMPT FOR DESIGN EXTRACTION

**Send to Gemini** with these images:
1. Pragmatic Play homepage screenshot (already captured)
2. Your 3 slot game images

**Prompt**:
```
Analyze these images and extract the complete design system:

1. Pragmatic Play Homepage (reference style)
2. Elemental Legends slot game
3. KungFuWorld slot game  
4. KungFuGem slot game

Please provide:
- Exact color palette (hex codes) for backgrounds, accents, text
- Typography specifications (font families, sizes, weights)
- Button styles (gradients, shadows, hover effects)
- Card/component styles (borders, shadows, spacing)
- Animation suggestions (subtle, premium gaming feel)
- Layout grid specifications

Output as CSS variables and Tailwind config ready to use.
```

---

## WHAT TO EXCLUDE (From Evolution/Pragmatic Play)

❌ **Remove these common B2B site elements**:
- Language selector dropdown
- News/blog section
- Contact forms
- About us / Company history
- Careers page
- Partners/client logos
- Newsletter signup
- Social media links
- Multi-level navigation menus
- Product categories beyond slots
- Licensing details page
- Terms & Conditions pages

✅ **Keep ONLY**:
- Game showcase
- Fairness explanation
- Verification tool
- Simple navigation

---

## ACCEPTANCE CRITERIA

### Homepage Must:
- [ ] Display all 3 game images properly optimized
- [ ] Match Pragmatic Play color scheme and premium feel
- [ ] Explain fairness in 3 simple steps (under 50 words each)
- [ ] Show clear visual comparison (Traditional vs Provably Fair)
- [ ] Load in < 2 seconds on mobile
- [ ] Look professional but not overwhelming

### Verification Page Must:
- [ ] Reuse N6 verification tool exactly
- [ ] Accept JSON verification bundles
- [ ] Show green checks for valid spins
- [ ] Work offline (client-side only)

### Overall Site Must:
- [ ] Mobile responsive (all breakpoints)
- [ ] No broken links
- [ ] No language selector or news sections
- [ ] < 3 pages total (Homepage, Verify, optional Play Demo)
- [ ] Lighthouse score > 85 (Performance, Accessibility)

---

## UNIQUE SELLING POINTS TO EMPHASIZE

**Core Message**: "Provably Fair - You Don't Have To Trust Us, You Can Verify"

**3 Key Differentiators** (highlight these prominently):

1. **Client Seed Mixing**
   - Traditional slots: 100% house controlled
   - Our slots: You contribute randomness

2. **Pre-Commitment**
   - Traditional slots: Results generated after bet
   - Our slots: We commit BEFORE you play (can't cheat)

3. **Independent Verification**
   - Traditional slots: "Trust us"
   - Our slots: Verify with open-source tools

---

## DEVIN PROMPT (Ready to Use)

```
Build a minimal provably fair slots showcase website from N7-FRONTEND-SHOWCASE-SPECIFICATION.md.

Requirements:
1. Next.js 14 + Tailwind CSS + TypeScript
2. 3 pages: Homepage, Verify Spin, (optional) Play Demo
3. Extract design system from Pragmatic Play using Gemini:
   - Send screenshots to Gemini
   - Get color palette, typography, component styles
   - Implement as Tailwind config
4. Game portfolio section with 3 slot images:
   - Elemental Legends (photo_6192887158146796738_y.jpg)
   - KungFuWorld (photo_6192887158146796740_x.jpg)
   - KungFuGem (photo_6192887158146796739_x.jpg)
5. Simple "Traditional vs Provably Fair" comparison
6. Reuse verification tool from N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
7. NO language selector, news, contact, or extra fluff
8. Deploy to Vercel

Reference:
- N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md (verification tool)
- N7-FRONTEND-SHOWCASE-SPECIFICATION.md (complete spec)
- Pragmatic Play homepage (design reference)
```

---

## SUCCESS METRICS

**Primary Goal**: Showcase provably fair slots simply and clearly

**Measures**:
- Visitor understands "provably fair" in < 30 seconds
- Can verify a spin without confusion
- Impressed by game visuals and premium feel
- NOT overwhelmed by information or navigation

**Target Audience**: Casino operators evaluating fair gaming tech + players curious about verification

---

## PHASE APPROACH

### Phase 1: Design Extraction (Gemini)
1. Send Pragmatic Play screenshot + 3 game images to Gemini
2. Get complete design system (colors, typography, styles)
3. Create Tailwind config

### Phase 2: Homepage Build (Devin)
1. Hero section with game logos
2. 3-game portfolio grid
3. "Why Fair?" comparison section

### Phase 3: Verification Page (Devin)
1. Copy verification tool from N6
2. Style to match homepage
3. Add "Load Example" with working test case

### Phase 4: Polish (Cursor - optional)
1. Animation timing
2. Image optimization
3. Mobile responsiveness tweaks

---

## FILE STRUCTURE

```
/app
  /page.tsx              # Homepage
  /verify/page.tsx       # Verify Spin
  /demo/page.tsx         # Play Demo (optional)
/components
  /Hero.tsx
  /GameCard.tsx
  /FairComparison.tsx
  /VerificationTool.tsx  # From N6
/lib
  /verifier.ts           # SHA-256 + HKDF logic from N6
/public
  /images
    /elemental-legends.jpg
    /kungfu-world.jpg
    /kungfu-gem.jpg
tailwind.config.ts       # Design system from Gemini
```

---

## NOTES & REMINDERS

**Critical**: Keep it SIMPLE. The whole point is to avoid the bloat of Evolution/Pragmatic Play full B2B sites.

**Design Priority**: Premium gaming aesthetic, but minimal navigation and content

**Fairness Explanation**: Use analogies, not cryptography jargon
- ✅ "fingerprint of a number"
- ✅ "mix your randomness with ours"
- ❌ "SHA-256 cryptographic hash function"
- ❌ "HKDF key derivation protocol"

**Google Drive Images**: Must be optimized for web (WebP format, < 500KB each)

---

## QUICK LINKS

- [N6 Verification Spec](./N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md)
- [PROJECT-MASTER Tracker](./PROJECT-MASTER.md)
- [Pragmatic Play Reference](https://www.pragmaticplay.com/)

---

**Last Updated**: December 14, 2025  
**Next Step**: Extract design system with Gemini, then build with Devin
