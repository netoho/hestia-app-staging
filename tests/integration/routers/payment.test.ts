/**
 * Integration tests for the `payment` tRPC router.
 *
 * Covers all 17 procedures:
 *   - protectedProcedure (broker-scoped):
 *     list, getPaymentDetails, getBreakdown, getById, getStripeReceipt
 *   - adminProcedure:
 *     generatePaymentLinks, recordManualPayment, verifyPayment,
 *     updatePaymentReceipt, cancelPayment, editAmount, createNew
 *   - publicProcedure:
 *     getStripePublicReceipt, getPublicPayment, createCheckoutSession,
 *     createSpeiSession, getSpeiDetails
 *
 * Stripe is fully mocked at preload (see preload.ts FakeStripe). Tests that
 * need to assert call args use `spyOn`.
 */

import { describe, test, expect } from 'bun:test';
import {
  PaymentStatus,
  PaymentType,
  PayerType,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import {
  createAdminCaller,
  createBrokerCaller,
  createPublicCaller,
  createStaffCaller,
} from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import {
  paymentFactory,
  pendingPayment,
  completedPayment,
  cancelledPayment,
  manualPayment,
  speiPayment,
} from '../factories';

// ===========================================================================
// payment.list — protectedProcedure with internal BROKER ownership check
// ===========================================================================
describe('payment.list', () => {
  test('returns payments ordered by createdAt desc for ADMIN', async () => {
    const { policy } = await createPolicyWithActors();
    await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await completedPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.payment.list({ policyId: policy.id });

    expect(result).toHaveLength(2);
    expect(result[0]!.policyId).toBe(policy.id);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.payment.list({ policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('throws FORBIDDEN when BROKER reads payments on someone else’s policy', async () => {
    const { policy } = await createPolicyWithActors();
    await pendingPayment.create({}, { transient: { policyId: policy.id } });
    const { caller: otherBroker } = await createBrokerCaller();
    await expect(otherBroker.payment.list({ policyId: policy.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked when not owner', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.list({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// payment.getPaymentDetails — full PaymentSummary
// ===========================================================================
describe('payment.getPaymentDetails', () => {
  test('returns the payment summary for ADMIN', async () => {
    const { policy } = await createPolicyWithActors();
    await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.payment.getPaymentDetails({ policyId: policy.id });

    expect(result.policyId).toBe(policy.id);
    expect(result.breakdown).toBeDefined();
    expect(typeof result.breakdown.subtotal).toBe('number');
    expect(['pending', 'partial', 'completed']).toContain(result.overallStatus);
    expect(Array.isArray(result.payments)).toBe(true);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.getPaymentDetails({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked when not owner', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.getPaymentDetails({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// payment.getBreakdown — PaymentBreakdown
// ===========================================================================
describe('payment.getBreakdown', () => {
  test('returns the breakdown for ADMIN', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();
    const result = await caller.payment.getBreakdown({ policyId: policy.id });

    expect(typeof result.subtotal).toBe('number');
    expect(typeof result.iva).toBe('number');
    expect(typeof result.totalWithIva).toBe('number');
    expect(typeof result.tenantPercentage).toBe('number');
    expect(typeof result.landlordPercentage).toBe('number');
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.getBreakdown({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked when not owner', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.getBreakdown({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// payment.getById — protectedProcedure with BROKER ownership check
// ===========================================================================
describe('payment.getById', () => {
  test('returns the payment without the policy include', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.payment.getById({ paymentId: payment.id });

    expect(result.id).toBe(payment.id);
    expect(result.policyId).toBe(policy.id);
    expect(result.amount).toBe(payment.amount);
    expect((result as Record<string, unknown>).policy).toBeUndefined();
  });

  test('throws NOT_FOUND when payment does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.getById({ paymentId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws FORBIDDEN when BROKER reads someone else’s payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    const { caller: otherBroker } = await createBrokerCaller();
    await expect(
      otherBroker.payment.getById({ paymentId: payment.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked when not owner', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.getById({ paymentId: payment.id }),
    });
  });
});

// ===========================================================================
// payment.recordManualPayment — adminProcedure
// ===========================================================================
describe('payment.recordManualPayment', () => {
  test('creates a manual payment with PENDING_VERIFICATION status', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller, user } = await createAdminCaller();

    const result = await caller.payment.recordManualPayment({
      policyId: policy.id,
      type: PaymentType.PARTIAL_PAYMENT,
      amount: 1000,
      paidBy: PayerType.TENANT,
      reference: 'manual-ref-001',
      description: 'Cash payment',
    });

    expect(result.policyId).toBe(policy.id);
    expect(result.amount).toBe(1000);
    expect(result.isManual).toBe(true);
    expect(result.status).toBe(PaymentStatus.PENDING_VERIFICATION);
    expect(result.createdById).toBe(user.id);
    expect(result.reference).toBe('manual-ref-001');
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.payment.recordManualPayment({
          policyId: policy.id,
          type: PaymentType.PARTIAL_PAYMENT,
          amount: 500,
          paidBy: PayerType.TENANT,
        }),
    });
  });
});

// ===========================================================================
// payment.verifyPayment — adminProcedure
// ===========================================================================
describe('payment.verifyPayment', () => {
  test('approves a PENDING_VERIFICATION manual payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await manualPayment.create({}, { transient: { policyId: policy.id } });

    const { caller, user } = await createAdminCaller();
    const result = await caller.payment.verifyPayment({
      paymentId: payment.id,
      approved: true,
      notes: 'Verified bank deposit',
    });

    expect(result.id).toBe(payment.id);
    expect(result.status).toBe(PaymentStatus.COMPLETED);
    expect(result.verifiedBy).toBe(user.id);
    expect(result.verificationNotes).toBe('Verified bank deposit');
  });

  test('throws BAD_REQUEST when payment is not pending verification', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.verifyPayment({ paymentId: payment.id, approved: true }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await manualPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.verifyPayment({ paymentId: payment.id, approved: true }),
    });
  });
});

// ===========================================================================
// payment.updatePaymentReceipt — adminProcedure
// ===========================================================================
describe('payment.updatePaymentReceipt', () => {
  test('updates receiptS3Key and receiptFileName on a payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.payment.updatePaymentReceipt({
      paymentId: payment.id,
      receiptS3Key: 'receipts/test-key.pdf',
      receiptFileName: 'test-receipt.pdf',
    });

    expect(result.id).toBe(payment.id);
    expect(result.receiptS3Key).toBe('receipts/test-key.pdf');
    expect(result.receiptFileName).toBe('test-receipt.pdf');
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.payment.updatePaymentReceipt({
          paymentId: payment.id,
          receiptS3Key: 's3-key',
          receiptFileName: 'name.pdf',
        }),
    });
  });
});

// ===========================================================================
// payment.cancelPayment — adminProcedure
// ===========================================================================
describe('payment.cancelPayment', () => {
  test('cancels a PENDING payment and logs activity', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.payment.cancelPayment({
      paymentId: payment.id,
      reason: 'Test cancellation',
    });

    expect(result.id).toBe(payment.id);
    expect(result.status).toBe(PaymentStatus.CANCELLED);
    expect(result.errorMessage).toBe('Test cancellation');

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'payment_cancelled' },
    });
    expect(activity).not.toBeNull();
  });

  test('throws BAD_REQUEST when cancelling an already-completed payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.cancelPayment({ paymentId: payment.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws NOT_FOUND when payment does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.payment.cancelPayment({ paymentId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.cancelPayment({ paymentId: payment.id }),
    });
  });
});

// ===========================================================================
// payment.generatePaymentLinks / payment.editAmount / payment.createNew —
// adminProcedure, exercises Stripe checkout creation. Auth gate only here;
// happy paths require richer Stripe-session fixtures.
// ===========================================================================
describe('payment.generatePaymentLinks', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.generatePaymentLinks({ policyId: policy.id }),
    });
  });
});

describe('payment.editAmount', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.payment.editAmount({ paymentId: payment.id, newAmount: 2000 }),
    });
  });
});

describe('payment.createNew', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.payment.createNew({
          policyId: policy.id,
          amount: 1000,
          paidBy: PayerType.TENANT,
        }),
    });
  });
});

// ===========================================================================
// payment.getStripeReceipt — protectedProcedure
// ===========================================================================
describe('payment.getStripeReceipt', () => {
  test('returns the receipt URL from the mocked Stripe paymentIntent', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { stripeIntentId: 'pi_test_receipt_url' },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.payment.getStripeReceipt({ paymentId: payment.id });
    expect(result.receiptUrl).toBe('https://stripe.test/receipts/ch_test_fake');
  });

  test('returns null receiptUrl when payment is not COMPLETED', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    const { caller } = await createAdminCaller();
    const result = await caller.payment.getStripeReceipt({ paymentId: payment.id });
    expect(result.receiptUrl).toBeNull();
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.payment.getStripeReceipt({ paymentId: payment.id }),
    });
  });
});

// ===========================================================================
// PUBLIC procedures (no auth needed)
// ===========================================================================
describe('payment.getStripePublicReceipt', () => {
  test('returns the receipt URL for a completed Stripe payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { stripeIntentId: 'pi_public_receipt' },
      { transient: { policyId: policy.id } },
    );

    const { caller } = createPublicCaller();
    const result = await caller.payment.getStripePublicReceipt({ paymentId: payment.id });
    expect(result.receiptUrl).toBe('https://stripe.test/receipts/ch_test_fake');
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.payment.getStripePublicReceipt({ paymentId: payment.id }),
    });
  });
});

describe('payment.getPublicPayment', () => {
  test('returns the public payment info for a pending payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.getPublicPayment({ paymentId: payment.id });

    expect(result.id).toBe(payment.id);
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.policyNumber).toBe(policy.policyNumber);
    expect(result.hasSpei).toBe(false);
    expect(Array.isArray(result.transfers)).toBe(true);
  });

  test('throws NOT_FOUND when payment does not exist', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.payment.getPublicPayment({ paymentId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.payment.getPublicPayment({ paymentId: payment.id }),
    });
  });
});

describe('payment.createCheckoutSession', () => {
  test('returns checkoutUrl + expiresAt for a PENDING non-manual payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.createCheckoutSession({ paymentId: payment.id });

    expect((result as { checkoutUrl: string }).checkoutUrl).toBeTruthy();
  });

  test('returns { checkoutUrl: null, reason } for COMPLETED payments', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.createCheckoutSession({ paymentId: payment.id });
    expect((result as { checkoutUrl: null; reason: string }).checkoutUrl).toBeNull();
    expect((result as { reason: string }).reason).toBe('not_eligible');
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.payment.createCheckoutSession({ paymentId: payment.id }),
    });
  });
});

describe('payment.createSpeiSession', () => {
  test('returns SPEI bank-transfer instructions for a PENDING payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.createSpeiSession({ paymentId: payment.id });

    expect(result.clabe).toBe('646180111811111111');
    expect(result.bankName).toBe('Citibanamex');
    expect(typeof result.amount).toBe('number');
  });

  test('auth gate: every scope allowed (public) — fresh payment per scope', async () => {
    const { policy } = await createPolicyWithActors();
    // Each scope iteration needs its own payment (createSpei mutates state).
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: async (caller) => {
        const p = await pendingPayment.create({}, { transient: { policyId: policy.id } });
        return caller.payment.createSpeiSession({ paymentId: p.id });
      },
    });
  });
});

describe('payment.getSpeiDetails', () => {
  test('returns SPEI details for a payment with SPEI populated', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await speiPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.getSpeiDetails({ paymentId: payment.id });

    expect(result).not.toBeNull();
    expect(result!.clabe).toBe('646180111811111111');
    expect(result!.bankName).toBe('Citibanamex');
    expect(result!.reference).toBe('REF12345');
  });

  test('returns null when payment has no SPEI intent', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const { caller } = createPublicCaller();
    const result = await caller.payment.getSpeiDetails({ paymentId: payment.id });
    expect(result).toBeNull();
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await speiPayment.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.payment.getSpeiDetails({ paymentId: payment.id }),
    });
  });
});
