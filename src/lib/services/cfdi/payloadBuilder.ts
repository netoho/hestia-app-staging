/**
 * Pure CFDI payload logic (micfdi integration, #212). No I/O — unit-tested in
 * isolation. micfdi collects the receptor's fiscal identity at its portal, so
 * this only maps a payment's facts into the /v1/records submission.
 */
import { PaymentStatus, PaymentType, PaymentMethod } from '@/prisma/generated/prisma-client/enums';
import { calculateSubtotalFromTotal } from '@/lib/utils/money';

/** SAT c_FormaPago codes we derive from a Stripe payment today. */
export const SAT_FORMA_PAGO = {
  EFECTIVO: '01',
  TRANSFERENCIA: '03',
  TARJETA_CREDITO: '04',
  POR_DEFINIR: '99',
} as const;

/**
 * A payment is CFDI-eligible when it reaches COMPLETED. Eligibility keys on
 * STATUS, not payment type: a completed PARTIAL_PAYMENT is a real payment (a
 * "type of payment", not a non-completion state) and is invoiced. REFUND stays
 * excluded — a refund is a nota de crédito, never an ingreso CFDI; today refunds
 * carry the REFUNDED status (never COMPLETED), so this is a defensive guard.
 */
export function isCfdiEligible(payment: { status: PaymentStatus; type: PaymentType }): boolean {
  return payment.status === PaymentStatus.COMPLETED && payment.type !== PaymentType.REFUND;
}

/**
 * SAT forma de pago from the stored Stripe method. Débito (28) isn't
 * recoverable without a live charge lookup, so cards map to crédito (04).
 * MANUAL/STRIPE/unknown → 99 (por definir); the manual admin picker (T2) will
 * supply the real code for manually-recorded payments.
 */
export function formaPagoFromMethod(method: PaymentMethod | null | undefined): string {
  switch (method) {
    case PaymentMethod.CARD:
      return SAT_FORMA_PAGO.TARJETA_CREDITO;
    case PaymentMethod.BANK_TRANSFER:
      return SAT_FORMA_PAGO.TRANSFERENCIA;
    case PaymentMethod.CASH:
      return SAT_FORMA_PAGO.EFECTIVO;
    default:
      return SAT_FORMA_PAGO.POR_DEFINIR;
  }
}

/** Spanish concept fallback when a payment carries no description. */
export function conceptFromType(type: PaymentType): string {
  switch (type) {
    case PaymentType.TENANT_PORTION:
      return 'Pago del Inquilino - Protección de Arrendamiento';
    case PaymentType.LANDLORD_PORTION:
      return 'Pago del Arrendador - Protección de Arrendamiento';
    case PaymentType.INVESTIGATION_FEE:
      return 'Cuota de Investigación';
    case PaymentType.POLICY_PREMIUM:
      return 'Prima de Protección de Arrendamiento';
    case PaymentType.INCIDENT_PAYMENT:
      return 'Pago de Incidente';
    default:
      return 'Pago - Protección de Arrendamiento';
  }
}

/**
 * Date-only ISO string ("2026-05-01") for micfdi's match_fields. UTC-based on
 * purpose: contract dates are stored as UTC midnight, and a local-timezone
 * format would shift the calendar day west of UTC.
 */
export function formatContractStart(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface CfdiSubmission {
  external_ref: string;
  /** IVA-EXCLUSIVE unit price as a 2-decimal string; micfdi adds the 16% IVA. */
  unit_price: string;
  description: string;
  payment_form: string;
  /** Ownership facts the client types at the partner search portal (#225). */
  match_fields: {
    policy_number: string;
    contract_start: string;
  };
}

export interface BuildCfdiInput {
  id: string;
  subtotal: number | null;
  amount: number;
  description: string | null;
  type: PaymentType;
  method: PaymentMethod | null;
  /** Ownership facts — the issuance service guarantees contractStartDate is set. */
  policy: {
    policyNumber: string;
    contractStartDate: Date;
  };
}

/**
 * Build the micfdi /v1/records payload. `unit_price` is the stored IVA-exclusive
 * subtotal (2-decimal string per the micfdi contract), falling back to the
 * reverse-IVA of the gross amount for legacy rows. `formaPagoOverride` lets the
 * manual-payment picker (T2) set the SAT code.
 */
export function buildCfdiSubmission(
  payment: BuildCfdiInput,
  formaPagoOverride?: string,
): CfdiSubmission {
  const unitPrice = payment.subtotal ?? calculateSubtotalFromTotal(payment.amount).subtotal;
  return {
    external_ref: payment.id,
    unit_price: unitPrice.toFixed(2),
    description: payment.description ?? conceptFromType(payment.type),
    payment_form: formaPagoOverride ?? formaPagoFromMethod(payment.method),
    match_fields: {
      policy_number: payment.policy.policyNumber,
      contract_start: formatContractStart(payment.policy.contractStartDate),
    },
  };
}
