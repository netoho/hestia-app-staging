# Session: pricing-calculator-refactor

**Started:** 2025-11-28 12:00

## Overview
Add tiered percentage pricing for Premium package on high-value rents + Policy creation wizard UX refactor.

## Goals
- [x] Add tiered percentages for Premium package when rent > $60k
- [x] Refactor policy creation wizard to use RHF + Zod + toast (replace alerts)

## Progress

### 12:00 - Session started
- Session initialized
- Reviewed `pricingService.ts` and package seed data

### 12:15 - Implemented tiered pricing
- Added `PREMIUM_TIERS` constant with rent thresholds:
  - $100k+ → 42%
  - $90k-99k → 43%
  - $80k-89k → 44%
  - $70k-79k → 45%
  - $60k-69k → 46%
  - <$60k → 50% (unchanged)
- Added `getPremiumPercentage()` helper function
- Modified `calculatePackagePrice()` to use tiered rates for premium
- Updated `calculatePolicyPricing()` to show correct percentage in summary
- Updated `generateFormulaString()` to display correct tier percentage
- Build passes ✓

### 12:45 - Policy Creation Wizard UX Refactor
Refactored policy creation wizard following the TenantFormWizard-Simplified pattern:

**New Files Created:**
- `src/lib/schemas/policy/wizard.ts` - Zod schemas for each wizard step
- `src/components/policies/create/steps/PropertyStep-RHF.tsx`
- `src/components/policies/create/steps/PricingStep-RHF.tsx`
- `src/components/policies/create/steps/LandlordStep-RHF.tsx`
- `src/components/policies/create/steps/TenantStep-RHF.tsx`
- `src/components/policies/create/steps/GuarantorStep-RHF.tsx`

**Updated Files:**
- `src/components/policies/create/PolicyCreationWizard.tsx` - Complete refactor

**Key Changes:**
- Replaced all `alert()` calls with `useToast`
- Each step now uses `useForm` + `zodResolver` for validation
- Using existing `useFormWizardTabs` hook for navigation
- Using existing `FormWizardProgress` + `FormWizardTabs` components
- Inline field-level validation via `FormMessage`
- Step navigation controlled (must complete previous steps)
- Progress bar shows completion status

**Pattern followed:** Same as actor forms (TenantFormWizard-Simplified)

Build passes ✓

### 18:30 - Replace propertyAddress with AddressAutocomplete

**Summary**: Replaced plain text `propertyAddress` field with structured `AddressAutocomplete` component, storing address data directly in PropertyDetails → PropertyAddress from policy creation.

**Git Changes**:
- Modified: `prisma/migrations/20251129043930_improve_policy_property/migration.sql` (data preservation)
- Modified: `src/lib/schemas/policy/wizard.ts` (removed propertyAddress)
- Modified: `src/components/policies/create/types/index.ts`
- Modified: `src/server/routers/policy.router.ts`
- Modified: `src/lib/services/policyService/index.ts` (upsert PropertyDetails)
- Modified: `src/lib/services/policyService/types.ts`
- Modified: `src/lib/services/PropertyDetailsService.ts` (added propertyType/Description)
- Modified: `src/components/policies/create/steps/PropertyStep-RHF.tsx` (AddressAutocomplete)
- Modified: `src/components/policies/create/PolicyCreationWizard.tsx` (sanitize empty objects)
- Modified: `src/components/policies/create/steps/ReviewStep/index.tsx` (display formatted address)
- Branch: `new-policy-pricing-calc` (last commit: c9c3a3c)

**Todo Progress**: 9 completed, 0 in progress, 0 pending
- ✓ Fix migration to preserve propertyType data
- ✓ Update wizard schema - remove propertyAddress
- ✓ Update types.ts - PolicyCreationFormData
- ✓ Update tRPC policy.create input schema
- ✓ Update policyService - upsert PropertyDetails with address
- ✓ Update PropertyStep-RHF - use AddressAutocomplete
- ✓ Update PolicyCreationWizard - sanitize empty objects
- ✓ Update ReviewStep - display formatted address
- ✓ Build verification passed

**Key Implementation Details**:
- Added `sanitizeAddressDetails()` helper to convert `{}` to `null` (prevents DB insert errors)
- PropertyDetails now always upserted (1:1 relationship with Policy)
- Migration preserves `propertyType` when moving from Policy → PropertyDetails
- Address displayed using `formattedAddress` or constructed from structured fields

Build passes ✓

---

## Session End Summary

**Duration:** ~6.5 hours (12:00 - 18:30)
**Branch:** `new-policy-pricing-calc`
**Last Commit:** c9c3a3c (feat: pricing calculations)

### Files Changed

**New Files (7):**
- `src/lib/schemas/policy/wizard.ts` - Zod validation schemas for wizard steps
- `src/components/policies/create/steps/PropertyStep-RHF.tsx`
- `src/components/policies/create/steps/PricingStep-RHF.tsx`
- `src/components/policies/create/steps/LandlordStep-RHF.tsx`
- `src/components/policies/create/steps/TenantStep-RHF.tsx`
- `src/components/policies/create/steps/GuarantorStep-RHF.tsx`
- `prisma/migrations/20251129043930_improve_policy_property/migration.sql`

**Modified Files (10):**
- `src/components/policies/create/PolicyCreationWizard.tsx`
- `src/components/policies/create/steps/ReviewStep/index.tsx`
- `src/components/policies/create/types/index.ts`
- `src/lib/services/policyService/index.ts`
- `src/lib/services/policyService/types.ts`
- `src/lib/services/PropertyDetailsService.ts`
- `src/server/routers/policy.router.ts`
- `prisma/schema.prisma`
- `src/lib/enums.ts`
- `package.json` / `bun.lock`

### Key Accomplishments

1. **Tiered Premium Pricing** - High-value rents ($60k+) now get progressive discounts (50% → 42%)
2. **Policy Wizard UX Refactor** - Migrated to React Hook Form + Zod with toast notifications
3. **Structured Address Storage** - Property addresses now use AddressAutocomplete with Google Places integration

### Architecture Decisions

- **PropertyDetails always created** - 1:1 relationship with Policy, upserted on policy creation
- **Empty object sanitization** - `{}` converted to `null` to prevent DB insert errors
- **Address data flow:** Form → sanitize → tRPC → policyService → PropertyDetailsService → PropertyAddress table

### Breaking Changes

- `propertyAddress` (string) removed from Policy model - now stored in PropertyDetails.propertyAddressDetails
- Migration moves `propertyType` from Policy → PropertyDetails

### Tips for Future Development

1. Always sanitize address objects before DB operations (`{}` breaks inserts)
2. PropertyDetailsService.upsert() handles both create and update
3. Use `formattedAddress` for display, fall back to constructed string from structured fields
4. Follow RHF step pattern in `*-RHF.tsx` files for new wizard steps

### Remaining Work

- Run migration on staging/production
- Test full policy creation flow end-to-end
- Verify Google Places autocomplete works in all environments

**Status:** All planned tasks completed ✓
