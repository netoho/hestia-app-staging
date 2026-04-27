/**
 * Output schemas for payment.* tRPC procedures.
 *
 * The payment router has the largest external-service surface (Stripe
 * checkout, SPEI bank transfers, manual verification, partial-payment
 * tracking) so the contracts here matter most for catching regressions.
 *
 * Strict at the field level; relations beyond the Payment row itself are
 * tolerated as `passthrough()` until those entities earn their own coverage.
 */

import { z } from 'zod';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PayerType,
} from '@/prisma/generated/prisma-client/enums';

// ---------------------------------------------------------------------------
// Shared Payment row shape (matches the Prisma `Payment` model).
// ---------------------------------------------------------------------------
export const PaymentShape = z.object({
  id: z.string(),
  policyId: z.string(),
  amount: z.number(),
  subtotal: z.number().nullable(),
  iva: z.number().nullable(),
  currency: z.string(),
  status: z.nativeEnum(PaymentStatus),
  method: z.nativeEnum(PaymentMethod).nullable(),
  type: z.nativeEnum(PaymentType),
  paidBy: z.nativeEnum(PayerType),
  stripeIntentId: z.string().nullable(),
  stripeSessionId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  checkoutUrl: z.string().nullable(),
  checkoutUrlExpiry: z.date().nullable(),
  speiPaymentIntentId: z.string().nullable(),
  speiClabe: z.string().nullable(),
  speiBankName: z.string().nullable(),
  speiReference: z.string().nullable(),
  speiFundedAmount: z.number().nullable(),
  speiHostedUrl: z.string().nullable(),
  overpaymentAmount: z.number().nullable(),
  isManual: z.boolean(),
  reference: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  receiptS3Key: z.string().nullable(),
  receiptFileName: z.string().nullable(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  verificationNotes: z.string().nullable(),
  createdById: z.string().nullable(),
  paidByTenantName: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.unknown().nullable(),
  errorMessage: z.string().nullable(),
  paidAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
  refundAmount: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PaymentTransferInfoShape = z.object({
  id: z.string(),
  amount: z.number(),
  cumulativeAmount: z.number(),
  receivedAt: z.date(),
});

// ===========================================================================
// payment.list — Payment[]
// ===========================================================================
export const PaymentListOutput = z.array(PaymentShape);
export type PaymentListOutput = z.infer<typeof PaymentListOutput>;

// ===========================================================================
// payment.getPaymentDetails — full PaymentSummary
// ===========================================================================
const PaymentBreakdownShape = z.object({
  investigationFee: z.number(),
  subtotal: z.number(),
  iva: z.number(),
  totalWithIva: z.number(),
  tenantPercentage: z.number(),
  landlordPercentage: z.number(),
  tenantAmount: z.number(),
  landlordAmount: z.number(),
  tenantAmountAfterFee: z.number(),
  includesInvestigationFee: z.boolean(),
});

const PaymentWithStatusShape = PaymentShape.extend({
  isExpired: z.boolean().optional(),
  transfers: z.array(PaymentTransferInfoShape).optional(),
});

export const PaymentSummaryOutput = z.object({
  policyId: z.string(),
  breakdown: PaymentBreakdownShape,
  payments: z.array(PaymentWithStatusShape),
  overallStatus: z.enum(['pending', 'partial', 'completed']),
  totalPaid: z.number(),
  totalRemaining: z.number(),
});
export type PaymentSummaryOutput = z.infer<typeof PaymentSummaryOutput>;

// ===========================================================================
// payment.getBreakdown — PaymentBreakdown
// ===========================================================================
export const PaymentBreakdownOutput = PaymentBreakdownShape;
export type PaymentBreakdownOutput = z.infer<typeof PaymentBreakdownOutput>;

// ===========================================================================
// payment.generatePaymentLinks — PolicyPaymentSessionsResult
// ===========================================================================
const PaymentSessionResultShape = z.object({
  paymentId: z.string(),
  checkoutUrl: z.string(),
  amount: z.number(),
  type: z.nativeEnum(PaymentType),
  expiresAt: z.date(),
});

export const PolicyPaymentSessionsOutput = z.object({
  investigationFee: PaymentSessionResultShape.nullable(),
  tenantPayment: PaymentSessionResultShape.nullable(),
  landlordPayment: PaymentSessionResultShape.nullable(),
});
export type PolicyPaymentSessionsOutput = z.infer<typeof PolicyPaymentSessionsOutput>;

// ===========================================================================
// payment.recordManualPayment / verifyPayment / updatePaymentReceipt /
// cancelPayment — all return a Payment row.
// ===========================================================================
export const PaymentRecordOutput = PaymentShape;
export type PaymentRecordOutput = z.infer<typeof PaymentRecordOutput>;

// ===========================================================================
// payment.getById — Payment without policy include
// ===========================================================================
export const PaymentGetByIdOutput = PaymentShape;
export type PaymentGetByIdOutput = z.infer<typeof PaymentGetByIdOutput>;

// ===========================================================================
// payment.editAmount / payment.createNew — PaymentSessionResult
// ===========================================================================
export const PaymentSessionOutput = PaymentSessionResultShape;
export type PaymentSessionOutput = z.infer<typeof PaymentSessionOutput>;

// ===========================================================================
// payment.getStripeReceipt / payment.getStripePublicReceipt — { receiptUrl }
// ===========================================================================
export const PaymentStripeReceiptOutput = z.object({
  receiptUrl: z.string().nullable(),
});
export type PaymentStripeReceiptOutput = z.infer<typeof PaymentStripeReceiptOutput>;

// ===========================================================================
// payment.getPublicPayment — minimal public-display info
// ===========================================================================
export const PaymentPublicInfoOutput = z.object({
  id: z.string(),
  status: z.nativeEnum(PaymentStatus),
  type: z.string().nullable(),
  amount: z.number(),
  subtotal: z.number().nullable(),
  iva: z.number().nullable(),
  policyNumber: z.string(),
  isManual: z.boolean(),
  hasSpei: z.boolean(),
  speiClabe: z.string().nullable(),
  speiBankName: z.string().nullable(),
  speiReference: z.string().nullable(),
  speiFundedAmount: z.number().nullable(),
  speiHostedUrl: z.string().nullable(),
  overpaymentAmount: z.number().nullable(),
  transfers: z.array(PaymentTransferInfoShape),
});
export type PaymentPublicInfoOutput = z.infer<typeof PaymentPublicInfoOutput>;

// ===========================================================================
// payment.createCheckoutSession — { checkoutUrl, expiresAt } | { checkoutUrl: null, reason }
// ===========================================================================
export const PaymentCheckoutSessionOutput = z.union([
  z.object({
    checkoutUrl: z.string(),
    expiresAt: z.date(),
  }),
  z.object({
    checkoutUrl: z.null(),
    reason: z.string(),
  }),
]);
export type PaymentCheckoutSessionOutput = z.infer<typeof PaymentCheckoutSessionOutput>;

// ===========================================================================
// payment.createSpeiSession — bank transfer instructions
// ===========================================================================
export const PaymentSpeiSessionOutput = z.object({
  clabe: z.string(),
  bankName: z.string(),
  reference: z.string(),
  amount: z.number(),
  hostedUrl: z.string().nullable(),
});
export type PaymentSpeiSessionOutput = z.infer<typeof PaymentSpeiSessionOutput>;

// ===========================================================================
// payment.getSpeiDetails — full SPEI status payload (or null)
// ===========================================================================
export const PaymentSpeiDetailsOutput = z
  .object({
    clabe: z.string(),
    bankName: z.string(),
    reference: z.string(),
    amount: z.number(),
    fundedAmount: z.number(),
    hostedUrl: z.string().nullable(),
    status: z.nativeEnum(PaymentStatus),
    overpaymentAmount: z.number().nullable(),
    transfers: z.array(PaymentTransferInfoShape),
  })
  .nullable();
export type PaymentSpeiDetailsOutput = z.infer<typeof PaymentSpeiDetailsOutput>;
