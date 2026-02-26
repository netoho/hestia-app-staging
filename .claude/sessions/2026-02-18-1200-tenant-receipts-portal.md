# Tenant Receipts Portal
**Started:** 2026-02-18 12:00

## Overview
Building a tenant-facing receipt upload portal where tenants can upload monthly receipts (rent + utility/service payments) for their active policies. Includes magic link auth, monthly reminders, admin view, and property service config.

## Goals
- [x] Prisma schema: TenantReceipt, ReminderLog, includedInRent fields
- [x] Receipt service (business logic)
- [x] tRPC receipt router (tenant + admin endpoints)
- [x] Email templates (reminder + magic link)
- [x] Email service functions
- [x] Tenant portal pages (/portal/receipts, /portal/receipts/[token])
- [x] Portal components (dashboard, month cards, receipt slots, uploader, N/A modal)
- [x] Admin receipts page (/dashboard/policies/[id]/receipts)
- [x] Receipt reminder cron job
- [x] Property form: includedInRent toggles
- [x] i18n translations

## Progress

### Completed
- **Schema**: Added `ReceiptType`, `ReceiptStatus` enums, `TenantReceipt` model, `ReminderLog` model, `includedInRent` per-service fields on PropertyDetails, relations on Tenant/Policy. Prisma generate passes.
- **i18n**: Created `src/lib/i18n/pages/receipts.ts` with all receipt type labels, portal text, upload instructions, months, status labels. Registered in pages/index.ts.
- **S3 key generator**: Added `generateReceiptS3Key()` to `documentService.ts` — pattern: `receipts/{policyNumber}/{tenantId}/{year}-{month}/{receiptType}/{uuid}-{filename}`
- **Receipt service**: Created `src/lib/services/receiptService.ts` with `getRequiredReceiptTypes()`, `getMonthStatus()`, `getMonthsStatus()`, `findTenantsByEmail()`, `getReceiptsByPolicy()`.
- **Email templates**: Created `ReceiptReminderEmail.tsx` and `ReceiptMagicLinkEmail.tsx` in react-email templates.
- **Email functions**: Added `sendReceiptReminder()` and `sendReceiptMagicLink()` to `emailService.ts`.
- **tRPC router**: Created `receipt.router.ts` with all tenant-facing (requestMagicLink, getPortalData, getUploadUrl, confirmUpload, markNotApplicable, undoNotApplicable, deleteReceipt, getDownloadUrl) and admin-facing (listByPolicy, getDownloadUrlAdmin) procedures. Registered in `_app.ts`.
- **Build**: `bun run build` passes with all changes.

### In Progress
- None — all implementation phases complete

### Pending
- Commit all changes
- Run migration on environment
- End-to-end testing

## Key Files
- `prisma/schema.prisma`
- `src/lib/services/receiptService.ts`
- `src/server/routers/receipt.router.ts`
- `src/lib/services/emailService.ts`
- `src/templates/email/react-email/ReceiptReminderEmail.tsx`
- `src/templates/email/react-email/ReceiptMagicLinkEmail.tsx`
- `src/lib/i18n/pages/receipts.ts`
- `src/lib/services/documentService.ts` (generateReceiptS3Key)

## Plan (Approved)

### Key Decisions
- **Auth**: Magic link via email. Reuse `actorTokenService`. Monthly reminder email = the link.
- **Multi-policy portal**: Tenant portal shows ALL active policies linked to tenant's email. Token authenticates person; email lookup finds all policies.
- **Services**: Ask for ALL configured services every month. Tenant can mark individual ones as "Not applicable this month" (with confirmation modal).
- **No deadline**: Just monthly reminders. No "late" status.
- **Admin**: Separate page at `/dashboard/policies/[id]/receipts` (from dropdown menu, like Investigations). View/download only — no admin upload.
- **Included in rent**: Services marked "included in rent" won't show as receipt slots.

### Schema
- `ReceiptType` enum: RENT, ELECTRICITY, WATER, GAS, INTERNET, CABLE_TV, PHONE, MAINTENANCE, OTHER
- `ReceiptStatus` enum: UPLOADED, NOT_APPLICABLE (PENDING = no record)
- `TenantReceipt` model with period (year/month), type, file (S3), N/A fields. Unique on `[policyId, year, month, receiptType]`
- `ReminderLog` model for audit trail
- PropertyDetails: 6 new `xIncludedInRent` Boolean fields
- Relations: Tenant.receipts, Policy.tenantReceipts

### S3 Storage
Pattern: `receipts/{policyNumber}/{tenantId}/{year}-{month}/{receiptType}/{uuid}-{filename}`

### tRPC Router (`receipt.router.ts`)
**Tenant-facing (public+token)**: requestMagicLink, getPortalData, getUploadUrl, confirmUpload, markNotApplicable, undoNotApplicable, deleteReceipt, getDownloadUrl
**Admin-facing (protected)**: listByPolicy, getDownloadUrlAdmin

### Portal Routes
- `/portal/receipts` — magic link request (email form)
- `/portal/receipts/[token]` — receipt dashboard (multi-policy)

### Portal Components
```
src/components/portal/
  PortalLayout.tsx              — Branded shell
  receipts/
    MagicLinkForm.tsx           — Email input
    PolicySelector.tsx          — Multi-policy pills
    ReceiptDashboard.tsx        — Main orchestrator
    MonthReceiptCard.tsx        — Month grid (shared: portal + admin)
    ReceiptSlot.tsx             — Receipt type slot (shared, readOnly prop)
    ReceiptUploader.tsx         — File picker + progress
    NotApplicableModal.tsx      — Confirmation dialog
    ReceiptHistoryList.tsx      — Past months accordion
```

### Admin Page
- Route: `/dashboard/policies/[id]/receipts`
- Dropdown menu item in PolicyHeader.tsx (like Investigations)
- Reuses same receipt components with `readOnly=true`

### Reminder System
- `src/services/receiptReminderService.ts` — finds APPROVED policies, checks missing receipts, sends emails
- Cron: `/api/cron/receipt-reminder` at `0 15 1 * *` (1st of month, 9am MX)
- Logs to `ReminderLog`

### Implementation Order
1. ~~Schema & Foundation~~ ✅
2. ~~Service Layer~~ ✅
3. ~~API (tRPC router)~~ ✅
4. ~~Email Templates~~ ✅
5. ~~Tenant Portal~~ ✅
6. ~~Admin Dashboard~~ ✅
7. ~~Reminders & Cron~~ ✅
8. ~~Property Form Update~~ ✅

---

### Update — 2026-02-18

**Summary**: Backend complete. Built all schema, services, API, and email infrastructure. Starting frontend.

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/lib/i18n/pages/index.ts`, `src/lib/services/documentService.ts`, `src/lib/services/emailService.ts`, `src/server/routers/_app.ts`
- Added: `src/lib/i18n/pages/receipts.ts`, `src/lib/services/receiptService.ts`, `src/server/routers/receipt.router.ts`, `src/templates/email/react-email/ReceiptReminderEmail.tsx`, `src/templates/email/react-email/ReceiptMagicLinkEmail.tsx`
- Branch: `feature/tenant-receipts` (commit: cd39beb)

**Todo Progress**: 7 completed, 1 in progress, 3 pending
- ✓ Schema (TenantReceipt, ReminderLog, includedInRent)
- ✓ i18n translations
- ✓ S3 key generator
- ✓ Receipt service
- ✓ Email functions + templates
- ✓ tRPC receipt router
- ✓ Build passes
- ⏳ Tenant portal pages & components
- ◻ Admin receipts page + dropdown
- ◻ Receipt reminder cron
- ◻ Property form includedInRent toggles

---

### Update — 2026-02-19

**Summary**: Phase 5 (Tenant Portal) complete. Built all 12 frontend files — hook, pages, and components. Build passes.

**Git Changes**:
- Modified: (same as previous — no new commit yet)
- Added: `src/hooks/useReceiptOperations.ts`, `src/app/portal/receipts/page.tsx`, `src/app/portal/receipts/[token]/layout.tsx`, `src/app/portal/receipts/[token]/page.tsx`, `src/components/portal/receipts/MagicLinkForm.tsx`, `src/components/portal/receipts/PolicySelector.tsx`, `src/components/portal/receipts/ReceiptDashboard.tsx`, `src/components/portal/receipts/MonthReceiptCard.tsx`, `src/components/portal/receipts/ReceiptSlot.tsx`, `src/components/portal/receipts/ReceiptUploader.tsx`, `src/components/portal/receipts/NotApplicableModal.tsx`, `src/components/portal/receipts/ReceiptHistoryList.tsx`
- Branch: `feature/tenant-receipts` (commit: cd39beb, uncommitted)

**Todo Progress**: 9 completed, 1 in progress, 2 pending
- ✓ Completed: Tenant portal pages & components (12 files)
- ✓ Completed: `bun run build` passes
- ⏳ Admin receipts page + dropdown
- ◻ Receipt reminder cron
- ◻ Property form includedInRent toggles

**Decisions resolved**:
- Replace confirmation dialog before overwriting uploaded receipts
- All past months always editable (no lock period)
- `activatedAt` null → default to current month only

---

### Update — 2026-02-19 (session 2)

**Summary**: ALL 8 implementation phases complete. Feature fully built (backend + frontend + cron + property form). Also fixed a pre-existing i18n bug.

**DONE** (all phases):
- ✅ Phase 1: Schema (TenantReceipt, ReminderLog, ReceiptType/ReceiptStatus enums, includedInRent fields)
- ✅ Phase 2: Service layer (receiptService.ts — getRequiredReceiptTypes, getMonthStatus, etc.)
- ✅ Phase 3: API (receipt.router.ts — 8 tenant + 2 admin tRPC endpoints)
- ✅ Phase 4: Email templates (ReceiptReminderEmail, ReceiptMagicLinkEmail) + email service functions
- ✅ Phase 5: Tenant portal (12 files — hook, layout, pages, 7 components)
- ✅ Phase 6: Admin dashboard (receipts page + PolicyHeader "Comprobantes" dropdown item)
- ✅ Phase 7: Cron (receiptReminderService.ts + /api/cron/receipt-reminder + vercel.json)
- ✅ Phase 8: Property form (includedInRent toggles in PropertyDetailsForm-RHF, PropertyDetailsService, LandlordService, actor types)
- ✅ Bugfix: PolicyStatusIndicators.tsx — `t.labels.policySubStatus` → `t.policySubStatus`

**TODO** (remaining):
- ◻ Commit all changes
- ◻ Run Prisma migration on environment
- ◻ End-to-end testing (magic link flow, upload, N/A, admin view, cron)

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/components/actor/landlord/PropertyDetailsForm-RHF.tsx`, `src/components/forms/property/PropertyServicesSection.tsx`, `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx`, `src/components/shared/PolicyStatusIndicators.tsx`, `src/lib/i18n/pages/index.ts`, `src/lib/services/PropertyDetailsService.ts`, `src/lib/services/actors/LandlordService.ts`, `src/lib/services/documentService.ts`, `src/lib/services/emailService.ts`, `src/lib/types/actor.ts`, `src/server/routers/_app.ts`, `vercel.json`
- Added: `src/hooks/useReceiptOperations.ts`, `src/app/portal/receipts/page.tsx`, `src/app/portal/receipts/[token]/layout.tsx`, `src/app/portal/receipts/[token]/page.tsx`, `src/components/portal/receipts/` (7 components), `src/app/dashboard/policies/[id]/receipts/page.tsx`, `src/app/api/cron/receipt-reminder/route.ts`, `src/services/receiptReminderService.ts`, `src/lib/i18n/pages/receipts.ts`, `src/lib/services/receiptService.ts`, `src/server/routers/receipt.router.ts`, `src/templates/email/react-email/ReceiptReminderEmail.tsx`, `src/templates/email/react-email/ReceiptMagicLinkEmail.tsx`
- Branch: `feature/tenant-receipts` (commit: cd39beb, all changes uncommitted)

**Build**: `bun run build` ✅ passes

---

### Update — 2026-02-19 (session 3)

**Summary**: In-depth audit of Policy status transitions. Found and fixed 15 workflow issues across two rounds.

**Round 1 fixes** (committed separately earlier, files now clean):
- Removed `allActorsApproved` gate from approve CTA — was checking `verificationStatus` instead of `actorInvestigation.status`, causing button to never appear
- Added activate/deactivate buttons to PolicyHeader dropdown for APPROVED policies
- Set `submittedAt` on COLLECTING_INFO → PENDING_APPROVAL transition (was always null)
- Added payment gate (`paymentStatus === COMPLETED`) before activation
- Fixed silent `catch {}` on investigation→policy auto-transition
- Sent approval email to tenant on APPROVED transition
- Deleted dead code: `autoTransitionPolicies()`, `ApprovalWorkflow` component + `approval/` folder

**Round 2 fixes** (commit: 7c981e8):
- Reset `activatedAt`/`expiresAt` on tenant replacement & guarantor type change (was leaving stale activation state)
- Added `activatedAt: { not: null }` filter to receipt cron, portal magic link, and portal data queries
- Added `status !== 'APPROVED'` guard to admin `listByPolicy` endpoint
- Removed debug `console.log(pd)` from receipt router
- Moved 4 hardcoded Spanish strings to i18n (activate, deactivate, share, cancel)
- Added `utils.policy.getById.invalidate()` to activate/deactivate mutation success handlers
- Created `sendPolicyPendingApprovalNotification()` — admins now get emailed when policy reaches PENDING_APPROVAL

**Git Changes**:
- Modified: `PolicyHeader.tsx`, `usePolicyActions.ts`, `PolicyDetailsContent.tsx`, `policies.ts` (i18n), `notificationService/index.ts`, `guarantorTypeChange.ts`, `tenantReplacement.ts`, `policyWorkflowService.ts`, `receipt.router.ts`, `receiptReminderService.ts`, `investigation.router.ts`
- Deleted: `ApprovalWorkflow.tsx`, `approval/` folder (3 files), `ApprovalWorkflowSkeleton.tsx`
- Branch: `feature/tenant-receipts` (commit: 7c981e8)
- Working tree clean

**Build**: `bun run build` ✅ passes

---

### Update — 2026-02-19 (session 4 — FINAL)

**Summary**: Policy workflow improvements round 3 — 7 small fixes for data consistency, dead code, i18n gaps, confirmation UX, loading states, and timeline completeness. Also fixed a bug introduced during session (`t.statuses.policyStatusFull` → `t.policyStatusFull`).

**Changes (all uncommitted, 8 files modified)**:

1. **Cancellation date reset** — `cancellation.ts`: added `activatedAt: null, expiresAt: null` on cancel
2. **Dead prop removal** — removed unused `progressOverall` from `PolicyHeader` interface + `PolicyDetailsContent` usage
3. **Status text i18n** — `PolicyStatusIndicators.tsx`: replaced hardcoded `getStatusDisplayText()`/`getPaymentStatusText()` with `t.policyStatusFull`/`t.paymentStatusFull`
4. **Toast i18n** — added 12 toast keys to `policies.ts`, replaced all hardcoded toast strings in `usePolicyActions.ts`
5. **AlertDialog replaces confirm()** — added `pendingAction` state to `usePolicyActions`, `ConfirmActionDialog` component in `PolicyDetailsContent`
6. **Loading states** — exposed `isActivating`/`isDeactivating` from hook, passed to `PolicyHeader`, spinner + disabled on menu items
7. **Timeline expiresAt** — added `expiresAt` prop to `TimelineCard` with `CalendarClock` icon, wired from `OverviewTab`
8. **Bugfix** — `t.statuses.policyStatusFull` → `t.policyStatusFull` (statuses is spread into `t`, not nested)

**Modified files**:
- `src/lib/services/policyService/cancellation.ts` (M)
- `src/components/policies/PolicyDetailsContent/PolicyDetailsContent.tsx` (M)
- `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx` (M)
- `src/components/policies/PolicyDetailsContent/hooks/usePolicyActions.ts` (M)
- `src/components/policies/PolicyDetailsContent/tabs/OverviewTab.tsx` (M)
- `src/components/policies/details/TimelineCard.tsx` (M)
- `src/components/shared/PolicyStatusIndicators.tsx` (M)
- `src/lib/i18n/pages/policies.ts` (M)

**Stats**: 9 files changed, +203 -64 lines. 0 new commits (all uncommitted).

**Build**: `bun run build` ✅

**Remaining TODO**:
- ◻ Commit round 3 changes
- ◻ Commit all tenant receipts portal changes (from sessions 1-2, still uncommitted)
- ◻ Run Prisma migration on environment
- ◻ End-to-end testing

**Key lesson**: The i18n `t` object spreads `statuses` at top level (`t.policyStatusFull`), not nested (`t.statuses.policyStatusFull`). Same for globals. Only `layout`, `wizard`, `pages` are nested.
