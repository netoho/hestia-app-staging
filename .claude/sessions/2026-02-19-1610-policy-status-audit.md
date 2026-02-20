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

### In Progress
- (none)

### Pending
- Run migration on database
- Commit changes
