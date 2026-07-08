import { describe, test, expect, spyOn } from 'bun:test';
import { prisma } from '../../utils/database';
import { createPolicyWithActors } from '../scenarios';
import { paymentFactory, completedPayment } from '../factories';
import { PaymentStatus, PaymentType, PaymentMethod } from '@/prisma/generated/prisma-client/enums';
import { cfdiIssuanceService } from '@/lib/services/cfdi/cfdiIssuanceService';
import { paymentService } from '@/lib/services/paymentService';

// micfdiService is mocked at preload (returns a canned "registered" record).
// We assert the DB OUTCOME (the CfdiRecord + its submission snapshot), NOT a
// spyOn on the preload-mocked client — that binding is unreliable on CI
// (see memory: Stripe/preload mock-binding flake). The record stores
// externalRef/unitPrice/paymentForm, so it proves the payload we built.

describe('cfdiIssuanceService.issueForPayment', () => {
  test('creates a CfdiRecord with the right submission snapshot for a COMPLETED eligible payment', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { method: PaymentMethod.CARD, subtotal: 4310.34, amount: 5000, type: PaymentType.TENANT_PORTION },
      { transient: { policyId: policy.id } },
    );

    await cfdiIssuanceService.issueForPayment(payment.id);

    const record = await prisma.cfdiRecord.findUnique({ where: { paymentId: payment.id } });
    expect(record).not.toBeNull();
    expect(record!.externalRef).toBe(payment.id);
    expect(record!.micfdiRecordId).toBe('rec_test_fake');
    expect(record!.portalUrl).toContain('portal.micfdi.test');
    expect(record!.status).toBe('registered');
    expect(record!.unitPrice).toBe(4310.34); // IVA-exclusive subtotal → unit_price
    expect(record!.paymentForm).toBe('04'); // CARD → SAT c_FormaPago 04
  });

  test('skips REFUND and PARTIAL_PAYMENT — no record created', async () => {
    const { policy } = await createPolicyWithActors();

    for (const type of [PaymentType.REFUND, PaymentType.PARTIAL_PAYMENT]) {
      const p = await paymentFactory.create(
        { status: PaymentStatus.COMPLETED, type, method: PaymentMethod.CARD },
        { transient: { policyId: policy.id } },
      );
      await cfdiIssuanceService.issueForPayment(p.id);
      expect(await prisma.cfdiRecord.findUnique({ where: { paymentId: p.id } })).toBeNull();
    }
  });

  test('is idempotent — a duplicate completion yields exactly one record', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { method: PaymentMethod.BANK_TRANSFER },
      { transient: { policyId: policy.id } },
    );

    await cfdiIssuanceService.issueForPayment(payment.id);
    await cfdiIssuanceService.issueForPayment(payment.id);

    const records = await prisma.cfdiRecord.findMany({ where: { paymentId: payment.id } });
    expect(records).toHaveLength(1);
    // Bank transfer → SAT 03, confirming the second call didn't overwrite.
    expect(records[0]!.paymentForm).toBe('03');
  });
});

describe('updatePaymentById → CFDI hook', () => {
  test('a COMPLETED transition fires issuance; a non-COMPLETED one does not', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await paymentFactory.create(
      { status: PaymentStatus.PENDING, method: PaymentMethod.CARD },
      { transient: { policyId: policy.id } },
    );

    // spyOn the REAL cfdiIssuanceService singleton (not a preload-mocked
    // module) — this binding is reliable.
    const issueSpy = spyOn(cfdiIssuanceService, 'issueForPayment').mockImplementation(async () => {});

    await paymentService.updatePaymentById(payment.id, PaymentStatus.PROCESSING);
    expect(issueSpy).not.toHaveBeenCalled();

    await paymentService.updatePaymentById(payment.id, PaymentStatus.COMPLETED, { paidAt: new Date() });
    expect(issueSpy).toHaveBeenCalledTimes(1);
    expect(issueSpy).toHaveBeenCalledWith(payment.id);

    issueSpy.mockRestore();
  });
});
