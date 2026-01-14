'use client';

import { useState } from 'react';
import { Users, Shield, History, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/shared/EmptyState';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFullName } from '@/lib/utils/names';
import { PolicyStatusType } from '@/lib/prisma-types';

// Statuses that allow guarantor type change
const CHANGEABLE_STATUSES: PolicyStatusType[] = ['DRAFT', 'COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];

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
  isStaffOrAdmin?: boolean;
  policyStatus?: PolicyStatusType;
  jointObligorHistory?: any[];
  avalHistory?: any[];
  onChangeGuarantorType?: () => void;
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
  isStaffOrAdmin,
  policyStatus,
  jointObligorHistory,
  avalHistory,
  onChangeGuarantorType,
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
  const hasHistory = (jointObligorHistory?.length || 0) > 0 || (avalHistory?.length || 0) > 0;
  const canChangeType = isStaffOrAdmin && policyStatus && CHANGEABLE_STATUSES.includes(policyStatus);

  if (guarantorType === 'NONE') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center">
          {canChangeType && onChangeGuarantorType ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeGuarantorType}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Cambiar Tipo
            </Button>
          ) : (
            <div />
          )}
        </div>
        <EmptyState
          icon={Shield}
          title="Esta protección no requiere garantías adicionales"
        />
        {/* History for NONE type */}
        {hasHistory && renderHistory()}
      </div>
    );
  }

  function renderHistory() {
    if (!hasHistory) return null;

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de cambios ({(jointObligorHistory?.length || 0) + (avalHistory?.length || 0)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Joint Obligor History */}
            {jointObligorHistory && jointObligorHistory.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Obligados Solidarios Archivados</p>
                <div className="space-y-3">
                  {jointObligorHistory.map((prev: any) => (
                    <div key={prev.id} className="border-l-2 border-muted pl-4 py-2">
                      <p className="font-medium">
                        {prev.jointObligorType === 'COMPANY'
                          ? prev.companyName
                          : formatFullName(
                              prev.firstName || '',
                              prev.paternalLastName || '',
                              prev.maternalLastName || '',
                              prev.middleName || undefined
                            )}
                      </p>
                      <p className="text-sm text-muted-foreground">{prev.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Archivado: {format(new Date(prev.replacedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Razón: {prev.replacementReason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aval History */}
            {avalHistory && avalHistory.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Avales Archivados</p>
                <div className="space-y-3">
                  {avalHistory.map((prev: any) => (
                    <div key={prev.id} className="border-l-2 border-muted pl-4 py-2">
                      <p className="font-medium">
                        {prev.avalType === 'COMPANY'
                          ? prev.companyName
                          : formatFullName(
                              prev.firstName || '',
                              prev.paternalLastName || '',
                              prev.maternalLastName || '',
                              prev.middleName || undefined
                            )}
                      </p>
                      <p className="text-sm text-muted-foreground">{prev.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Archivado: {format(new Date(prev.replacedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Razón: {prev.replacementReason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        {canChangeType && onChangeGuarantorType ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeGuarantorType}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Cambiar Tipo
          </Button>
        ) : (
          <div />
        )}
        {hasGuarantors && <ActorViewToggle value={view} onChange={setView} />}
      </div>

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
            <EmptyState title="No se han registrado obligados solidarios" />
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
            <EmptyState title="No se han registrado avales" />
          )}
        </div>
      )}

      {/* History Section */}
      {renderHistory()}
    </div>
  );
}

export default GuarantorsTab;
