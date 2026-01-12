# Payment Service Implementation

**Started:** 2026-01-07 22:22

## Goals

- [ ] Implement comprehensive payment service with Stripe integration
- [ ] Add "Pagos" tab to policy details page
- [ ] Support manual payments with admin verification
- [ ] Generate Stripe payment links at pricing configuration

## Progress

### 2026-01-07 22:22 - Planning Complete

**Explored:**
- Policy details tab structure (PolicyDetailsContent.tsx)
- Current payment service and tRPC router
- Document upload pattern (useDocumentOperations)
- Pricing calculation service

**Key Decisions Made:**
- Payment links generated at pricing configuration time
- Investigation fee deducted from tenant portion (fixed at generation)
- Manual payments require admin verification
- Admin/Staff see all; actors see own payments only
- Hide payment sections where percentage is 0%

**Plan Created:** `~/.claude/plans/keen-skipping-bunny.md`

**Estimated Sessions:** 8 (schema through polish)

---

### Update - 2026-01-08 00:52

**Summary:** Completed Phases 1-3 of payment service implementation

**Git Changes:**
- Modified: `prisma/schema.prisma` (schema updates)
- Modified: `src/lib/services/paymentService.ts` (new methods)
- Modified: `src/server/routers/payment.router.ts` (new procedures)
- Current branch: `chore/clean-code` (commit: 4c416fc)

**Todo Progress:** 7 completed, 0 in progress, 0 pending
- ✓ Phase 1: Schema updates (PaymentStatus.PENDING_VERIFICATION, PaymentType.TENANT_PORTION/LANDLORD_PORTION, Payment model fields)
- ✓ Phase 2: PaymentService methods implemented
- ✓ Phase 3: tRPC procedures implemented

**Phase 1 - Schema Updates (COMPLETE):**
- Added `PENDING_VERIFICATION` to PaymentStatus enum
- Added `TENANT_PORTION`, `LANDLORD_PORTION` to PaymentType enum
- Added to Payment model:
  - `checkoutUrl`, `checkoutUrlExpiry` (Stripe links)
  - `receiptS3Key`, `receiptFileName` (manual payment proof)
  - `verifiedBy`, `verifiedAt`, `verificationNotes` (verification)
  - Index on `type`
- User ran migration successfully

**Phase 2 - Payment Service Enhancement (COMPLETE):**
File: `src/lib/services/paymentService.ts`

New types added:
- `PaymentBreakdown` - payment amounts breakdown
- `PaymentSessionResult` - Stripe session result
- `PolicyPaymentSessionsResult` - all sessions for a policy
- `PaymentSummary` - full payment status summary
- `CreateManualPaymentParams`, `CreateTypedCheckoutParams`

New methods added:
- `calculatePaymentBreakdown()` - calc amounts per party
- `createTypedCheckoutSession()` - create Stripe checkout with metadata
- `createPolicyPaymentSessions()` - generate all payment links
- `getPaymentSummary()` - get full payment status
- `createManualPayment()` - record manual payment (PENDING_VERIFICATION)
- `verifyManualPayment()` - admin verify/reject
- `updatePaymentReceipt()` - update S3 receipt info
- `regenerateCheckoutUrl()` - refresh expired links
- `getPaymentById()` - get single payment

Fixes applied:
- Fixed import error (PaymentMethodType → PaymentMethod)
- Updated Stripe API version to `2025-08-27.basil`
- Fixed `performedBy` → `performedById` in activity logs

**Phase 3 - tRPC Procedures (COMPLETE):**
File: `src/server/routers/payment.router.ts`

New procedures:
- `list` - Enhanced with role-based access control
- `getPaymentDetails` - Full payment summary with breakdown
- `getBreakdown` - Payment amounts only
- `generatePaymentLinks` - Admin: Create Stripe checkout sessions
- `recordManualPayment` - Admin: Record manual payment
- `verifyPayment` - Admin: Approve/reject manual payment
- `regeneratePaymentUrl` - Admin: Refresh expired URLs
- `updatePaymentReceipt` - Admin: Update S3 receipt info
- `getById` - Get single payment
- `cancelPayment` - Admin: Cancel pending payment

**Next Steps:**
- Phase 4: UI Components (PaymentsTab, PaymentCard, etc.)
- Phase 5: Manual payment flow UI
- Phase 6: Receipt upload endpoint
- Phase 7: Webhook updates
- Phase 8: Polish and testing

**Issues Encountered:**
- Pre-existing zod/react-hook-form type errors in form components (unrelated to payment work)
- Build passes compilation but fails on linting due to pre-existing issues

**Notes:**
- All payment-related code compiles without errors
- Ready to proceed with Phase 4 (UI Components)

---

### Update - 2026-01-08

**Summary:** Completed Phase 4 - Payments Tab UI Components

**Files Created:**
- `src/components/policies/payments/PaymentsTabSkeleton.tsx`
- `src/components/policies/payments/PaymentSummaryCard.tsx`
- `src/components/policies/payments/PaymentCard.tsx`
- `src/components/policies/payments/ManualPaymentDialog.tsx`
- `src/components/policies/payments/VerifyPaymentDialog.tsx`
- `src/components/policies/payments/PaymentsTab.tsx`

**Files Modified:**
- `src/components/policies/PolicyDetailsContent.tsx` - Added 7th tab "Pagos"

**Phase 4 - UI Components (COMPLETE):**

Components implemented:
- `PaymentsTabSkeleton` - Loading skeleton for tab
- `PaymentSummaryCard` - Shows breakdown (subtotal, IVA, total), paid/remaining with progress bar
- `PaymentCard` - Individual payment with status badge, Stripe button, admin actions
- `ManualPaymentDialog` - Form to record manual payment with receipt upload
- `VerifyPaymentDialog` - Admin approval/rejection with notes
- `PaymentsTab` - Main container fetching data and orchestrating components

Features:
- Status badges: PENDING (gray), PROCESSING (blue), COMPLETED (green), FAILED (red), PENDING_VERIFICATION (orange)
- "Pagar con Stripe" opens checkout URL in new tab
- "Regenerar Link" for expired URLs (admin)
- "Registrar Pago Manual" with receipt upload (admin)
- "Verificar Pago" approve/reject dialog (admin)
- "Cancelar Pago" for pending payments (admin)
- Currency formatted as `$X,XXX MXN`

Tab integration:
- Changed grid from 6 to 7 columns
- Added "Pagos" tab between "Obligado S. / Aval" and "Documentos"
- Dynamic import with skeleton loader

**Build Status:**
- Payment components compile without errors
- Pre-existing type error in AvalEmploymentTab-RHF.tsx (unrelated)

**Next Steps:**
- Phase 5: Receipt upload REST endpoint
- Phase 6: Webhook updates for payment type metadata
- Phase 7: Polish and testing

---

### Update - 2026-01-08 (Phase 5)

**Summary:** Completed Phase 5 - Receipt Upload Endpoint

**File Created:**
- `src/app/api/payments/[paymentId]/receipt/route.ts`

**Phase 5 - Receipt Upload Endpoint (COMPLETE):**

Endpoints:
- `POST /api/payments/[paymentId]/receipt` - Upload receipt (admin/staff only)
- `GET /api/payments/[paymentId]/receipt` - Get signed download URL

Features:
- FormData upload with file validation
- S3 storage: `payments/{policyNumber}/{paymentId}/{uniqueId}-{filename}.ext`
- Updates payment record with `receiptS3Key` and `receiptFileName`
- Signed URL expires in 5 minutes
- Auth: POST requires ADMIN/STAFF, GET requires any authenticated user

**Build Status:** Passes successfully

**Next Steps:**
- Phase 6: Webhook updates (add paymentType metadata handling)
- Phase 7: Polish and testing

---

### Update - 2026-01-09 01:15

**Summary:** Completed Phases 4-5, ready for webhook updates

**Git Changes:**
- Modified: `src/components/policies/PolicyDetailsContent.tsx` (added Pagos tab)
- Added: `src/components/policies/payments/*.tsx` (6 UI components)
- Added: `src/app/api/payments/[paymentId]/receipt/route.ts`
- Branch: `chore/clean-code` (commit: 4c416fc)

**Todo Progress:** All Phase 4-5 tasks complete

**Work Completed:**
- Phase 4: Full Payments Tab UI (skeleton, summary card, payment cards, dialogs)
- Phase 5: Receipt upload REST endpoint (POST upload, GET signed URL)

**Remaining Work (specific next steps):**

1. **Phase 6: Webhook Updates** (`src/app/api/webhooks/stripe/route.ts`)
   - Extract `paymentType` from session metadata
   - Update correct payment record by type (not just first found)
   - Log activity with payment type details
   - Check if all payments complete for policy

2. **Phase 7: Polish & Testing**
   - End-to-end test: generate links → complete Stripe checkout → verify webhook updates status
   - Manual payment flow: record → upload receipt → verify → approve
   - Edge cases: expired URLs, 0% percentages, duplicate payments

**Build Status:** Passes (pre-existing error in AvalEmploymentTab-RHF.tsx unrelated)

---

### Update - 2026-01-09

**Summary:** Completed Phase 6 - Webhook Enhancement

**Git Changes:**
- Modified: `src/app/api/webhooks/stripe/route.ts`
- Branch: `chore/clean-code` (commit: 4c416fc)

**Todo Progress:** 4 completed, 0 in progress, 0 pending
- ✓ Update checkout.session.completed handler with paymentType metadata
- ✓ Update checkout.session.expired handler with paymentType metadata
- ✓ Add all-payments-complete check
- ✓ Verify build passes

**Phase 6 - Webhook Enhancement (COMPLETE):**

File: `src/app/api/webhooks/stripe/route.ts`

Changes:
- Added `PAYMENT_TYPE_DESCRIPTIONS` map for human-readable names
- `checkout.session.completed`: extracts `paymentType`/`paidBy` from metadata, logs "Pago completado: Porción del Inquilino" etc.
- Added all-payments-complete check → logs "Todos los pagos de la póliza han sido completados"
- `checkout.session.expired`: extracts `paymentType`, logs "Link de pago expirado: Cuota de Investigación" etc.
- Fixed imports: `prisma` default import, `PaymentStatus` from generated enums

**Build Status:** Passes

**Remaining Work:**
- Phase 7: Polish & Testing
  - E2E: generate links → Stripe checkout → webhook updates status
  - Manual payment: record → upload receipt → verify → approve
  - Edge cases: expired URLs, 0% percentages

---

### Update - 2026-01-10 - Final Polish

**Summary:** Completed Phase 7 - Receipt download, pricing integration, email notifications

**Todo Progress:** 5 completed
- ✓ Add receipt download button to PaymentCard
- ✓ Add payment link generation to pricing page
- ✓ Add payment email templates to emailService
- ✓ Trigger emails from webhook on payment complete
- ✓ Verify build passes

**Changes:**
- `PaymentCard.tsx`: Added receipt download button with loading state
- `pricing/page.tsx`: Auto-generates payment links after pricing save
- `emailService.ts`: Added `sendPaymentCompletedEmail` and `sendAllPaymentsCompletedEmail`
- `webhooks/stripe/route.ts`: Sends confirmation email to payer + admin notification

---

## Session End Summary

**Session Duration:** 2026-01-07 22:22 → 2026-01-10 (~3 days)

### Git Summary

**Branch:** `chore/clean-code`
**Commits during session:** 0 (changes uncommitted)
**Files changed:** 41 total

**Payment-related files created:**
- `src/components/policies/payments/PaymentsTab.tsx`
- `src/components/policies/payments/PaymentsTabSkeleton.tsx`
- `src/components/policies/payments/PaymentSummaryCard.tsx`
- `src/components/policies/payments/PaymentCard.tsx`
- `src/components/policies/payments/ManualPaymentDialog.tsx`
- `src/components/policies/payments/VerifyPaymentDialog.tsx`
- `src/app/api/payments/[paymentId]/receipt/route.ts`

**Payment-related files modified:**
- `prisma/schema.prisma` (PaymentStatus, PaymentType enums + Payment model fields)
- `src/lib/services/paymentService.ts` (8 new methods)
- `src/server/routers/payment.router.ts` (10 new procedures)
- `src/components/policies/PolicyDetailsContent.tsx` (added Pagos tab)
- `src/app/api/webhooks/stripe/route.ts` (enhanced with metadata + emails)
- `src/app/dashboard/policies/[id]/pricing/page.tsx` (auto-generate links)
- `src/lib/services/emailService.ts` (payment email templates)

### Features Implemented

1. **Schema Updates**
   - `PENDING_VERIFICATION` status for manual payments
   - `TENANT_PORTION`, `LANDLORD_PORTION` payment types
   - `checkoutUrl`, `checkoutUrlExpiry` for Stripe links
   - `receiptS3Key`, `receiptFileName` for manual payment proof
   - `verifiedBy`, `verifiedAt`, `verificationNotes` for verification

2. **Payment Service Methods**
   - `calculatePaymentBreakdown()` - amounts per party
   - `createTypedCheckoutSession()` - Stripe checkout with metadata
   - `createPolicyPaymentSessions()` - generate all payment links
   - `getPaymentSummary()` - full payment status
   - `createManualPayment()` - record manual payment
   - `verifyManualPayment()` - admin approve/reject
   - `updatePaymentReceipt()` - update S3 receipt info
   - `regenerateCheckoutUrl()` - refresh expired links

3. **tRPC Procedures**
   - `list`, `getPaymentDetails`, `getBreakdown`
   - `generatePaymentLinks`, `recordManualPayment`, `verifyPayment`
   - `regeneratePaymentUrl`, `updatePaymentReceipt`, `getById`, `cancelPayment`

4. **UI Components**
   - PaymentsTab with summary card and payment cards
   - ManualPaymentDialog for recording manual payments
   - VerifyPaymentDialog for admin approval
   - Receipt download button
   - Status badges, expiry warnings, admin actions

5. **Integrations**
   - Webhook extracts `paymentType` from Stripe metadata
   - Sends email on payment complete
   - Sends admin notification when all payments done
   - Auto-generates payment links when pricing saved

### Key Decisions

- Payment links generated at pricing configuration time
- Investigation fee deducted from tenant's portion
- Manual payments require admin verification
- Admin/Staff see all payments; actors see own payments only
- Hide payment sections where percentage is 0%

### Edge Cases Handled

- Expired checkout URLs → "Regenerar Link" button
- 0% percentage → payment type hidden
- Investigation fee = tenant amount → tenant owes $0
- Duplicate payments → service throws error
- Currency → rounded to whole MXN pesos

### What Wasn't Completed

- E2E manual testing (code complete, not tested)
- No commits made (changes uncommitted)

### Tips for Future Developers

1. Payment metadata in Stripe includes `policyId`, `paymentType`, `paidBy`
2. Use `PENDING_VERIFICATION` status for manual payments awaiting admin review
3. `tenantAmountAfterFee = Math.max(0, tenantAmount - investigationFee)`
4. Receipt files stored at `payments/{policyNumber}/{paymentId}/`
5. Webhook sends emails - ensure `ADMIN_NOTIFICATION_EMAIL` env var is set

### Build Status

✅ Passes successfully
