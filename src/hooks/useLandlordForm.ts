import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
import {
  validateEmail,
  validatePhone,
  validateCURP,
  validateRFC,
  validateRequired,
  VALIDATION_MESSAGES
} from '@/lib/utils/validationUtils';
import {
  LandlordData,
  PropertyDetails,
  PolicyFinancialDetails,
  PersonActorData,
  CompanyActorData
} from '@/lib/types/actor';

interface UseLandlordFormProps {
  token: string;
  initialData?: Partial<LandlordData>;
  policy?: any;
  isAdminEdit?: boolean;
}

export function useLandlordForm({
  token,
  initialData = {},
  policy,
  isAdminEdit = false
}: UseLandlordFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Support multiple landlords (primary + co-owners)
  const [landlords, setLandlords] = useState<Partial<LandlordData>[]>([
    {
      ...initialData,
      isCompany: initialData.isCompany || false,
      isPrimary: true, // First landlord is always primary
    }
  ]);

  const [propertyData, setPropertyData] = useState<Partial<PropertyDetails>>({
    isFurnished: false,
    hasElectricity: true,
    hasWater: true,
    hasGas: false,
    hasCableTV: false,
    hasInternet: false,
    hasPhone: false,
    utilitiesInLandlordName: false,
    hasInventory: false,
    hasRules: false,
    petsAllowed: false,
    ...(policy?.propertyDetails || {}),
  });

  const [policyFinancialData, setPolicyFinancialData] = useState<Partial<PolicyFinancialDetails>>({
    hasIVA: false,
    issuesTaxReceipts: false,
    maintenanceIncludedInRent: false,
    ...(policy ? {
      hasIVA: policy.hasIVA,
      issuesTaxReceipts: policy.issuesTaxReceipts,
      securityDeposit: policy.securityDeposit,
      maintenanceFee: policy.maintenanceFee,
      maintenanceIncludedInRent: policy.maintenanceIncludedInRent,
      rentIncreasePercentage: policy.rentIncreasePercentage,
      paymentMethod: policy.paymentMethod,
    } : {}),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update landlord field
  const updateLandlordField = useCallback((landlordIndex: number, field: string, value: any) => {
    setLandlords(prev => {
      const updated = [...prev];
      updated[landlordIndex] = { ...updated[landlordIndex], [field]: value };
      return updated;
    });
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${landlordIndex}_${field}`];
      return newErrors;
    });
  }, []);

  // Update property field
  const updatePropertyField = useCallback((field: string, value: any) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Update financial field
  const updateFinancialField = useCallback((field: string, value: any) => {
    setPolicyFinancialData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Add co-owner
  const addCoOwner = useCallback(() => {
    setLandlords(prev => [
      ...prev,
      {
        isCompany: false,
        isPrimary: false,
        email: '',
        phone: '',
        address: '',
      }
    ]);
  }, []);

  // Remove co-owner
  const removeCoOwner = useCallback((index: number) => {
    if (index === 0) return; // Can't remove primary landlord
    setLandlords(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Validate personal tab (all landlords)
  const validatePersonalTab = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    landlords.forEach((landlord, index) => {
      const prefix = index > 0 ? `${index}_` : '';

      if (landlord.isCompany) {
        // Company validation
        if (!landlord.companyName || !validateRequired(landlord.companyName)) {
          newErrors[`${prefix}companyName`] = VALIDATION_MESSAGES.required;
          valid = false;
        }
        if (!landlord.rfc || !validateRequired(landlord.rfc)) {
          newErrors[`${prefix}rfc`] = VALIDATION_MESSAGES.required;
          valid = false;
        } else if (landlord.rfc && !validateRFC(landlord.rfc, true)) {
          newErrors[`${prefix}rfc`] = VALIDATION_MESSAGES.invalidRFC;
          valid = false;
        }
      } else {
        // Person validation
        if (!landlord.firstName || !validateRequired(landlord.firstName)) {
          newErrors[`${prefix}firstName`] = VALIDATION_MESSAGES.required;
          valid = false;
        }
        if (!landlord.lastName1 || !validateRequired(landlord.lastName1)) {
          newErrors[`${prefix}lastName1`] = VALIDATION_MESSAGES.required;
          valid = false;
        }
      }

      // Common validations
      if (!landlord.email || !validateRequired(landlord.email)) {
        newErrors[`${prefix}email`] = VALIDATION_MESSAGES.required;
        valid = false;
      } else if (!validateEmail(landlord.email)) {
        newErrors[`${prefix}email`] = VALIDATION_MESSAGES.invalidEmail;
        valid = false;
      }

      if (!landlord.phone || !validateRequired(landlord.phone)) {
        newErrors[`${prefix}phone`] = VALIDATION_MESSAGES.required;
        valid = false;
      } else if (!validatePhone(landlord.phone)) {
        newErrors[`${prefix}phone`] = VALIDATION_MESSAGES.invalidPhone;
        valid = false;
      }

      if (!landlord.address || !validateRequired(landlord.address)) {
        newErrors[`${prefix}address`] = VALIDATION_MESSAGES.required;
        valid = false;
      }
    });

    return { valid, errors: newErrors };
  }, [landlords]);

  // Validate property tab
  const validatePropertyTab = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    if (!propertyData.propertyAddress || !validateRequired(propertyData.propertyAddress)) {
      newErrors.propertyAddress = VALIDATION_MESSAGES.required;
      valid = false;
    }

    if (!propertyData.propertyRentAmount || !validateRequired(propertyData.propertyRentAmount.toString())) {
      newErrors.propertyRentAmount = VALIDATION_MESSAGES.required;
      valid = false;
    }

    return { valid, errors: newErrors };
  }, [propertyData]);

  // Validate financial tab
  const validateFinancialTab = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    if (policyFinancialData.securityDeposit === undefined || policyFinancialData.securityDeposit === null) {
      newErrors.securityDeposit = VALIDATION_MESSAGES.required;
      valid = false;
    }

    return { valid, errors: newErrors };
  }, [policyFinancialData]);

  // Save tab data
  const saveTab = useCallback(async (tabName: string, isPartial: boolean = true) => {
    setSaving(true);
    setErrors({});

    try {
      // Clean addresses for all landlords
      const cleanedLandlords = landlords.map(landlord => {
        return cleanFormAddresses(landlord, ['addressDetails']);
      });

      // Clean property address
      const cleanPropertyData = cleanFormAddresses(propertyData, ['propertyAddressDetails']);

      // Normalize dates
      if (cleanPropertyData.propertyDeliveryDate) {
        cleanPropertyData.propertyDeliveryDate = cleanPropertyData.propertyDeliveryDate.split('T')[0];
      }
      if (cleanPropertyData.contractSigningDate) {
        cleanPropertyData.contractSigningDate = cleanPropertyData.contractSigningDate.split('T')[0];
      }

      // Merge financial data for financial tab
      const propertyWithFinancial = tabName === 'financial'
        ? { ...cleanPropertyData, ...policyFinancialData }
        : cleanPropertyData;

      // Prepare submission data
      let submissionData: any = {
        landlords: cleanedLandlords,
        propertyDetails: (tabName === 'property' || tabName === 'financial') ? propertyWithFinancial : undefined,
        partial: isPartial,
      };

      // Optimize submission data based on tab
      if (tabName === 'property') {
        submissionData.landlords = [{
          ...cleanedLandlords[0],
          isPrimary: true,
        }];
      }

      if (tabName === 'financial') {
        submissionData.landlords = [{
          ...cleanedLandlords[0],
          isPrimary: true,
          requiresCFDI: cleanedLandlords[0].requiresCFDI,
        }];
      }

      // Use appropriate endpoint
      const submitUrl = isAdminEdit
        ? `/api/admin/actors/landlord/${token}/submit`
        : `/api/actor/landlord/${token}/submit`;

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
        throw new Error(data.error || 'Error al guardar información');
      }

      return data;
    } finally {
      setSaving(false);
    }
  }, [landlords, propertyData, policyFinancialData, token, isAdminEdit]);

  return {
    // State
    landlords,
    propertyData,
    policyFinancialData,
    errors,
    saving,

    // Actions
    updateLandlordField,
    updatePropertyField,
    updateFinancialField,
    addCoOwner,
    removeCoOwner,
    setErrors,

    // Validation
    validatePersonalTab,
    validatePropertyTab,
    validateFinancialTab,

    // Save
    saveTab
  };
}