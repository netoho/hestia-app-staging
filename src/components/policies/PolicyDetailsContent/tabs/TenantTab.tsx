'use client';

import { useState } from 'react';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserMinus, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatFullName } from '@/lib/utils/names';
import { PolicyStatusType } from '@/lib/prisma-types';

// Statuses that allow tenant replacement
const REPLACEABLE_STATUSES: PolicyStatusType[] = ['DRAFT', 'COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];

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
  isStaffOrAdmin?: boolean;
  policyStatus?: PolicyStatusType;
  tenantHistory?: any[];
  onReplaceTenant?: () => void;
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
  isStaffOrAdmin,
  policyStatus,
  tenantHistory,
  onReplaceTenant,
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

  const canReplaceTenant = isStaffOrAdmin && policyStatus && REPLACEABLE_STATUSES.includes(policyStatus);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {tenant && (
        <div className="flex justify-between items-center mb-4">
          {/* Replace Tenant Button */}
          {canReplaceTenant && onReplaceTenant ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReplaceTenant}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Reemplazar
            </Button>
          ) : (
            <div />
          )}

          {/* View Toggle */}
          <ActorViewToggle value={view} onChange={setView} />
        </div>
      )}

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

      {/* Tenant Replacement History */}
      {tenantHistory && tenantHistory.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de reemplazos ({tenantHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenantHistory.map((prev: any) => (
                <div key={prev.id} className="border-l-2 border-muted pl-4 py-2">
                  <p className="font-medium">
                    {prev.tenantType === 'COMPANY'
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
                    Reemplazado: {format(new Date(prev.replacedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Razón: {prev.replacementReason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TenantTab;
