# Session: Quick Fixes for Investigation Approval

**Started:** 2026-02-04 01:20

## Overview
Investigation feature audit + archive flow implementation + edit mode fixes.

## Goals
- [x] Deep audit of investigation feature
- [x] Add ARCHIVED status + archive flow
- [x] Fix edit mode for investigations
- [x] Update brandColors in approval card
- [x] Duplicate prevention in actor selection

## Completed

### 1. Schema Changes (`prisma/schema.prisma`)
- Added `ARCHIVED` to `ActorInvestigationStatus` enum
- Added `InvestigationArchiveReason` enum (OUTDATED, ERROR, SUPERSEDED, OTHER)
- Added archive fields: `archivedAt`, `archivedBy`, `archiveReason`, `archiveComment`

### 2. Config Updates (`investigationConfig.ts`)
- Added `ARCHIVED` to status config
- Added `archiveReasonConfig` with labels
- Added `ARCHIVE_REASONS` export for dropdown
- Added `archiveComment` max length to form limits

### 3. Router Changes (`investigation.router.ts`)
- Added duplicate prevention check in `create` procedure
- Replaced `delete` with `archive` procedure
- Added `includeArchived` param to `getByPolicy`
- Archive procedure requires reason + optional comment

### 4. UI Components Updated

**ArchiveInvestigationDialog (NEW)**
- Predefined reason dropdown
- Optional comment field
- Character count

**InvestigationCard, InvestigationsTable, InvestigationsCards**
- Changed `onDelete` to `onArchive`
- Updated icons (Trash2 → Archive)
- Can archive any non-archived investigation

**InvestigationsList**
- Uses ArchiveInvestigationDialog

**InvestigationsFilters**
- Now shows ARCHIVED filter option

**ActorSelectionDialog**
- Shows existing investigation status
- Clicking actor with investigation navigates to it
- Visual indicator for actors with active investigations

**InvestigationApprovalCard**
- Updated hardcoded colors to use `brandColors`
- Approve: `brandColors.success`
- Reject: `brandColors.danger`

### 5. Edit Mode Fixed

**new/page.tsx**
- Added `useSearchParams` for `edit` param
- Queries existing investigation when `edit` param present
- Passes `existingInvestigation` and `isEditMode` to form

**InvestigationForm**
- Accepts `existingInvestigation` and `isEditMode` props
- Pre-populates form with existing data
- Shows "Editar Investigación" title in edit mode
- Initializes documents from existing investigation

---

## Audit Results - All Security Issues FIXED

| Issue | Status |
|-------|--------|
| getByToken WHERE clause | SECURE |
| S3 presigned URLs | WORKING |
| Token validation | SECURE |
| File validation | ENABLED |
| Submit race condition | SECURE |
| localStorage token | NO ISSUE |
| Service consolidation | COMPLETE |

---

## Files Changed

**Schema:**
- `prisma/schema.prisma`

**Config:**
- `src/lib/constants/investigationConfig.ts`

**Router:**
- `src/server/routers/investigation.router.ts`

**Pages:**
- `src/app/dashboard/policies/[id]/investigation/[actorType]/[actorId]/new/page.tsx`
- `src/app/dashboard/policies/[id]/investigations/page.tsx`

**Components:**
- `src/components/investigation/InvestigationForm.tsx`
- `src/components/investigation/InvestigationApprovalCard.tsx`
- `src/components/investigations/list/ArchiveInvestigationDialog.tsx` (NEW)
- `src/components/investigations/list/InvestigationCard.tsx`
- `src/components/investigations/list/InvestigationsTable.tsx`
- `src/components/investigations/list/InvestigationsCards.tsx`
- `src/components/investigations/list/InvestigationsList.tsx`
- `src/components/investigations/list/ActorSelectionDialog.tsx`
- `src/components/investigations/list/index.ts`

---

## Migration Required

```bash
bunx prisma migrate dev --name add_investigation_archive_fields
```

---

## Verification Checklist

- [x] `bun run build` passes
- [ ] Create investigation → save draft works
- [ ] Try create second for same actor → blocked
- [ ] Archive approved investigation → can create new
- [ ] Archive pending investigation → works with reason
- [ ] Edit draft → loads existing data

---

## User Decisions (Confirmed)

1. **Draft/Submit:** Keep both buttons
2. **Archive reason:** Predefined dropdown options
3. **Delete behavior:** Always archive, never truly delete

---

### Update - 2026-02-04 14:50

**Summary**: All implementation complete and tested - user confirmed working

**Git Changes**:
- Modified: 14 files (schema, router, config, pages, components)
- Added: `ArchiveInvestigationDialog.tsx`, migration
- Branch: `feat/investigation-vb` (commit: 87e0fa9)

**Todo Progress**: 8/8 completed
- ✓ Update schema with archive fields
- ✓ Update investigation router
- ✓ Add archive reason labels to config
- ✓ Fix edit flow in new/page.tsx
- ✓ Update InvestigationForm for edit mode
- ✓ Update ActorSelectionDialog for duplicate prevention
- ✓ Update InvestigationApprovalCard with brandColors
- ✓ Replace delete with archive in UI components

**Verification**:
- ✓ `bun run build` passes
- ✓ User confirmed all features working

**Status**: Ready for PR / merge

---

### Update - 2026-02-05 ~afternoon

**Summary**: Quality of life improvements - function overloads, query invalidation, approval UX fixes

**Git Changes**:
- Modified: 19 files
- Deleted: `DeleteInvestigationDialog.tsx` (broken, used non-existent procedure)
- Branch: `feat/investigation-vb` (commit: 87e0fa9)

**Completed Tasks**:

#### 1. `formatFullName` overload support
- Added TypeScript overload to accept object or individual params
- Removed duplicate definitions from `person.schema.ts` and `PersonNameFields.tsx`
- All 17 import sites work without changes

#### 2. Query invalidation for investigation mutations
- `InvestigationForm`: create/update/submit now invalidate `getByPolicy` + `getById`
- `ArchiveInvestigationDialog`: archive invalidates queries
- Fixes stale data when navigating back to list

#### 3. Replaced Delete with Archive on detail page
- `DeleteInvestigationDialog` called non-existent `trpc.investigation.delete`
- Replaced with `ArchiveInvestigationDialog` on detail page
- Deleted broken component

#### 4. Approval links accessible for submitted investigations
- Added `getApprovalUrls` router procedure
- Added "Ver Enlaces" button on detail page (PENDING + submitted only)
- Edit button disabled for submitted investigations
- URL truncation fix in `InvestigationSubmittedDialog`

#### 5. Approval page shows status on revisit
- Removed token nullification from approve/reject procedures
- Tokens persist for lookup → page shows "already approved/rejected" on revisit
- Archive still nullifies tokens (as intended)

**Verification**:
- ✓ `bun run build` passes

---

### Update - 2026-02-06 ~morning

**Summary**: Removed legacy Investigation model & entire review system. Replaced PDF investigation section with ActorInvestigation data.

**Git Changes**:
- Modified: 14 files (schema, router registry, i18n, generate-enums, workflow service, policy service, tenant replacement, guarantor type change, PolicyDetailsContent, PolicyHeader, PDF types, PDF transformer, InvestigationSection)
- Deleted: 18 files (13 review components, review page route, 3 services, review router, PolicyInvestigationInfo)
- Branch: `feat/investigation-vb` (commit: 46b73ca)
- Migration created: `20260206061833_drop_old_investigation_feature`

**Completed Tasks**:

#### 1. Schema cleanup (`prisma/schema.prisma`)
- Removed `Investigation` model
- Removed `InvestigationVerdict` enum, `RiskLevel` enum
- Removed `investigation` relation on Policy
- Removed `verdict` and `riskLevel` fields from `ActorInvestigation`

#### 2. Deleted entire review system (18 files)
- 13 review components, review page route, 3 services, review router, PolicyInvestigationInfo

#### 3. Workflow service simplified
- Removed investigation gating from APPROVED validation
- Removed `tx.investigation.create()` from UNDER_INVESTIGATION transition
- Simplified to single `policy.update()` call

#### 4. Policy service cleanup
- Removed `investigation` includes from queries
- Changed `getPolicyForPDF` to include `actorInvestigations` with documents
- Removed investigation delete blocks from tenant replacement & guarantor type change

#### 5. PDF updated to ActorInvestigation
- Replaced `PDFInvestigation` with `PDFActorInvestigation[]`
- New per-actor investigation cards

#### 6. PolicyHeader cleaned up
- Removed investigation verdict prop/badge/conditions
- Removed "Revisar Información" menu item

**Verification**:
- ✓ `bun run build` passes
- ✓ No stale references in src/
- ✓ Migration created and applied

---

## Session End Summary - 2026-02-06

**Duration:** 2026-02-04 01:20 → 2026-02-06 (multi-day session)

### Git Summary
- **Branch:** `feat/investigation-vb`
- **Last commit:** `46b73ca feat: remove risk level`
- **Commits during session:** 31
- **Uncommitted changes:** 21 modified, 19 deleted, 3 new migrations
- **Total files touched across session:** 50+

### All Changed Files (uncommitted)
**Modified (21):** prisma/schema.prisma, scripts/generate-enums.ts, src/components/actor/tenant/TenantPersonalInfoTab-RHF.tsx, PolicyDetailsContent.tsx, PolicyHeader.tsx, src/lib/i18n.ts, pdf/policyDataTransformer.ts, pdf/types.ts, schemas/landlord/index.ts, schemas/policy/wizard.ts, schemas/tenant/index.ts, services/actors/BaseActorService.ts, services/actors/LandlordService.ts, services/policyService/guarantorTypeChange.ts, services/policyService/index.ts, services/policyService/tenantReplacement.ts, services/policyWorkflowService.ts, src/lib/types/actor.ts, src/server/routers/_app.ts, src/templates/pdf/policy/sections/InvestigationSection.tsx

**Deleted (19):** 13 review components, review page route, reviewService.ts, reviewService.types.ts, validationService.ts, review.router.ts, PolicyInvestigationInfo.tsx

**New migrations:** add_business_type, add_rep_curp, drop_old_investigation_feature

### Key Accomplishments

1. **Investigation Feature Audit** — Full security audit, all issues verified secure
2. **Archive Flow** — Replaced hard delete with archive (reason + comment). ARCHIVED status, `ArchiveInvestigationDialog`
3. **Edit Mode** — Pre-populate investigation form from existing data via `?edit=true`
4. **Duplicate Prevention** — Actor selection dialog blocks creating second investigation for same actor
5. **Approval UX** — brandColors, "Ver Enlaces" button, approval page shows status on revisit
6. **Query Invalidation** — All mutation callbacks properly invalidate stale queries
7. **formatFullName Overload** — Unified function signature, removed duplicates
8. **Legacy Investigation Removal** — Deleted entire old Investigation model, review system (18 files), all references
9. **PDF Rewrite** — Investigation section now shows per-actor ActorInvestigation cards

### Breaking Changes
- `Investigation` model **dropped** — requires migration
- `InvestigationVerdict` and `RiskLevel` enums **dropped**
- `verdict` and `riskLevel` columns **dropped** from `ActorInvestigation`
- `/dashboard/policies/[id]/review` route **removed**
- `PolicyHeader` no longer accepts `investigationVerdict` prop
- `reviewRouter` removed from tRPC app router

### What Wasn't Completed
- `UNDER_INVESTIGATION` / `INVESTIGATION_REJECTED` PolicyStatus values still exist (future cleanup)
- Manual verification checklist items from Feb 4 (create, archive, edit flows) — need manual QA

### Migrations Pending Commit
- `20260206054152_add_business_type`
- `20260206054527_add_rep_curp`
- `20260206061833_drop_old_investigation_feature`

### Tips for Future
- The `ActorInvestigation` is now the **only** investigation model. No more 1:1 Policy→Investigation.
- Policy approval flow no longer gates on investigation verdict — it just checks `allActorsApproved`
- PDF investigation section uses `getInvestigatedActorLabel` and `getInvestigationStatusLabel` from `investigationConfig.ts`
- Archive is soft-delete: tokens are nullified, `archivedAt`/`archiveReason` set, but row persists
