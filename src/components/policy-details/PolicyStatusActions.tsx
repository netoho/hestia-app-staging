'use client';

import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

interface PolicyStatusActionsProps {
  status: PolicyStatus;
  onUpdateStatus: (newStatus: PolicyStatus, reason?: string) => void;
  updatingStatus: boolean;
}

/**
 * @deprecated This component is no longer used.
 * Status transitions are handled via PolicyHeader dropdown actions.
 */
export function PolicyStatusActions({
  status: _status,
  onUpdateStatus: _onUpdateStatus,
  updatingStatus: _updatingStatus,
}: PolicyStatusActionsProps) {
  return null;
}
