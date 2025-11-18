import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
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
      utils.actor.getByToken.invalidate({ type: actorType, token });
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
    getAdditionalData?: () => AdditionalData
  ): Promise<boolean> => {
    // Validate tab data
    const validationResult = validateTab();
    const isValid = typeof validationResult === 'boolean'
      ? validationResult
      : validationResult.valid;

    if (!isValid) {
      return false;
    }

    try {
      const formData = getFormData();
      const additionalData = getAdditionalData ? getAdditionalData() : {};

      // Clean address fields before submission
      const addressFields = ACTOR_ADDRESS_FIELDS[actorType];
      const cleanedFormData = cleanFormAddresses(formData, addressFields);

      // Prepare submission data
      let submissionData: SubmissionPayload = {
        ...cleanedFormData,
        ...additionalData,
        partial: true, // Indicates this is a tab save, not final submission
      };

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
      await updateMutation.mutateAsync({
        type: actorType === 'joint-obligor' ? 'jointObligor' : actorType,
        identifier: token, // Can be token or UUID - router handles both
        data: submissionData,
      });

      toast(TOAST_MESSAGES.saved);
      return true;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        ...TOAST_MESSAGES.saveError,
        description: error instanceof Error ? error.message : TOAST_MESSAGES.saveError.description,
      });
      return false;
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
      const cleanedFormData = cleanFormAddresses(formData, addressFields);

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

  return {
    handleSaveTab,
    handleFinalSubmit,
    isSaving: updateMutation.isPending,
  };
}
