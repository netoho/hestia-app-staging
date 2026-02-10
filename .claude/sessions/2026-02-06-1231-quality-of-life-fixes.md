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

## Notes
- Build passes cleanly
- All changes uncommitted
