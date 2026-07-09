import { describe, test, expect } from 'bun:test';
import { PaymentStatus, PaymentType, PaymentMethod } from '@/prisma/generated/prisma-client/enums';
import {
  isCfdiEligible,
  formaPagoFromMethod,
  conceptFromType,
  buildCfdiSubmission,
  formatContractStart,
  SAT_FORMA_PAGO,
} from '../payloadBuilder';

describe('isCfdiEligible', () => {
  test('any COMPLETED payment is eligible — gate is on status, incl. PARTIAL_PAYMENT', () => {
    for (const type of [
      PaymentType.TENANT_PORTION,
      PaymentType.LANDLORD_PORTION,
      PaymentType.INVESTIGATION_FEE,
      PaymentType.POLICY_PREMIUM,
      PaymentType.INCIDENT_PAYMENT,
      PaymentType.PARTIAL_PAYMENT,
    ]) {
      expect(isCfdiEligible({ status: PaymentStatus.COMPLETED, type })).toBe(true);
    }
  });

  test('non-COMPLETED is never eligible', () => {
    expect(isCfdiEligible({ status: PaymentStatus.PENDING, type: PaymentType.TENANT_PORTION })).toBe(false);
    expect(isCfdiEligible({ status: PaymentStatus.PENDING_VERIFICATION, type: PaymentType.TENANT_PORTION })).toBe(false);
    expect(isCfdiEligible({ status: PaymentStatus.CANCELLED, type: PaymentType.TENANT_PORTION })).toBe(false);
  });

  test('REFUND is excluded even when COMPLETED (nota de crédito, not an ingreso CFDI)', () => {
    expect(isCfdiEligible({ status: PaymentStatus.COMPLETED, type: PaymentType.REFUND })).toBe(false);
  });
});

describe('formaPagoFromMethod', () => {
  test('maps Stripe methods to SAT c_FormaPago', () => {
    expect(formaPagoFromMethod(PaymentMethod.CARD)).toBe(SAT_FORMA_PAGO.TARJETA_CREDITO);
    expect(formaPagoFromMethod(PaymentMethod.BANK_TRANSFER)).toBe(SAT_FORMA_PAGO.TRANSFERENCIA);
    expect(formaPagoFromMethod(PaymentMethod.CASH)).toBe(SAT_FORMA_PAGO.EFECTIVO);
  });

  test('ambiguous / unknown methods fall back to 99 (por definir)', () => {
    expect(formaPagoFromMethod(PaymentMethod.MANUAL)).toBe(SAT_FORMA_PAGO.POR_DEFINIR);
    expect(formaPagoFromMethod(PaymentMethod.STRIPE)).toBe(SAT_FORMA_PAGO.POR_DEFINIR);
    expect(formaPagoFromMethod(null)).toBe(SAT_FORMA_PAGO.POR_DEFINIR);
    expect(formaPagoFromMethod(undefined)).toBe(SAT_FORMA_PAGO.POR_DEFINIR);
  });
});

describe('formatContractStart', () => {
  test('formats as date-only ISO using UTC (no local-timezone day shift)', () => {
    // 2026-05-01T00:00:00Z is 2026-04-30 in America/Mexico_City local time —
    // the UTC-based format must still say 2026-05-01.
    expect(formatContractStart(new Date('2026-05-01T00:00:00.000Z'))).toBe('2026-05-01');
    expect(formatContractStart(new Date('2026-12-31T23:00:00.000Z'))).toBe('2026-12-31');
  });
});

describe('buildCfdiSubmission', () => {
  const base = {
    id: 'pay_1',
    subtotal: 4310.34,
    amount: 5000,
    description: 'Pago del Inquilino',
    type: PaymentType.TENANT_PORTION,
    method: PaymentMethod.CARD,
    policy: {
      policyNumber: 'POL-20260501-ABC',
      contractStartDate: new Date('2026-05-01T00:00:00.000Z'),
    },
  };

  test('unit_price is the stored IVA-exclusive subtotal as a 2-decimal string', () => {
    expect(buildCfdiSubmission(base).unit_price).toBe('4310.34');
  });

  test('falls back to reverse-IVA of the gross amount when subtotal is null', () => {
    const out = buildCfdiSubmission({ ...base, subtotal: null });
    expect(out.unit_price).toBe((5000 / 1.16).toFixed(2));
  });

  test('always carries both ownership match_fields (#225)', () => {
    const out = buildCfdiSubmission(base);
    expect(out.match_fields).toEqual({
      policy_number: 'POL-20260501-ABC',
      contract_start: '2026-05-01',
    });
  });

  test('external_ref is the payment id; payment_form derives from method', () => {
    const out = buildCfdiSubmission(base);
    expect(out.external_ref).toBe('pay_1');
    expect(out.payment_form).toBe(SAT_FORMA_PAGO.TARJETA_CREDITO);
  });

  test('description falls back to a concept from type when null', () => {
    const out = buildCfdiSubmission({ ...base, description: null, type: PaymentType.INVESTIGATION_FEE });
    expect(out.description).toBe(conceptFromType(PaymentType.INVESTIGATION_FEE));
  });

  test('formaPagoOverride wins (the manual-payment picker path, T2)', () => {
    expect(buildCfdiSubmission({ ...base, method: PaymentMethod.MANUAL }, '01').payment_form).toBe('01');
  });
});
