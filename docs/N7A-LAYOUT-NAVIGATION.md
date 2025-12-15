# MODULE A: CORE LAYOUT & NAVIGATION FRAMEWORK

**Module ID**: N7A-LAYOUT-NAVIGATION  
**Parent Spec**: N7-FRONTEND-SHOWCASE-SPECIFICATION.md  
**Devin Session**: 1 of 5  
**Dependencies**: None (foundational module)  
**Target Completion**: 90%+ on first iteration

---

## MODULE SCOPE

Build the foundational HTML/CSS/JS framework that all other modules will plug into. This includes:
- Base page structure and responsive grid system
- Top navigation bar
- Footer component
- Tailwind config with Pragmatic Play design system
- Typography system
- Routing structure (Next.js App Router)

---

## DESIGN SYSTEM EXTRACTION

### Step 1: Use Gemini for Design Analysis
Send these images to Gemini and extract complete design tokens:
1. Pragmatic Play homepage: https://www.pragmaticplay.com/en/#
2. Request: "Extract color palette, typography, spacing, shadows from this B2B gaming site"

### Step 2: Implement as Tailwind Config

Expected output from Gemini (implement these):

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'primary-bg': '#1a1625',
        'secondary-bg': '#2d2640',
        'accent-orange': '#ff6b1a',
        'accent-gold': '#ffd700',
        'text-primary': '#ffffff',
        'text-secondary': '#b8b8d1',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
    },
  },
}
```

---

## NAVIGATION COMPONENT

### Requirements
- **Position**: Fixed top, full-width
- **Background**: `primary-bg` with slight opacity
- **Height**: 80px desktop, 60px mobile
- **Layout**: Flexbox, space-between

### Structure
```
[Logo] ......................... [Our Games | Why Fair? | Verify Spin]
```

### Specifications
1. **Logo** (left side):
   - Text: "Three-Body Entropy Slots" or logo image
   - Font: Display font, bold, 24px
   - Color: `accent-gold`
   - Link: "/" (homepage)

2. **Nav Links** (right side):
   - Links: "Our Games" | "Why Fair?" | "Verify Spin"
   - Font: Body font, 16px
   - Color: `text-secondary`, hover: `accent-orange`
   - Spacing: 32px between items
   - Active state: underline with `accent-orange`

3. **Mobile Behavior**:
   - < 768px: Hamburger menu icon
   - Menu slides from right
   - Full-height drawer with vertical nav items

### NO Language Selector
❌ Do NOT include language dropdown
❌ Do NOT include news/blog links
❌ Do NOT include contact links

---

## FOOTER COMPONENT

### Requirements
- **Position**: Bottom of page
- **Background**: `secondary-bg`
- **Padding**: 40px vertical
- **Layout**: Centered content, max-width 1200px

### Structure
```
[Logo] | © 2025 Three-Body Entropy Slots
[18+ Icon] [Responsible Gaming Icon]
Built with Three-Body Entropy RNG™
```

### Specifications
1. **Content**:
   - Logo (smaller version, 16px text)
   - Copyright text
   - Age verification icon (18+)
   - Responsible gaming icon
   - Tagline: "Built with Three-Body Entropy RNG™"

2. **NO Social Media Links**
3. **NO Newsletter Signup**
4. **NO Sitemap or Privacy Policy**

---

## PAGE LAYOUT STRUCTURE

### Next.js App Router Structure
```
/app
  /layout.tsx         # Root layout with nav + footer
  /page.tsx           # Homepage (Module B, D, E plug in)
  /verify/page.tsx    # Verification page (Module C)
  /demo/page.tsx      # Optional play demo (future)
```

### Root Layout Template
```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body className="bg-primary-bg text-text-primary">
        <Navigation />
        <main className="min-h-screen pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

---

## RESPONSIVE GRID SYSTEM

### Breakpoints (Tailwind defaults)
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Container Specifications
- Max-width: 1200px
- Padding: 20px mobile, 40px desktop
- Centered with `mx-auto`

### Grid Classes to Provide
```css
.section-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.grid-3-col {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8;
}

.grid-2-col {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-12;
}
```

---

## TYPOGRAPHY SYSTEM

### Heading Styles
```css
.h1-display {
  @apply font-display text-5xl md:text-6xl font-bold uppercase tracking-wide;
}

.h2-section {
  @apply font-display text-3xl md:text-4xl font-bold uppercase;
}

.h3-card {
  @apply font-display text-xl md:text-2xl font-semibold;
}
```

### Body Styles
```css
.body-large {
  @apply font-body text-lg text-text-secondary leading-relaxed;
}

.body-regular {
  @apply font-body text-base text-text-secondary;
}
```

---

## BUTTON SYSTEM

### Primary Button (CTA)
```css
.btn-primary {
  @apply bg-gradient-to-r from-accent-orange to-accent-gold
         text-white font-bold px-8 py-4 rounded-lg
         hover:scale-105 transition-transform duration-200
         shadow-lg hover:shadow-2xl;
}
```

### Secondary Button
```css
.btn-secondary {
  @apply border-2 border-accent-orange text-accent-orange
         px-6 py-3 rounded-lg
         hover:bg-accent-orange hover:text-white
         transition-colors duration-200;
}
```

---

## INTEGRATION CONTRACTS

### CSS Classes Other Modules Must Use
- `.section-container` - All sections wrap in this
- `.grid-3-col` - Game portfolio grid (Module D)
- `.grid-2-col` - Fair comparison (Module B)
- `.btn-primary` - All CTAs
- `.btn-secondary` - Secondary actions

### Props/Exports Other Modules Need
```typescript
// Navigation state (for active link highlighting)
export function useActivePath(): string

// Scroll to section helper
export function scrollToSection(id: string): void
```

---

## ACCEPTANCE CRITERIA

### Navigation Must:
- [ ] Stick to top on scroll
- [ ] Highlight active page
- [ ] Mobile hamburger menu works
- [ ] NO language selector present
- [ ] Load in < 500ms

### Footer Must:
- [ ] Display on all pages
- [ ] Centered content
- [ ] NO social media links
- [ ] Age verification icons present

### Layout Must:
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Max-width 1200px content
- [ ] Proper spacing (sections 80px apart)
- [ ] Dark theme (Pragmatic Play colors)

### Design System Must:
- [ ] Tailwind config matches Pragmatic Play
- [ ] Typography scales properly
- [ ] Buttons have hover states
- [ ] Grid system works across breakpoints

---

## TECHNICAL STACK

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Fonts**: Next.js font optimization (Google Fonts)
- **Icons**: Lucide React or Heroicons

---

## DEVIN PROMPT

```
Build Module A: Core Layout & Navigation Framework from N7A-LAYOUT-NAVIGATION.md

Key tasks:
1. Extract Pragmatic Play design tokens using Gemini (colors, fonts, spacing)
2. Configure Tailwind with extracted design system
3. Build Navigation component (sticky top bar, mobile hamburger)
4. Build Footer component (minimal, no social links)
5. Setup Next.js App Router layout structure
6. Create responsive grid system and typography classes
7. Build button component system

Requirements:
- NO language selector, news, or contact links
- Match Pragmatic Play dark premium aesthetic
- Mobile-first responsive
- Provide CSS class contracts for other modules

Reference: N7-FRONTEND-SHOWCASE-SPECIFICATION.md
Deploy: Vercel
```

---

**STATUS**: Ready for Devin Session 1  
**NEXT MODULE**: N7B (Hero & Value Prop) - depends on layout classes from N7A
