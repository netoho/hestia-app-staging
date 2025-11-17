import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';

export interface UseFormWizardSubmissionConfig {
  actorType: 'aval' | 'tenant' | 'landlord' | 'joint-obligor';
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

export function useFormWizardSubmission(config: UseFormWizardSubmissionConfig) {
  const { toast } = useToast();
  const { actorType, token, isMultiActor = false, isAdminEdit = false } = config;

  /**
   * Handle tab save with validation
   */
  const handleSaveTab = useCallback(async (
    tabName: string,
    validateTab: () => boolean | { valid: boolean },
    getFormData: () => any,
    getAdditionalData?: () => any
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
      let submissionData: any = {
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
            landlords: cleanedFormData,
            partial: true,
          };
        }
      }

      // Make API call
      const endpoint = isAdminEdit
        ? `/api/actors/${actorType}/${token}` // Admin uses UUID
        : `/api/actors/${actorType}/${token}`; // Actor uses token (unified route handles both)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save');
      }

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
  }, [actorType, token, isMultiActor, isAdminEdit, toast]);

  /**
   * Handle final form submission
   */
  const handleFinalSubmit = useCallback(async (
    getFormData: () => any,
    requiredDocsUploaded: boolean,
    getReferences?: () => { personal?: any; commercial?: any },
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
      let submissionData: any = {
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

      // Make API call
      const endpoint = `/api/actors/${actorType}/${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to submit');
      }

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
  }, [actorType, token, isMultiActor, toast]);

  return {
    handleSaveTab,
    handleFinalSubmit,
  };
}