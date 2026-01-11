import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  filterVisible?: boolean;
}> = {
  [PolicyStatus.DRAFT]: { label: 'Borrador', variant: 'secondary', filterVisible: true },
  [PolicyStatus.COLLECTING_INFO]: { label: 'Recopilando Info', variant: 'default', filterVisible: true },
  [PolicyStatus.UNDER_INVESTIGATION]: { label: 'En Investigación', variant: 'default', filterVisible: true },
  [PolicyStatus.INVESTIGATION_REJECTED]: { label: 'Rechazado', variant: 'destructive', filterVisible: true },
  [PolicyStatus.PENDING_APPROVAL]: { label: 'Pendiente Aprobación', variant: 'default', filterVisible: true },
  [PolicyStatus.APPROVED]: { label: 'Aprobado', variant: 'default', filterVisible: true },
  [PolicyStatus.CONTRACT_PENDING]: { label: 'Contrato Pendiente', variant: 'default', filterVisible: true },
  [PolicyStatus.CONTRACT_SIGNED]: { label: 'Contrato Firmado', variant: 'default', filterVisible: true },
  [PolicyStatus.ACTIVE]: { label: 'Activa', variant: 'default', filterVisible: true },
  [PolicyStatus.EXPIRED]: { label: 'Expirada', variant: 'secondary', filterVisible: true },
  [PolicyStatus.CANCELLED]: { label: 'Cancelada', variant: 'destructive', filterVisible: true },
};

export const getFilterableStatuses = () =>
  Object.entries(POLICY_STATUS_CONFIG)
    .filter(([_, config]) => config.filterVisible)
    .map(([status, config]) => ({ status: status as PolicyStatus, ...config }));
