# Hestia App - Code Quality Audit & Improvement Plan

**Date:** December 2024
**Status:** Tier 1-4 Complete (Phase 1), Tier 1 Phase 2+ Deferred

---

## What Was Completed ✅

### Tier 2: Duplication & Complexity Reduction

| Task | Files Changed | Impact |
|------|---------------|--------|
| Extract shared data transforms | `src/lib/utils/dataTransform.ts` | -150 lines duplication |
| Update tenant prepareForDB | `src/lib/utils/tenant/prepareForDB.ts` | Uses shared utilities |
| Update landlord prepareForDB | `src/lib/utils/landlord/prepareForDB.ts` | Uses shared utilities |
| Update aval prepareForDB | `src/lib/utils/aval/prepareForDB.ts` | Uses shared utilities |

### Tier 3: Configuration Centralization

| Task | Files Created/Changed | Impact |
|------|----------------------|--------|
| Business config | `src/lib/constants/businessConfig.ts` | IVA rate, tiers, validation rules centralized |
| Update pricingService | `src/lib/services/pricingService.ts` | Uses TAX_CONFIG, PREMIUM_TIERS, LOCALE_CONFIG |
| Update actorTokenService | `src/lib/services/actorTokenService.ts` | Uses TOKEN_CONFIG.EXPIRATION_DAYS |
| Update aval prepareForDB | `src/lib/utils/aval/prepareForDB.ts` | Uses VALIDATION_CONFIG |
| Brand config | `src/lib/constants/brandConfig.ts` | All email colors/company info centralized |
| Update emailService | `src/lib/services/emailService.ts` | ~50 color references use BRAND_CONFIG |

### Cleanup: Unused Code Removed

| Item | Location | Impact |
|------|----------|--------|
| `estimatePotentialSavings()` | pricingService.ts | -24 lines |
| `calculateMonthlyPayment()` | pricingService.ts | -16 lines |
| `getActivePackages()` | pricingService.ts | -6 lines |
| `processRefund()` | paymentService.ts | -55 lines |
| Firebase storage provider | `src/lib/storage/providers/firebase.ts` | File deleted |
| Firebase imports | `src/lib/storage/index.ts`, `config.ts`, `types.ts` | Cleaned |
| Unused dependencies | package.json | Removed: firebase, firebase-admin, genkit, @genkit-ai/* |
| Commented code | actor.router.ts, forgot-password/route.ts | Cleaned |

### Email Templates Migration ✅

| Task | Files Changed | Impact |
|------|---------------|--------|
| Create ActorIncompleteReminderEmail.tsx | `src/templates/email/react-email/` | New React Email template |
| Create PolicyCreatorSummaryEmail.tsx | `src/templates/email/react-email/` | New React Email template |
| Remove inline HTML templates | `emailService.ts` | -370 lines |
| Remove fallback logic | `emailService.ts` | Simplified email functions |

**Result:** emailService.ts reduced from 1121 → 750 lines. All 10 email types now use React Email.

### Token Service Consolidation ✅

| Task | Files Changed | Impact |
|------|---------------|--------|
| Create `generateActorToken()` | `actorTokenService.ts` | Generic token generation |
| Thin wrapper functions | `actorTokenService.ts` | Backwards compatible |
| Refactor `renewToken()` | `actorTokenService.ts` | -50 lines switch logic |

**Result:** actorTokenService.ts reduced from 532 → 457 lines.

### Tier 1: Type Safety (Phase 1) ✅

| File | Fixes | Details |
|------|-------|---------|
| `emailService.ts` | 2 | `IMailgunClient`, `Transporter` types |
| `BaseService.ts` | 5 | `unknown`, `Record<string, unknown>`, generic `FilterDTO` |
| `validationService.ts` | 4 | `Prisma.ReviewNoteWhereInput`, document actor types |

**Result:** 11 `any` types fixed with proper types.

---

## What Remains (Prioritized) 🔄

### Tier 1: Type Safety (Remaining ~10 issues) - DEFERRED

Dynamic Prisma model access and actor type unions require architectural decisions:
- `validationService.ts` lines 523, 680: Dynamic `prisma[model]` access
- `validationService.ts` lines 559-566, 583, 592, 623, 633, 638: Actor type unions for progress calculation

**Recommendation:** These work correctly, just lack compile-time types. Address in future refactor.

### Tier 4: Additional Cleanup ✅

| Task | Location | Status |
|------|----------|--------|
| Remove `processRefund()` | `src/lib/services/paymentService.ts` | ✅ Done |
| Clean commented code | `src/server/routers/actor.router.ts` | ✅ Done |
| Clean commented code | `src/app/api/auth/forgot-password/route.ts` | ✅ Done |
| Delete deprecated folder | `src/app/api/_deprecated/` | ⏭️ Deferred |

### Future: File Splitting (Not Started)

| File | Lines | Suggestion |
|------|-------|------------|
| `emailService.ts` | 750 | ✅ Reduced from 1121. Further splitting optional |
| `actor.router.ts` | 1161 | Split by actor type |
| `validationService.ts` | 739 | Extract document validation, notes, activity logging |
| `actorTokenService.ts` | 457 | ✅ Reduced from 532. No further splitting needed |

---

## Executive Summary

This audit analyzed the codebase for type safety, maintainability, scalability, and unused code. **Key findings:** 75+ type safety issues, significant code duplication across actor utilities, several large files (1000+ lines), and unused exports/dependencies.

---

## 1. Type Safety Issues (75+ issues)

### 1.1 Critical `any` Usages

| File | Lines | Issue | Suggested Fix |
|------|-------|-------|---------------|
| `src/lib/services/emailService.ts` | 16-17 | `mailgunClient: any`, `smtpTransporter: any` | ✅ FIXED: `IMailgunClient`, `Transporter` |
| `src/lib/services/base/BaseService.ts` | 44, 75, 161, 177 | `data?: any`, `catch (error: any)`, `params: any` | ✅ FIXED: `unknown`, `Record<string, unknown>` |
| `src/lib/services/googleMapsService.ts` | 91, 158 | `prediction: any`, `components: any[]` | Define `GooglePrediction` interface |
| `src/lib/services/validationService.ts` | 321, 493, 501, 514 | 4 `any` usages | ✅ FIXED: Prisma types, inline interfaces |
| `src/lib/services/validationService.ts` | 523, 559-566, 583, 592, 623, 633, 638, 680 | 10 `any` usages (dynamic Prisma) | ⏭️ DEFERRED: Requires architectural work |
| `src/lib/services/actors/BaseActorService.ts` | 93, 109-112, 120, 267, 413, 472 | Address data, update data, Prisma delegate | Extract shared address interface |
| `src/lib/services/reviewService.ts` | 140-141, 222, 243-244, 276, 367, 373 | Actor/policy params as `any` | Use `Actor` union type |
| `src/lib/services/actorTokenService.ts` | 156, 189, 219, 269, 394, 460 | Return types with `any`, local variables | Define `TenantDTO`, `JointObligorDTO`, etc. |
| `src/lib/services/PropertyDetailsService.ts` | 122, 220, 334, 339 | Type assertions, update data | Use proper Prisma types |
| `src/lib/services/actors/JointObligorService.ts` | 33, 98, 163, 183, 217, 249, 285, 389, 425 | 9+ `any` usages | Type actor operations |
| `src/lib/documentManagement/upload.ts` | 97-98, 130, 134 | Results array, type assertions | Define `UploadResult` interface |

### 1.2 Unsafe Patterns

```typescript
// Pattern 1: Dynamic Prisma access (validationService.ts:523)
const actor = await (prisma as any)[model].findUnique(...)
// Fix: Use discriminated union or mapped types

// Pattern 2: Catch blocks (BaseService.ts:75)
catch (error: any) { ... }
// Fix: catch (error: unknown) + instanceof checks

// Pattern 3: Where clause construction (policyService/index.ts:196)
const where: any = {};
// Fix: Use Prisma.PolicyWhereInput
```

### 1.3 Missing Return Types

- `uploadWithProgress()` in documentManagement
- Various async functions in validation/actor services
- Factory functions in schemas

---

## 2. Code Organization & Maintainability

### 2.1 Large Files (Need Splitting)

| File | Lines | Responsibility Overload |
|------|-------|------------------------|
| `src/lib/services/emailService.ts` | 1121 | 10+ email types, HTML templates, provider abstraction |
| `src/lib/services/validationService.ts` | 739 | Section validation, document validation, notes, activity logging |
| `src/lib/services/pdfService.ts` | 659 | PDF generation with embedded HTML templates |
| `src/lib/services/reviewService.ts` | 555 | Multiple review workflows |
| `src/lib/services/actorTokenService.ts` | 530 | Token management for 4 actor types |
| `src/server/routers/actor.router.ts` | 1166 | All 4 actor types in one router |

### 2.2 Code Duplication

**Actor Utility Functions (400+ lines duplicated):**
- `src/lib/utils/tenant/prepareForDB.ts` (264 lines)
- `src/lib/utils/landlord/prepareForDB.ts` (370 lines)
- `src/lib/utils/aval/prepareForDB.ts` (371 lines)
- `src/lib/utils/joint-obligor/prepareForDB.ts` (similar)

Identical functions in each:
- `emptyStringsToNull()`
- `removeUndefined()`
- `normalizeBooleans()`
- `normalizeNumbers()`
- `processAddressFields()`

**Token Generation (actorTokenService.ts):**
- `generateTenantToken()` (lines 96-111)
- `generateJointObligorToken()` (lines 116-131)
- `generateAvalToken()` (lines 136-151)
- `generateLandlordToken()` (lines 249-269)

All follow identical pattern - should be generic.

**Email Templates (emailService.ts):**
- Lines 172-227, 266-312, 343-389, 890-930, 976-1030
- 5 templates with identical HTML/CSS structure
- Hardcoded colors: `#007bff`, `#28a745`, `#dc3545`, `#173459`, `#FF7F50`

### 2.3 Complexity Issues

**getPolicies() - policyService/index.ts:174-320+**
- 20+ OR conditions for search
- Complex include object
- Multiple .map() transformations
- Pagination mixed with data transformation

**validateSection() - validationService.ts:52-149**
- 97 lines
- Nested transaction
- Activity logging within validation (SoC violation)
- Status transitions

**calculatePolicyPricing() - pricingService.ts:131-248**
- 117 lines
- 8 parameters through 10+ transformations

---

## 3. Hard-coded Values

### 3.1 Business Logic Constants

| Location | Value | Issue |
|----------|-------|-------|
| `pricingService.ts:5-11` | PREMIUM_TIERS | Rent thresholds hardcoded |
| `pricingService.ts:208` | `0.16` | IVA rate (16%) |
| `pricingService.ts:262` | `'es-MX'` | Locale hardcoded |
| `aval/prepareForDB.ts:225` | `3` | Reference count requirement |
| `actorTokenService.ts:13` | `1000` | Token expiration days |

### 3.2 Email Configuration

```typescript
// emailService.ts:10-12
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'; // Wrong for production
const COMPANY_NAME = 'Hestia'; // Should be configurable
```

### 3.3 Template Colors (emailService.ts)

- Primary: `#007bff`
- Success: `#28a745`
- Error: `#dc3545`
- Brand: `#173459`, `#FF7F50`

No brand config - requires code change to update.

---

## 4. Inconsistent Patterns

### 4.1 Service Architecture

**Functional pattern:**
- `pricingService.ts`
- `actorTokenService.ts`
- `fileUploadService.ts`

**Class-based pattern:**
- `BaseService.ts` (abstract)
- `BaseActorService.ts`
- `TenantService.ts`, `LandlordService.ts`, etc.
- `PaymentService.ts` (static methods)

### 4.2 Error Handling

- `Result<T>` type in BaseService
- Direct throws in pricingService
- `{ valid: boolean; error?: string }` in validation
- Mixed patterns throughout

### 4.3 Naming Inconsistencies

| Pattern | Examples |
|---------|----------|
| Mixed boolean prefix | `isPrimary`, `isCompany`, `isFurnished` |
| Generic names | `data`, `result`, `prepared` (ambiguous in 739-line file) |
| Abbreviations | `tx`, `ref`, `jo` |

---

## 5. Unused Code

### 5.1 Unused Functions (HIGH confidence) - ✅ ALL REMOVED

| File | Function | Status |
|------|----------|--------|
| `pricingService.ts` | `estimatePotentialSavings()` | ✅ Removed |
| `pricingService.ts` | `calculateMonthlyPayment()` | ✅ Removed |
| `pricingService.ts` | `getActivePackages()` | ✅ Removed |
| `paymentService.ts` | `processRefund()` | ✅ Removed |

### 5.2 Unused Dependencies (package.json) - ✅ ALL REMOVED

| Package | Status |
|---------|--------|
| `firebase` | ✅ Removed |
| `firebase-admin` | ✅ Removed |
| `@genkit-ai/*` | ✅ Removed |

### 5.3 Dead Code Patterns - ✅ ALL REMOVED

| File | Location | Status |
|------|----------|--------|
| `actor.router.ts` | Commented function overloads | ✅ Removed |
| `forgot-password/route.ts` | Commented rate limiter | ✅ Removed |
| `FirebaseStorageProvider` | storage/providers/firebase.ts | ✅ File deleted |

### 5.4 Deprecated Folder

`src/app/api/_deprecated/` - 32 files, 220KB - marked for removal

---

## Implementation Plan (Tier 2 & 3)

### Phase 1: Extract Shared Data Transform Utilities

**Goal:** Remove ~400 lines of duplication across actor utilities

**Create:** `src/lib/utils/dataTransform.ts`

```typescript
// Functions to extract:
export function emptyStringsToNull<T>(obj: T): T
export function removeUndefined<T>(obj: T): T
export function normalizeBooleans<T>(obj: T, fields: string[]): T
export function normalizeNumbers<T>(obj: T, fields: string[]): T
export function processAddressFields(data: Record<string, unknown>): Record<string, unknown>
```

**Files to update:**
- `src/lib/utils/tenant/prepareForDB.ts` - import shared, remove duplicates
- `src/lib/utils/landlord/prepareForDB.ts` - import shared, remove duplicates
- `src/lib/utils/aval/prepareForDB.ts` - import shared, remove duplicates
- `src/lib/utils/joint-obligor/prepareForDB.ts` - import shared, remove duplicates

---

### Phase 2: Generic Token Functions

**Goal:** Replace 8 nearly-identical functions with 2 generic ones

**File:** `src/lib/services/actorTokenService.ts`

**Before (4 generate + 4 validate functions):**
- `generateTenantToken()`, `generateJointObligorToken()`, `generateAvalToken()`, `generateLandlordToken()`
- `validateTenantToken()`, `validateJointObligorToken()`, `validateAvalToken()`, `validateLandlordToken()`

**After:**
```typescript
type ActorType = 'tenant' | 'jointObligor' | 'aval' | 'landlord'

export async function generateActorToken(actorType: ActorType, actorId: string): Promise<string>
export async function validateActorToken(actorType: ActorType, token: string): Promise<ValidationResult>
```

**Keep existing function names as thin wrappers** for backwards compatibility in routers.

---

### Phase 3: Extract Business Constants

**Goal:** Centralize hard-coded business logic values

**Create:** `src/lib/constants/businessConfig.ts`

```typescript
export const BUSINESS_CONFIG = {
  tax: {
    IVA_RATE: 0.16,
  },
  pricing: {
    PREMIUM_TIERS: [
      { maxRent: 15000, premiumPercentage: 100 },
      { maxRent: 25000, premiumPercentage: 90 },
      // ... rest from pricingService.ts
    ],
  },
  validation: {
    AVAL_REQUIRED_REFERENCES: 3,
    TENANT_REQUIRED_REFERENCES: 3,
  },
  tokens: {
    EXPIRATION_DAYS: 1000,
  },
  locale: {
    DEFAULT: 'es-MX',
    CURRENCY: 'MXN',
  },
} as const
```

**Files to update:**
- `src/lib/services/pricingService.ts` - use BUSINESS_CONFIG.tax.IVA_RATE, PREMIUM_TIERS
- `src/lib/services/actorTokenService.ts` - use BUSINESS_CONFIG.tokens.EXPIRATION_DAYS
- `src/lib/utils/aval/prepareForDB.ts` - use BUSINESS_CONFIG.validation.AVAL_REQUIRED_REFERENCES

---

### Phase 4: Email Brand Configuration

**Goal:** Centralize email styling and brand values

**Create:** `src/lib/constants/brandConfig.ts`

```typescript
export const BRAND_CONFIG = {
  company: {
    name: 'Hestia',
    supportEmail: 'soporte@hestiaplp.com.mx',
  },
  colors: {
    primary: '#173459',
    accent: '#FF7F50',
    success: '#28a745',
    error: '#dc3545',
    link: '#007bff',
  },
  email: {
    maxWidth: '600px',
    padding: '20px',
  },
} as const
```

**File to update:** `src/lib/services/emailService.ts` - use BRAND_CONFIG throughout templates

---

### Phase 5: Remove Unused Code

**Functions to delete:**
- `pricingService.ts`: `estimatePotentialSavings()` (lines 338-361)
- `pricingService.ts`: `calculateMonthlyPayment()` (lines 317-332)
- `pricingService.ts`: `getActivePackages()` (lines 307-312)

**Files to delete:**
- `src/lib/storage/providers/firebase.ts` - never instantiated

**Dependencies to remove from package.json:**
- `firebase`
- `firebase-admin`
- `@genkit-ai/ai`
- `@genkit-ai/googleai`
- `@genkit-ai/core`

**Deferred:**
- `src/app/api/_deprecated/` - keep for now, separate cleanup task

---

## Execution Order (Completed)

| Phase | Task | Status |
|-------|------|--------|
| 1 | Data transform utilities | ✅ DONE |
| 5 | Remove unused code | ✅ DONE |
| 3 | Business constants | ✅ DONE |
| 2 | Generic token functions | ✅ DONE (Dec 2024 - `generateActorToken()`) |
| 4 | Email brand config | ✅ DONE |
| 6 | Email templates migration | ✅ DONE (Dec 2024 - all React Email) |
| 7 | Type safety Phase 1 | ✅ DONE (Dec 2024 - 11 `any` fixed) |

---

## New Config Files Created

### `src/lib/constants/businessConfig.ts`

```typescript
export const TAX_CONFIG = { IVA_RATE: 0.16 }
export const PREMIUM_TIERS = [/* rent tiers */]
export const VALIDATION_CONFIG = { AVAL_REQUIRED_REFERENCES: 3, TENANT_REQUIRED_REFERENCES: 3 }
export const TOKEN_CONFIG = { EXPIRATION_DAYS: 1000 }
export const LOCALE_CONFIG = { DEFAULT: 'es-MX', CURRENCY: 'MXN' }
```

### `src/lib/constants/brandConfig.ts`

```typescript
export const COMPANY_CONFIG = { name: 'Hestia', supportEmail: 'soporte@hestiaplp.com.mx' }
export const BRAND_COLORS = {
  primary: '#173459', accent: '#FF7F50', link: '#007bff',
  success: '#28a745', error: '#dc3545', warning: '#ffc107',
  lightBg: '#f8f9fa', white: '#ffffff', border: '#e9ecef',
  borderDark: '#dee2e6', mutedText: '#6c757d',
  warningBg: '#fff3cd', warningBorder: '#ffeaa7',
  successBg: '#d4edda', successBorder: '#c3e6cb',
  errorBg: '#f8d7da', errorBorder: '#f5c6cb',
}
export const EMAIL_STYLE = { maxWidth: '600px', padding: '20px', fontFamily: 'Arial, sans-serif' }
```

---

## Summary Statistics

| Category | Before | After |
|----------|--------|-------|
| Type safety issues (`any`) | 75+ | ~60 (11 fixed, ~10 deferred) |
| Duplicated utility lines | ~400 | ~250 |
| Hard-coded business values | 10+ | 0 (centralized) |
| Hard-coded colors in emails | ~50 | 0 (centralized) |
| Unused functions | 4 | 0 |
| Unused dependencies | 6 | 0 |
| Config files | 0 | 2 (businessConfig, brandConfig) |
| emailService.ts lines | 1121 | 750 (-371) |
| actorTokenService.ts lines | 532 | 457 (-75) |
| React Email templates | 8 | 10 (+2 new) |
| Inline HTML templates | 5 | 0 (all migrated) |

---

## Quick Reference: Key Files

### Configuration
- `src/lib/constants/businessConfig.ts` - Business rules (IVA, tiers, validation)
- `src/lib/constants/brandConfig.ts` - Brand colors, company info, email styling

### Shared Utilities
- `src/lib/utils/dataTransform.ts` - `emptyStringsToNull`, `removeUndefined`, `normalizeBooleans`, `normalizeNumbers`

### Services Using Config
- `src/lib/services/pricingService.ts` - TAX_CONFIG, PREMIUM_TIERS, LOCALE_CONFIG
- `src/lib/services/actorTokenService.ts` - TOKEN_CONFIG
- `src/lib/services/emailService.ts` - BRAND_CONFIG
- `src/lib/utils/aval/prepareForDB.ts` - VALIDATION_CONFIG
