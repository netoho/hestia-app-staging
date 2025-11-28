import { useState, useCallback } from 'react';

export interface PersonalReference {
  id?: string;
  firstName: string;
  middleName?: string;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  email?: string;
  relationship: string;
  occupation?: string;
  address?: string; // Optional for JointObligor
}

export interface CommercialReference {
  id?: string;
  companyName: string;
  contactFirstName: string;
  contactMiddleName?: string;
  contactPaternalLastName: string;
  contactMaternalLastName: string;
  phone: string;
  email?: string;
  relationship: string;
  yearsOfRelationship?: number;
}

export interface UseActorReferencesConfig {
  initialPersonal?: PersonalReference[];
  initialCommercial?: CommercialReference[];
  allowAddRemove?: boolean; // For tenant's dynamic references
  includeAddressField?: boolean; // For jointObligor's address requirement
  errorKeyPrefix?: string; // For different error key patterns
}

// Type overloads for better type inference
export function useActorReferences(config: UseActorReferencesConfig & { allowAddRemove: true }): {
  personalReferences: PersonalReference[];
  commercialReferences: CommercialReference[];
  updatePersonalReference: (index: number, field: string, value: any) => void;
  updateCommercialReference: (index: number, field: string, value: any) => void;
  validatePersonalReferences: () => { valid: boolean; errors: Record<string, string> };
  validateCommercialReferences: () => { valid: boolean; errors: Record<string, string> };
  addPersonalReference: () => void;
  addCommercialReference: () => void;
  removePersonalReference: (index: number) => void;
  removeCommercialReference: (index: number) => void;
};

export function useActorReferences(config?: UseActorReferencesConfig): {
  personalReferences: PersonalReference[];
  commercialReferences: CommercialReference[];
  updatePersonalReference: (index: number, field: string, value: any) => void;
  updateCommercialReference: (index: number, field: string, value: any) => void;
  validatePersonalReferences: () => { valid: boolean; errors: Record<string, string> };
  validateCommercialReferences: () => { valid: boolean; errors: Record<string, string> };
  addPersonalReference?: () => void;
  addCommercialReference?: () => void;
  removePersonalReference?: (index: number) => void;
  removeCommercialReference?: (index: number) => void;
};

export function useActorReferences({
  initialPersonal = [],
  initialCommercial = [],
  allowAddRemove = false,
  includeAddressField = false,
  errorKeyPrefix = 'personalReference',
}: UseActorReferencesConfig = {}) {
  // Create default personal references with optional address field
  const createDefaultPersonalReference = (): PersonalReference => {
    const base: PersonalReference = {
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      phone: '',
      email: '',
      relationship: '',
      occupation: '',
    };
    if (includeAddressField) {
      base.address = '';
    }
    return base;
  };

  const createDefaultCommercialReference = (): CommercialReference => ({
    companyName: '',
    contactFirstName: '',
    contactMiddleName: '',
    contactPaternalLastName: '',
    contactMaternalLastName: '',
    phone: '',
    email: '',
    relationship: '',
    yearsOfRelationship: 0,
  });

  // Initialize state with 3 default references if not provided
  const [personalReferences, setPersonalReferences] = useState<PersonalReference[]>(
    initialPersonal.length > 0
      ? initialPersonal
      : [
          createDefaultPersonalReference(),
          createDefaultPersonalReference(),
          createDefaultPersonalReference(),
        ]
  );

  const [commercialReferences, setCommercialReferences] = useState<CommercialReference[]>(
    initialCommercial.length > 0
      ? initialCommercial
      : [
          createDefaultCommercialReference(),
          createDefaultCommercialReference(),
          createDefaultCommercialReference(),
        ]
  );

  // Update functions
  const updatePersonalReference = useCallback((index: number, field: string, value: any) => {
    setPersonalReferences(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateCommercialReference = useCallback((index: number, field: string, value: any) => {
    setCommercialReferences(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Add/Remove functions (only if allowed)
  const addPersonalReference = useCallback(() => {
    if (!allowAddRemove) return;
    setPersonalReferences(prev => [...prev, createDefaultPersonalReference()]);
  }, [allowAddRemove, includeAddressField]);

  const addCommercialReference = useCallback(() => {
    if (!allowAddRemove) return;
    setCommercialReferences(prev => [...prev, createDefaultCommercialReference()]);
  }, [allowAddRemove]);

  const removePersonalReference = useCallback((index: number) => {
    if (!allowAddRemove) return;
    setPersonalReferences(prev => prev.filter((_, i) => i !== index));
  }, [allowAddRemove]);

  const removeCommercialReference = useCallback((index: number) => {
    if (!allowAddRemove) return;
    setCommercialReferences(prev => prev.filter((_, i) => i !== index));
  }, [allowAddRemove]);

  // Validation functions
  const validatePersonalReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    personalReferences.forEach((ref, index) => {
      // Check required fields
      if (!ref.firstName || !ref.paternalLastName || !ref.maternalLastName || !ref.phone || !ref.relationship) {
        // Use different error key based on configuration (for tenant compatibility)
        const key = errorKeyPrefix === 'reference'
          ? `reference${index}`
          : `${errorKeyPrefix}${index}`;
        errors[key] = `Complete la referencia personal ${index + 1}`;
      }

      // Phone validation (10 digits)
      if (ref.phone && ref.phone.replace(/\D/g, '').length !== 10) {
        errors[`${errorKeyPrefix}${index}Phone`] = `Teléfono de referencia ${index + 1} debe tener 10 dígitos`;
      }

      // Email validation
      if (ref.email && !emailPattern.test(ref.email)) {
        errors[`${errorKeyPrefix}${index}Email`] = `Email de referencia ${index + 1} inválido`;
      }

      // Address validation if required
      if (includeAddressField && !ref.address) {
        errors[`${errorKeyPrefix}${index}Address`] = `Dirección de referencia ${index + 1} es requerida`;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [personalReferences, errorKeyPrefix, includeAddressField]);

  const validateCommercialReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    commercialReferences.forEach((ref, index) => {
      // Check required fields
      if (!ref.companyName || !ref.contactFirstName || !ref.contactPaternalLastName ||
          !ref.contactMaternalLastName || !ref.phone) {
        errors[`commercialReference${index}`] = `Complete la referencia comercial ${index + 1}`;
      }

      // Phone validation (10 digits)
      if (ref.phone && ref.phone.replace(/\D/g, '').length !== 10) {
        errors[`commercialReference${index}Phone`] = `Teléfono de referencia ${index + 1} debe tener 10 dígitos`;
      }

      // Email validation
      if (ref.email && !emailPattern.test(ref.email)) {
        errors[`commercialReference${index}Email`] = `Email de referencia ${index + 1} inválido`;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [commercialReferences]);

  // Return object includes add/remove functions only if allowed
  const baseReturn = {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  };

  if (allowAddRemove) {
    return {
      ...baseReturn,
      addPersonalReference,
      addCommercialReference,
      removePersonalReference,
      removeCommercialReference,
    };
  }

  return baseReturn;
}