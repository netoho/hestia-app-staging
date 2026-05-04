import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

export type PolicyStatusBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'error';

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, {
  label: string;
  variant: PolicyStatusBadgeVariant;
  filterVisible?: boolean;
}> = {
  // Soft-tinted pills aligned with the KPI tile chip palette
  // (emerald/amber/sky/slate/rose). Labels shortened to single words —
  // "Recopilando" and "Pendiente" are unambiguous in this state machine
  // (the alternative for each is the other, with a different label).
  [PolicyStatus.COLLECTING_INFO]: { label: 'Recopilando', variant: 'info', filterVisible: true },
  [PolicyStatus.PENDING_APPROVAL]: { label: 'Pendiente', variant: 'warning', filterVisible: true },
  [PolicyStatus.ACTIVE]: { label: 'Activa', variant: 'success', filterVisible: true },
  [PolicyStatus.EXPIRED]: { label: 'Expirada', variant: 'muted', filterVisible: true },
  [PolicyStatus.CANCELLED]: { label: 'Cancelada', variant: 'error', filterVisible: true },
};

export const getFilterableStatuses = () =>
  Object.entries(POLICY_STATUS_CONFIG)
    .filter(([_, config]) => config.filterVisible)
    .map(([status, config]) => ({ status: status as PolicyStatus, ...config }));
