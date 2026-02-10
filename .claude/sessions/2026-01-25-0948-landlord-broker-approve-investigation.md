# Session: Landlord/Broker Approve Investigation Result

**Started:** 2026-01-25 09:48

## Overview
Implement feature allowing landlord or broker to approve investigation results.

## Goals
- [x] Landlord can approve investigation result
- [x] Broker can approve investigation result

## Completed

### 1. Schema (prisma/schema.prisma)
- Added `ActorInvestigation` model with actor reference, findings, verdict, risk level
- Added `ActorInvestigationDocument` model for uploaded documents
- Added enums: `InvestigatedActorType`, `ActorInvestigationStatus`, `ApproverType`
- Added relation to Policy model

### 2. Backend (src/server/routers/investigation.router.ts)
- `create` - Staff creates investigation for actor
- `getById` / `getByActor` / `getByPolicy` - Query investigations
- `update` - Update findings before submit
- `getDocumentUploadUrl` / `removeDocument` - Document management
- `submit` - Submit for approval (generates tokens, sends notifications)
- `getByToken` - Public: get investigation by approval token
- `getDocumentDownloadUrlByToken` - Public: download docs via token
- `approve` / `reject` - Broker/landlord approval via token

### 3. Email Templates
- `InvestigationSubmittedEmail` - Notice to admins
- `InvestigationApprovalRequestEmail` - Broker/landlord with link
- `InvestigationResultEmail` - Approved/rejected notice
- Added functions to `emailService.ts`

### 4. Staff Investigation Form Page
- Route: `/dashboard/policies/[id]/investigation/[actorType]/[actorId]/new`
- Component: `InvestigationForm.tsx`
- Features: findings textarea, verdict/risk select, document upload, confirmation dialog

### 5. Approval Page
- Route: `/investigation/approve/[token]`
- Component: `InvestigationApprovalCard.tsx`
- Token-based auth for both broker and landlord
- Shows findings, verdict, risk level, documents
- Big Approve/Reject CTAs

## Remaining

### 6. Update ActorCard with investigation CTA
- Add "Investigación" button when actor info complete
- Show investigation history list per actor

### 7. Add missing fields to PDF + ActorCard
- Legal rep info (companies)
- Commercial references
- Spouse info (property guarantees)
- Work phone, personal email
- Additional income
- Investigation results per actor

## Notes
- Run `bunx prisma migrate dev` to apply schema changes
- Email sending is stubbed (TODO comments in router)

---

### Update - 2026-01-26 10:15

**Summary**: Added plan file reference

**Plan File**: `/Users/neto/.claude/plans/lucky-whistling-octopus.md`

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/lib/services/emailService.ts`, `src/server/routers/investigation.router.ts`
- Added: `src/app/dashboard/policies/[id]/investigation/`, `src/app/investigation/`, `src/components/investigation/`, 3 email templates
- Branch: `feat/investigation-vb` (commit: 23744d9)

**Todo Progress**: 5 completed, 0 in progress, 2 pending
- Completed: Schema, Router, Email templates, Staff form page, Approval page
- Pending: ActorCard CTA, PDF fields

**Files Created**:
- `src/components/investigation/InvestigationForm.tsx`
- `src/components/investigation/InvestigationApprovalCard.tsx`
- `src/app/dashboard/policies/[id]/investigation/[actorType]/[actorId]/new/page.tsx`
- `src/app/investigation/approve/[token]/page.tsx`
- `src/templates/email/react-email/Investigation*.tsx` (3 files)

---

### Update - 2026-02-03 (Full Refactor)

**Summary**: Complete audit & refactor of investigation feature - fixed 67 issues

**Plan File**: `/Users/neto/.claude/plans/polymorphic-shimmying-meerkat.md`

**Git Changes**:
- Modified: `prisma/schema.prisma`, `src/server/routers/investigation.router.ts`, `src/components/investigation/*.tsx`
- Added: `src/lib/constants/investigationConfig.ts`, `src/lib/validations/investigation.ts`
- Branch: `feat/investigation-vb` (commit: 904ac13)

**Todo Progress**: 6 completed, 0 in progress, 0 pending
- ✓ Create investigationConfig.ts constants file
- ✓ Create investigation.ts validation schema
- ✓ Fix investigation.router.ts critical issues
- ✓ Update InvestigationForm.tsx
- ✓ Update InvestigationApprovalCard.tsx
- ✓ Update email templates and page components

**Critical Fixes**:
1. Race condition in approve/reject → atomic transactions with `updateMany` + status check
2. Logic bug line 216 (`&&` → `||`) → prevents updating submitted investigations
3. Email TODOs → implemented all 3 email sends (submit/approve/reject)
4. Token security → timing-safe comparison with `crypto.timingSafeEqual`
5. File validation → enforced 10MB limit + MIME type check in backend

**Architecture Improvements**:
- Created `src/lib/constants/investigationConfig.ts` with labels, colors, validation config
- Created `src/lib/validations/investigation.ts` with Zod schemas
- Centralized form limits (findings: 10-10000, rejection: 10-2000)
- Removed hardcoded labels from 3 files → single source of truth

**Frontend Fixes**:
- Responsive grids: `grid-cols-1 sm:grid-cols-2`
- File validation before upload using `validateFile()`
- Success toast for draft save
- Empty state for documents
- Character count for textareas
- ARIA labels for accessibility
- File type icons (PDF=red, images=blue)

**Clarification from User**:
- Approval: Either broker OR landlord can approve (not both required)
- After first approval → emails sent to ADMINs + broker + landlord

**Remaining**:
- Run `bunx prisma migrate dev` to generate new enums
- Add index on `status` field (optional, performance)

---

### Update - 2026-02-03 (Investigation Landing Page)

**Summary**: Created investigation landing page for staff to manage investigations per policy

**Plan File**: `/Users/neto/.claude/plans/parallel-dancing-pumpkin.md`

**New Routes**:
- `/dashboard/policies/[id]/investigations` - List investigations for policy
- `/dashboard/policies/[id]/investigations/[investigationId]` - Investigation detail view

**Backend Changes** (`investigation.router.ts`):
- Enhanced `getByPolicy` with actor name resolution + status filter
- Added `delete` mutation (drafts only, deletes S3 docs + record)

**New Files**:
- `src/hooks/useInvestigationsState.ts` - URL state management (status filter)
- `src/app/dashboard/policies/[id]/investigations/page.tsx` - List page
- `src/app/dashboard/policies/[id]/investigations/[investigationId]/page.tsx` - Detail page
- `src/components/investigations/list/` (8 files):
  - `InvestigationsHeader.tsx` - Title + "Nueva" button with actor selection
  - `InvestigationsFilters.tsx` - Status dropdown
  - `InvestigationsList.tsx` - Loading/empty/list wrapper
  - `InvestigationsTable.tsx` - Desktop table view
  - `InvestigationsCards.tsx` - Mobile cards container
  - `InvestigationCard.tsx` - Single mobile card
  - `ActorSelectionDialog.tsx` - Dialog to pick actor for new investigation
  - `DeleteInvestigationDialog.tsx` - Confirm delete (drafts only)
  - `types.ts` - Shared types
  - `index.ts` - Exports

**Features**:
- Full CRUD: View, Edit (not approved), Delete (drafts only)
- Status filter: All / Pending / Approved / Rejected
- Actor name resolution from policy
- Responsive: Mobile cards + Desktop table
- Role-based actions: ADMIN/STAFF can edit/delete, BROKER view only

---

### Update - 2026-02-03 (Demo Audit Fixes)

**Summary**: Fixed issues found during demo

**Plan File**: `/Users/neto/.claude/plans/parallel-dancing-pumpkin.md`

**P0 Fixes Completed**:

1. **PolicyHeader → Investigations link**
   - Added "Investigaciones" dropdown menu item
   - File: `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx`
   - Icon: `FileSearch`, ADMIN/STAFF only

2. **Approval link copy fallback**
   - Submit mutation now returns `approvalUrls` (broker + landlord)
   - Created `InvestigationSubmittedDialog.tsx` with copy/WhatsApp buttons
   - After submit: shows dialog with both links before redirect
   - Files: `investigation.router.ts`, `InvestigationSubmittedDialog.tsx`, `InvestigationForm.tsx`

**P1 Deferred**:
- Document components refactor (useInvestigationDocuments hook)
  - Current implementation works, refactor could introduce regressions
  - Recommend as follow-up task

**Findings**:
- [Object Object] bug: Email templates checked - all use strings correctly
- TypeScript errors: None - build passes
- Need to reproduce [Object Object] with specific steps if still occurring

---

### Update - 2026-02-03 (TODO & Next Steps)

**Summary**: Session status with detailed TODO and next steps

**Git Changes**:
- Modified: `PolicyHeader.tsx`, `investigation.router.ts`, `InvestigationForm.tsx`
- Added: `InvestigationSubmittedDialog.tsx`
- Branch: `feat/investigation-vb` (commit: 263deb7)

**Todo Progress**: 3 completed, 0 in progress, 2 pending (deferred)
- ✓ Add Investigaciones menu item to PolicyHeader
- ✓ Return approval URLs from submit mutation
- ✓ Create InvestigationSubmittedDialog component
- ⏸ Create useInvestigationDocuments hook (DEFERRED)
- ⏸ Refactor InvestigationForm to use DocumentManagerCard (DEFERRED)

---

## TODO - Remaining Work

### Before Merge (Required)
1. **Run migration**: `bunx prisma migrate dev` for new enums
2. **Test end-to-end**:
   - Policy page → dropdown → Investigaciones
   - Create investigation → submit → see copy links dialog
   - Copy broker link → test in incognito
   - Copy landlord link → test in incognito
   - Approve/reject flow
3. **Reproduce [Object Object]**: If still occurring, get exact steps

### P1 - Follow-up Tasks (Post-merge)
1. **Document components refactor** (Tasks #10, #11)
   - Create `useInvestigationDocuments` hook
   - Replace custom upload UI with `DocumentManagerCard`
   - ~150 LOC reduction, but risk of regressions

2. **ActorCard investigation CTA**
   - Add "Investigación" button when actor info complete
   - Show investigation status badge per actor

3. **PDF fields update**
   - Legal rep info (companies)
   - Commercial references
   - Investigation results per actor

### P2 - Nice to Have
1. Investigation summary card in policy OverviewTab
2. Add index on `status` field for performance
3. Edit mode for existing investigations (currently create-only)

---

## Files Changed This Session

**Modified**:
- `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx` - Added Investigaciones menu
- `src/server/routers/investigation.router.ts` - Return approvalUrls from submit
- `src/components/investigation/InvestigationForm.tsx` - Show dialog after submit

**Created**:
- `src/components/investigation/InvestigationSubmittedDialog.tsx` - Success dialog with copy links

---

## Next Steps

1. Run `bunx prisma migrate dev`
2. Test the complete flow locally
3. Fix any issues found
4. Create PR for review

---

### Update - 2026-02-04 (S3 Consolidation & Presigned URLs)

**Summary**: Fixed S3 upload errors + consolidated document services + migrated payment receipts to presigned URLs

**Duration**: ~2 hours

---

## Git Summary

**Total Changes**: 22 files changed, 836 insertions, 767 deletions

| Status | File |
|--------|------|
| M | `prisma/schema.prisma` |
| M | `src/app/api/payments/[paymentId]/receipt/route.ts` |
| M | `src/app/api/user/avatar/route.ts` |
| M | `src/components/policies/payments/ManualPaymentDialog.tsx` |
| M | `src/lib/services/documentService.ts` |
| D | `src/lib/services/fileUploadService.ts` |
| M | `src/server/routers/investigation.router.ts` |
| M | `src/server/routers/onboard.router.ts` |
| M | `src/server/routers/review.router.ts` |
| M | `src/server/routers/user.router.ts` |
| A | `prisma/migrations/20260204060044_add_investigation_doc_upload_status/` |

---

## Tasks Completed

### 1. Fixed S3 Upload Error
**Problem**: `s3.generatePresignedUploadUrl is not a function`

**Root Cause**: `investigation.router.ts` called non-existent S3 methods

**Fix**: Updated method calls to match `S3StorageProvider` API:
| Broken | Correct |
|--------|---------|
| `generatePresignedUploadUrl()` | `getSignedUrl({ action: 'write' })` |
| `generatePresignedDownloadUrl()` | `getSignedUrl({ action: 'read' })` |
| `deleteFile()` | `delete()` |

### 2. Consolidated Document Services
**Problem**: 3 separate S3 provider instantiations + 2 overlapping services

**Solution**: Merged `fileUploadService.ts` into `documentService.ts`

**New documentService structure**:
```typescript
// Pure S3 operations (no DB)
getUploadUrl(), getDownloadUrl(), getViewUrl(), deleteFile(), fileExists()

// S3 key generators
generateActorS3Key(), generateInvestigationS3Key(), generatePolicyS3Key()

// Actor documents
generateUploadUrl(), confirmUpload(), deleteDocument(), uploadActorDocument()

// Investigation documents (NEW)
generateInvestigationUploadUrl(), confirmInvestigationUpload(), deleteInvestigationDocument()

// Policy documents
uploadPolicyDocument(), deletePolicyDocument(), getPolicyDocuments()

// Public uploads
publicUpload(), getPublicUrl(), deletePublic()

// Legacy exports for backwards compatibility
```

**Files updated**:
- `investigation.router.ts` → uses `documentService`
- `review.router.ts` → import from `documentService`
- `onboard.router.ts` → import from `documentService`
- `user.router.ts` → import from `documentService`
- `api/user/avatar/route.ts` → import from `documentService`

**Deleted**: `src/lib/services/fileUploadService.ts`

### 3. Schema Migration
Added `uploadStatus` to `ActorInvestigationDocument`:
```prisma
uploadStatus DocumentUploadStatus @default(PENDING)
```

### 4. Payment Receipt → Presigned URLs
**Problem**: Direct upload limited to 4MB on Vercel

**Solution**: Converted to presigned URL pattern

**Backend** (`api/payments/[paymentId]/receipt/route.ts`):
| Method | Before | After |
|--------|--------|-------|
| POST | Direct FormData upload | Returns presigned URL |
| PUT | N/A | Confirms upload + updates DB |
| GET | `getStorageProvider()` | `documentService.getDownloadUrl()` |

**Frontend** (`ManualPaymentDialog.tsx`):
```typescript
// 1. Get presigned URL
const { uploadUrl, s3Key } = await fetch(POST).json()

// 2. Upload to S3 directly
await uploadToS3WithProgress(uploadUrl, file, contentType)

// 3. Confirm upload
await fetch(PUT, { body: { s3Key, fileName } })
```

---

## Key Accomplishments

1. ✅ Fixed S3 upload breaking bug
2. ✅ Consolidated 2 services → 1 unified `documentService`
3. ✅ Removed redundant `fileUploadService.ts`
4. ✅ Added `uploadStatus` to investigation documents
5. ✅ Payment receipts now support files up to 20MB (was 4MB)
6. ✅ All consumers updated to use `documentService`
7. ✅ Build passes

---

## Breaking Changes

1. **fileUploadService removed** - All imports must use `documentService`
   - Legacy exports added for backwards compatibility

2. **Payment receipt API contract changed**:
   - POST now expects JSON body: `{ fileName, contentType, fileSize }`
   - POST returns: `{ uploadUrl, s3Key, fileName, expiresIn }`
   - New PUT endpoint for confirmation

---

## Migration Required

```bash
bunx prisma migrate dev --name add_investigation_doc_upload_status
```

---

## Verification Checklist

- [x] `bun run build` passes
- [ ] Investigation document upload works
- [ ] Investigation document download works
- [ ] Payment receipt upload works (>4MB)
- [ ] Avatar upload/delete works

---

## Tips for Future Developers

1. **Always use documentService** for S3 operations - it's the single source of truth
2. **Use presigned URLs** for client-side uploads to bypass Vercel limits
3. **uploadToS3WithProgress()** is the standard for client → S3 uploads
4. **Legacy exports** in documentService allow gradual migration

---

**Session ended**: 2026-02-04
