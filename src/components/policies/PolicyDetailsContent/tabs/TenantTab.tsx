'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, UserMinus, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { getFriendlyError } from '@/lib/utils/trpcErrors';
import ActorCard from '@/components/policies/details/ActorCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';
import { ActorViewToggle } from '../components/ActorViewToggle';
import { ActorTabSkeleton } from '../components/ActorTabSkeleton';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { ActorType } from '@/lib/utils/actor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatFullName } from '@/lib/utils/names';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

// Pre-ACTIVE statuses: tenant replacement AND membership changes (add/
// remove co-tenants, S5b #169) are only allowed before the protección
// is active.
const PRE_ACTIVE_STATUSES: PolicyStatus[] = ['COLLECTING_INFO', 'PENDING_APPROVAL'];

interface TenantTabProps {
  /** ALL tenants of the policy, in display order (createdAt asc). */
  tenants: any[];
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
  /** Refresh actor caches + policy after add/remove (mirrors LandlordTab #189). */
  onActorsChanged?: () => void;
  isLoading?: boolean;
  isStaffOrAdmin?: boolean;
  policyStatus?: PolicyStatus;
  tenantHistory?: any[];
  /** Open the replace modal for ONE specific tenant (replaceTenant requires tenantId). */
  onReplaceTenant?: (tenant: { id: string; email: string }) => void;
}

export function TenantTab({
  tenants,
  activities,
  policyId,
  permissions,
  sending,
  onEditClick,
  onSendInvitation,
  onMarkComplete,
  onActorsChanged,
  isLoading,
  isStaffOrAdmin,
  policyStatus,
  tenantHistory,
  onReplaceTenant,
}: TenantTabProps) {
  const [view, setView] = useState<'info' | 'history'>('info');
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  // Co-tenant add/remove is ADMIN-ONLY (S5b #169) — each tenant's portal
  // edits only their own record.
  const addTenantMutation = trpc.actor.addTenant.useMutation({
    onSuccess: () => {
      toast({
        title: 'Coinquilino agregado',
        description: 'Complete su información o envíele su enlace de acceso',
      });
      onActorsChanged?.();
    },
    onError: (error) => {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    },
  });

  const removeTenantMutation = trpc.actor.removeTenant.useMutation({
    onSuccess: () => {
      toast({ title: 'Inquilino eliminado' });
      setPendingRemove(null);
      onActorsChanged?.();
    },
    onError: (error) => {
      const friendly = getFriendlyError(error);
      setPendingRemove(null);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <ActorTabSkeleton />;
  }

  const getActorName = (actor: any) =>
    actor?.companyName ||
    actor?.fullName ||
    `${actor?.firstName || ''} ${actor?.paternalLastName || ''}`.trim() ||
    'Actor';

  const isPreActive = !!policyStatus && PRE_ACTIVE_STATUSES.includes(policyStatus);
  const canReplaceTenant = !!isStaffOrAdmin && isPreActive;
  const canEditMembership = permissions.canEdit && isPreActive;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {tenants && tenants.length > 0 && (
        <ActorViewToggle value={view} onChange={setView} />
      )}

      {tenants && tenants.length > 0 ? (
        tenants.map((tenant: any, index: number) => (
          <div key={tenant.id} className="space-y-4">
            {index > 0 && <hr className="my-6" />}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {tenants.length > 1 ? `Inquilino ${index + 1}` : 'Inquilino'}
              <span className="ml-auto flex items-center gap-2">
                {canReplaceTenant && onReplaceTenant && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={() => onReplaceTenant({ id: tenant.id, email: tenant.email || '' })}
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Reemplazar
                  </Button>
                )}
                {canEditMembership && tenants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() =>
                      setPendingRemove({ id: tenant.id, name: getActorName(tenant) })
                    }
                    disabled={removeTenantMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </span>
            </h3>
            {view === 'info' ? (
              <ActorCard
                actor={tenant}
                actorType="tenant"
                policyId={policyId}
                getVerificationBadge={(status) => <VerificationBadge status={status} />}
                onEditClick={() => onEditClick('tenant', tenant.id)}
                onSendInvitation={
                  permissions.canSendInvitations && !tenant.informationComplete
                    ? () => onSendInvitation('tenant', tenant.id)
                    : undefined
                }
                onMarkComplete={
                  permissions.canEdit && !tenant.informationComplete
                    ? () => onMarkComplete('tenant', tenant.id, getActorName(tenant))
                    : undefined
                }
                canEdit={permissions.canEdit}
                sending={sending === tenant.id}
              />
            ) : (
              <ActorActivityTimeline
                activities={activities}
                actorId={tenant.id}
                actorName={tenant.fullName || tenant.companyName}
              />
            )}
          </div>
        ))
      ) : (
        <EmptyState title="No se ha registrado información del inquilino" />
      )}

      {/* Add co-tenant — admin-only, pre-ACTIVE only (S5b #169); the new
          tenant fills their own record through their own portal link. */}
      {canEditMembership && (
        <Button
          type="button"
          variant="outline"
          onClick={() => addTenantMutation.mutate({ policyId })}
          disabled={addTenantMutation.isPending}
          className="w-full sm:w-auto"
        >
          {addTenantMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Agregar inquilino
        </Button>
      )}

      {/* Tenant history — replacements and removals both archive to
          TenantHistory (summary + snapshot) before the row goes away. */}
      {tenantHistory && tenantHistory.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de inquilinos ({tenantHistory.length})
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Archivado: {format(new Date(prev.replacedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    Razón: {prev.replacementReason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm-remove dialog — the removed tenant is archived to the
          history below and the removal leaves an activity-trail event. */}
      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar inquilino?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a {pendingRemove?.name} de esta protección. Esta
              acción es permanente y quedará registrada en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingRemove &&
                removeTenantMutation.mutate({ tenantId: pendingRemove.id })
              }
              disabled={removeTenantMutation.isPending}
            >
              {removeTenantMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TenantTab;
