# Session: Tenant Edition with Same Policy
**Started:** 2026-01-12 12:32

## Overview
Implementing tenant edition functionality following the same policy pattern.

## Goals
- [x] Schema: Add history tables (TenantHistory, JointObligorHistory, AvalHistory)
- [x] Backend mutation: `policy.replaceTenant`
- [x] Frontend: Replace button + modal
- [x] No query changes needed (1:1 relationship preserved)

## Progress
- Explored codebase (Landlord pattern, policy statuses, actor models)
- Plan created at `.claude/plans/abstract-spinning-pearl.md`
- **Pivoted approach**: Using history tables instead of isActive flag (cleaner, no query changes)
- Decisions: History tables, up to PENDING_APPROVAL, replace all guarantors, required reason

### Completed
1. Schema: `TenantHistory`, `JointObligorHistory`, `AvalHistory` tables
2. Migration: `prisma/migrations/20260112202933_add_actor_history_tables`
3. Backend: `replaceTenant` mutation with archive + reset logic
4. Frontend: `ReplaceTenantModal` component
5. Frontend: "Reemplazar" button in tenant tab (visible for staff/admin on replaceable statuses)

### Key Files
- `prisma/schema.prisma` - History tables added
- `src/server/routers/policy.router.ts:602-968` - replaceTenant mutation
- `src/components/policies/ReplaceTenantModal.tsx` - New modal
- `src/components/policies/PolicyDetailsContent.tsx` - CTA button added

---

### Update - 2026-01-12 2:30 PM

**Summary**: Implementation complete, ready for testing

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/server/routers/policy.router.ts`, `src/components/policies/PolicyDetailsContent.tsx`, `src/lib/services/emailService.ts`, `src/lib/services/notificationService/index.ts`
- Added: `src/components/policies/ReplaceTenantModal.tsx`, `prisma/migrations/20260112202933_add_actor_history_tables/`
- Current branch: `feat/tenant-edition` (commit: 65a5739)

**Todo Progress**: 5 completed, 0 in progress, 0 pending
- ✓ Schema: Add history tables
- ✓ Backend: replaceTenant mutation
- ✓ Frontend: ReplaceTenantModal component
- ✓ Frontend: CTA button in tenant tab

**Plan File**: `.claude/plans/abstract-spinning-pearl.md`

---

## Next Steps
1. Run migration: `bun prisma migrate dev`
2. Test tenant replacement flow end-to-end
3. Test with guarantors replacement checkbox
4. Verify notifications sent to manager + admins
5. Test access token regeneration

## Blind Spots / Edge Cases - RESOLVED
All gaps fixed in latest update:
- ✅ PropertyAddress cleanup - orphan records now deleted in transaction
- ✅ Pending TENANT payments now cancelled
- ✅ ActorSectionValidation cleared for tenant
- ✅ DocumentValidation cleared for tenant's old documents

## Future Improvements (Updated)
1. ~~**Tenant History UI**: Add collapsible section in tenant tab to view replacement history~~ ✅ DONE
2. **Guarantor addition after replacement**: Allow adding new guarantors after replacing (currently they're just deleted)
3. **Orphan cleanup**: Background job to clean up orphan PropertyAddress records
4. **Payment link regeneration**: Auto-regenerate payment links when tenant is replaced
5. **Audit log enhancement**: Store more context in activity log (full before/after snapshot)

---

### Update - 2026-01-13 (Session Review)

**Summary**: Full feature review, gap fixes implemented, history UI added

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/server/routers/policy.router.ts`, `src/components/policies/PolicyDetailsContent.tsx`, `src/lib/services/policyService/index.ts`, `src/lib/services/emailService.ts`, `src/lib/services/notificationService/index.ts`
- Added: `src/components/policies/ReplaceTenantModal.tsx`, `prisma/migrations/20260112202933_add_actor_history_tables/`
- Current branch: `feat/tenant-edition` (last commit: 65a5739)

**Todo Progress**: 8 completed, 0 in progress, 0 pending
- ✓ Schema: Add history tables
- ✓ Backend: replaceTenant mutation
- ✓ Frontend: ReplaceTenantModal component
- ✓ Frontend: CTA button in tenant tab
- ✓ Gap fix: PropertyAddress cleanup
- ✓ Gap fix: Cancel pending TENANT payments
- ✓ Gap fix: ActorSectionValidation cleanup
- ✓ Gap fix: DocumentValidation cleanup
- ✓ History UI: tenantHistory in query + UI section

---

## Current Status

### ✅ Completed
1. **Schema**: TenantHistory, JointObligorHistory, AvalHistory tables
2. **Migration**: Created (NOT APPLIED YET)
3. **Backend**: `replaceTenant` mutation with full cleanup logic
4. **Frontend**: ReplaceTenantModal + CTA button
5. **Notifications**: Manager + admins notified
6. **Gap fixes**: All 4 implemented
7. **History UI**: Displays previous tenants in tenant tab

### ⚠️ Critical Issues
1. **Migration not applied** - Run `bun prisma migrate dev` before testing
2. **Build verified** - Passes successfully

---

## Known Gaps - RESOLVED

| Gap | Status |
|-----|--------|
| PropertyAddress orphans | ✅ Fixed - deleted in transaction |
| Stripe checkout URLs | ✅ Fixed - pending TENANT payments cancelled |
| ActorSectionValidation | ✅ Fixed - deleted for tenant |
| DocumentValidation | ✅ Fixed - deleted for tenant docs |
| ReviewNote | ✅ Keep as-is (audit trail) |

---

## Future Improvements

1. ~~**Tenant History UI**~~ ✅ DONE
2. **Guarantor addition after replacement**: Allow adding new guarantors (currently deleted)
3. **Orphan cleanup job**: Background job for PropertyAddress
4. **Payment link regeneration**: Auto-regenerate for new tenant
5. **Audit log enhancement**: Full before/after snapshot

---

## Key Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | +3 history models (680-783) |
| `src/server/routers/policy.router.ts` | +replaceTenant mutation (602-990) |
| `src/components/policies/ReplaceTenantModal.tsx` | NEW modal |
| `src/components/policies/PolicyDetailsContent.tsx` | +CTA button, +history section |
| `src/lib/services/policyService/index.ts` | +tenantHistory in query |
| `src/lib/services/notificationService/index.ts` | +sendTenantReplacementNotification |

---

## Reference Plan

See `.claude/plans/cryptic-skipping-stroustrup.md` for full implementation details.

---

## Next Steps

1. **Run migration**: `bun prisma migrate dev`
2. **Test E2E**: Replace tenant flow
3. **Test guarantors checkbox**
4. **Verify history UI displays correctly**
5. **Verify notifications sent**

---

### Update - 2026-01-13 (Final Gap Fixes)

**Summary**: Reviewed implementation for blind spots, fixed 2 remaining gaps

**Gaps Found & Fixed:**
1. **Guarantor cleanup incomplete** - When `replaceGuarantors=true`, wasn't cleaning up:
   - DocumentValidation for guarantor documents
   - ActorSectionValidation for jointObligors/avals
   - PropertyAddress (addressId, employerAddressId, guaranteePropertyAddressId)

2. **New tenant didn't get access email** - After replacement, new tenant had no way to access their form

**Changes Made:**
- `src/server/routers/policy.router.ts`:
  - Added addressId, employerAddressId, guaranteePropertyAddressId to jointObligors/avals select
  - Added full cleanup logic in guarantor replacement loop
  - Added `sendIncompleteActorInfoNotification` to send access email to new tenant
- `src/components/policies/ReplaceTenantModal.tsx`:
  - Added blue info alert: "Se enviará un correo al nuevo inquilino con su enlace de acceso."

**Build**: ✅ Passes

---

## SESSION END - 2026-01-13

### Duration
~2 days (Started: 2026-01-12 12:32)

### Git Summary
**Branch:** `feat/tenant-edition`
**Last commit:** 65a5739

**Files Changed:**
| Type | File |
|------|------|
| Modified | `prisma/schema.prisma` |
| Modified | `src/server/routers/policy.router.ts` |
| Modified | `src/components/policies/PolicyDetailsContent.tsx` |
| Modified | `src/lib/services/policyService/index.ts` |
| Modified | `src/lib/services/emailService.ts` |
| Modified | `src/lib/services/notificationService/index.ts` |
| Modified | `src/components/policies/ReplaceTenantModal.tsx` |
| Added | `prisma/migrations/20260112202933_add_actor_history_tables/` |

### Todo Summary
**Completed:** 13 tasks
- ✓ Schema: Add history tables (TenantHistory, JointObligorHistory, AvalHistory)
- ✓ Backend: replaceTenant mutation
- ✓ Frontend: ReplaceTenantModal component
- ✓ Frontend: CTA button in tenant tab
- ✓ Gap fix: Tenant PropertyAddress cleanup
- ✓ Gap fix: Cancel pending TENANT payments
- ✓ Gap fix: Tenant ActorSectionValidation cleanup
- ✓ Gap fix: Tenant DocumentValidation cleanup
- ✓ History UI: tenantHistory in query + UI section
- ✓ Gap fix: Guarantor DocumentValidation cleanup
- ✓ Gap fix: Guarantor ActorSectionValidation cleanup
- ✓ Gap fix: Guarantor PropertyAddress cleanup (3 types each)
- ✓ Auto-send access email to new tenant

**Remaining:** 0 tasks

### Key Accomplishments
1. **Full tenant replacement flow** - Archive old tenant, reset with new data, regenerate token
2. **History tables** - TenantHistory, JointObligorHistory, AvalHistory for audit trail
3. **Comprehensive cleanup** - No orphan records (PropertyAddress, validations, documents)
4. **Notifications** - Manager + admins notified of replacement
5. **New tenant email** - Auto-sends access link after replacement
6. **History UI** - Displays previous tenants in tenant tab

### Features Implemented
- `policy.replaceTenant` mutation with full cleanup
- ReplaceTenantModal component
- "Reemplazar" CTA button (staff/admin only, specific statuses)
- Tenant replacement history display
- Auto-email to new tenant with access link

### Problems & Solutions
| Problem | Solution |
|---------|----------|
| Orphan PropertyAddress records | Delete in transaction before resetting |
| Stale validations | Delete ActorSectionValidation + DocumentValidation |
| Old payment links still valid | Cancel pending TENANT payments |
| New tenant can't access | Auto-send access email after replacement |
| Guarantor cleanup incomplete | Added full cleanup for JO/Aval (addresses, validations, docs) |

### Breaking Changes
None - new tables only, existing queries unchanged

### Dependencies Added
None

### Configuration Changes
None

### Deployment Steps
1. Run migration: `bun prisma migrate dev`
2. Verify build passes: `bun run build`
3. Test E2E flow

### Lessons Learned
1. History tables > isActive flag for 1:1 relationships
2. Always check for orphan records when deleting/resetting actors
3. PropertyAddress has multiple FK relationships per actor (personal, employer, guarantee property)
4. ActorSectionValidation uses string actorType, not enum

### Future Improvements
1. Guarantor addition after replacement (currently just deleted)
2. Background orphan cleanup job
3. Audit log enhancement (full before/after snapshot)
4. Payment link regeneration for new tenant

### Tips for Future Developers
- Check `REPLACEABLE_STATUSES` constant for allowed policy statuses
- History tables store snapshot of actor data + replacement reason
- Cleanup order matters: get doc IDs → delete validations → unlink docs → delete other records
- renewToken is called OUTSIDE transaction (acceptable - just regenerates token)

---
*Session ended - 2026-01-13*
