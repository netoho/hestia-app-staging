'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Import existing form wizards
import TenantFormWizard from '@/components/actor/tenant/TenantFormWizard';
import LandlordFormWizard from '@/components/actor/landlord/LandlordFormWizard';
import AvalFormWizard from '@/components/actor/aval/AvalFormWizard';
import JointObligorFormWizard from '@/components/actor/joint-obligor/JointObligorFormWizard';

interface InlineActorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  actor: any;
  actorType: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
  policy: any;
  onSave?: () => Promise<void>;
}

export default function InlineActorEditor({
  isOpen,
  onClose,
  actor,
  actorType,
  policy,
  onSave,
}: InlineActorEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const getActorTypeLabel = () => {
    switch (actorType) {
      case 'tenant':
        return 'Inquilino';
      case 'landlord':
        return 'Arrendador';
      case 'aval':
        return 'Aval';
      case 'jointObligor':
        return 'Obligado Solidario';
      default:
        return 'Actor';
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      if (onSave) {
        await onSave();
      }

      toast({
        title: 'Información actualizada',
        description: `La información del ${getActorTypeLabel().toLowerCase()} ha sido actualizada exitosamente`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving actor:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar la información',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getFormWizard = () => {
    // For admin editing, pass the actor ID and indicate admin mode
    // The form wizards will use admin endpoints instead of token-based endpoints
    const wizardProps = {
      token: actor?.id, // Pass actor ID instead of token
      isAdminEdit: true, // Flag to indicate this is an admin edit
      initialData: actor,
      policy,
      onComplete: handleComplete,
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
          <DialogTitle>Editar {getActorTypeLabel()}</DialogTitle>
          <DialogDescription>
            Actualice la información del {getActorTypeLabel().toLowerCase()} para esta protección
          </DialogDescription>
        </DialogHeader>

        {saving ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4">
            {getFormWizard()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
