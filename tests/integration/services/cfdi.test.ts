import { describe, test, expect, spyOn } from 'bun:test';
import { prisma } from '../../utils/database';
import { createPolicyWithActors, createMultiTenantPolicy } from '../scenarios';
import { paymentFactory, completedPayment, landlordFactory } from '../factories';
import { PaymentStatus, PaymentType, PaymentMethod, PayerType } from '@/prisma/generated/prisma-client/enums';
import { cfdiIssuanceService } from '@/lib/services/cfdi/cfdiIssuanceService';
import { cfdiReconciliationService } from '@/lib/services/cfdi/reconciliationService';
import { deliverCfdiPortalLink } from '@/lib/services/cfdi/delivery';
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
    // Ownership match snapshot (#225) — what the client types at the portal.
    expect(record!.matchPolicyNumber).toBe(policy.policyNumber);
    expect(record!.matchContractStart).toBe('2026-05-01'); // factory contract start, UTC date-only
  });

  test('skips (no record) when the policy has no contractStartDate — ownership key missing (#225)', async () => {
    const { policy } = await createPolicyWithActors();
    await prisma.policy.update({ where: { id: policy.id }, data: { contractStartDate: null } });
    const payment = await completedPayment.create({}, { transient: { policyId: policy.id } });

    await cfdiIssuanceService.issueForPayment(payment.id);

    expect(await prisma.cfdiRecord.findUnique({ where: { paymentId: payment.id } })).toBeNull();
  });

  test('skips REFUND — no record created (nota de crédito, not an ingreso CFDI)', async () => {
    const { policy } = await createPolicyWithActors();
    const p = await paymentFactory.create(
      { status: PaymentStatus.COMPLETED, type: PaymentType.REFUND, method: PaymentMethod.CARD },
      { transient: { policyId: policy.id } },
    );
    await cfdiIssuanceService.issueForPayment(p.id);
    expect(await prisma.cfdiRecord.findUnique({ where: { paymentId: p.id } })).toBeNull();
  });

  test('issues for a COMPLETED PARTIAL_PAYMENT — gate is status, not type', async () => {
    const { policy } = await createPolicyWithActors();
    const p = await paymentFactory.create(
      { status: PaymentStatus.COMPLETED, type: PaymentType.PARTIAL_PAYMENT, method: PaymentMethod.CARD },
      { transient: { policyId: policy.id } },
    );
    await cfdiIssuanceService.issueForPayment(p.id);
    expect(await prisma.cfdiRecord.findUnique({ where: { paymentId: p.id } })).not.toBeNull();
  });

  test('honors the admin-picked SAT forma de pago from a manual payment', async () => {
    const { policy } = await createPolicyWithActors();
    // MANUAL method would derive 99; the stored satFormaPago must win.
    const payment = await completedPayment.create(
      { method: PaymentMethod.MANUAL, satFormaPago: '01', type: PaymentType.TENANT_PORTION },
      { transient: { policyId: policy.id } },
    );

    await cfdiIssuanceService.issueForPayment(payment.id);

    const record = await prisma.cfdiRecord.findUnique({ where: { paymentId: payment.id } });
    expect(record!.paymentForm).toBe('01');
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

describe('verifyManualPayment → CFDI hook', () => {
  test('approving fires issuance and persists the approver forma; rejecting does neither', async () => {
    const { policy, creator } = await createPolicyWithActors();
    const approved = await paymentFactory.create(
      {
        status: PaymentStatus.PENDING_VERIFICATION,
        type: PaymentType.TENANT_PORTION,
        method: PaymentMethod.MANUAL,
        isManual: true,
        satFormaPago: '03', // recorded forma
      },
      { transient: { policyId: policy.id } },
    );
    const rejected = await paymentFactory.create(
      {
        status: PaymentStatus.PENDING_VERIFICATION,
        type: PaymentType.LANDLORD_PORTION,
        method: PaymentMethod.MANUAL,
        isManual: true,
      },
      { transient: { policyId: policy.id } },
    );

    // spyOn the REAL singleton (reliable) — the hook is fire-and-forget, so we
    // assert it was invoked, then assert the persisted forma directly.
    const issueSpy = spyOn(cfdiIssuanceService, 'issueForPayment').mockImplementation(async () => {});

    await paymentService.verifyManualPayment(rejected.id, false, creator.id, 'sin comprobante');
    expect(issueSpy).not.toHaveBeenCalled();

    await paymentService.verifyManualPayment(approved.id, true, creator.id, undefined, '02');
    expect(issueSpy).toHaveBeenCalledWith(approved.id);

    const updated = await prisma.payment.findUnique({ where: { id: approved.id } });
    expect(updated!.status).toBe(PaymentStatus.COMPLETED);
    expect(updated!.satFormaPago).toBe('02'); // approver override wins over the recorded 03

    issueSpy.mockRestore();
  });
});

// micfdiService.getRecord is preload-mocked to return a canned STAMPED record
// (invoiced, folio F-TEST-001, uuid UUID-TEST-0001, total 116) — we assert the
// DB transition, never spyOn the mock.
describe('cfdiReconciliationService (#216)', () => {
  async function createRecord(
    policyId: string,
    overrides: Partial<{ status: string; micfdiRecordId: string | null; folio: string }> = {},
  ) {
    const payment = await completedPayment.create(
      { type: PaymentType.TENANT_PORTION },
      { transient: { policyId } },
    );
    return prisma.cfdiRecord.create({
      data: {
        paymentId: payment.id,
        externalRef: payment.id,
        micfdiRecordId: overrides.micfdiRecordId === undefined ? 'rec_pending' : overrides.micfdiRecordId,
        portalUrl: 'https://portal.micfdi.test/r/pending',
        status: overrides.status ?? 'registered',
        folio: overrides.folio,
        unitPrice: 100,
        paymentForm: '03',
      },
    });
  }

  test('sweep advances a registered record to the stamped state (status/folio/uuid/totals)', async () => {
    const { policy } = await createPolicyWithActors();
    const record = await createRecord(policy.id);

    const result = await cfdiReconciliationService.reconcilePending();

    expect(result).toMatchObject({ scanned: 1, updated: 1, invoiced: 1, failed: 0 });
    const updated = await prisma.cfdiRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(updated.status).toBe('invoiced');
    expect(updated.folio).toBe('F-TEST-001');
    expect(updated.uuid).toBe('UUID-TEST-0001');
    expect(updated.total).toBe(116);
    expect(updated.stampedAt).not.toBeNull();
  });

  test('terminal (invoiced) records are not polled — their stamped facts stay put', async () => {
    const { policy } = await createPolicyWithActors();
    const done = await createRecord(policy.id, { status: 'invoiced', folio: 'KEEP-ME' });

    const result = await cfdiReconciliationService.reconcilePending();

    // Nothing non-terminal to scan; the mock's F-TEST-001 never overwrote it.
    expect(result.scanned).toBe(0);
    const untouched = await prisma.cfdiRecord.findUniqueOrThrow({ where: { id: done.id } });
    expect(untouched.folio).toBe('KEEP-ME');
    expect(untouched.status).toBe('invoiced');
  });

  test('records without a micfdi id are skipped by the sweep', async () => {
    const { policy } = await createPolicyWithActors();
    const orphan = await createRecord(policy.id, { micfdiRecordId: null });

    const result = await cfdiReconciliationService.reconcilePending();

    expect(result.scanned).toBe(0);
    const untouched = await prisma.cfdiRecord.findUniqueOrThrow({ where: { id: orphan.id } });
    expect(untouched.status).toBe('registered');
  });
});

// emailService is preload-mocked (sendCfdiPortalEmail is a no-op), so we assert
// the RESOLVED recipients returned by deliverCfdiPortalLink — not a spyOn on the
// mocked send fn (that binding flakes on CI; see memory).
describe('deliverCfdiPortalLink (#214)', () => {
  const url = 'https://portal.micfdi.test/r/abc';

  test('TENANT-paid → every tenant of the policy', async () => {
    const { policy, tenants } = await createMultiTenantPolicy({ tenantCount: 2 });
    const recipients = await deliverCfdiPortalLink(
      { id: 'pay_t', policyId: policy.id, paidBy: PayerType.TENANT, amount: 1000, description: 'Pago' },
      url,
    );
    expect(recipients.map((r) => r.email).sort()).toEqual(tenants.map((t) => t.email).sort());
    expect(recipients).toHaveLength(2);
  });

  test('LANDLORD-paid → every landlord (primary + co-owner)', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    const coLandlord = await landlordFactory.create({}, { transient: { policyId: policy.id } });
    const recipients = await deliverCfdiPortalLink(
      { id: 'pay_l', policyId: policy.id, paidBy: PayerType.LANDLORD, amount: 1000, description: 'Pago' },
      url,
    );
    expect(recipients.map((r) => r.email).sort()).toEqual([landlord.email, coLandlord.email].sort());
  });

  test('JOINT_OBLIGOR / AVAL → no auto-recipient rule yet (#219), returns empty', async () => {
    const { policy } = await createPolicyWithActors();
    for (const paidBy of [PayerType.JOINT_OBLIGOR, PayerType.AVAL]) {
      const recipients = await deliverCfdiPortalLink(
        { id: 'pay_g', policyId: policy.id, paidBy, amount: 1000, description: 'Pago' },
        url,
      );
      expect(recipients).toEqual([]);
    }
  });

  test('no portal_url → nothing delivered', async () => {
    const { policy } = await createPolicyWithActors();
    const recipients = await deliverCfdiPortalLink(
      { id: 'pay_n', policyId: policy.id, paidBy: PayerType.TENANT, amount: 1000, description: 'Pago' },
      null,
    );
    expect(recipients).toEqual([]);
  });
});
