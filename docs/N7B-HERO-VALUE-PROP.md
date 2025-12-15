# MODULE B: HERO SECTION & VALUE PROPOSITION

**Document**: Three-Body Entropy RNG - Module B Specification
**Version**: 1.0
**Date**: December 14, 2025
**Parent Spec**: N7-FRONTEND-SHOWCASE-SPECIFICATION.md
**Devin Session**: Session 2 of 5

## PURPOSE

Create the homepage hero section with value proposition that immediately communicates provable fairness and premium gaming experience to B2B clients.

## DEPENDENCIES

- Module A (N7A-LAYOUT-NAVIGATION.md): Layout classes (`.section-container`, `.btn-primary`, `.btn-secondary`)
- Tailwind CSS design system from Module A
- No other module dependencies

## DELIVERABLES

### 1. Hero Section Component

**Location**: `/app/page.tsx` (Hero component)

**Visual Design**:
- Full-width hero section
- Dark gradient background: `bg-gradient-to-b from-primary-bg to-secondary-bg`
- Minimum height: 80vh
- Centered content vertically and horizontally
- Premium gaming aesthetic (inspired by Pragmatic Play/Evolution Gaming)

**Content Structure**:
```tsx
<section className="hero-section section-container">
  <div className="hero-content">
    <h1 className="h1-display">PROVABLY FAIR SLOTS</h1>
    <p className="hero-subheadline">Every Spin. Cryptographically Verified.</p>
    
    <div className="game-logos-row">
      {/* 3 game logos in horizontal row */}
      <img src="/games/elemental-legends-logo.png" alt="Elemental Legends" />
      <span className="logo-separator">|</span>
      <img src="/games/kungfuworld-logo.png" alt="KungFuWorld" />
      <span className="logo-separator">|</span>
      <img src="/games/kungfugem-logo.png" alt="KungFuGem" />
    </div>
    
    <div className="hero-cta-group">
      <button className="btn-primary">PLAY DEMO</button>
      <button className="btn-secondary">Verify a Spin</button>
    </div>
  </div>
  
  {/* Optional: Three-body orbital animation */}
  <div className="hero-background-animation"></div>
</section>
```

### 2. Visual Treatment

**Typography**:
- H1: "PROVABLY FAIR SLOTS" - Large, bold, uppercase
- Subheadline: "Every Spin. Cryptographically Verified." - Clean, modern font
- Use Pragmatic Play-inspired typography hierarchy

**Colors** (from Module A theme):
- Background gradient: Dark blue to deep purple
- Text: White with subtle glow effect
- CTAs: Premium gold/orange accents

**Animations** (optional):
- Subtle particle animation in background
- Three-body orbital visual (low-key, non-distracting)
- Fade-in on load
- Hover effects on game logos

### 3. Game Logo Display

**Layout**:
- 3 logos in horizontal row
- Pipe separators between logos: `|`
- Equal spacing
- Hover effect: slight scale and glow

**Images**:
- Elemental Legends: `photo_6192887158146796738_y.jpg` (if available from Google Drive)
- KungFuWorld: `photo_6192887158146796740_x.jpg`
- KungFuGem: `photo_6192887158146796739_x.jpg`
- Fallback: Use placeholder images or text logos

### 4. Call-to-Action Buttons

**Primary CTA**: "PLAY DEMO"
- Style: `.btn-primary` class from Module A
- Action: Navigate to `/demo` page or open game selector modal
- Prominent positioning

**Secondary CTA**: "Verify a Spin"
- Style: `.btn-secondary` class from Module A
- Action: Navigate to `/verify` page
- Less prominent but still visible

**Button Group Layout**:
- Side-by-side on desktop
- Stacked on mobile
- Adequate spacing between buttons

### 5. Responsive Design

**Desktop (≥1024px)**:
- Full-width hero with 80vh height
- Horizontal game logo row
- Side-by-side CTA buttons
- Large typography

**Tablet (768px - 1023px)**:
- Adjusted typography sizes
- Maintained horizontal layout
- Slightly reduced heights

**Mobile (<768px)**:
- Stacked layout
- Smaller logo sizes
- Stacked CTA buttons
- Reduced hero height (60vh)
- Optimized text sizes

## TECHNICAL REQUIREMENTS

### Performance
- Lazy load background animations
- Optimize images (WebP format)
- Critical CSS inlined
- < 1s LCP (Largest Contentful Paint)

### Accessibility
- Semantic HTML (h1, section, button)
- Alt text for all images
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast ratios: WCAG AA minimum

### Browser Support
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Graceful degradation for older browsers
- CSS fallbacks for gradients/animations

## INTEGRATION WITH OTHER MODULES

- **Module A**: Uses layout classes (`.section-container`, button styles)
- **Module D**: Game logos link to product showcase section
- **Module E**: CTAs coordinated with overall CTA system

## SUCCESS CRITERIA

✅ Hero section loads in < 1s
✅ All CTAs functional and linked correctly
✅ Responsive across all breakpoints
✅ Premium aesthetic matches Pragmatic Play standards
✅ Game logos display correctly or have proper fallbacks
✅ Accessibility score: 100% (Lighthouse)

## DEVIN PROMPT TEMPLATE

```
Build Module B: Hero Section from N7B-HERO-VALUE-PROP.md

Create homepage hero with:
- "PROVABLY FAIR SLOTS" headline (Pragmatic Play style)
- 3 game logo placeholders in row (Elemental Legends | KungFuWorld | KungFuGem)
- Dual CTAs (Play Demo + Verify Spin)
- Dark premium aesthetic with gradients
- Use N7A layout classes (.section-container, .btn-primary, .btn-secondary)

Reference: N7-FRONTEND-SHOWCASE-SPECIFICATION.md Section "PAGE 1: HOMEPAGE"
Location: /app/page.tsx (Hero component)

Repo: esportsjesus1-create/three-body-entropy-rng
Branch: devin/1765535998-complete-system
```

## NOTES

- Keep animations subtle - focus on content, not distractions
- Ensure fast load time - hero is first impression
- Use Module A's design tokens consistently
- Test on real devices for responsive behavior
- Consider A/B testing different CTA copy later

**STATUS**: Ready for Devin implementation
**ESTIMATED COMPLETION**: 90%+ in single Devin session
