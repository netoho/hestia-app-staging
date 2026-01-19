'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';

interface LandlordTabProps {
  landlords: any[];
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

export function LandlordTab({
  landlords,
  activities,
  policyId,
  permissions,
  sending,
  onEditClick,
  onSendInvitation,
  onMarkComplete,
  isLoading,
}: LandlordTabProps) {
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
      {landlords && landlords.length > 0 && (
        <ActorViewToggle value={view} onChange={setView} />
      )}

      {landlords && landlords.length > 0 ? (
        landlords.map((landlord: any, index: number) => (
          <div key={landlord.id} className="space-y-4">
            {index > 0 && <hr className="my-6" />}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {landlord.isPrimary ? 'Arrendador Principal' : `Co-propietario ${index}`}
              {landlord.isPrimary && <Badge variant="outline" className="ml-2">Principal</Badge>}
            </h3>
            {view === 'info' ? (
              <ActorCard
                actor={landlord}
                actorType="landlord"
                policyId={policyId}
                getVerificationBadge={(status) => <VerificationBadge status={status} />}
                onEditClick={() => onEditClick('landlord', landlord.id)}
                onSendInvitation={
                  permissions.canSendInvitations && !landlord.informationComplete
                    ? () => onSendInvitation('landlord', landlord.id)
                    : undefined
                }
                onMarkComplete={
                  permissions.canEdit && !landlord.informationComplete
                    ? () => onMarkComplete('landlord', landlord.id, getActorName(landlord))
                    : undefined
                }
                canEdit={permissions.canEdit}
                sending={sending === landlord.id}
              />
            ) : (
              <ActorActivityTimeline
                activities={activities}
                actorId={landlord.id}
                actorName={landlord.fullName || landlord.companyName}
              />
            )}
          </div>
        ))
      ) : (
        <EmptyState title="No se ha registrado información del arrendador" />
      )}
    </div>
  );
}

export default LandlordTab;
