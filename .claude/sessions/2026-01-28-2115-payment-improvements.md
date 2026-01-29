# Session: Payment Improvements
**Started:** 2026-01-28 21:15

## Overview
Implementing payment management features for the Hestia application including editing, creating, and displaying payments with proper IVA (16% VAT) handling.

## Goals
- [x] Edit payment amount functionality (ADMIN/STAFF only)
- [x] Add new payment feature with Stripe checkout
- [x] Fix PARTIAL_PAYMENT display in payment list
- [x] Add IVA breakdown display on all PaymentCards
- [x] Change amount input to subtotal (IVA added automatically)
- [x] Show live price breakdown in Add/Edit dialogs
- [ ] Add Stripe tax rate integration (requires STRIPE_TAX_RATE_ID env var)

## Progress

### Completed
1. **Edit Payment Feature**
   - Added `editPaymentAmount` method to paymentService.ts
   - Added `payment.editAmount` TRPC endpoint
   - Created `EditPaymentDialog.tsx` with confirmation step
   - Added edit button to PaymentCard for pending payments

2. **Add New Payment Feature**
   - Added `payment.createNew` TRPC endpoint
   - Created `AddPaymentDialog.tsx` with payer selection
   - Uses PARTIAL_PAYMENT type (no migration needed)
   - "Agregar Pago" button always visible for ADMIN/STAFF

3. **Fixed PARTIAL_PAYMENT Display**
   - Added filter for additional payments (PARTIAL_PAYMENT, INCIDENT_PAYMENT)
   - Renders them in PaymentsTab after standard payments

4. **IVA Breakdown Display**
   - PaymentCard shows Subtotal/IVA(16%)/Total breakdown
   - AddPaymentDialog: user enters subtotal, sees live breakdown
   - EditPaymentDialog: shows current breakdown, input for new subtotal
   - Backend multiplies subtotal × 1.16 before storing

### Files Modified
- `src/lib/services/paymentService.ts` - editPaymentAmount, IVA in Stripe sessions
- `src/server/routers/payment.router.ts` - editAmount, createNew endpoints
- `src/components/policies/payments/PaymentCard.tsx` - IVA breakdown, edit button
- `src/components/policies/payments/PaymentsTab.tsx` - add button, dialogs, additional payments
- `src/components/policies/payments/EditPaymentDialog.tsx` - new file
- `src/components/policies/payments/AddPaymentDialog.tsx` - new file

## Notes
- Max subtotal: $862,069 MXN (so total with IVA stays under $1M)
- Stored amounts include IVA (e.g., $1,160 = $1,000 subtotal + $160 IVA)
- Stripe tax rate integration ready but requires env var STRIPE_TAX_RATE_ID

---

## Audit & Fixes (2026-01-28)

### Audit Findings
Full audit report at `.claude/plans/tranquil-finding-minsky.md`

Key issues found:
- IVA rounding inconsistency (backward vs forward calculation)
- Missing error toasts on mutation failures
- Fragile historical payments filter (truthy check)
- Hardcoded additional payment types filter
- No test coverage (noted, tests deferred)

### Fixes Implemented

1. **Schema: Added subtotal/iva fields**
   - `prisma/schema.prisma`: Added `subtotal Float?` and `iva Float?` to Payment model
   - Requires migration: `bunx prisma migrate dev --name add_payment_subtotal_iva`

2. **Backend: Store subtotal/iva on payment creation**
   - `paymentService.ts`: Updated `createTypedCheckoutSession`, `editPaymentAmount`, `createManualPayment`, `createPaymentRecord`
   - All methods now calculate and store subtotal/iva from total amount

3. **Frontend: Use stored values with fallback**
   - `PaymentCard.tsx`: Uses `payment.subtotal ?? calculated` for display
   - Legacy payments (null subtotal/iva) still work via fallback calculation

4. **PaymentsTab.tsx fixes**
   - Added error toasts to all mutation error handlers
   - Changed `refetch()` to `utils.payment.getPaymentDetails.invalidate()`
   - Fixed historical filter: truthy → explicit `=== null` check
   - Fixed additional payments: inclusion → exclusion filter

### Files Modified
- `prisma/schema.prisma`
- `src/lib/services/paymentService.ts`
- `src/components/policies/payments/PaymentCard.tsx`
- `src/components/policies/payments/PaymentsTab.tsx`

### Migration Required
Run: `bunx prisma migrate dev --name add_payment_subtotal_iva`

---

### Update - 2026-01-28 ~9:45 PM

**Summary**: Completed audit and implemented fixes for IVA storage

**Plan File**: `.claude/plans/tranquil-finding-minsky.md` (full audit report + implementation plan)

**Git Changes**:
- Modified: `prisma/schema.prisma`, `paymentService.ts`, `PaymentCard.tsx`, `PaymentsTab.tsx`
- Added: `prisma/migrations/20260128214415_add_payment_subtotal_iva/`
- Branch: `feat/edit-payment` (last commit: 5f56686)

**Todo Progress**: 4 completed, 0 in progress, 0 pending
- ✓ Add subtotal/iva fields to Payment schema
- ✓ Update paymentService.ts to store subtotal/iva
- ✓ Update PaymentCard.tsx to use stored values
- ✓ Fix PaymentsTab.tsx bugs and UX

**Details**: Audit found IVA rounding issues (backward calculation), missing error toasts, fragile filters. All fixed. Migration created but not yet run on DB.

---

### Update - 2026-01-28 ~10:30 PM

**Summary**: Major refactor - Payment URL architecture change

**Plan File**: `.claude/plans/validated-tickling-thimble.md`

**Git Changes**:
- Modified: `stripe/route.ts`, `paymentService.ts`, `payment.router.ts`, `PaymentCard.tsx`, `PaymentsTab.tsx`
- Added: `src/app/payments/[id]/page.tsx` (new public payment page)
- Branch: `feat/edit-payment` (uncommitted changes)

**Changes Implemented**:
1. **Webhook**: `checkout.session.expired` no longer marks payment FAILED, just logs
2. **Service**: Added `getOrCreateCheckoutSession()`, `getPublicPaymentInfo()`
3. **URLs**: All success/cancel URLs now use `/payments/{paymentId}?status=...`
4. **tRPC**: Added public endpoints `getPublicPayment`, `createCheckoutSession`
5. **New Page**: `/payments/[id]` - public page that auto-redirects to Stripe
6. **PaymentsTab**: Shows cancelled payments at end, removed regenerate logic
7. **PaymentCard**: Removed "Regenerar Link", copy/pay buttons use internal URL

**Architecture Change**:
- Before: Share Stripe checkout URL directly, regenerate when expired
- After: Share internal `/payments/{uuid}`, creates Stripe session on demand

## Next Steps

1. **Test the flow manually**:
   - Create a payment → copy link → open → verify Stripe redirect
   - Let session expire → reopen link → verify new session created
   - Complete payment → verify success page shows

2. **Commit changes** (when ready)

3. **Consider**: Remove `regeneratePaymentUrl` tRPC endpoint (now unused)

---

### Update - 2026-01-28 ~11:15 PM

**Summary**: UI polish - manual payments, IVA centralization, branding

**Git Changes**:
- Modified: `PaymentsTab.tsx`, `PaymentCard.tsx`, `EditPaymentDialog.tsx`, `AddPaymentDialog.tsx`, `paymentService.ts`, `payment.router.ts`
- Added: `src/app/payments/layout.tsx`
- Branch: `feat/edit-payment` (last commit: 686b5e6)

**Changes Implemented**:
1. **PaymentsTab**: Added `onManualPayment` to additional payments (PARTIAL_PAYMENT, etc.)
2. **IVA Centralization**: Replaced hardcoded `0.16`/`1.16` with `TAX_CONFIG.IVA_RATE` across 6 files
3. **Branding**: Created `payments/layout.tsx` with Logo header and footer (matches actor layout)
4. **Stripe Badge**: Added "Powered by Stripe" badge to payment page

**Files using TAX_CONFIG now**:
- `paymentService.ts` (9 uses)
- `payment.router.ts` (3 uses)
- `PaymentCard.tsx`, `EditPaymentDialog.tsx`, `AddPaymentDialog.tsx`

4. **Optional**: Remove old `checkoutUrl` display from PaymentCard expiry warning (no longer needed since we create sessions on demand)

---

## Session End Summary

**Ended:** 2026-01-28 ~11:30 PM
**Duration:** ~4 hours
**Status:** Core functionality completed

### Git Summary

**Branch:** `feat/edit-payment`

**Commits this session:** 5
- `1c72d30` feat: use new iva const
- `ca166ad` feat: clean code and use config for constant iva
- `b331464` feat: layout for public payment page
- `686b5e6` feat: don't fail on session expiration
- `eb25de8` Merge branch 'main' into feat/edit-payment

**Uncommitted files:** 8 (mostly config/docs, not code)

### Key Files Modified

**Backend:**
- `src/lib/services/paymentService.ts` - editPaymentAmount, getOrCreateCheckoutSession, getPublicPaymentInfo, IVA storage
- `src/server/routers/payment.router.ts` - editAmount, createNew, getPublicPayment, createCheckoutSession endpoints
- `src/app/api/webhooks/stripe/route.ts` - expired session handling change
- `prisma/schema.prisma` - subtotal/iva fields on Payment model

**Frontend:**
- `src/components/policies/payments/PaymentCard.tsx` - IVA breakdown, edit button, internal URLs
- `src/components/policies/payments/PaymentsTab.tsx` - add button, dialogs, filters fixed
- `src/components/policies/payments/EditPaymentDialog.tsx` - NEW
- `src/components/policies/payments/AddPaymentDialog.tsx` - NEW
- `src/app/payments/[id]/page.tsx` - NEW public payment page
- `src/app/payments/layout.tsx` - NEW branded layout

### Features Implemented

1. **Edit Payment Amount** - ADMIN/STAFF can edit pending payment amounts
2. **Add New Payment** - ADMIN/STAFF can create additional payments (PARTIAL_PAYMENT type)
3. **IVA Breakdown Display** - All PaymentCards show subtotal/IVA(16%)/total
4. **Live Price Preview** - Add/Edit dialogs show IVA calculation in real-time
5. **Public Payment URL** - `/payments/{uuid}` creates Stripe session on demand
6. **Branded Payment Page** - Logo header/footer, "Powered by Stripe" badge
7. **IVA Centralization** - `TAX_CONFIG.IVA_RATE` constant used throughout

### Architecture Changes

**Payment URL Flow (Breaking Change):**
- Before: Share Stripe checkout URL → regenerate when expired
- After: Share `/payments/{uuid}` → creates fresh Stripe session on demand
- Benefit: Links never expire, cleaner UX

### Problems Encountered & Solutions

1. **IVA Rounding** - Backward calculation (total/1.16) caused rounding errors → Added `subtotal`/`iva` fields to store exact values
2. **Expired Sessions** - Marking payment FAILED on session expiry was wrong → Now just logs, creates new session on next visit
3. **Fragile Filters** - Truthy checks failed for `month: 0` → Changed to explicit `=== null` checks

### Migration Required

```bash
bunx prisma migrate dev --name add_payment_subtotal_iva
```

### What Wasn't Completed

- [ ] Stripe tax rate integration (requires `STRIPE_TAX_RATE_ID` env var)
- [ ] Remove unused `regeneratePaymentUrl` tRPC endpoint
- [ ] Tests for payment features

### Tips for Future Developers

1. **IVA Calculation**: Always use `TAX_CONFIG.IVA_RATE` from config, never hardcode
2. **Legacy Payments**: Old payments have `subtotal: null` - use fallback calculation
3. **Payment Links**: Share `/payments/{uuid}` not Stripe URLs
4. **Expired Sessions**: `checkout.session.expired` webhook does NOT mark payment failed
5. **Manual Payment**: Uses `MANUAL` stripe session type, no checkout URL needed

---

### Update - 2026-01-29 ~12:15 PM

**Summary**: Fixed idempotency keys in paymentService.ts

**Git Changes**:
- Modified: `src/lib/services/paymentService.ts`
- Branch: `feat/edit-payment` (last commit: 6e5e206)

**Changes Implemented**:
Fixed 5 idempotency keys that used `Date.now()` (defeating retry safety):

| Method | Before | After |
|--------|--------|-------|
| `createCheckoutSession` | `checkout-${policyId}-${amount}-${Date.now()}` | `checkout-${policyId}-${amount}` |
| `createTypedCheckoutSession` | `typed-${payment.id}-${Date.now()}` | `typed-${payment.id}` |
| `regenerateCheckoutUrl` | `regenerate-${paymentId}-${Date.now()}` | `regenerate-${paymentId}-${payment.stripeSessionId}` |
| `getOrCreateCheckoutSession` | `session-${paymentId}-${Date.now()}` | `session-${paymentId}-${payment.stripeSessionId ?? 'new'}` |
| `editPaymentAmount` | `edit-${paymentId}-${newAmount}-${Date.now()}` | `edit-${paymentId}-${newAmount}` |

**Rationale**: Idempotency keys must be stable across retries. Network retry with `Date.now()` creates new key each time → defeats Stripe's idempotency protection.

**Build**: ✅ Passed

---

## Final Session End Summary

**Started:** 2026-01-28 21:15
**Ended:** 2026-01-29 ~12:30 PM
**Duration:** ~15 hours (across 2 days)
**Branch:** `feat/edit-payment`

### Git Summary

**Commits (last 10 relevant):**
- `a9523bc` feat: correct idempotency key
- `6e5e206` feat: mobile improvements
- `41aa65e` feat: cancell page with better message
- `f8b4aa7` feat: payment router with config
- `0ed9744` feat: money totals
- `9ef5b01` feat: using shared utils for pricing calc
- `6639c55` config: payments
- `4c19457` feat: show pending payments indicator
- `12c41da` feat: imdepotency check
- `1c72d30` feat: use new iva const

**Files Changed (last 5 commits):**
- Modified: `src/app/payments/[id]/page.tsx`
- Modified: `src/components/policies/payments/PaymentCard.tsx`
- Modified: `src/lib/services/paymentService.ts`
- Added: `src/lib/utils/money.ts`
- Modified: `src/server/routers/payment.router.ts`

**Uncommitted:**
- `.claude/sessions/2026-01-28-2115-payment-improvements.md` (this file)

### All Features Implemented

1. **Edit Payment Amount** - ADMIN/STAFF can edit pending payment amounts
2. **Add New Payment** - ADMIN/STAFF can create additional PARTIAL_PAYMENT
3. **IVA Breakdown Display** - All PaymentCards show subtotal/IVA(16%)/total
4. **Live Price Preview** - Add/Edit dialogs show IVA calculation in real-time
5. **Public Payment URL** - `/payments/{uuid}` creates Stripe session on demand
6. **Branded Payment Page** - Logo header/footer, "Powered by Stripe" badge
7. **IVA Centralization** - `TAX_CONFIG.IVA_RATE` constant used throughout
8. **Money Utils** - Shared `calculateSubtotalFromTotal()` utility
9. **Idempotency Keys Fixed** - Removed `Date.now()` from all 5 idempotency keys

### Architecture Changes

**Payment URL Flow:**
- Before: Share Stripe checkout URL → regenerate when expired
- After: Share `/payments/{uuid}` → creates fresh Stripe session on demand
- Benefit: Links never expire, cleaner UX

**IVA Storage:**
- Before: Calculate IVA on display (rounding errors)
- After: Store `subtotal` and `iva` fields in DB

### Problems Encountered & Solutions

1. **IVA Rounding** → Added `subtotal`/`iva` DB fields
2. **Expired Sessions** → Don't mark FAILED, create new session on demand
3. **Fragile Filters** → Changed truthy to explicit `=== null` checks
4. **Idempotency Keys** → Removed `Date.now()` to enable proper retry safety

### What Wasn't Completed

- [ ] Stripe tax rate integration (requires `STRIPE_TAX_RATE_ID` env var)
- [ ] Remove unused `regeneratePaymentUrl` tRPC endpoint
- [ ] Tests for payment features

### Tips for Future Developers

1. **IVA**: Use `TAX_CONFIG.IVA_RATE`, never hardcode `0.16`
2. **Legacy Payments**: Old payments have `subtotal: null` - use fallback
3. **Payment Links**: Share `/payments/{uuid}` not Stripe URLs
4. **Idempotency**: Keys must be stable across retries (no timestamps)
5. **Money Utils**: Use `calculateSubtotalFromTotal()` from `src/lib/utils/money.ts`
