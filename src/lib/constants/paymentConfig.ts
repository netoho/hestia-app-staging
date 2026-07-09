import { PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.INVESTIGATION_FEE]: 'Cuota de Investigación',
  [PaymentType.TENANT_PORTION]: 'Pago del Inquilino',
  [PaymentType.LANDLORD_PORTION]: 'Pago del Arrendador',
  [PaymentType.POLICY_PREMIUM]: 'Pago de Protección de Arrendamiento',
  [PaymentType.PARTIAL_PAYMENT]: 'Pago Parcial',
  [PaymentType.INCIDENT_PAYMENT]: 'Pago por Incidencia',
  [PaymentType.REFUND]: 'Reembolso',
};

// COMPANY intentionally omitted — not a valid payment actor (#213). Partial so a
// legacy paidBy=COMPANY row falls back to its raw value at the callsites (all use `|| paidBy`).
export const PAYER_TYPE_LABELS: Partial<Record<PayerType, string>> = {
  [PayerType.TENANT]: 'Inquilino',
  [PayerType.LANDLORD]: 'Arrendador',
  [PayerType.JOINT_OBLIGOR]: 'Obligado Solidario',
  [PayerType.AVAL]: 'Aval',
};

/**
 * SAT c_FormaPago options for the manual-payment CFDI picker (#213). Curated
 * subset relevant to rent payments; 99 (por definir) is the fallback. Sourcing
 * the full catalog from a micfdi endpoint is tracked in #218.
 */
export const SAT_FORMA_PAGO_OPTIONS: { value: string; label: string }[] = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '99', label: '99 - Por definir' },
];

/** Default forma de pago for a manual payment — most arrive as bank transfers. */
export const DEFAULT_SAT_FORMA_PAGO = '03';

/**
 * CFDI record status badge config (#215). Keys are micfdi's vocabulary
 * (registered → validated → invoiced, or error) plus our local "pending".
 */
export const CFDI_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'muted' | 'outline' }
> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  registered: { label: 'Registrada', variant: 'info' },
  validated: { label: 'En proceso', variant: 'info' },
  invoiced: { label: 'Facturada', variant: 'success' },
  error: { label: 'Error', variant: 'error' },
};
