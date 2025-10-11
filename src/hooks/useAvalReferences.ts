import { useState, useCallback } from 'react';

export interface PersonalReference {
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  occupation?: string;
}

export interface CommercialReference {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  relationship: string;
  yearsOfRelationship?: number;
}

export function useAvalReferences(
  initialPersonal: PersonalReference[] = [],
  initialCommercial: CommercialReference[] = []
) {
  const [personalReferences, setPersonalReferences] = useState<PersonalReference[]>(
    initialPersonal.length > 0
      ? initialPersonal
      : [
          { name: '', phone: '', email: '', relationship: '', occupation: '' },
          { name: '', phone: '', email: '', relationship: '', occupation: '' },
          { name: '', phone: '', email: '', relationship: '', occupation: '' },
        ]
  );

  const [commercialReferences, setCommercialReferences] = useState<CommercialReference[]>(
    initialCommercial.length > 0
      ? initialCommercial
      : [
          { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
          { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
          { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
        ]
  );

  const updatePersonalReference = useCallback((index: number, field: string, value: string) => {
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

  const validatePersonalReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    personalReferences.forEach((ref, index) => {
      if (!ref.name || !ref.phone || !ref.relationship) {
        errors[`personalReference${index}`] = `Complete la referencia personal ${index + 1}`;
      }

      // Phone validation (10 digits)
      if (ref.phone && ref.phone.replace(/\D/g, '').length !== 10) {
        errors[`personalReference${index}Phone`] = `Teléfono de referencia ${index + 1} debe tener 10 dígitos`;
      }

      // Email validation
      if (ref.email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(ref.email)) {
          errors[`personalReference${index}Email`] = `Email de referencia ${index + 1} inválido`;
        }
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [personalReferences]);

  const validateCommercialReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    commercialReferences.forEach((ref, index) => {
      if (!ref.companyName || !ref.contactName || !ref.phone) {
        errors[`commercialReference${index}`] = `Complete la referencia comercial ${index + 1}`;
      }

      // Phone validation (10 digits)
      if (ref.phone && ref.phone.replace(/\D/g, '').length !== 10) {
        errors[`commercialReference${index}Phone`] = `Teléfono de referencia ${index + 1} debe tener 10 dígitos`;
      }

      // Email validation
      if (ref.email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(ref.email)) {
          errors[`commercialReference${index}Email`] = `Email de referencia ${index + 1} inválido`;
        }
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [commercialReferences]);

  return {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  };
}
