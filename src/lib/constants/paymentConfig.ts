import { PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.INVESTIGATION_FEE]: 'Cuota de Investigación',
  [PaymentType.TENANT_PORTION]: 'Pago del Inquilino',
  [PaymentType.LANDLORD_PORTION]: 'Pago del Arrendador',
  [PaymentType.POLICY_PREMIUM]: 'Prima de Póliza',
  [PaymentType.PARTIAL_PAYMENT]: 'Pago Parcial',
  [PaymentType.INCIDENT_PAYMENT]: 'Pago por Incidencia',
  [PaymentType.REFUND]: 'Reembolso',
};

export const PAYER_TYPE_LABELS: Record<PayerType, string> = {
  [PayerType.TENANT]: 'Inquilino',
  [PayerType.LANDLORD]: 'Arrendador',
  [PayerType.JOINT_OBLIGOR]: 'Obligado Solidario',
  [PayerType.AVAL]: 'Aval',
  [PayerType.COMPANY]: 'Empresa',
};
