'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { getFriendlyError } from '@/lib/utils/trpcErrors';
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
  /** Refresh actor caches + policy after add/remove (#189 admin-only ops). */
  onActorsChanged?: () => void;
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
  onActorsChanged,
  isLoading,
}: LandlordTabProps) {
  const [view, setView] = useState<'info' | 'history'>('info');
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  // Co-owner add/remove is ADMIN-ONLY since #189 — each landlord's portal
  // edits only their own record.
  const addCoOwnerMutation = trpc.actor.addCoOwner.useMutation({
    onSuccess: () => {
      toast({
        title: 'Copropietario agregado',
        description: 'Complete su información o envíele su enlace de acceso',
      });
      onActorsChanged?.();
    },
    onError: (error) => {
      const friendly = getFriendlyError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    },
  });

  const deleteCoOwnerMutation = trpc.actor.deleteCoOwner.useMutation({
    onSuccess: () => {
      toast({ title: 'Copropietario eliminado' });
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {landlords && landlords.length > 0 && (
        <ActorViewToggle value={view} onChange={setView} />
      )}

      {landlords && landlords.length > 0 ? (
        landlords.map((landlord: any, index: number) => {
          const coOwnerNumber = landlord.isPrimary
            ? 0
            : landlords.slice(0, index).filter((l: any) => !l.isPrimary).length + 1;
          return (
          <div key={landlord.id} className="space-y-4">
            {index > 0 && <hr className="my-6" />}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {landlord.isPrimary ? 'Arrendador Principal' : `Co-propietario ${coOwnerNumber}`}
              {landlord.isPrimary && <Badge variant="outline" className="ml-2">Principal</Badge>}
              {permissions.canEdit && !landlord.isPrimary && landlords.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive hover:text-destructive/90"
                  onClick={() =>
                    setPendingRemove({ id: landlord.id, name: getActorName(landlord) })
                  }
                  disabled={deleteCoOwnerMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
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
          );
        })
      ) : (
        <EmptyState title="No se ha registrado información del arrendador" />
      )}

      {/* Add co-owner — admin-only (#189); the new landlord fills their own
          record through their own portal link. */}
      {permissions.canEdit && landlords.length > 0 && landlords.length < 5 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => addCoOwnerMutation.mutate({ policyId })}
          disabled={addCoOwnerMutation.isPending}
          className="w-full sm:w-auto"
        >
          {addCoOwnerMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Agregar Copropietario
        </Button>
      )}

      {/* Confirm-remove dialog — deletion is permanent and now leaves an
          activity-trail event (#183). */}
      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar copropietario?</AlertDialogTitle>
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
                deleteCoOwnerMutation.mutate({ type: 'landlord', id: pendingRemove.id })
              }
              disabled={deleteCoOwnerMutation.isPending}
            >
              {deleteCoOwnerMutation.isPending ? (
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

export default LandlordTab;
