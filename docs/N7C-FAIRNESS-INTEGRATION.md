# MODULE C: FAIRNESS VERIFICATION INTEGRATION

**Document**: Three-Body Entropy RNG - Module C Specification  
**Version**: 1.0  
**Date**: December 14, 2025  
**Parent Spec**: N7-FRONTEND-SHOWCASE-SPECIFICATION.md  
**Devin Session**: Session 3 of 5

## PURPOSE

Create a standalone fairness verification page that allows anyone to independently verify spin results using client-side cryptographic verification.

## DEPENDENCIES

- **NONE** - Fully independent module
- Reuses complete spec from N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
- No dependencies on other modules

## DELIVERABLES

### 1. Verification Page

**Location**: `/app/verify/page.tsx`

**Components**:
- JSON input textarea for verification bundle
- "Load Example" button with working test data
- Step-by-step verification results with green checkmarks
- "Copy Audit Report" functionality

### 2. Verification Library

**Location**: `/lib/verifier.ts`

**Functions**:
- `verifySHA256Hash()` - Server seed hash verification
- `deriveHKDF()` - HKDF key derivation
- `verifyRNGOutput()` - RNG output verification
- All cryptographic operations use Web Crypto API (client-side only)

### 3. UI Components

**Verification Steps Display**:
```
✅ Server seed hash matches
✅ HKDF derivation correct
✅ RNG output matches
```

**Green Check Indicators**: Visual confirmation for each step

**Error Handling**: Clear error messages if verification fails

## TECHNICAL REQUIREMENTS

- Client-side only (no server calls)
- Works offline
- SHA-256 hash verification
- HKDF key derivation (HMAC-based)
- Web Crypto API usage
- Copy audit report to clipboard

## INTEGRATION

Standalone page accessible via `/verify` route. Links from Module B (Hero CTAs) and Module E (CTA System).

## DEVIN PROMPT

```
Build Module C: Fairness Verification from N7C-FAIRNESS-INTEGRATION.md

Create standalone verification page:
- Reuse complete spec from N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md
- JSON input with "Load Example" button
- Client-side verification (SHA-256, HKDF, RNG check)
- Green check UI for each step
- Copy audit report functionality
- Works offline (no server calls)

Location: /app/verify/page.tsx + /lib/verifier.ts
Reference: N6-B2B-WEBSITE-FAIRNESS-PORTAL-SPECIFICATION.md

Repo: esportsjesus1-create/three-body-entropy-rng
Branch: devin/1765535998-complete-system
```

**STATUS**: Ready for Devin implementation
