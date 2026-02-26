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
- Run migration `20260219235928_add_policy_status` on database
- Push branch & merge PR #69

---

### Update — 2026-02-22

**Summary**: Full codebase audit (60+ files) + PR #69 Copilot review fixes. All clean.

**Audit Results**:
- ✅ Schema, services, routes, frontend, i18n, config — all correct
- ✅ No stale APPROVED references, no activate/deactivate remnants, no paymentStatus on Policy
- ✅ Token expiry, file validation, multi-policy access — all working

**Fixes Applied (3 commits)**:
1. `5f5dd60` — Removed `console.log(activePayments)` debug log from policyWorkflowService + added in-memory rate limiting (3/email/hour) to `requestMagicLink` public endpoint
2. `175504b` — Removed stale `.claude/plans/` files
3. `a6ecdb4` — PR #69 Copilot review: removed `payment.id` debug artifact from PaymentCard badge + fixed migration SQL to send unactivated APPROVED policies → PENDING_APPROVAL instead of ACTIVE

**Git Changes**:
- Modified: `src/lib/services/policyWorkflowService.ts`, `src/server/routers/receipt.router.ts`, `src/components/policies/payments/PaymentCard.tsx`, `prisma/migrations/20260219235928_add_policy_status/migration.sql`
- Deleted: `.claude/plans/next_steps.md`, `.claude/plans/parsed-purring-crab.md`
- Branch: `fix/payment-policy-state-machine` (commit: a6ecdb4)
- Working tree clean, 1 commit ahead of origin

**Copilot Review Triage (7 comments)**:
- 2 fixed (console.log — already done, payment.id — fixed now)
- 2 valid & fixed (payment.id debug in UI, migration catch-all)
- 3 dismissed (ACTIVE-only for tenant receipts is intentional design)

**Build**: `bun run build` ✅

---

### Update — 2026-02-23

**Summary**: Deep post-session audit (4 parallel agents, 60+ files). Found 7 issues — all fixed.

**Audit Scope**: Schema, services, routes, frontend, i18n, config, enums, cron, webhook, seed, email templates, PDF generation, types, Zod schemas.

**Verdict**: All original session goals correctly implemented. No stale APPROVED, no paymentStatus on Policy, no activate/deactivate remnants.

**Fixes Applied (1 commit)**:
- `977308a` — post-audit cleanup:
  1. Deleted deprecated `PolicyStatusActions.tsx` (returned null, unused)
  2. Fixed stale "APPROVED" → "ACTIVE" in receiptReminderService JSDoc
  3. Translated English error to Spanish in policyWorkflowService
  4. Distinct badge variants: COLLECTING_INFO→outline, PENDING_APPROVAL→secondary
  5. TimelineCard: "Expirada el" (red) vs "Expira el" for expired/future policies
  6. Cancel modal: clarified pending payments won't be charged
  7. Deleted 14 `.bak` files (gitignored, not in commit)

**Git Changes**:
- Deleted: `src/components/policy-details/PolicyStatusActions.tsx`
- Modified: `CancelPolicyModal.tsx`, `TimelineCard.tsx`, `policyStatus.ts`, `policyWorkflowService.ts`, `receiptReminderService.ts`
- Branch: `fix/payment-policy-state-machine` (commit: 977308a)
- 2 commits ahead of origin

**Build**: `bun run build` ✅

---

## Session Closed — 2026-02-24

**Duration:** ~5 days (2026-02-19 16:10 → 2026-02-24)

### Final Git Summary
- **Branch:** `fix/payment-policy-state-machine`
- **Final commit:** `977308a`
- **Total commits (session):** 8 (de14a1e → 977308a)
- **Total files changed:** 25 (net: +356 / −486 lines)
- **Working tree:** clean

**Changed files:**
- **Deleted:** `PolicyStatusService.ts`, `PolicyStatusActions.tsx`, 2 stale plan files
- **Added:** `policy-expiry/route.ts` (cron), 2 migration SQL files
- **Modified (schema):** `schema.prisma` (enum + drop paymentStatus)
- **Modified (services):** `policyWorkflowService.ts`, `paymentService.ts`, `receiptService.ts`, `receiptReminderService.ts`, `policyService/index.ts`
- **Modified (routes):** `policy.router.ts`, `receipt.router.ts`, `payment.router.ts`, `investigation.router.ts`
- **Modified (webhook):** `stripe/route.ts`
- **Modified (frontend):** `PolicyDetailsContent.tsx`, `PolicyHeader.tsx`, `PolicyStatusIndicators.tsx`, `PolicyProgressBar.tsx`, `PaymentsTab.tsx`, `ManualPaymentDialog.tsx`, `PaymentCard.tsx`, `TimelineCard.tsx`, `CancelPolicyModal.tsx`
- **Modified (config/i18n):** `policyStatus.ts`, `statuses.ts`, `policies.ts`, `policy.ts`
- **Modified (other):** `vercel.json`, `docs/POLICY_STATUS.md`, `CLAUDE.md`

### All Goals Completed ✅
1. ✓ PolicyStatus enum: APPROVED → ACTIVE + EXPIRED
2. ✓ Deleted PolicyStatusService, consolidated into PolicyWorkflowService
3. ✓ Removed activate/deactivate endpoints and UI
4. ✓ Receipt queries use ACTIVE instead of APPROVED+activatedAt
5. ✓ Daily cron for auto-expiring policies (`/api/cron/policy-expiry`)
6. ✓ Migration SQL (with TEXT intermediate column fix)
7. ✓ Dropped stale `policy.paymentStatus` — ACTIVE gate queries payments directly
8. ✓ Fixed payment progress bars (exclude cancelled/failed/historical)
9. ✓ Fixed ManualPaymentDialog (converts existing payments, no duplicates)
10. ✓ Fixed webhook allComplete check
11. ✓ PR #69 Copilot review fixes
12. ✓ Post-audit cleanup (dead code, i18n, UX improvements)

### Key Architecture Decisions
1. **Eliminated `policy.paymentStatus`** — denormalized field written from 10+ paths but always stale. ACTIVE gate now queries payments directly. Simpler, always correct.
2. **No activate/deactivate flow** — approval transitions directly to ACTIVE when all payments settled + investigations approved.
3. **Cron-based expiry** — daily job checks `expiresAt < now` for ACTIVE policies → EXPIRED.

### Problems & Solutions
| Problem | Solution |
|---------|----------|
| Migration SQL `current transaction aborted` | Removed explicit BEGIN/COMMIT; use TEXT intermediate column |
| paymentStatus always stale | Eliminated field entirely; query payments at transition time |
| Progress bar >100% | Capped with `Math.min`, `isComplete` uses `>=` |
| Duplicate manual payments | Dialog now converts existing PENDING payment via paymentId |

### Tips for Future Work
- `PolicyStatus` enum: `COLLECTING_INFO → PENDING_APPROVAL → ACTIVE → EXPIRED → CANCELLED`
- ACTIVE gate requires: all investigations APPROVED + all payments COMPLETED
- `activatedAt` is still stored for receipt month calculations — it's a data field, not an activation gate
- See `docs/POLICY_STATUS.md` for full transition diagram
- 14 `.bak` files were deleted locally but were gitignored — won't appear in commits
