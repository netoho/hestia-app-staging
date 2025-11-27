# tRPC Migration Session

**Started**: 2025-11-26
**Branch**: feat/hooks-refactor
**Goal**: Migrate REST API endpoints to tRPC following the plan in `virtual-churning-wren.md`

---

### Update - 2025-11-26 2:00 AM

**Summary**: Completed Phase 1 (Quick Wins), Phase 2 (Staff Management), and Phase 3 (Onboarding) of tRPC migration

**Git Changes**:
- **New files**:
  - `src/server/routers/staff.router.ts` - Staff CRUD operations
  - `src/server/routers/onboard.router.ts` - Onboarding flow
- **Modified files**:
  - `src/server/routers/_app.ts` - Added staff and onboard routers
  - `src/server/routers/pricing.router.ts` - Added getPolicyPricing, updatePolicyPricing
  - `src/server/routers/user.router.ts` - Enhanced updateProfile with email/password
  - `src/app/dashboard/packages/page.tsx` - Migrated to tRPC
  - `src/app/dashboard/policies/[id]/pricing/page.tsx` - Migrated to tRPC
  - `src/app/dashboard/policies/[id]/review/page.tsx` - Migrated to tRPC
  - `src/app/dashboard/profile/page.tsx` - Migrated to tRPC (avatar stays REST)
  - `src/app/dashboard/users/page.tsx` - Migrated to tRPC
  - `src/app/onboard/[token]/page.tsx` - Migrated to tRPC
  - `src/components/dialogs/UserDialog.tsx` - Migrated to tRPC
  - `src/components/dialogs/DeleteUserDialog.tsx` - Migrated to tRPC (soft delete)
  - `src/lib/hooks/useShareLinks.ts` - Migrated to tRPC
  - `src/lib/i18n.ts` - Changed "Eliminar" to "Desactivar" for users
- Current branch: feat/hooks-refactor (commit: 1b073b0)

**Todo Progress**: 4 of 5 phases completed
- ✓ Phase 1: Quick Wins (5 tasks) - Wire up existing tRPC procedures
- ✓ Phase 2: Staff Management (4 tasks) - Create staff.router.ts + migrate components
- ✓ Phase 3: Onboarding (3 tasks) - Create onboard.router.ts + migrate page
- ✗ Phase 4: Document Management - **SKIPPED** (staying REST for FormData uploads)
- ✓ Phase 5: Address Autocomplete (2 tasks) - Router created, component migrated, old REST deleted

**Completed Tasks**:
1. useShareLinks.ts → trpc.policy.getShareLinks, sendInvitations
2. packages/page.tsx → trpc.package.getAll
3. pricing/page.tsx → trpc.pricing.getPolicyPricing, updatePolicyPricing
4. profile/page.tsx → trpc.user.getProfile, updateProfile
5. review/page.tsx → trpc.policy.getById
6. staff.router.ts created with list/getById/create/update/delete
7. users/page.tsx → trpc.staff.list
8. UserDialog.tsx → trpc.staff.create/update
9. DeleteUserDialog.tsx → trpc.staff.delete (soft delete: isActive=false)
10. onboard.router.ts created with validateToken/complete
11. onboard/[token]/page.tsx → trpc.onboard.validateToken, complete
12. address.router.ts created with autocomplete/details
13. AddressAutocomplete.tsx → trpc.address.autocomplete, details
14. Deleted old REST routes: src/app/api/address/

**Technical Decisions**:
- User deletion is now soft-delete (sets isActive=false)
- Avatar upload stays as REST (FormData efficiency)
- Document upload stays as REST (FormData + progress tracking)
- Onboarding uses publicProcedure (users not authenticated yet)
- Address autocomplete uses publicProcedure (needed before auth)

**Build Status**: ✓ Passing

---

## Session End Summary

**Ended**: 2025-11-26
**Status**: ✓ Complete (Phase 4 intentionally skipped)

### Git Summary
- **77 files** changed across recent commits
- **~2,571 lines added**, **~2,483 lines removed**
- Branch: feat/hooks-refactor

### New Files Created
- `src/server/routers/staff.router.ts`
- `src/server/routers/onboard.router.ts`
- `src/server/routers/address.router.ts`

### Files Deleted
- `src/app/api/address/autocomplete/route.ts`
- `src/app/api/address/details/route.ts`

### Modified Files (key)
- `src/server/routers/_app.ts` - Added 3 new routers
- `src/server/routers/pricing.router.ts` - Added getPolicyPricing, updatePolicyPricing
- `src/server/routers/user.router.ts` - Enhanced updateProfile
- 8 pages/components migrated from fetch → tRPC

### Key Accomplishments
1. Created 3 new tRPC routers (staff, onboard, address)
2. Migrated 8 pages/components from REST fetch to tRPC
3. Implemented soft-delete for users (isActive=false instead of hard delete)
4. Cleaned up deprecated address REST endpoints

### What Stays as REST
- Avatar upload (FormData efficiency)
- Document upload (FormData + progress tracking via XMLHttpRequest)
- Auth routes (register, forgot-password, reset-password)
- Webhooks (Stripe)
- Cron jobs

### Tips for Future Work
- Use `trpc.useUtils()` for imperative data fetching
- All new routers follow the pattern: publicProcedure for pre-auth, adminProcedure for admin-only
- Build verified passing after all changes
