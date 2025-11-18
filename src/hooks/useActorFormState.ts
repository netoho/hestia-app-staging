import { useState, useCallback, useEffect } from 'react';
import { ActorType } from '@/lib/enums';
import type {
  Tenant,
  Aval,
  JointObligor,
  Landlord,
  Policy
} from '@prisma/client';

// Type definitions for different actor data structures
type SingleActorData = Tenant | Aval | JointObligor;
type MultiActorData = Landlord[];

type ActorDataMap = {
  tenant: Tenant;
  aval: Aval;
  jointObligor: JointObligor;
  landlord: Landlord[];
};

// Additional data specific to landlord
type LandlordAdditionalData = {
  propertyData: any; // Replace with proper type
  policyFinancialData: any; // Replace with proper type
};

// Return types for different actor patterns
type SingleActorReturn<T extends SingleActorData> = {
  formData: T;
  updateField: (field: keyof T, value: any) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isMultiActor: false;
};

type MultiActorReturn = {
  actors: Landlord[];
  updateActorField: (index: number, field: keyof Landlord, value: any) => void;
  addActor: () => void;
  removeActor: (index: number) => void;
  propertyData: LandlordAdditionalData['propertyData'];
  updatePropertyField: (field: string, value: any) => void;
  policyFinancialData: LandlordAdditionalData['policyFinancialData'];
  updateFinancialField: (field: string, value: any) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isMultiActor: true;
};

// Hook configuration options
type UseActorFormStateOptions<T extends ActorType> = {
  actorType: T;
  initialData?: ActorDataMap[T];
  policy?: Policy | null;
  isAdminEdit?: boolean;
  token?: string | null;
};

// Create default data for new actors
const createDefaultActorData = (actorType: ActorType): any => {
  const baseData = {
    firstName: '',
    middleName: '',
    paternalLastName: '',
    maternalLastName: '',
    isCompany: false,
    companyName: '',
    rfc: '',
    email: '',
    phone: '',
  };

  switch (actorType) {
    case 'tenant':
      return {
        ...baseData,
        tenantType: 'INDIVIDUAL',
        currentAddress: '',
        workInfo: '',
        monthlyIncome: '',
        additionalIncome: '',
        previousLandlordName: '',
        previousLandlordPhone: '',
        previousRentAmount: '',
        reasonForMoving: '',
      };
    case 'aval':
      return {
        ...baseData,
        relationship: '',
        occupation: '',
        monthlyIncome: '',
        currentAddress: '',
        propertyAddress: '',
        propertyValue: '',
        propertyStatus: 'OWNED',
      };
    case 'jointObligor':
      return {
        ...baseData,
        relationship: '',
        occupation: '',
        monthlyIncome: '',
        currentAddress: '',
      };
    case 'landlord':
      return {
        ...baseData,
        isPrimary: true,
        ownershipPercentage: 100,
        bankName: '',
        accountHolder: '',
        clabe: '',
      };
    default:
      return baseData;
  }
};

// Create default property data for landlord
const createDefaultPropertyData = () => ({
  address: '',
  propertyType: 'APARTMENT',
  size: '',
  bedrooms: '',
  bathrooms: '',
  parkingSpaces: '',
  furnished: false,
  amenities: '',
});

// Create default financial data for landlord
const createDefaultFinancialData = () => ({
  monthlyRent: '',
  deposit: '',
  depositMonths: 1,
  advanceRent: '',
  advanceRentMonths: 0,
  maintenanceFee: '',
  paymentDay: 1,
  leaseTerm: 12,
});

// Type guard to check if actor type is multi-actor
const isMultiActorType = (actorType: ActorType): actorType is 'landlord' => {
  return actorType === 'landlord';
};

// Main hook with overloaded signatures for type safety
export function useActorFormState<T extends ActorType>(
  options: UseActorFormStateOptions<T>
): T extends 'landlord' ? MultiActorReturn : SingleActorReturn<ActorDataMap[T]> {
  const { actorType, initialData, policy } = options;
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Multi-actor state (Landlord)
  const [actors, setActors] = useState<Landlord[]>(() => {
    if (isMultiActorType(actorType)) {
      const data = initialData as Landlord[] | undefined;
      return data && data.length > 0 ? data : [createDefaultActorData('landlord')];
    }
    return [];
  });

  const [propertyData, setPropertyData] = useState(() =>
    isMultiActorType(actorType) ? createDefaultPropertyData() : null
  );

  const [policyFinancialData, setPolicyFinancialData] = useState(() =>
    isMultiActorType(actorType) ? createDefaultFinancialData() : null
  );

  // Single-actor state (Tenant, Aval, JointObligor)
  const [formData, setFormData] = useState<SingleActorData>(() => {
    if (!isMultiActorType(actorType)) {
      const data = initialData as SingleActorData | undefined;
      return data || createDefaultActorData(actorType);
    }
    return createDefaultActorData(actorType);
  });

  // Single-actor update method
  const updateField = useCallback((field: string, value: any) => {
    if (!isMultiActorType(actorType)) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
      // Clear error for this field when it's updated
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  }, [actorType, errors]);

  // Multi-actor methods
  const updateActorField = useCallback((index: number, field: string, value: any) => {
    if (isMultiActorType(actorType)) {
      setActors(prev => {
        const newActors = [...prev];
        if (newActors[index]) {
          newActors[index] = {
            ...newActors[index],
            [field]: value,
          };
        }
        return newActors;
      });
      // Clear error for this field
      const errorKey = `actor${index}.${field}`;
      if (errors[errorKey]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  }, [actorType, errors]);

  const addActor = useCallback(() => {
    if (isMultiActorType(actorType)) {
      setActors(prev => [
        ...prev,
        {
          ...createDefaultActorData('landlord'),
          isPrimary: false,
          ownershipPercentage: 0,
        },
      ]);
    }
  }, [actorType]);

  const removeActor = useCallback((index: number) => {
    if (isMultiActorType(actorType) && actors.length > 1) {
      setActors(prev => prev.filter((_, i) => i !== index));
      // Clear errors for removed actor
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`actor${index}.`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  }, [actorType, actors.length]);

  const updatePropertyField = useCallback((field: string, value: any) => {
    if (isMultiActorType(actorType)) {
      setPropertyData(prev => prev ? {
        ...prev,
        [field]: value,
      } : null);
      // Clear error
      const errorKey = `property.${field}`;
      if (errors[errorKey]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  }, [actorType, errors]);

  const updateFinancialField = useCallback((field: string, value: any) => {
    if (isMultiActorType(actorType)) {
      setPolicyFinancialData(prev => prev ? {
        ...prev,
        [field]: value,
      } : null);
      // Clear error
      const errorKey = `financial.${field}`;
      if (errors[errorKey]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  }, [actorType, errors]);

  // Initialize data from policy if available (for landlord)
  useEffect(() => {
    if (isMultiActorType(actorType) && policy && !initialData) {
      // Initialize property data from policy
      if (policy.propertyAddress) {
        setPropertyData({
          address: policy.propertyAddress || '',
          propertyType: policy.propertyType || 'APARTMENT',
          size: policy.propertySize || '',
          bedrooms: policy.bedrooms?.toString() || '',
          bathrooms: policy.bathrooms?.toString() || '',
          parkingSpaces: policy.parkingSpaces?.toString() || '',
          furnished: policy.furnished || false,
          amenities: policy.amenities || '',
        });
      }
      // Initialize financial data from policy
      if (policy.monthlyRent) {
        setPolicyFinancialData({
          monthlyRent: policy.monthlyRent?.toString() || '',
          deposit: policy.depositAmount?.toString() || '',
          depositMonths: policy.depositMonths || 1,
          advanceRent: policy.advanceRent?.toString() || '',
          advanceRentMonths: policy.advanceRentMonths || 0,
          maintenanceFee: policy.maintenanceFee?.toString() || '',
          paymentDay: policy.paymentDay || 1,
          leaseTerm: policy.leaseTerm || 12,
        });
      }
    }
  }, [actorType, policy, initialData]);

  // Return type-safe result based on actor type
  if (isMultiActorType(actorType)) {
    return {
      actors,
      updateActorField,
      addActor,
      removeActor,
      propertyData,
      updatePropertyField,
      policyFinancialData,
      updateFinancialField,
      errors,
      setErrors,
      isMultiActor: true,
    } as any;
  } else {
    return {
      formData,
      updateField,
      errors,
      setErrors,
      isMultiActor: false,
    } as any;
  }
}
