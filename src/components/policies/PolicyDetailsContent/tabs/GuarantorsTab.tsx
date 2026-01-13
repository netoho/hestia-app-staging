'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';

interface GuarantorsTabProps {
  guarantorType: string;
  jointObligors: any[];
  avals: any[];
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

export function GuarantorsTab({
  guarantorType,
  jointObligors,
  avals,
  activities,
  policyId,
  permissions,
  sending,
  onEditClick,
  onSendInvitation,
  onMarkComplete,
  isLoading,
}: GuarantorsTabProps) {
  const [view, setView] = useState<'info' | 'history'>('info');

  if (isLoading) {
    return <ActorTabSkeleton />;
  }

  const getActorName = (actor: any) =>
    actor?.companyName ||
    actor?.fullName ||
    `${actor?.firstName || ''} ${actor?.paternalLastName || ''}`.trim() ||
    'Actor';

  const hasGuarantors = (jointObligors?.length > 0 || avals?.length > 0);

  if (guarantorType === 'NONE') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Esta protección no requiere garantías adicionales</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {hasGuarantors && <ActorViewToggle value={view} onChange={setView} />}

      {/* Joint Obligors */}
      {(guarantorType === 'JOINT_OBLIGOR' || guarantorType === 'BOTH') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Obligados Solidarios
          </h3>
          {jointObligors && jointObligors.length > 0 ? (
            jointObligors.map((jo: any) => (
              <div key={jo.id}>
                {view === 'info' ? (
                  <ActorCard
                    actor={jo}
                    actorType="jointObligor"
                    policyId={policyId}
                    getVerificationBadge={(status) => <VerificationBadge status={status} />}
                    onEditClick={() => onEditClick('jointObligor', jo.id)}
                    onSendInvitation={
                      permissions.canSendInvitations && !jo.informationComplete
                        ? () => onSendInvitation('jointObligor', jo.id)
                        : undefined
                    }
                    onMarkComplete={
                      permissions.canEdit && !jo.informationComplete
                        ? () => onMarkComplete('jointObligor', jo.id, getActorName(jo))
                        : undefined
                    }
                    canEdit={permissions.canEdit}
                    sending={sending === jo.id}
                  />
                ) : (
                  <ActorActivityTimeline
                    activities={activities}
                    actorId={jo.id}
                    actorName={jo.fullName || jo.companyName}
                  />
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-600">No se han registrado obligados solidarios</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Avals */}
      {(guarantorType === 'AVAL' || guarantorType === 'BOTH') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Avales
          </h3>
          {avals && avals.length > 0 ? (
            avals.map((aval: any) => (
              <div key={aval.id}>
                {view === 'info' ? (
                  <ActorCard
                    actor={aval}
                    actorType="aval"
                    policyId={policyId}
                    getVerificationBadge={(status) => <VerificationBadge status={status} />}
                    onEditClick={() => onEditClick('aval', aval.id)}
                    onSendInvitation={
                      permissions.canSendInvitations && !aval.informationComplete
                        ? () => onSendInvitation('aval', aval.id)
                        : undefined
                    }
                    onMarkComplete={
                      permissions.canEdit && !aval.informationComplete
                        ? () => onMarkComplete('aval', aval.id, getActorName(aval))
                        : undefined
                    }
                    canEdit={permissions.canEdit}
                    sending={sending === aval.id}
                  />
                ) : (
                  <ActorActivityTimeline
                    activities={activities}
                    actorId={aval.id}
                    actorName={aval.fullName || aval.companyName}
                  />
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-600">No se han registrado avales</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default GuarantorsTab;
