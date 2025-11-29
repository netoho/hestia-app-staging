# Session: Fix Validation Service
**Started:** 2025-11-27 23:10

## Overview
Fixed the validation service to properly show sections based on actor type and company status.

## Goals
- [x] Identify and fix validation service issues

## Problem
The `getSectionsForActorType` method in `validationService.ts` returned a static list of sections regardless of actor type or company status, causing:
- `work_info` never showing approved (applied to all actors even companies)
- Missing sections: `rental_history`, `property_guarantee`, `references`
- Wrong sections for companies vs individuals

## Solution
Created a centralized section configuration that can be easily edited.

## Files Changed

### New Files
- `src/lib/constants/actorSectionConfig.ts` - Single source of truth for section matrix

### Modified Files
- `src/lib/services/validationService.ts` - Use centralized config
- `src/lib/services/reviewService.ts` - Added new section types and data extraction
- `src/components/policies/review/ActorReviewCard.tsx` - Added icons for new sections
- `src/components/policies/review/SectionValidator.tsx` - Updated references display with clear type labels
- `src/server/routers/review.router.ts` - Added new section types to zod schema

## Section Matrix

| Section | Landlord | Tenant | Aval | JointObligor |
|---------|----------|--------|------|--------------|
| personal_info | ✓ (all) | ✓ (all) | ✓ (all) | ✓ (all) |
| address | ✓ (all) | ✓ (all) | ✓ (all) | ✓ (all) |
| company_info | company | company | company | company |
| work_info | - | person | person | person |
| financial_info | ✓ (all) | - | - | - |
| rental_history | - | person | - | - |
| property_guarantee | - | - | ✓ (all) | ✓ (all) |
| references | - | ✓ (all) | ✓ (all) | ✓ (all) |

## Progress
- [x] Created actorSectionConfig.ts with ACTOR_SECTIONS matrix
- [x] Updated validationService.ts to use config
- [x] Updated reviewService.ts with new sections and extractSectionData
- [x] Updated ActorReviewCard.tsx with new section icons
- [x] Updated SectionValidator.tsx for references display
- [x] Build passed

---

## Next Task: Auto-transition to PENDING_APPROVAL

### Problem
When all actors are approved during review, the policy stays stuck on `UNDER_INVESTIGATION`.
It should automatically move to `PENDING_APPROVAL` for final manager sign-off.

### Policy Status Flow
```
DRAFT → COLLECTING_INFO → UNDER_INVESTIGATION → PENDING_APPROVAL → APPROVED → CONTRACT_PENDING → CONTRACT_SIGNED → ACTIVE
```

### Implementation Plan

1. **Update `checkActorValidationComplete` in `validationService.ts`**
   - After marking actor as APPROVED, check if ALL actors in the policy are now APPROVED
   - If all approved → update policy.status to `PENDING_APPROVAL`

2. **Add `checkPolicyReadyForApproval` method**
   - Query all actors (landlords, tenant, jointObligors, avals)
   - Check if each actor's `verificationStatus === 'APPROVED'`
   - Return true only if ALL actors are approved

3. **Log the status transition**
   - Use `logPolicyActivity` to record the automatic transition

### Files to Modify
- `src/lib/services/validationService.ts` - Add policy status check after actor approval
- `src/lib/services/policyService.ts` - May need helper to update policy status

### Key Code Location
In `validationService.ts:checkActorValidationComplete` (around line 590):
```typescript
if (allSectionsApproved && allDocumentsApproved) {
  // Update actor verification status to APPROVED
  // ... existing code ...

  // NEW: Check if all actors in policy are now approved
  await this.checkAndTransitionPolicyStatus(policyId);
}
```

### ✅ COMPLETED - Auto-transition Implementation

**Files Modified:**
- `src/lib/services/policyWorkflowService.ts` - Added `checkAllActorsVerified` helper, added PENDING_APPROVAL validation
- `src/lib/services/validationService.ts` - Added `checkAndTransitionPolicyStatus` method, calls `transitionPolicyStatus`

---

### Update - 2025-11-28 12:30 AM

**Summary**: Added "Aprobar Investigación" CTA to review page

**Problem Discovered**: After implementing auto-transition, clicking "Aprobar Protección" failed with:
> "Investigation must be approved before policy approval"

The flow had two separate concepts:
1. Actor verification (what review page does)
2. Investigation verdict (never being set!)

**Solution**: Added separate "Aprobar Investigación" button on review page.

**Git Changes**:
- Modified: `policyWorkflowService.ts` - Exported `checkAllActorsVerified`
- Modified: `review.router.ts` - Added `approveInvestigation` mutation
- Modified: `reviewService.ts` - Added `investigationVerdict` to response
- Modified: `ReviewProgress.tsx` - Added CTA button and status display
- Modified: `ReviewLayout.tsx` - Wired up mutation
- Branch: `feat/release-candidate` (commit: 41e0870)

**Todo Progress**: 5 completed, 0 in progress, 0 pending
- ✓ Add approveInvestigation mutation to review.router.ts
- ✓ Add investigationVerdict to reviewService response
- ✓ Add CTA button to ReviewProgress.tsx
- ✓ Wire up mutation in ReviewLayout.tsx
- ✓ Build passed

**New Flow**:
1. Review all actors on `/dashboard/policies/[id]/review`
2. When all validated (100%, 0 rejections), "Aprobar Investigación" button appears
3. Click → sets `investigation.verdict = 'APPROVED'`
4. Shows "Investigación aprobada" status
5. "Aprobar Protección" on policy details page now works

---

## Next Session Focus (2025-11-28)

### Tasks for Next Session:

1. **Pricing Calculation Update**
   - Need to update how the initial policy price is calculated

2. **Show "Approved Investigation" on Policy Details View**
   - Currently only visible on review page
   - Need to show investigation status on policy details page

3. **Fix Investigation & Policy Approval Flows**
   - Both flows are failing
   - Need to debug and fix `approveInvestigation` mutation
   - Need to debug and fix `updateStatus` (policy approval) mutation

---

### Update - 2025-11-28 01:45 AM

**Summary**: Major security & data integrity audit of validation/approval flows

Performed comprehensive analysis of validation approval and policy approval flows. Fixed critical bugs and security issues across Phase 1 and Phase 2.

## Phase 1 - Critical Bug Fixes (Completed Earlier)

1. **Empty Actor Auto-Approval Bug** - Fixed `.every()` returning true on empty arrays
2. **IN_REVIEW Blocking** - Items in review now block actor approval
3. **Null Verdict Handling** - Clear Spanish error messages for investigation states
4. **Investigation in Transaction** - Moved investigation creation inside transaction
5. **Rejection Reason Validation** - Backend now validates 10+ char rejection reason
6. **Deprecated Routes Deleted** - Removed 5 broken deprecated API routes

## Phase 2 - Security & UX Improvements (This Session)

**Security Fixes:**
- Document access control - Verifies document belongs to policy actors before download
- Race condition protection - Investigation approval uses `SELECT FOR UPDATE` row lock
- IP address logging - Investigation approval logs IP for audit trail

**Data Integrity:**
- Validation history logging - Logs previous status before changes to sections/documents
- Actor addition guards - Verified architecture prevents post-investigation actor additions

**UX Improvements:**
- Toast notifications - Replaced all `alert()` with proper toast notifications

**Git Changes:**
- Modified: `src/server/routers/review.router.ts` (document access, race condition, IP logging)
- Modified: `src/lib/services/validationService.ts` (validation history logging)
- Modified: `src/lib/services/policyWorkflowService.ts` (null verdict handling, transaction fix)
- Modified: `src/components/policies/review/SectionValidator.tsx` (toast)
- Modified: `src/components/policies/review/ReviewDocumentCard.tsx` (toast)
- Modified: `src/components/policies/review/DocumentValidator.tsx` (toast)
- Modified: `src/components/policies/review/ReviewNotes.tsx` (toast)
- Deleted: 5 deprecated investigation routes
- Branch: `feat/release-candidate` (commit: 868cef2)

**Todo Progress**: 8 completed, 0 in progress, 0 pending
- ✓ Fix document access control
- ✓ Fix note deletion permission logic (verified already correct)
- ✓ Add race condition protection for investigation approval
- ✓ Add IP address logging for approvals
- ✓ Add validation history logging
- ✓ Prevent actor addition post-investigation (architecture already prevents)
- ✓ Replace alert() with toast notifications
- ✓ Build passed

**Deferred for Future:**
- Stuck policy explanations in ReviewProgress
- Rejection feedback with inline errors
- SLA dashboard
- Investigation reporting endpoints

---

### Update - 2025-11-28 (Onboarding UX Fixes)

**Summary**: Fixed onboarding page issues - avatar upload, password validation, phone required

## Problems Fixed

1. **Avatar Upload 401 Error** - After onboarding, avatar upload failed because:
   - `onboard.complete` cleared invitation token
   - Session cookie not immediately available after `signIn()`

2. **Weak Password Validation** - Onboard only required 6 chars, reset-password required 8+uppercase+lowercase+number

3. **Phone/Address Requirements** - Phone was optional, should be required

## Solution - Migrated to tRPC for Avatar Upload

Instead of REST endpoint with session auth, created tRPC mutations:
- `onboard.uploadAvatar` (publicProcedure) - validates user.emailVerified < 5 min ago
- `user.uploadAvatar` (protectedProcedure) - for profile page

**New Files Created:**
- `src/app/api/user/avatar/route.ts` - REST endpoint (kept for profile multipart)
- `src/hooks/useAvatarUpload.ts` - Progress tracking hook
- `src/components/user/AvatarUploader.tsx` - Reusable avatar component
- `src/lib/validation/password.ts` - Shared password schema
- `src/components/auth/PasswordRequirements.tsx` - Password strength UI

**Files Modified:**
- `src/server/routers/onboard.router.ts` - Added uploadAvatar, phone required, password validation
- `src/server/routers/user.router.ts` - Implemented uploadAvatar, phone required, password validation
- `src/app/onboard/[token]/page.tsx` - Uses tRPC for avatar, password requirements, phone required
- `src/app/dashboard/profile/page.tsx` - AvatarUploader component, password requirements
- `src/app/reset-password/[token]/page.tsx` - Uses shared password schema

**Git Changes:**
- Branch: `feat/release-candidate`
- Modified: 9 files
- Added: 5 new files
- Deleted: 1 deprecated route

**Todo Progress**: 4 completed, 0 in progress, 0 pending
- ✓ Add uploadAvatar to onboard.router.ts (publicProcedure)
- ✓ Implement uploadAvatar in user.router.ts (protectedProcedure)
- ✓ Update onboard page to use tRPC mutation
- ✓ Build passed

**New Onboarding Flow:**
1. User fills form → `onboard.complete` runs
2. Returns `user.id` → calls `onboard.uploadAvatar` with userId (validates emailVerified < 5min)
3. Auto-login with `signIn('credentials')`
4. Redirect to `/dashboard/profile`

---

### Update - 2025-11-28 (Avatar Fix + Investigation Status on Policy Details)

## Task 1: Fix Avatar Upload on Onboarding Page

**Problem**: `AvatarUploader` component on onboarding page returned 401 because:
- No session exists during onboarding
- Token prop wasn't being passed to the component

**Solution**: Pass `token` prop to `AvatarUploader` and clean up duplicate upload logic.

**File Modified:**
- `src/app/onboard/[token]/page.tsx`:
  - Added `token={token}` prop to `AvatarUploader`
  - Replaced `avatarFile` state with `avatarUrl` state
  - Removed duplicate tRPC upload logic (was uploading via both REST and tRPC)
  - Removed unused `isUploadingAvatar`, `uploadAvatarMutation`, `fileToBase64`, `handleAvatarSelect`
  - Simplified submit button logic

## Task 2: Show Investigation Status on Policy Details Page

**Problem**: Investigation approval status was only visible on the review page, not on policy details.

**Solution**: Display investigation verdict badge and update CTA button logic.

**Files Modified:**

1. `src/lib/services/policyService/index.ts`:
   - Added `investigation: { select: { verdict: true } }` to `getPolicyById` include

2. `src/components/policies/PolicyDetailsContent.tsx`:
   - Added blue "Investigación Aprobada" badge next to status badge
   - Updated "Revisar Información" button: only shows when investigation NOT approved
   - Updated "Aprobar Protección" button: shows when investigation approved + all actors verified + status is UNDER_INVESTIGATION or PENDING_APPROVAL

**New UI Flow:**
| Status | Investigation | Actors | Display |
|--------|--------------|--------|---------|
| UNDER_INVESTIGATION | null | - | "Revisar Información" CTA |
| UNDER_INVESTIGATION | APPROVED | No | Investigation badge only |
| UNDER_INVESTIGATION | APPROVED | Yes | Investigation badge + "Aprobar Protección" CTA |
| PENDING_APPROVAL | APPROVED | Yes | Investigation badge + "Aprobar Protección" CTA |

---

## Session End Summary

**Session Duration:** ~4+ hours (started 2025-11-27 23:10)
**Branch:** `feat/release-candidate`

### Git Summary (This Session)

**Files Modified:**
- `src/app/onboard/[token]/page.tsx` - Avatar upload fix
- `src/lib/services/policyService/index.ts` - Added investigation to getPolicyById
- `src/components/policies/PolicyDetailsContent.tsx` - Investigation status UI

**Uncommitted Changes:**
- 2 files modified for investigation status feature
- Build passes ✓

### Tasks Completed This Session

1. ✓ Fix avatar upload 401 on onboarding page (pass token prop)
2. ✓ Add investigation verdict to policy details response
3. ✓ Add investigation badge to PolicyDetailsContent header
4. ✓ Update CTA button logic for policy approval
5. ✓ Update "Revisar Información" button visibility

### Key Accomplishments (Full Session)

1. **Validation Service Overhaul** - Centralized section configuration
2. **Auto-transition to PENDING_APPROVAL** - When all actors approved
3. **Investigation Approval Flow** - "Aprobar Investigación" CTA on review page
4. **Security Audit** - Race condition protection, IP logging, document access control
5. **Onboarding UX** - Password validation, phone required, avatar upload
6. **Policy Details** - Investigation status badge and approval CTAs

### Deferred for Future

- Pricing calculation update
- Stuck policy explanations in ReviewProgress
- Rejection feedback with inline errors
- SLA dashboard
- Investigation reporting endpoints

### Tips for Future Development

1. The investigation verdict is stored in `Investigation.verdict` enum (APPROVED, REJECTED, HIGH_RISK, CONDITIONAL)
2. Policy approval requires: investigation.verdict === 'APPROVED' AND all actors verificationStatus === 'APPROVED'
3. Avatar upload during onboarding uses REST endpoint with token query param for auth
4. `getPolicyById` now includes investigation relation - use `policy.investigation?.verdict`
