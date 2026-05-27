'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { getActorTypeLabel } from '@/lib/utils/actor';
import { getFriendlyError, readForceCompleteState } from '@/lib/utils/trpcErrors';

// Import simplified form wizards
import TenantFormWizard from '@/components/actor/tenant/TenantFormWizard-Simplified';
import LandlordFormWizard from '@/components/actor/landlord/LandlordFormWizard-Simplified';
import AvalFormWizard from '@/components/actor/aval/AvalFormWizard-Simplified';
import JointObligorFormWizard from '@/components/actor/joint-obligor/JointObligorFormWizard-Simplified';

interface InlineActorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  actorId: string;
  actorType: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
  policyId: string;
  policy: any;
  onSave?: () => void;
}

export default function InlineActorEditor({
  isOpen,
  onClose,
  actorId,
  actorType,
  policyId,
  policy,
  onSave,
}: InlineActorEditorProps) {
  const utils = trpc.useUtils();
  const { toast } = useToast();

  // When the server returns `requiresForce: true`, we surface a confirm-
  // force dialog instead of toasting an error. Null = no force needed.
  const [forceState, setForceState] = useState<{
    missingFields: { field?: string; message?: string }[];
    missingDocuments: string[];
  } | null>(null);

  // Admin submit mutation
  const adminSubmitMutation = trpc.actor.adminSubmitActor.useMutation({
    onSuccess: () => {
      toast({
        title: 'Actor marcado como completo',
        description: `El ${getActorTypeLabel(actorType).toLowerCase()} ha sido marcado como completo exitosamente`,
      });
      setForceState(null);
      // Invalidate queries
      utils.actor.listByPolicy.invalidate({ policyId });
      if (actorType !== 'landlord') {
        utils.actor.getById.invalidate({ type: actorType, id: actorId });
      }
      onSave?.();
      onClose();
    },
    onError: (error) => {
      const force = readForceCompleteState(error);
      if (force.requiresForce) {
        // Show the confirm-force dialog with what's actually missing.
        setForceState({
          missingFields: force.missingFields,
          missingDocuments: force.missingDocuments,
        });
        return;
      }
      // Genuine error — clear any pending force prompt and toast.
      setForceState(null);
      const friendly = getFriendlyError(error);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: 'destructive',
      });
    },
  });

  // Fetch data using admin endpoints (same data shape as public pages)

  // For non-landlord actors: use getById
  const singleActorQuery = trpc.actor.getById.useQuery(
    { type: actorType, id: actorId },
    { enabled: actorType !== 'landlord' && isOpen && !!actorId }
  );

  // For landlords: get ALL landlords for this policy (to match public page behavior)
  const landlordsQuery = trpc.actor.listByPolicy.useQuery(
    { policyId, type: 'landlord' },
    { enabled: actorType === 'landlord' && isOpen && !!policyId }
  );

  const handleComplete = () => {
    // Invalidate admin queries to ensure fresh data
    if (actorType === 'landlord') {
      utils.actor.listByPolicy.invalidate({ policyId, type: 'landlord' });
    } else {
      utils.actor.getById.invalidate({ type: actorType, id: actorId });
    }
    // Also invalidate the general listByPolicy for policy details refresh
    utils.actor.listByPolicy.invalidate({ policyId });

    onSave?.();
    onClose();
  };

  // Build initialData matching public page structure exactly
  const getInitialData = () => {
    if (actorType === 'landlord') {
      const landlords = landlordsQuery.data?.map(l => l.actor) || [];
      return {
        landlords,
        propertyDetails: policy?.propertyDetails,
        policyFinancialData: {
          securityDeposit: policy?.securityDeposit,
          maintenanceFee: policy?.maintenanceFee,
          maintenanceIncludedInRent: policy?.maintenanceIncludedInRent,
          issuesTaxReceipts: policy?.issuesTaxReceipts,
          hasIVA: policy?.hasIVA,
          rentIncreasePercentage: policy?.rentIncreasePercentage,
          paymentMethod: policy?.paymentMethod,
        },
      };
    }
    // For tenant/aval/jointObligor - direct actor object
    return singleActorQuery.data;
  };

  // Check loading state
  const isLoading = actorType === 'landlord'
    ? landlordsQuery.isLoading
    : singleActorQuery.isLoading;

  const hasData = actorType === 'landlord'
    ? landlordsQuery.data && landlordsQuery.data.length > 0
    : !!singleActorQuery.data;

  // Check if actor is already complete
  const isActorComplete = actorType === 'landlord'
    ? landlordsQuery.data?.some(l => l.actor?.informationComplete)
    : singleActorQuery.data?.informationComplete;

  // First attempt: try a normal submit. If the server says
  // `requiresForce`, the mutation's onError populates forceState and the
  // user gets a confirm-force dialog with the exact missing data.
  const handleMarkComplete = () => {
    adminSubmitMutation.mutate({
      type: actorType,
      id: actorId,
      skipValidation: false,
    });
  };

  // Second attempt: user confirmed they want to force past validation.
  const handleConfirmForce = () => {
    adminSubmitMutation.mutate({
      type: actorType,
      id: actorId,
      skipValidation: true,
    });
  };

  const handleCancelForce = () => {
    setForceState(null);
  };

  const getFormWizard = () => {
    const initialData = getInitialData();

    // Common props for all wizards
    const wizardProps = {
      token: actorId, // Will be used as identifier in actor.update
      initialData,
      policy,
      onComplete: handleComplete,
      isAdminEdit: true,
    };

    switch (actorType) {
      case 'tenant':
        return <TenantFormWizard {...wizardProps} />;
      case 'landlord':
        return <LandlordFormWizard {...wizardProps} />;
      case 'aval':
        return <AvalFormWizard {...wizardProps} />;
      case 'jointObligor':
        return <JointObligorFormWizard {...wizardProps} />;
      default:
        return <div>Tipo de actor no soportado</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar {getActorTypeLabel(actorType)}</DialogTitle>
          <DialogDescription>
            Actualice la información del {getActorTypeLabel(actorType).toLowerCase()} para esta protección
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasData ? (
          <>
            <div className="flex-1 overflow-y-auto mt-4">
              {getFormWizard()}
            </div>

            {/* Mark Complete Section */}
            {!isActorComplete && (
              <DialogFooter className="mt-6 pt-4 border-t">
                <div className="flex w-full items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Marcar como completo cuando toda la información este lista
                  </div>
                  <Button
                    onClick={handleMarkComplete}
                    disabled={adminSubmitMutation.isPending}
                  >
                    {adminSubmitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Marcar como Completo
                  </Button>
                </div>
              </DialogFooter>
            )}

            {isActorComplete && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Este {getActorTypeLabel(actorType).toLowerCase()} ya está marcado como completo
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No se encontraron datos del actor
          </div>
        )}
      </DialogContent>

      {/* Force-confirm Dialog — only opens when the first attempt failed with
          requiresForce: true. Lists what's missing so the admin sees exactly
          what they're overriding before they confirm. */}
      <AlertDialog
        open={forceState !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelForce();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Marcar como completo con información faltante?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este {getActorTypeLabel(actorType).toLowerCase()} aún tiene
              información faltante. Si confirmas, será marcado como completo y
              la falta de información quedará registrada en el historial de la
              protección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-3">
            {forceState && forceState.missingFields.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">
                    Campos faltantes ({forceState.missingFields.length})
                  </div>
                  <ul className="list-disc list-inside text-sm">
                    {forceState.missingFields.slice(0, 10).map((mf, idx) => (
                      <li key={idx}>
                        {mf.field ?? 'Campo'}
                        {mf.message ? `: ${mf.message}` : ''}
                      </li>
                    ))}
                    {forceState.missingFields.length > 10 && (
                      <li>… y {forceState.missingFields.length - 10} más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {forceState && forceState.missingDocuments.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">
                    Documentos faltantes ({forceState.missingDocuments.length})
                  </div>
                  <ul className="list-disc list-inside text-sm">
                    {forceState.missingDocuments.slice(0, 10).map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                    {forceState.missingDocuments.length > 10 && (
                      <li>… y {forceState.missingDocuments.length - 10} más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelForce}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmForce}
              disabled={adminSubmitMutation.isPending}
            >
              {adminSubmitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar y Forzar Completo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
