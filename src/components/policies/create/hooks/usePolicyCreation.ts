import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/hooks/use-toast';
import { generatePolicyNumber } from '@/lib/utils/policy';
import {
  PolicyCreationFormData,
  PropertyFormData,
  PricingFormData,
  LandlordFormData,
  TenantFormData,
  ActorFormData,
} from '../types';
import { PropertyType, GuarantorType, TenantType } from '@/lib/enums';

/**
 * Main hook for policy creation with tRPC
 */
export function usePolicyCreation() {
  const router = useRouter();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  // Initialize form data with defaults
  const [formData, setFormData] = useState<PolicyCreationFormData>({
    property: {
      policyNumber: generatePolicyNumber(),
      internalCode: '',
      propertyAddress: '',
      propertyAddressDetails: null,
      propertyType: PropertyType.APARTMENT,
      propertyDescription: '',
      rentAmount: '',
      depositAmount: '',
      contractLength: 12,
      startDate: '',
      endDate: '',
      parkingSpaces: 0,
      parkingNumbers: '',
      isFurnished: false,
      hasPhone: false,
      hasElectricity: true,
      hasWater: true,
      hasGas: false,
      hasCableTV: false,
      hasInternet: false,
      utilitiesInLandlordName: false,
      hasIVA: false,
      issuesTaxReceipts: false,
      securityDeposit: 1,
      maintenanceFee: '',
      maintenanceIncludedInRent: false,
      rentIncreasePercentage: '',
      paymentMethod: 'bank_transfer',
      hasInventory: false,
      hasRules: false,
      rulesType: undefined,
      petsAllowed: false,
      propertyDeliveryDate: '',
      contractSigningDate: '',
      contractSigningAddressDetails: null,
    },
    pricing: {
      packageId: '',
      tenantPercentage: 100,
      landlordPercentage: 0,
      manualPrice: null,
      isManualOverride: false,
    },
    landlord: {
      isCompany: false,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
      rfc: '',
    },
    tenant: {
      tenantType: TenantType.INDIVIDUAL,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      companyName: '',
      email: '',
      phone: '',
      rfc: '',
    },
    guarantorType: GuarantorType.NONE,
    jointObligors: [],
    avals: [],
    sendInvitations: true,
  });

  // tRPC mutations
  const createPolicyMutation = trpc.policy.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Protección creada',
        description: 'La protección se ha creado exitosamente',
      });
      router.push(`/dashboard/policies/${data.policy.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear la protección',
        variant: 'destructive',
      });
    },
  });

  const calculatePriceMutation = trpc.pricing.calculate.useMutation({
    onSuccess: (data) => {
      // Update pricing data with calculation result
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          manualPrice: prev.pricing.isManualOverride ? prev.pricing.manualPrice : data.subtotal,
        },
      }));
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Error al calcular el precio',
        variant: 'destructive',
      });
    },
  });

  const saveDraftMutation = trpc.policy.saveDraft.useMutation({
    onSuccess: () => {
      // Silent save, no notification
    },
  });

  // tRPC queries
  const packagesQuery = trpc.package.getAll.useQuery();

  const policyNumberQuery = trpc.policy.checkNumber.useQuery(
    { number: formData.property.policyNumber },
    {
      enabled: formData.property.policyNumber.length > 0,
      debounce: 500,
    }
  );

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.user) {
        saveDraftMutation.mutate({
          policyNumber: formData.property.policyNumber,
          propertyData: formData.property,
          pricingData: formData.pricing,
          landlordData: formData.landlord,
          tenantData: formData.tenant,
          guarantorsData: {
            guarantorType: formData.guarantorType,
            jointObligors: formData.jointObligors,
            avals: formData.avals,
          },
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, session, saveDraftMutation]);

  // Update functions
  const updatePropertyData = useCallback((data: Partial<PropertyFormData>) => {
    setFormData(prev => ({
      ...prev,
      property: { ...prev.property, ...data },
    }));
  }, []);

  const updatePricingData = useCallback((data: Partial<PricingFormData>) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, ...data },
    }));
  }, []);

  const updateLandlordData = useCallback((data: Partial<LandlordFormData>) => {
    setFormData(prev => ({
      ...prev,
      landlord: { ...prev.landlord, ...data },
    }));
  }, []);

  const updateTenantData = useCallback((data: Partial<TenantFormData>) => {
    setFormData(prev => ({
      ...prev,
      tenant: { ...prev.tenant, ...data },
    }));
  }, []);

  const setGuarantorType = useCallback((type: GuarantorType) => {
    setFormData(prev => ({
      ...prev,
      guarantorType: type,
    }));
  }, []);

  const addJointObligor = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      jointObligors: [
        ...prev.jointObligors,
        {
          firstName: '',
          middleName: '',
          paternalLastName: '',
          maternalLastName: '',
          email: '',
          phone: '',
        },
      ],
    }));
  }, []);

  const removeJointObligor = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      jointObligors: prev.jointObligors.filter((_, i) => i !== index),
    }));
  }, []);

  const updateJointObligor = useCallback((index: number, data: Partial<ActorFormData>) => {
    setFormData(prev => ({
      ...prev,
      jointObligors: prev.jointObligors.map((jo, i) =>
        i === index ? { ...jo, ...data } : jo
      ),
    }));
  }, []);

  const addAval = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      avals: [
        ...prev.avals,
        {
          firstName: '',
          middleName: '',
          paternalLastName: '',
          maternalLastName: '',
          email: '',
          phone: '',
        },
      ],
    }));
  }, []);

  const removeAval = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      avals: prev.avals.filter((_, i) => i !== index),
    }));
  }, []);

  const updateAval = useCallback((index: number, data: Partial<ActorFormData>) => {
    setFormData(prev => ({
      ...prev,
      avals: prev.avals.map((aval, i) =>
        i === index ? { ...aval, ...data } : aval
      ),
    }));
  }, []);

  const setSendInvitations = useCallback((send: boolean) => {
    setFormData(prev => ({
      ...prev,
      sendInvitations: send,
    }));
  }, []);

  // Calculate pricing
  const calculatePricing = useCallback(() => {
    if (!formData.property.rentAmount || !formData.pricing.packageId) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor ingrese la renta y seleccione un paquete',
        variant: 'destructive',
      });
      return;
    }

    calculatePriceMutation.mutate({
      packageId: formData.pricing.packageId,
      rentAmount: parseFloat(formData.property.rentAmount),
      tenantPercentage: formData.pricing.tenantPercentage,
      landlordPercentage: formData.pricing.landlordPercentage,
      includeInvestigationFee: false,
    });
  }, [formData, calculatePriceMutation]);

  // Submit policy
  const submitPolicy = useCallback(() => {
    // Transform form data to API format
    const policyData = {
      // Property
      policyNumber: formData.property.policyNumber,
      internalCode: formData.property.internalCode,
      propertyAddress: formData.property.propertyAddress,
      propertyAddressDetails: formData.property.propertyAddressDetails,
      propertyType: formData.property.propertyType,
      propertyDescription: formData.property.propertyDescription,
      rentAmount: parseFloat(formData.property.rentAmount),
      depositAmount: parseFloat(formData.property.depositAmount || formData.property.rentAmount),
      contractLength: formData.property.contractLength,
      startDate: formData.property.startDate,
      endDate: formData.property.endDate,

      // Property features
      parkingSpaces: formData.property.parkingSpaces,
      parkingNumbers: formData.property.parkingNumbers,
      isFurnished: formData.property.isFurnished,
      hasPhone: formData.property.hasPhone,
      hasElectricity: formData.property.hasElectricity,
      hasWater: formData.property.hasWater,
      hasGas: formData.property.hasGas,
      hasCableTV: formData.property.hasCableTV,
      hasInternet: formData.property.hasInternet,
      utilitiesInLandlordName: formData.property.utilitiesInLandlordName,

      // Financial
      hasIVA: formData.property.hasIVA,
      issuesTaxReceipts: formData.property.issuesTaxReceipts,
      securityDeposit: formData.property.securityDeposit,
      maintenanceFee: formData.property.maintenanceFee ? parseFloat(formData.property.maintenanceFee) : undefined,
      maintenanceIncludedInRent: formData.property.maintenanceIncludedInRent,
      rentIncreasePercentage: formData.property.rentIncreasePercentage ? parseFloat(formData.property.rentIncreasePercentage) : undefined,
      paymentMethod: formData.property.paymentMethod,

      // Additional
      hasInventory: formData.property.hasInventory,
      hasRules: formData.property.hasRules,
      rulesType: formData.property.rulesType,
      petsAllowed: formData.property.petsAllowed,
      propertyDeliveryDate: formData.property.propertyDeliveryDate || undefined,
      contractSigningDate: formData.property.contractSigningDate || undefined,
      contractSigningAddressDetails: formData.property.contractSigningAddressDetails,

      // Pricing
      packageId: formData.pricing.packageId,
      tenantPercentage: formData.pricing.tenantPercentage,
      landlordPercentage: formData.pricing.landlordPercentage,
      totalPrice: formData.pricing.isManualOverride && formData.pricing.manualPrice
        ? formData.pricing.manualPrice * 1.16
        : (calculatePriceMutation.data?.totalWithIva || 0),

      // Guarantor
      guarantorType: formData.guarantorType,

      // Actors
      landlord: formData.landlord,
      tenant: formData.tenant,
      jointObligors: formData.guarantorType === GuarantorType.JOINT_OBLIGOR || formData.guarantorType === GuarantorType.BOTH
        ? formData.jointObligors
        : [],
      avals: formData.guarantorType === GuarantorType.AVAL || formData.guarantorType === GuarantorType.BOTH
        ? formData.avals
        : [],

      sendInvitations: formData.sendInvitations,
    };

    createPolicyMutation.mutate(policyData);
  }, [formData, createPolicyMutation, calculatePriceMutation.data]);

  return {
    // Form data
    formData,

    // Update functions
    updatePropertyData,
    updatePricingData,
    updateLandlordData,
    updateTenantData,
    setGuarantorType,
    addJointObligor,
    removeJointObligor,
    updateJointObligor,
    addAval,
    removeAval,
    updateAval,
    setSendInvitations,

    // Actions
    calculatePricing,
    submitPolicy,

    // Queries
    packages: packagesQuery.data || [],
    packagesLoading: packagesQuery.isLoading,
    policyNumberValidation: policyNumberQuery.data,

    // Mutations
    isCreating: createPolicyMutation.isLoading,
    isCalculating: calculatePriceMutation.isLoading,
    pricingResult: calculatePriceMutation.data,
  };
}