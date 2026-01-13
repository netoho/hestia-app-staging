'use client';

import { useState } from 'react';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';

interface TenantTabProps {
  tenant: any;
  activities: any[];
  policyId: string;
  permissions: {
    canEdit: boolean;
    canSendInvitations: boolean;
  };
  sending: string | null;
  onEditClick: (type: ActorType, actorId: string) => void;
  onSendInvitation: (actorType: string, actorId: string) => void;
  onMarkComplete: (type: ActorType, actorId: string, name: string) => void;
  isLoading?: boolean;
}

export function TenantTab({
  tenant,
  activities,
  policyId,
  permissions,
  sending,
  onEditClick,
  onSendInvitation,
  onMarkComplete,
  isLoading,
}: TenantTabProps) {
  const [view, setView] = useState<'info' | 'history'>('info');

  if (isLoading) {
    return <ActorTabSkeleton />;
  }

  const getActorName = (actor: any) =>
    actor?.companyName ||
    actor?.fullName ||
    `${actor?.firstName || ''} ${actor?.paternalLastName || ''}`.trim() ||
    'Actor';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {tenant && <ActorViewToggle value={view} onChange={setView} />}

      {view === 'info' ? (
        <ActorCard
          actor={tenant}
          actorType="tenant"
          policyId={policyId}
          getVerificationBadge={(status) => <VerificationBadge status={status} />}
          onEditClick={() => tenant && onEditClick('tenant', tenant.id)}
          onSendInvitation={
            permissions.canSendInvitations && tenant && !tenant.informationComplete
              ? () => onSendInvitation('tenant', tenant.id)
              : undefined
          }
          onMarkComplete={
            permissions.canEdit && tenant && !tenant.informationComplete
              ? () => onMarkComplete('tenant', tenant.id, getActorName(tenant))
              : undefined
          }
          canEdit={permissions.canEdit}
          sending={tenant && sending === tenant.id}
        />
      ) : (
        <ActorActivityTimeline
          activities={activities}
          actorId={tenant?.id}
          actorName={tenant?.fullName || tenant?.companyName}
        />
      )}
    </div>
  );
}

export default TenantTab;
