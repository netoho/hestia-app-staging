# Session: Quality of Life Fixes

**Started:** 2026-02-06 12:31

## Overview
Form validation improvements, shared components, and policy detail refresh fixes.

## Goals
- [x] Fix joint obligor guarantee tab document validation
- [x] Extract shared DocumentProgressBar component
- [x] Require 3 references minimum for tenant
- [x] Fix policy detail refresh missing data

## Progress

### Update - 2026-02-06 18:45

**Summary**: 4 QoL fixes completed

**Git Changes** (13 modified, 1 added):
- Branch: `feat/investigation-vb` (last commit: 22816ea)
- All changes uncommitted

**Completed**:

1. **Guarantee tab doc validation** — Block advancing from guarantee tab without required docs (income proof or property deed+tax). Added visual indicators (green/orange card borders + icons).
   - `JointObligorGuaranteeTab-RHF.tsx`

2. **Shared DocumentProgressBar** — Extracted progress bar from JointObligorDocumentsSection into reusable component, added to all 4 actor document sections.
   - Created: `src/components/actor/shared/DocumentProgressBar.tsx`
   - Updated: `JointObligorDocumentsSection`, `TenantDocumentsSection`, `AvalDocumentsSection`, `LandlordDocumentsSection`

3. **Tenant references min 3** — Changed minimum from 1 to 3 for both personal and commercial references (schema + component).
   - `src/lib/schemas/tenant/index.ts`
   - `TenantReferencesTab-RHF.tsx`

4. **Policy detail refresh** — Added missing Prisma includes to `getPolicyById` (commercialReferences, contractSigningAddressDetails). Enhanced `handleActorRefresh` to also invalidate actor query caches.
   - `src/lib/services/policyService/index.ts`
   - `PolicyDetailsContent.tsx`

## Files Modified
- src/components/actor/joint-obligor/JointObligorGuaranteeTab-RHF.tsx
- src/components/actor/joint-obligor/JointObligorDocumentsSection.tsx
- src/components/actor/shared/DocumentProgressBar.tsx (new)
- src/components/actor/tenant/TenantDocumentsSection.tsx
- src/components/actor/tenant/TenantReferencesTab-RHF.tsx
- src/components/actor/aval/AvalDocumentsSection.tsx
- src/components/actor/landlord/DocumentsSection.tsx
- src/components/policies/PolicyDetailsContent/PolicyDetailsContent.tsx
- src/lib/schemas/tenant/index.ts
- src/lib/services/policyService/index.ts

### Update - 2026-02-06 20:30

**Summary**: UX improvements batch implemented and committed

**Git Changes**:
- Branch: `feat/investigation-vb`
- Working tree: clean
- Recent commits:
  - `576cec5` feat: UX improvements batch
  - `e4fe410` chore: current fixes
  - `449b1c4` chore: correct validations for documents
  - `9143eb7` chore: document progress bar
  - `883328f` chore: increase references for the tenant
  - `747b32d` chore: increase references for the tenant
  - `20886c6` chore: include the commercial references

**Todo Progress**: 6 completed, 0 in progress, 0 pending

**Completed (UX batch)**:
1. Last tab button → "Enviar Información" (all 4 wizards)
2. Tab URL persistence in policy details (?tab= param)
3. Tooltip on section refresh buttons (SectionHeader)
4. Disable form fields during save (all 4 wizards)
5. InlineActorEditor scroll fix (header/footer pinned)
6. Activity timeline grouped by date (Hoy, Esta semana, Este mes, Anteriores)

### Update - 2026-02-10 16:30

**Summary**: Separated card & SPEI into independent payment pages

**Git Changes**:
- Branch: `feat/investigation-vb` (last commit: 25399cd)
- Modified: `PaymentCard.tsx`, `payments/[id]/page.tsx`
- Added: `payments/[id]/spei/page.tsx`
- Unstaged: stripe webhook, payment service, payment router (SPEI backend work)

**Todo Progress**: 3 completed, 0 in progress, 0 pending

**Completed**:
1. **PaymentCard buttons** — Replaced "Pagar con Stripe" + "Copiar Link" with "Copiar Tarjeta" (`/payments/{id}`) and "Copiar SPEI" (`/payments/{id}/spei`)
2. **Card-only page** — Removed all SPEI code from `/payments/[id]`, restored auto-redirect to Stripe checkout on pending
3. **SPEI-only page** — New `/payments/[id]/spei` page: auto-creates SPEI intent on first visit, shows CLABE/bank/reference/amount, partial payment progress bar, refresh button, link to card page

---

## Session End Summary — 2026-02-10

**Duration**: ~4 days (Feb 6 12:31 → Feb 10)
**Branch**: `feat/investigation-vb`
**Commits during session**: 12

### All Goals: COMPLETED (4/4)
1. Fix joint obligor guarantee tab document validation
2. Extract shared DocumentProgressBar component
3. Require 3 references minimum for tenant
4. Fix policy detail refresh missing data

### Key Accomplishments (13 features total)

**QoL Fixes (Feb 6)**:
1. Guarantee tab doc validation — block advance without required docs, visual indicators
2. Shared `DocumentProgressBar` component — extracted and reused across 4 actor sections
3. Tenant references min 3 — schema + component updated
4. Policy detail refresh — added missing Prisma includes, invalidate actor query caches

**UX Improvements Batch (Feb 6)**:
5. Last tab button → "Enviar Información" (all 4 wizards)
6. Tab URL persistence in policy details (?tab= param)
7. Tooltip on section refresh buttons
8. Disable form fields during save (all 4 wizards)
9. InlineActorEditor scroll fix (header/footer pinned)
10. Activity timeline grouped by date

**Payment Page Separation (Feb 10)**:
11. PaymentCard — two copy buttons: "Copiar Tarjeta" + "Copiar SPEI"
12. Card page — SPEI code removed, auto-redirect to Stripe restored
13. SPEI page — new `/payments/[id]/spei` with auto-create, CLABE/bank/reference, progress bar

### Files Changed
**New**:
- `src/components/actor/shared/DocumentProgressBar.tsx`
- `src/app/payments/[id]/spei/page.tsx`

**Modified**:
- `src/components/actor/joint-obligor/JointObligorGuaranteeTab-RHF.tsx`
- `src/components/actor/joint-obligor/JointObligorDocumentsSection.tsx`
- `src/components/actor/tenant/TenantDocumentsSection.tsx`
- `src/components/actor/tenant/TenantReferencesTab-RHF.tsx`
- `src/components/actor/aval/AvalDocumentsSection.tsx`
- `src/components/actor/landlord/DocumentsSection.tsx`
- `src/components/policies/PolicyDetailsContent/PolicyDetailsContent.tsx`
- `src/components/policies/payments/PaymentCard.tsx`
- `src/app/payments/[id]/page.tsx`
- `src/lib/schemas/tenant/index.ts`
- `src/lib/services/policyService/index.ts`

### Final Git Status
- Working tree clean (only session file and settings modified)
- All feature code committed

### Notes
- Build passes cleanly throughout
- No breaking changes
- No new dependencies added
- Payment pages are now fully independent — admin copies the correct URL per method
