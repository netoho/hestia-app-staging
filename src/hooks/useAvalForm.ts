import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface AvalFormData {
  id?: string;

  // Type
  isCompany: boolean;

  // Individual Information
  fullName?: string;
  nationality?: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  rfc?: string;
  passport?: string;
  relationshipToTenant?: string;

  // Company Information
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepId?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Contact Information
  email: string;
  phone: string;
  workPhone?: string;
  personalEmail?: string;
  workEmail?: string;

  // Address Information
  address?: string;
  addressDetails?: any;
  employerAddressDetails?: any;

  // Employment (for individuals)
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  employerAddress?: string;
  position?: string;
  monthlyIncome?: number;
  incomeSource?: string;

  // Property Guarantee Information (MANDATORY for Aval)
  propertyAddress?: string;
  guaranteePropertyDetails?: any;
  propertyValue?: number;
  propertyUnderLegalProceeding?: boolean;

  // Marriage Information
  maritalStatus?: string;
  spouseName?: string;
  spouseRfc?: string;
  spouseCurp?: string;

  // Status
  informationComplete?: boolean;
  additionalInfo?: string;
}

export function useAvalForm(initialData: Partial<AvalFormData> = {}, isAdminEdit: boolean = false) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AvalFormData>({
    isCompany: false,
    email: '',
    phone: '',
    nationality: 'MEXICAN',
    propertyUnderLegalProceeding: false,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const validatePersonalTab = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.isCompany) {
      // Individual validation
      if (!formData.fullName) {
        newErrors.fullName = 'Nombre completo es requerido';
      }
      if (formData.nationality === 'MEXICAN' && !formData.curp) {
        newErrors.curp = 'CURP es requerido para ciudadanos mexicanos';
      }
      if (formData.nationality === 'FOREIGN' && !formData.passport) {
        newErrors.passport = 'Pasaporte es requerido para extranjeros';
      }
    } else {
      // Company validation
      if (!formData.companyName) {
        newErrors.companyName = 'Razón social es requerida';
      }
      if (!formData.companyRfc) {
        newErrors.companyRfc = 'RFC de la empresa es requerido';
      }
      if (!formData.legalRepName) {
        newErrors.legalRepName = 'Nombre del representante es requerido';
      }
    }

    if (!formData.email) {
      newErrors.email = 'Email es requerido';
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    if (!formData.phone) {
      newErrors.phone = 'Teléfono es requerido';
    } else if (formData.phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Teléfono debe tener 10 dígitos';
    }

    // CURP validation
    if (formData.curp) {
      const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
      if (!curpPattern.test(formData.curp)) {
        newErrors.curp = 'CURP inválido';
      }
    }

    // RFC validation
    if (formData.rfc) {
      const rfcPattern = formData.isCompany
        ? /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/
        : /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;

      if (!rfcPattern.test(formData.rfc)) {
        newErrors.rfc = formData.isCompany
          ? 'RFC de empresa inválido (formato: AAA123456XXX)'
          : 'RFC de persona física inválido (formato: AAAA123456XXX)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validatePropertyTab = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Property validation (MANDATORY for Aval)
    if (!formData.propertyAddress && !formData.guaranteePropertyDetails) {
      newErrors.propertyAddress = 'Dirección de la propiedad es requerida';
    }
    if (!formData.propertyValue || formData.propertyValue <= 0) {
      newErrors.propertyValue = 'Valor de la propiedad debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const saveTab = useCallback(async (
    token: string,
    tabName: string,
    additionalData?: any
  ): Promise<boolean> => {
    setSaving(true);
    setErrors({});

    try {
      // Clean addressDetails to remove id and timestamps
      const cleanFormData = { ...formData };
      if (cleanFormData.addressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.addressDetails as any;
        cleanFormData.addressDetails = cleanAddress;
      }
      if (cleanFormData.employerAddressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.employerAddressDetails as any;
        cleanFormData.employerAddressDetails = cleanAddress;
      }
      if (cleanFormData.guaranteePropertyDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.guaranteePropertyDetails as any;
        cleanFormData.guaranteePropertyDetails = cleanAddress;
      }

      const submissionData = {
        ...cleanFormData,
        ...additionalData,
        partial: true,
      };

      const submitUrl = isAdminEdit
        ? `/api/admin/actors/aval/${token}/submit`
        : `/api/actor/aval/${token}/submit`;

      const response = await fetch(submitUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details.errors)) {
          const fieldErrors: Record<string, string> = {};
          data.details.errors.forEach((error: any) => {
            if (error.field) {
              fieldErrors[error.field.split('.').pop()] = error.message;
            }
          });
          setErrors(fieldErrors);
        }

        toast({
          title: "Error",
          description: data.error || 'Error al guardar información',
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "✓ Guardado",
        description: `Información guardada exitosamente`,
      });

      return true;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: 'Error al guardar la información',
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, toast, isAdminEdit]);

  return {
    formData,
    setFormData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    validatePropertyTab,
    saveTab,
  };
}
