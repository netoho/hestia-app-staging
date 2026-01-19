# Policy Details UI Improvements

**Started:** 2026-01-13
**Status:** In Progress

---

## Session Overview

Refactoring `PolicyDetailsContent.tsx` and related components to improve code organization, reduce duplication, and enhance UI/UX.

---

## Goals

1. Modularize large components into smaller, reusable pieces
2. Eliminate code duplication across policy-related components
3. Improve UI/UX (loading states, mobile responsiveness, consistency)
4. Document future refactoring opportunities

---

## Progress

### Phase 1 - Completed
- Created module structure for `PolicyDetailsContent/`
- Created shared utilities:
  - `src/lib/utils/actor.ts` - `getActorTypeLabel()`, `getActorIcon()`, `getActorTitle()`
  - `src/components/shared/VerificationBadge.tsx`
- Extracted components: `PolicyHeader`, `PolicyProgressBar`, `ActorViewToggle`, `MarkCompleteDialog`, `ActorTabSkeleton`
- Extracted tabs: `OverviewTab`, `LandlordTab`, `TenantTab`, `GuarantorsTab`
- Created `usePolicyActions.ts` hook
- Fixed bugs: `ShareInvitationModal.tsx` handleClose bug, double badges issue
- **Result:** ~900 lines → ~230 lines in main component

### Phase 2 - Completed
- Updated 5 files to use shared utilities
- Mobile scroll indicator now only shows when tabs are scrollable
- ~80 lines of duplicate code removed

### Phase 3 - Completed (Current Session)

#### Tier 2: Quick Wins
- ✅ `formatCurrency()` consolidated (7→1) in `currency.ts`
- ✅ `formatDate()`/`formatDateTime()` created in `formatting.ts`
- ✅ `PAYMENT_TYPE_LABELS`, `PAYER_TYPE_LABELS` → `paymentConfig.ts`
- ✅ `calculateActorProgress()` added to `actor.ts`
- ✅ `VerificationBadge` adopted in 3 more files
- ✅ `CompletionBadge` created and adopted in 4 files

#### Tier 1: ApprovalWorkflow Refactor
- ✅ Extracted `ActorVerificationRow.tsx`
- ✅ Extracted `useApprovalWorkflow.ts` hook
- ✅ `ApprovalWorkflow.tsx`: 563 → 282 lines (50% reduction)

---

## Update - 2026-01-13

**Summary**: Completed Tier 1 & 2 refactoring - consolidated utilities and refactored ApprovalWorkflow

**Git Changes**:
- Modified: 18 files (payment dialogs, actor cards, shared components)
- Added: 8 new files (shared utilities, approval module, badges)
- Deleted: `PolicyDetailsContent.tsx` (replaced by module)
- Branch: `policy-details-ui-improvements` (last: 65a5739)

**Todo Progress**: 8 completed, 0 in progress, 0 pending
- ✓ formatCurrency consolidation (7 files)
- ✓ formatDate/DateTime creation
- ✓ Payment labels extraction
- ✓ calculateActorProgress consolidation
- ✓ VerificationBadge adoption
- ✓ CompletionBadge creation (4 files)
- ✓ ApprovalWorkflow refactor
- ✓ useApprovalWorkflow hook extraction

**Details**: User asked about remaining duplications. Found `informationComplete` badge pattern in 4 files. Created `CompletionBadge` component with `isComplete`, `size`, and `showIcon` props.

---

## TODOs - Remaining Work

### Optional Further Refactoring
- [ ] Extract `ActorDocumentsSection` from ActorCard (~500 lines)
- [ ] Create `useDialogState()` hook for dialog patterns
- [ ] Standardize empty states across tabs

### Deferred (Tier 3)
- [ ] Tab field consolidation (7 files, 2 parallel config systems)
- [ ] Type safety (~200 `any` usages)
- [ ] Tests for extracted components

---

## Files Modified This Session

### Created
- `src/lib/utils/actor.ts` - actor utilities + `calculateActorProgress()`
- `src/lib/utils/formatting.ts` - `formatDate()`, `formatDateTime()`
- `src/lib/constants/paymentConfig.ts` - payment labels
- `src/components/shared/VerificationBadge.tsx`
- `src/components/shared/CompletionBadge.tsx`
- `src/components/policies/PolicyDetailsContent/` (entire module)
- `src/components/policies/approval/` (entire module)
  - `ActorVerificationRow.tsx`
  - `useApprovalWorkflow.ts`
  - `index.ts`

### Modified (18 files)
- Payment components: PaymentCard, PaymentSummaryCard, VerifyPaymentDialog, ManualPaymentDialog
- Actor components: ActorCard, ActorProgressCard, ActorCardMinimal, ActorVerificationCard
- Review components: QuickComparisonPanel, ActorReviewCard, DocumentValidator, ActorListSidebar
- Other: ShareInvitationModal, ApprovalWorkflow, PolicyStatusIndicators, ActorActivityTimeline, InlineActorEditor
- Utilities: currency.ts

### Deleted
- `src/components/policies/PolicyDetailsContent.tsx` (replaced by module)

---

### Update - 2026-01-13 (Option B Complete)

**Summary**: Completed Option B refactoring - EmptyState component and useDialogState hook

**Git Changes**:
- Modified: 10 files (tabs, dialogs, actor components)
- Added: `EmptyState.tsx`, `useDialogState.ts`
- Branch: `policy-details-ui-improvements` (last: f91689b)

**Completed**:
- ✅ Created `EmptyState` component (Card-wrapped, icon/title/description/action)
- ✅ Updated 4 files: LandlordTab, GuarantorsTab (3 places), PoliciesList
- ✅ Created `useDialogState` hook (isOpen, open, close, toggle, data)
- ✅ Updated 5 files: PaymentCard, DocumentValidator, VerifyPaymentDialog, SectionValidator, InlineActorEditor
- ✅ Fixed missing imports in ActorCard.tsx (CheckCircle2, Badge)

**Skipped** (as planned):
- DocumentsList, ActorActivityTimeline (nested Card context)
- ManualPaymentDialog (controlled component)
- ActorDocumentsSection extraction (only 30 lines, low ROI)

---

## Next Steps

### Ready to Ship
All Option B work is complete. Ready for commit/PR.

### Deferred (Tier 3) - Future Sessions
- [ ] Tab field consolidation (7 files, 2 parallel config systems)
- [ ] Type safety (~200 `any` usages)
- [ ] Tests for extracted components

---

### Update - 2026-01-13 (Committed)

**Summary**: Option B committed and pushed

**Git Changes**:
- Commit: `6b5229b refactor: add EmptyState component and useDialogState hook`
- Branch: `policy-details-ui-improvements` (last: 978efcc)
- 11 files changed, 152 insertions, 61 deletions

**Status**: All Option B work complete and committed. Session work done.

---

## Plan Files

| Plan | Purpose |
|------|---------|
| `.claude/plans/crystalline-stirring-starlight.md` | Option B: EmptyState + useDialogState |
| `.claude/plans/parsed-purring-crab.md` | Tier 1 & 2: Utilities consolidation + ApprovalWorkflow |
| `.claude/plans/iterative-strolling-piglet.md` | Tab field config consolidation (Tier 3) |

---

### Update - 2026-01-13 (Tab Field Consolidation)

**Summary**: Completed Tier 3 tab field consolidation - fixed bugs and unified config system

**Completed Tasks**:
1. ✅ Fixed `shared.router.ts`: `phoneNumber` → `phone` (4 places in createBatch schema)
2. ✅ Fixed `actorTabFields.ts` field names:
   - `phoneNumber` → `phone` (4 occurrences)
   - `legalRepPhoneNumber` → `legalRepPhone` (4 occurrences)
   - `accountHolderName` → `accountHolder`
   - Removed `employerPhoneNumber` (doesn't exist in schema)
   - Removed duplicate `email` entries (2 occurrences)
3. ✅ Created `jointObligorTabFields.ts` with INDIVIDUAL/COMPANY split
4. ✅ Refactored `actorTabFields.ts` as unified entry point (re-exports from individual files)
5. ✅ Updated `useFormWizardSubmissionTRPC.ts` to use individual filter functions with proper INDIVIDUAL/COMPANY handling

**Files Changed (This Update)**:
- `src/server/routers/actor/shared.router.ts` - Bug fix
- `src/lib/constants/actorTabFields.ts` - Bug fixes + refactor
- `src/lib/constants/jointObligorTabFields.ts` - New file (316 lines)
- `src/hooks/useFormWizardSubmissionTRPC.ts` - Updated imports and filter logic

**Build**: ✅ Passed

---

## SESSION END - 2026-01-13

**Duration**: Full day session

### Git Summary
- **Branch**: `policy-details-ui-improvements`
- **Files changed (uncommitted)**: 4 modified, 1 new
  - M `src/hooks/useFormWizardSubmissionTRPC.ts`
  - M `src/lib/constants/actorTabFields.ts`
  - M `src/server/routers/actor/shared.router.ts`
  - A `src/lib/constants/jointObligorTabFields.ts`

### Key Accomplishments
1. **PolicyDetailsContent refactor**: 900 → 230 lines (75% reduction)
2. **ApprovalWorkflow refactor**: 563 → 282 lines (50% reduction)
3. **Created shared utilities**: actor.ts, formatting.ts, paymentConfig.ts
4. **Created shared components**: VerificationBadge, CompletionBadge, EmptyState
5. **Created hooks**: usePolicyActions, useApprovalWorkflow, useDialogState
6. **Tab field consolidation**: Fixed bugs, created jointObligorTabFields.ts, unified API

### Problems Encountered & Solutions
1. **Field name discrepancies**: `phoneNumber` vs `phone` in schema
   - Solution: Used Prisma schema as source of truth, fixed all occurrences
2. **Duplicate email fields**: Found in actorTabFields.ts
   - Solution: Removed duplicates
3. **Missing jointObligorTabFields.ts**: No INDIVIDUAL/COMPANY config existed
   - Solution: Created new file following existing patterns

### What's Left (Deferred)
- [ ] Type safety (~200 `any` usages)
- [ ] Tests for extracted components
- [ ] ~200 more type improvements

### Tips for Future Developers
1. Always use Prisma schema as source of truth for field names
2. Individual tab field files (`*TabFields.ts`) have INDIVIDUAL/COMPANY split; `actorTabFields.ts` is the unified entry point
3. Check for duplicate entries when modifying tab field configs
4. Build passes - changes ready for commit
