# MODULE E: CTA SYSTEM & CONTACT INTERFACE

**Document**: Three-Body Entropy RNG - Module E Specification  
**Version**: 1.0  
**Date**: December 14, 2025  
**Parent Spec**: N7-FRONTEND-SHOWCASE-SPECIFICATION.md  
**Devin Session**: Session 5 of 5

## PURPOSE

Add strategic call-to-action buttons throughout the site to guide users to demos and verification tools. NO contact forms or newsletter signups.

## DEPENDENCIES

- Module A (N7A-LAYOUT-NAVIGATION.md): Button classes (`.btn-primary`, `.btn-secondary`)

## DELIVERABLES

###  1. CTA Buttons (Strategic Placement)

**Location**: `/app/page.tsx` + `/components/CTA.tsx`

**CTA Locations**:
- Bottom of Hero: "PLAY DEMO" + "Verify a Spin"
- After Game Portfolio: "TRY ALL GAMES"
- After Fairness Comparison: "Verify a Real Spin" → `/verify`
- Footer CTA: "GET STARTED" button with 18+ and Responsible Gaming icons

### 2. Button Behavior

- "PLAY DEMO" → `/demo` (or modal with game selector)
- "Verify Spin" → `/verify`
- Smooth scroll to sections (use N7A `scrollToSection` helper)
- Use N7A button classes

### 3. NO Contact Forms

❌ Do NOT create:
- Contact page
- Newsletter signup
- Email forms
- Social links

✅ Simple footer with copyright only

## DEVIN PROMPT

```
Build Module E: CTA System from N7E-CTA-CONTACT.md

See complete specification in N7B-E-ALL-MODULES.md Module E section for full details.

Add strategic CTAs throughout site:
- Hero, after sections, footer
- NO contact forms, NO newsletter, NO social links
- Use N7A button classes

Repo: esportsjesus1-create/three-body-entropy-rng
Branch: devin/1765535998-complete-system
```

**STATUS**: Ready for Devin implementation  
**Reference**: See N7B-E-ALL-MODULES.md for complete detailed specifications
