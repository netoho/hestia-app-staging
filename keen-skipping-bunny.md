# Payment Service Implementation Plan

## Overview

Implement a comprehensive payment system with Stripe integration, manual payments, and a new "Pagos" tab in policy details.

**Key Decisions:**
- Payment links generated at pricing configuration time
- Investigation fee deducted from tenant's portion (fixed at generation)
- Manual payments require admin verification
- Admin/Staff see all payments; actors see only their own
- Hide payment sections where percentage is 0%

---

## Phase 1: Schema Updates

### 1.1 Update PaymentStatus Enum
**File:** `prisma/schema.prisma:1175`

Add `PENDING_VERIFICATION` status for manual payments awaiting admin review.

### 1.2 Add PaymentType Values
**File:** `prisma/schema.prisma:1192`

Add explicit types:
- `TENANT_PORTION` - Tenant's share of policy premium
- `LANDLORD_PORTION` - Landlord's share of policy premium

**Note:** `INVESTIGATION_FEE` already exists and remains separate. The investigation fee is non-refundable even if investigation is rejected - it's a distinct payment use case.

### 1.3 Update Payment Model
**File:** `prisma/schema.prisma:939`

Add fields:
```
checkoutUrl        String?      // Stripe checkout URL
checkoutUrlExpiry  DateTime?    // URL expiration (24h from creation)
receiptS3Key       String?      // S3 key for manual payment proof
receiptFileName    String?      // Original filename
verifiedBy         String?      // Admin who verified manual payment
verifiedAt         DateTime?
verificationNotes  String?      @db.Text
```

### 1.4 Run Migration

**USER ACTION:** After schema changes, you will run the migration manually.
I will indicate when it's time with: `[MIGRATION NEEDED]`

---

## Phase 2: Payment Service Enhancement

### 2.1 Fix Import Error
**File:** `src/lib/services/paymentService.ts:4`

Fix `PaymentMethodType` import - should be from generated Prisma types.

### 2.2 New Service Methods

**File:** `src/lib/services/paymentService.ts`

```typescript
// Calculate payment breakdown for a policy
calculatePaymentBreakdown(policyId: string): Promise<PaymentBreakdown>

// Create all applicable checkout sessions
createPolicyPaymentSessions(policyId: string): Promise<PaymentSessionsResult>

// Get payment summary with role-based filtering
getPaymentSummary(policyId: string, userId: string, isAdmin: boolean): Promise<PaymentSummary>

// Create manual payment record
createManualPayment(params: ManualPaymentParams): Promise<Payment>

// Verify manual payment (admin only)
verifyManualPayment(paymentId: string, approved: boolean, verifierId: string, notes?: string): Promise<Payment>

// Upload payment receipt
uploadPaymentReceipt(paymentId: string, file: File): Promise<{ s3Key: string }>

// Regenerate expired checkout URL
regenerateCheckoutUrl(paymentId: string): Promise<{ checkoutUrl: string }>
```

### 2.3 Payment Breakdown Logic

When generating payment links:
1. Calculate `totalWithIva` from pricing
2. If `investigationFee` included: create investigation payment first
3. Calculate `tenantAmount = totalWithIva * tenantPercentage% - investigationFee`
4. Calculate `landlordAmount = totalWithIva * landlordPercentage%`
5. Only create payments where amount > 0

---

## Phase 3: tRPC Procedures

**File:** `src/server/routers/payment.router.ts`

### 3.1 Existing Procedure Enhancement

`list` - Add role-based filtering (actors see only their type)

### 3.2 New Procedures

```typescript
// Generate Stripe checkout sessions for a policy
generatePaymentLinks: adminProcedure
  .input({ policyId: string, regenerate?: boolean })
  .mutation()

// Get payment details with breakdown
getPaymentDetails: protectedProcedure
  .input({ policyId: string })
  .query()

// Record manual payment (creates PENDING_VERIFICATION record)
recordManualPayment: protectedProcedure
  .input({
    policyId: string,
    type: enum,
    amount: number,
    reference?: string,
    paidBy: PayerType
  })
  .mutation()

// Verify manual payment (admin only)
verifyPayment: adminProcedure
  .input({ paymentId: string, approved: boolean, notes?: string })
  .mutation()

// Get presigned URL for receipt upload
getReceiptUploadUrl: protectedProcedure
  .input({ paymentId: string, fileName: string, mimeType: string })
  .mutation()

// Confirm receipt upload complete
confirmReceiptUpload: protectedProcedure
  .input({ paymentId: string, s3Key: string, fileName: string })
  .mutation()
```

---

## Phase 4: REST Endpoint for Receipt Upload

**File:** `src/app/api/payments/[paymentId]/receipt/route.ts`

Create POST endpoint for uploading payment proof:
- Accepts FormData with file
- Validates user can upload for this payment
- Uploads to S3: `policies/{policyNumber}/payments/{paymentId}/`
- Updates payment record with receipt info

Reuse patterns from `src/app/api/actors/[type]/[identifier]/documents/route.ts`

---

## Phase 5: UI Components

### 5.1 Create Payment Components

**Directory:** `src/components/policies/details/payments/`

```
payments/
├── PaymentsTab.tsx           # Main tab container
├── PaymentSummaryCard.tsx    # Total breakdown overview
├── PaymentCard.tsx           # Individual payment card
├── PaymentStatusBadge.tsx    # Status indicator
├── ManualPaymentDialog.tsx   # Modal for recording manual payment
├── ReceiptUploader.tsx       # Upload proof component
└── VerifyPaymentDialog.tsx   # Admin verification modal
```

### 5.2 PaymentsTab Structure

```
<PaymentsTab>
  <PaymentSummaryCard>        <!-- Overview: total, paid, remaining -->
    - Breakdown table
    - Overall status badge
  </PaymentSummaryCard>

  {investigationFee && (
    <PaymentCard type="investigation" />
  )}

  {tenantPercentage > 0 && (
    <PaymentCard type="tenant" />
  )}

  {landlordPercentage > 0 && (
    <PaymentCard type="landlord" />
  )}
</PaymentsTab>
```

### 5.3 PaymentCard Features

- Status badge (pending, processing, completed, etc.)
- Amount display with currency
- If pending + has checkoutUrl: "Pagar con Stripe" button
- If pending + admin: "Registrar Pago Manual" button
- If PENDING_VERIFICATION + admin: "Verificar" button
- Receipt download button if available

### 5.4 Add Tab to PolicyDetailsContent

**File:** `src/components/policies/PolicyDetailsContent.tsx`

Add to TabsList (~line 519):
```tsx
<TabsTrigger value="payments">Pagos</TabsTrigger>
```

Add TabsContent:
```tsx
<TabsContent value="payments" className="space-y-6">
  <PaymentsTab
    policyId={policyId}
    policy={policy}
    isStaffOrAdmin={isStaffOrAdmin}
  />
</TabsContent>
```

---

## Phase 6: Webhook Enhancement

**File:** `src/app/api/webhooks/stripe/route.ts`

Update handler to:
1. Extract `paymentType` from session metadata
2. Update correct payment record
3. Log activity with payment type details
4. Check if all payments complete for policy

---

## Phase 7: Integration with Pricing

### 7.1 Trigger Payment Generation

**Option A (Recommended):** Add to pricing.updatePolicyPricing mutation
- After saving pricing, call `generatePaymentLinks`

**Option B:** Manual button in Payments tab
- Admin clicks "Generar Links de Pago"

### 7.2 Update Pricing Edit Page

**File:** `src/app/dashboard/policies/[id]/pricing/page.tsx`

After successful save, trigger payment link generation.

---

## Implementation Order

| Session | Tasks | Status |
|---------|-------|--------|
| 1 | Schema updates (you run migration) | ✅ DONE |
| 2 | PaymentService methods (calculateBreakdown, createSessions) | ✅ DONE |
| 3 | tRPC procedures (generateLinks, getDetails) | ✅ DONE |
| 4 | UI: PaymentsTab, PaymentSummaryCard, PaymentCard | 🔄 NEXT |
| 5 | Manual payment flow (recordManualPayment, verification) | ⏳ Pending |
| 6 | Receipt upload (REST endpoint, ReceiptUploader) | ⏳ Pending |
| 7 | Webhook updates, integration testing | ⏳ Pending |
| 8 | Polish: error states, loading, edge cases | ⏳ Pending |

**Investigation Fee Logic:**
- Always a separate payment from tenant/landlord portions
- Non-refundable even if investigation is rejected
- Can be deducted from tenant's premium portion at generation time

---

## Critical Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Schema updates |
| `src/lib/services/paymentService.ts` | New methods, fix import |
| `src/server/routers/payment.router.ts` | New procedures |
| `src/components/policies/PolicyDetailsContent.tsx` | Add tab |
| `src/components/policies/details/payments/*.tsx` | New components |
| `src/app/api/payments/[paymentId]/receipt/route.ts` | New endpoint |
| `src/app/api/webhooks/stripe/route.ts` | Update handler |

---

## Edge Cases

1. **Expired checkout URLs** - Show "Regenerar Link" button
2. **0% percentage** - Hide that payment type entirely
3. **Investigation fee = tenant amount** - Tenant owes $0 remaining
4. **Manual + Stripe conflict** - Allow both, first to complete wins
5. **Duplicate payments** - Validate no duplicate type+status=COMPLETED
6. **Currency rounding** - Round to whole pesos (MXN has no centavos in practice)

---

## Verification Steps

1. **Schema**: `bunx prisma migrate dev` succeeds
2. **Build**: `bun run build` passes
3. **Manual test**: Create policy → Configure pricing → See payment links
4. **Stripe test**: Complete checkout → Webhook updates payment
5. **Manual payment**: Upload receipt → Admin verifies → Payment completed
6. **Access control**: Tenant sees only their payment, admin sees all

---

## Unresolved Questions

None - all clarified with user.
