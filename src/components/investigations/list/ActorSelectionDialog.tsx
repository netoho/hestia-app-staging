'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Users, Shield, AlertCircle } from 'lucide-react';
import { formatFullName } from '@/lib/utils/names';
import { getInvestigatedActorLabel, getInvestigationStatusLabel } from '@/lib/constants/investigationConfig';
import { trpc } from '@/lib/trpc/client';

interface Actor {
  id: string;
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  companyName?: string;
}

interface Policy {
  id: string;
  policyNumber: string;
  tenant?: Actor | null;
  jointObligors?: Actor[];
  avals?: Actor[];
}

interface ActorSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy;
}

type ActorType = 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';

interface ActorOption {
  id: string;
  name: string;
  type: ActorType;
  icon: typeof User;
}

function getActorName(actor: Actor): string {
  return actor.companyName || formatFullName(
    actor.firstName,
    actor.paternalLastName,
    actor.maternalLastName,
    actor.middleName,
  );
}

export default function ActorSelectionDialog({
  open,
  onOpenChange,
  policy,
}: ActorSelectionDialogProps) {
  const router = useRouter();

  // Query existing investigations for this policy
  const { data: investigations } = trpc.investigation.getByPolicy.useQuery(
    { policyId: policy.id },
    { enabled: open }
  );

  // Build a map of actors with active investigations
  const actorInvestigationMap = new Map<string, { status: string; id: string }>();
  investigations?.forEach((inv) => {
    const key = `${inv.actorType}-${inv.actorId}`;
    // Only track non-archived investigations
    if (inv.status !== 'ARCHIVED' && inv.status !== 'REJECTED') {
      actorInvestigationMap.set(key, { status: inv.status, id: inv.id });
    }
  });

  // Build list of actors
  const actors: ActorOption[] = [];

  if (policy.tenant) {
    actors.push({
      id: policy.tenant.id,
      name: getActorName(policy.tenant),
      type: 'TENANT',
      icon: User,
    });
  }

  policy.jointObligors?.forEach((jo) => {
    actors.push({
      id: jo.id,
      name: getActorName(jo),
      type: 'JOINT_OBLIGOR',
      icon: Users,
    });
  });

  policy.avals?.forEach((aval) => {
    actors.push({
      id: aval.id,
      name: getActorName(aval),
      type: 'AVAL',
      icon: Shield,
    });
  });

  const handleSelect = (actor: ActorOption) => {
    const key = `${actor.type}-${actor.id}`;
    const existingInv = actorInvestigationMap.get(key);
    if (existingInv) {
      // Navigate to existing investigation instead
      router.push(`/dashboard/policies/${policy.id}/investigations/${existingInv.id}`);
    } else {
      router.push(
        `/dashboard/policies/${policy.id}/investigation/${actor.type}/${actor.id}/new`
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Actor</DialogTitle>
          <DialogDescription>
            Selecciona el actor para crear una nueva investigación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {actors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay actores disponibles en esta protección
            </p>
          ) : (
            actors.map((actor) => {
              const Icon = actor.icon;
              const key = `${actor.type}-${actor.id}`;
              const existingInv = actorInvestigationMap.get(key);
              const hasActiveInvestigation = !!existingInv;

              return (
                <Button
                  key={key}
                  variant="outline"
                  className={`w-full justify-start h-auto py-3 ${hasActiveInvestigation ? 'opacity-70' : ''}`}
                  onClick={() => handleSelect(actor)}
                >
                  <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-medium truncate w-full text-left">
                      {actor.name}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {getInvestigatedActorLabel(actor.type)}
                      </Badge>
                      {hasActiveInvestigation && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {getInvestigationStatusLabel(existingInv.status as any)}
                        </Badge>
                      )}
                    </div>
                    {hasActiveInvestigation && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Click para ver investigación existente
                      </span>
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
