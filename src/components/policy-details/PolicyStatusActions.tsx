'use client';

import { PolicyStatusType } from '@/lib/prisma-types';

interface PolicyStatusActionsProps {
  status: PolicyStatusType;
  onUpdateStatus: (newStatus: PolicyStatusType, reason?: string) => void;
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
