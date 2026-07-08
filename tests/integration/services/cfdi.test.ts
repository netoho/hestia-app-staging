import { describe, test, expect, spyOn } from 'bun:test';
import { prisma } from '../../utils/database';
import { createPolicyWithActors } from '../scenarios';
import { paymentFactory, completedPayment } from '../factories';
import { PaymentStatus, PaymentType, PaymentMethod } from '@/prisma/generated/prisma-client/enums';
import { cfdiIssuanceService } from '@/lib/services/cfdi/cfdiIssuanceService';
import { micfdiService } from '@/lib/services/micfdiService';
import { paymentService } from '@/lib/services/paymentService';

// micfdiService is mocked at preload. Each spy sets an explicit
// mockImplementation: a bare spyOn on a preload-mocked export returns undefined
// after a prior test's mockRestore (bun gotcha) instead of calling through.
const CANNED_MICFDI = {
  recordId: 'rec_test_fake',
  portalUrl: 'https://portal.micfdi.test/rec_test_fake',
  status: 'registered',
  idempotentReplay: false,
};

describe('cfdiIssuanceService.issueForPayment', () => {
  test('creates a CfdiRecord for a COMPLETED eligible payment and submits the right payload', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { method: PaymentMethod.CARD, subtotal: 4310.34, amount: 5000, type: PaymentType.TENANT_PORTION },
      { transient: { policyId: policy.id } },
    );

    const submitSpy = spyOn(micfdiService, 'submitPayment').mockImplementation(async () => CANNED_MICFDI);

    await cfdiIssuanceService.issueForPayment(payment.id);

    const record = await prisma.cfdiRecord.findUnique({ where: { paymentId: payment.id } });
    expect(record).not.toBeNull();
    expect(record!.micfdiRecordId).toBe('rec_test_fake');
    expect(record!.portalUrl).toContain('portal.micfdi.test');
    expect(record!.status).toBe('registered');
    expect(record!.unitPrice).toBe(4310.34);
    expect(record!.paymentForm).toBe('04'); // CARD → SAT 04

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0]![0]).toMatchObject({
      external_ref: payment.id,
      unit_price: 4310.34,
      payment_form: '04',
    });
    submitSpy.mockRestore();
  });

  test('skips REFUND and PARTIAL_PAYMENT — no record, micfdi never called', async () => {
    const { policy } = await createPolicyWithActors();
    const submitSpy = spyOn(micfdiService, 'submitPayment').mockImplementation(async () => CANNED_MICFDI);

    for (const type of [PaymentType.REFUND, PaymentType.PARTIAL_PAYMENT]) {
      const p = await paymentFactory.create(
        { status: PaymentStatus.COMPLETED, type, method: PaymentMethod.CARD },
        { transient: { policyId: policy.id } },
      );
      await cfdiIssuanceService.issueForPayment(p.id);
      expect(await prisma.cfdiRecord.findUnique({ where: { paymentId: p.id } })).toBeNull();
    }

    expect(submitSpy).not.toHaveBeenCalled();
    submitSpy.mockRestore();
  });

  test('is idempotent — a duplicate completion yields exactly one record', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await completedPayment.create(
      { method: PaymentMethod.BANK_TRANSFER },
      { transient: { policyId: policy.id } },
    );
    const submitSpy = spyOn(micfdiService, 'submitPayment').mockImplementation(async () => CANNED_MICFDI);

    await cfdiIssuanceService.issueForPayment(payment.id);
    await cfdiIssuanceService.issueForPayment(payment.id);

    const records = await prisma.cfdiRecord.findMany({ where: { paymentId: payment.id } });
    expect(records).toHaveLength(1);
    expect(submitSpy).toHaveBeenCalledTimes(1); // second call short-circuits before micfdi
    submitSpy.mockRestore();
  });
});

describe('updatePaymentById → CFDI hook', () => {
  test('a COMPLETED transition fires issuance; a non-COMPLETED one does not', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await paymentFactory.create(
      { status: PaymentStatus.PENDING, method: PaymentMethod.CARD },
      { transient: { policyId: policy.id } },
    );

    const issueSpy = spyOn(cfdiIssuanceService, 'issueForPayment').mockImplementation(async () => {});

    await paymentService.updatePaymentById(payment.id, PaymentStatus.PROCESSING);
    expect(issueSpy).not.toHaveBeenCalled();

    await paymentService.updatePaymentById(payment.id, PaymentStatus.COMPLETED, { paidAt: new Date() });
    expect(issueSpy).toHaveBeenCalledTimes(1);
    expect(issueSpy).toHaveBeenCalledWith(payment.id);

    issueSpy.mockRestore();
  });
});
