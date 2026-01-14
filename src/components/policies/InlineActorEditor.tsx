'use client';

import { useDialogState } from '@/lib/hooks/useDialogState';
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
  const completeConfirmDialog = useDialogState();

  // Admin submit mutation
  const adminSubmitMutation = trpc.actor.adminSubmitActor.useMutation({
    onSuccess: () => {
      toast({
        title: 'Actor marcado como completo',
        description: `El ${getActorTypeLabel(actorType).toLowerCase()} ha sido marcado como completo exitosamente`,
      });
      // Invalidate queries
      utils.actor.listByPolicy.invalidate({ policyId });
      if (actorType !== 'landlord') {
        utils.actor.getById.invalidate({ type: actorType, id: actorId });
      }
      onSave?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al marcar como completo',
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

  // Handle mark as complete
  const handleMarkComplete = (skipValidation: boolean) => {
    adminSubmitMutation.mutate({
      type: actorType,
      id: actorId,
      skipValidation,
    });
    completeConfirmDialog.close();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {getActorTypeLabel(actorType)}</DialogTitle>
          <DialogDescription>
            Actualice la informacion del {getActorTypeLabel(actorType).toLowerCase()} para esta protección
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasData ? (
          <>
            <div className="mt-4">
              {getFormWizard()}
            </div>

            {/* Mark Complete Section */}
            {!isActorComplete && (
              <DialogFooter className="mt-6 pt-4 border-t">
                <div className="flex w-full items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Marcar como completo cuando toda la informacion este lista
                  </div>
                  <Button
                    variant="outline"
                    onClick={completeConfirmDialog.open}
                    disabled={adminSubmitMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Completo
                  </Button>
                </div>
              </DialogFooter>
            )}

            {isActorComplete && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Este {getActorTypeLabel(actorType).toLowerCase()} ya esta marcado como completo
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

      {/* Confirmation Dialog */}
      <AlertDialog open={completeConfirmDialog.isOpen} onOpenChange={(open) => !open && completeConfirmDialog.close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar {getActorTypeLabel(actorType)} como Completo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcara al {getActorTypeLabel(actorType).toLowerCase()} como completo.
              Si faltan documentos requeridos, puede elegir continuar de todas formas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Si hay documentos faltantes, se mostrara un error. Use &quot;Forzar Completo&quot; para omitir la validacion.
              </AlertDescription>
            </Alert>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleMarkComplete(true)}
              disabled={adminSubmitMutation.isPending}
            >
              Forzar Completo
            </Button>
            <AlertDialogAction
              onClick={() => handleMarkComplete(false)}
              disabled={adminSubmitMutation.isPending}
            >
              {adminSubmitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Marcar Completo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
