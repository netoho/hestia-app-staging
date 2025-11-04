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
  relationship?: string;
  yearsOfRelationship?: number;
}

export function useTenantReferences(
  initialPersonal: PersonalReference[] = [],
  initialCommercial: CommercialReference[] = []
) {
  const [personalReferences, setPersonalReferences] = useState<PersonalReference[]>(
    initialPersonal.length > 0
      ? initialPersonal
      : [
          { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '' },
          { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '' },
          { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '' },
        ]
  );

  const [commercialReferences, setCommercialReferences] = useState<CommercialReference[]>(
    initialCommercial.length > 0
      ? initialCommercial
      : [
          { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
          { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
          { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
        ]
  );

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

  const addPersonalReference = useCallback(() => {
    setPersonalReferences(prev => [
      ...prev,
      { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '' },
    ]);
  }, []);

  const addCommercialReference = useCallback(() => {
    setCommercialReferences(prev => [
      ...prev,
      { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
    ]);
  }, []);

  const removePersonalReference = useCallback((index: number) => {
    setPersonalReferences(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeCommercialReference = useCallback((index: number) => {
    setCommercialReferences(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validatePersonalReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    personalReferences.forEach((ref, index) => {
      if (!ref.firstName || !ref.paternalLastName || !ref.maternalLastName || !ref.phone || !ref.relationship) {
        errors[`reference${index}`] = `Complete la referencia personal ${index + 1}`;
      }
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }, [personalReferences]);

  const validateCommercialReferences = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    commercialReferences.forEach((ref, index) => {
      if (!ref.companyName || !ref.contactFirstName || !ref.contactPaternalLastName || !ref.contactMaternalLastName || !ref.phone) {
        errors[`commercialReference${index}`] = `Complete la referencia comercial ${index + 1}`;
      }
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }, [commercialReferences]);

  return {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    addPersonalReference,
    addCommercialReference,
    removePersonalReference,
    removeCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  };
}
