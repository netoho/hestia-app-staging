# Policy Status Audit
**Started:** 2026-02-19 16:10

## Overview
Simplify PolicyStatus enum by replacing overloaded APPROVED with explicit ACTIVE/EXPIRED statuses. Consolidate PolicyStatusService into PolicyWorkflowService.

**Plan file:** `.claude/plans/vast-prancing-waffle.md`

## Goals
- Remove APPROVED status, add ACTIVE + EXPIRED
- Delete PolicyStatusService, consolidate into PolicyWorkflowService
- Remove activate/deactivate endpoints and UI
- Fix receipt queries to use ACTIVE instead of APPROVED+activatedAt
- Add daily cron for auto-expiring policies
- Create proper migration SQL

## Progress

### Update - 2026-02-19 ~18:00

**Summary**: Full implementation of policy status refactor — schema, services, routes, frontend, i18n, cron, migration.

**Git Changes (30 files)**:
- **Deleted:** `src/lib/services/PolicyStatusService.ts`
- **Added:** `src/app/api/cron/policy-expiry/route.ts`, `prisma/migrations/20260219235928_add_policy_status/migration.sql`
- **Modified (schema):** `prisma/schema.prisma`, `src/prisma/generated/prisma-client/enums.ts`
- **Modified (services):** `policyWorkflowService.ts`, `receiptService.ts`, `receiptReminderService.ts`
- **Modified (routes):** `policy.router.ts`, `receipt.router.ts`, `investigation.router.ts`, `package.router.ts`, `user.router.ts`
- **Modified (frontend):** `PolicyHeader.tsx`, `usePolicyActions.ts`, `PolicyDetailsContent.tsx`, `PolicyStatusIndicators.tsx`, `GuarantorsTab.tsx`, `TenantTab.tsx`, `PolicyContractInfo.tsx`, `PolicyDetailsHeader.tsx`, `PolicyStatusActions.tsx`
- **Modified (config/i18n):** `policyStatus.ts`, `statuses.ts`, `policies.ts`, `policy.ts` (types + utils)
- **Modified (other):** `vercel.json`, `seed.ts`, `HeaderSection.tsx` (PDF)
- Current branch: `feature/tenant-receipts` (commit: 2ee54d6)

**Todo Progress**: 10 completed, 0 in progress, 0 pending
- ✓ Update PolicyStatus enum in Prisma schema (APPROVED → ACTIVE + EXPIRED)
- ✓ Delete PolicyStatusService + add tryAutoTransition to PolicyWorkflowService
- ✓ Refactor PolicyWorkflowService (new transitions, payment gate for ACTIVE, expireActivePolicies)
- ✓ Update policy router (removed activate/deactivate endpoints)
- ✓ Update receipt system queries (APPROVED+activatedAt → ACTIVE)
- ✓ Create expiry cron endpoint + vercel.json entry
- ✓ Frontend: PolicyHeader, usePolicyActions, PolicyDetailsContent (removed activate/deactivate)
- ✓ Frontend: PolicyStatusIndicators (removed sub-status), policy.ts utils (removed dead functions)
- ✓ i18n + config updates (new status labels, removed dead keys)
- ✓ Build verification — `bun run build` passes clean

**Issues Encountered**:
- Migration SQL failed with `current transaction is aborted` — caused by explicit BEGIN/COMMIT (Prisma wraps in transaction) and UPDATE setting values not in old enum

**Solutions Implemented**:
- Removed BEGIN/COMMIT from migration
- Added intermediate TEXT column conversion before data migration UPDATEs
- Then convert TEXT → new enum type

### Update - 2026-02-19 ~19:00

**Summary**: Created policy status documentation and added README link.

**Git Changes**:
- **Added:** `docs/POLICY_STATUS.md`
- **Modified:** `README.md` (added doc link in Architecture section + Status Transitions blurb)
- Current branch: `feature/tenant-receipts` (commit: 2ee54d6)

**Details**:
- Created `docs/POLICY_STATUS.md` with full status model: enum values, ASCII transition diagram, validation gates (investigations for PENDING_APPROVAL, payment for ACTIVE), auto-transitions (cron expiry), cancellation rules, key timestamps table, and source file references.
- Added link under README Architecture section and updated Status Transitions blurb to reference the new doc.

### Completed
- Full policy status refactor (all 10 tasks)
- Migration SQL fix
- Policy status documentation (`docs/POLICY_STATUS.md` + README link)

### Update - 2026-02-20 ~00:30

**Summary**: Fixed payment system — dropped stale `policy.paymentStatus`, fixed progress bars, fixed webhook bugs.

**Git Changes (14 files)**:
- **Modified (schema):** `prisma/schema.prisma` (removed `paymentStatus` column from Policy)
- **Added:** `prisma/migrations/20260220000000_drop_policy_payment_status/migration.sql`
- **Modified (services):**
  - `paymentService.ts` — removed `syncPolicyPaymentStatus`, `recheckPolicyPaymentStatus`, `checkAndUpdatePolicyPaymentStatus`, `updatePolicyPaymentStatusIfComplete` and all ~10 call sites
  - `policyWorkflowService.ts` — added `areAllPaymentsSettled()` that queries payments directly; ACTIVE gate no longer uses stale `paymentStatus` field
  - `policyService/index.ts` — removed unused `paymentStatus` param from `getPolicies`
- **Modified (routes):**
  - `payment.router.ts` — removed `recheckPolicyPaymentStatus` call, added `convertToManualPayment` support
  - `policy.router.ts` — removed `paymentStatus` from `PolicyListSchema`
- **Modified (webhook):**
  - `stripe/route.ts` — removed `recheckPolicyPaymentStatus` import/calls; extracted `checkAndNotifyAllPaymentsComplete()` helper; fixed `allComplete` check to exclude CANCELLED/FAILED payments
- **Modified (frontend):**
  - `PolicyDetailsContent.tsx` — payment progress excludes cancelled, failed, and historical (replaced tenant) payments
  - `PolicyProgressBar.tsx` — capped percentage at 100%, `isComplete` uses `>=`, display caps at `total/total`
  - `PaymentsTab.tsx` — passes `paymentId` to manual payment dialog
  - `ManualPaymentDialog.tsx` — accepts `paymentId` for converting existing payments
  - `PaymentCard.tsx` — shows cancel button for FAILED payments
- **Modified (docs):** `POLICY_STATUS.md` — updated ACTIVE gate description
- Current branch: `fix/payment-policy-state-machine` (commit: f63f320)

**Completed Tasks**:
- ✓ Dropped `policy.paymentStatus` denormalized field (was always null/stale)
- ✓ ACTIVE transition gate now queries payments directly via `areAllPaymentsSettled()`
- ✓ Removed all paymentStatus sync machinery (~100 lines of dead code)
- ✓ Fixed ManualPaymentDialog creating duplicate payments (now converts existing PENDING payment)
- ✓ Fixed `verifyManualPayment` using FAILED→CANCELLED for rejections
- ✓ Fixed progress bar: Pagos excludes cancelled/failed/historical payments
- ✓ Fixed progress bar: Documentos caps at 100% when uploaded > required
- ✓ Fixed webhook `allComplete` check to exclude CANCELLED/FAILED payments
- ✓ Extracted duplicated 34-line webhook notification block into helper
- ✓ Build passes clean

**Key Architecture Decision**:
Eliminated `policy.paymentStatus` entirely. It was a denormalized field written from 10+ mutation paths but always stale. The only consumer was the ACTIVE transition gate — now queries payments directly at transition time. Simpler, always correct.

### In Progress
- (none)

### Pending
- Run migration `20260220000000_drop_policy_payment_status` on database
- Commit changes
