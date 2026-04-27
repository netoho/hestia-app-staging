/**
 * Payment factory.
 *
 * Requires a policyId. Defaults match Prisma column defaults — every test
 * builds a PENDING tenant-portion payment unless a trait or override says
 * otherwise.
 */
import { Factory } from 'fishery';
import {
  PaymentStatus,
  PaymentType,
  PayerType,
  PaymentMethod,
} from '@/prisma/generated/prisma-client/enums';
import type { Payment } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type PaymentTransient = { policyId: string };

export const paymentFactory = Factory.define<Payment, PaymentTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (p) => prisma.payment.create({ data: p }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      amount: 5000,
      subtotal: 4310.34,
      iva: 689.66,
      currency: 'MXN',
      status: PaymentStatus.PENDING,
      method: null,
      type: PaymentType.TENANT_PORTION,
      paidBy: PayerType.TENANT,
      stripeIntentId: null,
      stripeSessionId: null,
      stripeCustomerId: null,
      checkoutUrl: null,
      checkoutUrlExpiry: null,
      speiPaymentIntentId: null,
      speiClabe: null,
      speiBankName: null,
      speiReference: null,
      speiFundedAmount: null,
      speiHostedUrl: null,
      overpaymentAmount: null,
      isManual: false,
      reference: null,
      receiptUrl: null,
      receiptS3Key: null,
      receiptFileName: null,
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: null,
      createdById: null,
      paidByTenantName: null,
      description: `Test payment ${sequence}`,
      metadata: null,
      errorMessage: null,
      paidAt: null,
      refundedAt: null,
      refundAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Payment;
  },
);

// Traits
export const pendingPayment = paymentFactory.params({ status: PaymentStatus.PENDING });
export const completedPayment = paymentFactory.params({
  status: PaymentStatus.COMPLETED,
  method: PaymentMethod.STRIPE,
  paidAt: new Date(),
});
export const cancelledPayment = paymentFactory.params({ status: PaymentStatus.CANCELLED });
export const failedPayment = paymentFactory.params({ status: PaymentStatus.FAILED });
export const manualPayment = paymentFactory.params({
  isManual: true,
  status: PaymentStatus.PENDING_VERIFICATION,
  method: PaymentMethod.CASH,
  reference: 'manual-ref-123',
});
export const speiPayment = paymentFactory.params({
  status: PaymentStatus.PENDING,
  speiPaymentIntentId: 'pi_test_spei',
  speiClabe: '646180111811111111',
  speiBankName: 'Citibanamex',
  speiReference: 'REF12345',
});
