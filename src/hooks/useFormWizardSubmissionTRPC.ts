import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
import { emptyStringsToNull } from '@/lib/utils/dataTransform';
import { filterTenantFieldsByTab } from '@/lib/constants/tenantTabFields';
import { filterFieldsByTab } from '@/lib/constants/actorTabFields';
import { trpc } from '@/lib/trpc/client';
import type {
  ActorType,
  FormDataMap,
  ReferencesData,
  AdditionalData,
  SubmissionPayload,
  ValidationResult,
} from './types/formWizardSubmission';

export interface UseFormWizardSubmissionConfig {
  actorType: ActorType;
  token: string;
  isMultiActor?: boolean; // For landlord with co-owners
  isAdminEdit?: boolean;
}

// Actor-specific address field configurations
const ACTOR_ADDRESS_FIELDS = {
  aval: ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails'],
  tenant: ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails'],
  'joint-obligor': ['addressDetails', 'employerAddressDetails', 'propertyAddressDetails'],
  landlord: ['addressDetails'], // Only for primary landlord
};

// Toast messages
const TOAST_MESSAGES = {
  saving: {
    title: "Guardando...",
    description: "Guardando información...",
  },
  saved: {
    title: "✓ Guardado",
    description: "Información guardada exitosamente",
  },
  saveError: {
    title: "Error",
    description: "Error al guardar la información",
    variant: "destructive" as const,
  },
  submitting: {
    title: "Enviando...",
    description: "Enviando información...",
  },
  submitted: {
    title: "✓ Información Enviada",
    description: "Tu información ha sido enviada exitosamente",
  },
  submitError: {
    title: "Error",
    description: "Error al enviar la información",
    variant: "destructive" as const,
  },
  missingDocs: {
    title: "Documentos requeridos",
    description: "Por favor cargue todos los documentos requeridos antes de enviar",
    variant: "destructive" as const,
  },
};

export function useFormWizardSubmissionTRPC(config: UseFormWizardSubmissionConfig) {
  const { toast } = useToast();
  const { actorType, token, isMultiActor = false, isAdminEdit = false } = config;
  const utils = trpc.useUtils();

  // Use tRPC mutation
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      // Invalidate actor data to refetch with updated values
      // Convert actorType to match tRPC schema
      const tRPCActorType = actorType === 'joint-obligor' ? 'jointObligor' : actorType;
      utils.actor.getByToken.invalidate({
        type: tRPCActorType as 'tenant' | 'landlord' | 'aval' | 'jointObligor',
        token
      });
      if (actorType === 'landlord') {
        utils.actor.getManyByToken.invalidate({ type: 'landlord', token });
      }
    },
  });

  /**
   * Handle tab save with validation
   */
  const handleSaveTab = useCallback(async (
    tabName: string,
    validateTab: () => ValidationResult,
    getFormData: () => FormDataMap[ActorType],
    getAdditionalData?: () => AdditionalData,
    getReferences?: () => ReferencesData
  ): Promise<{ saved: boolean; submitted?: boolean; error?: string }> => {
    // Validate tab data
    const validationResult = validateTab();
    const isValid = typeof validationResult === 'boolean'
      ? validationResult
      : validationResult.valid;

    if (!isValid) {
      return { saved: false, submitted: false };
    }

    try {
      const formData = getFormData();
      const additionalData = getAdditionalData ? getAdditionalData() : {};

      // Filter form data to only include fields relevant to current tab
      // This prevents validation errors on unfilled tabs
      let filteredFormData: any;

      if (actorType === 'tenant') {
        // Use tenant-specific filtering with proper type handling
        const tenantType = formData.tenantType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
        filteredFormData = filterTenantFieldsByTab(
          formData,
          tenantType,
          tabName
        );
      } else {
        // Use generic filtering for other actors
        const tabFieldsActorType = actorType === 'joint-obligor' ? 'jointObligor' : actorType;
        filteredFormData = filterFieldsByTab(
          formData,
          tabFieldsActorType as 'landlord' | 'aval' | 'jointObligor',
          tabName
        );
      }

      // Clean address fields before submission
      const addressFields = ACTOR_ADDRESS_FIELDS[actorType];
      const cleanedAddresses = cleanFormAddresses(filteredFormData, addressFields);

      // Transform empty strings to null for database consistency
      const cleanedFormData = emptyStringsToNull(cleanedAddresses);

      // Prepare submission data
      let submissionData: SubmissionPayload = {
        ...cleanedFormData,
        ...additionalData,
        partial: true, // Indicates this is a tab save, not final submission
        tabName, // Include which tab is being saved
      };



      // Special handling for references tab
      if (tabName === 'references' && getReferences) {
        const references = getReferences();
        if (references.personal) {
          submissionData.references = references.personal;
        }
        if (references.commercial) {
          submissionData.commercialReferences = references.commercial;
        }
      }

      // Special handling for landlord multi-actor
      if (isMultiActor && actorType === 'landlord') {
        // For property/financial tabs, only send primary landlord
        if (tabName === 'property' || tabName === 'financial') {
          const landlords = Array.isArray(cleanedFormData) ? cleanedFormData : [cleanedFormData];
          submissionData = {
            landlords: [{ ...landlords[0], isPrimary: true }],
            ...additionalData,
            partial: true,
          };
        } else {
          // For personal tab, send all landlords
          submissionData = {
            ...cleanedFormData,
            partial: true,
          };
        }
      }

      // Make tRPC mutation call
      // The dual-auth update mutation accepts both token and UUID as identifier
      console.log('Submission Data:', submissionData)
      const result = await updateMutation.mutateAsync({
        type: actorType === 'joint-obligor' ? 'jointObligor' : actorType,
        identifier: token, // Can be token or UUID - router handles both
        data: submissionData,
      });

      // Check if this was the last tab that auto-submitted
      if ('submitted' in result && result.submitted) {
        toast({
          title: "✓ Información Enviada",
          description: "Tu información ha sido enviada exitosamente. Ya no podrás realizar cambios.",
        });
        return { saved: true, submitted: true };
      } else if ('submissionError' in result && result.submissionError) {
        // Save succeeded but submission failed (last tab scenario)
        toast({
          title: "⚠️ Guardado pero no enviado",
          description: result.submissionError,
          variant: "destructive" as const,
        });
        return { saved: true, submitted: false, error: result.submissionError };
      } else {
        toast(TOAST_MESSAGES.saved);
        return { saved: true, submitted: false };
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        ...TOAST_MESSAGES.saveError,
        description: error instanceof Error ? error.message : TOAST_MESSAGES.saveError.description,
      });
      return { saved: false, submitted: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }, [actorType, token, isMultiActor, isAdminEdit, toast, updateMutation]);

  /**
   * Handle final form submission
   */
  const handleFinalSubmit = useCallback(async (
    getFormData: () => FormDataMap[ActorType],
    requiredDocsUploaded: boolean,
    getReferences?: () => ReferencesData,
    onComplete?: () => void
  ): Promise<boolean> => {
    // Check required documents
    if (!requiredDocsUploaded) {
      toast(TOAST_MESSAGES.missingDocs);
      return false;
    }

    try {
      const formData = getFormData();
      const references = getReferences ? getReferences() : {};

      // Clean address fields before submission
      const addressFields = ACTOR_ADDRESS_FIELDS[actorType];
      const cleanedAddresses = cleanFormAddresses(formData, addressFields);

      // Transform empty strings to null for database consistency
      const cleanedFormData = emptyStringsToNull(cleanedAddresses);

      // Prepare final submission data
      let submissionData: SubmissionPayload = {
        ...cleanedFormData,
        informationComplete: true, // Mark as complete submission
      };

      // Add references if applicable
      if (references.personal || references.commercial) {
        // For companies, use commercial references; for individuals, use personal
        const isCompany = cleanedFormData.isCompany || cleanedFormData.tenantType === 'COMPANY';

        if (isCompany && references.commercial) {
          submissionData.commercialReferences = references.commercial;
        } else if (!isCompany && references.personal) {
          submissionData.references = references.personal;
        }

        // Some actors support both types
        if (actorType === 'tenant' || actorType === 'joint-obligor') {
          if (references.personal) submissionData.references = references.personal;
          if (references.commercial) submissionData.commercialReferences = references.commercial;
        }
      }

      // Special handling for landlord multi-actor
      if (isMultiActor && actorType === 'landlord') {
        submissionData = {
          landlords: Array.isArray(cleanedFormData) ? cleanedFormData : [cleanedFormData],
          informationComplete: true,
        };
      }

      console.log('Final Submission Data:', submissionData);
      // Make tRPC mutation call
      await updateMutation.mutateAsync({
        type: actorType === 'joint-obligor' ? 'jointObligor' : actorType,
        identifier: token,
        data: submissionData,
      });

      toast(TOAST_MESSAGES.submitted);

      if (onComplete) {
        onComplete();
      }

      return true;
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        ...TOAST_MESSAGES.submitError,
        description: error instanceof Error ? error.message : TOAST_MESSAGES.submitError.description,
      });
      return false;
    }
  }, [actorType, token, isMultiActor, toast, updateMutation]);

  /**
   * Handle manual submission (for retry scenarios)
   */
  const handleManualSubmit = useCallback(async (): Promise<boolean> => {
    try {
      // Use the submitActor endpoint directly
      const result = await updateMutation.mutateAsync({
        type: actorType === 'joint-obligor' ? 'jointObligor' : actorType,
        identifier: token,
        data: {}, // No data needed, just marking as complete
      });

      // Note: We might want to create a separate submitActor mutation for this
      // For now, we'll use a workaround by calling the update with a special flag

      toast({
        title: "✓ Información Enviada",
        description: "Tu información ha sido enviada exitosamente",
      });

      return true;
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error al enviar",
        description: error instanceof Error ? error.message : "Error al enviar información",
        variant: "destructive" as const,
      });
      return false;
    }
  }, [actorType, token, toast, updateMutation]);

  return {
    handleSaveTab,
    handleFinalSubmit,
    handleManualSubmit,
    isSaving: updateMutation.isPending,
  };
}
