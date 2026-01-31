'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { PropertyType, GuarantorType, TenantType } from "@/prisma/generated/prisma-client/enums";
import { generatePolicyNumber } from '@/lib/utils/policy';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';

// Import RHF step components
import PropertyStepRHF from './steps/PropertyStep-RHF';
import PricingStepRHF from './steps/PricingStep-RHF';
import LandlordStepRHF from './steps/LandlordStep-RHF';
import TenantStepRHF from './steps/TenantStep-RHF';
import GuarantorStepRHF from './steps/GuarantorStep-RHF';
import ReviewStep from './steps/ReviewStep';

import type { PropertyStepData, PricingStepData, LandlordStepData, TenantStepData, GuarantorStepData } from '@/lib/schemas/policy/wizard';
import type { PolicyCreationFormData } from './types';

// Tab configuration
const POLICY_TABS = [
  { id: 'property', label: 'Propiedad', needsSave: true },
  { id: 'pricing', label: 'Precio', needsSave: true },
  { id: 'landlord', label: 'Arrendador', needsSave: true },
  { id: 'tenant', label: 'Inquilino', needsSave: true },
  { id: 'guarantors', label: 'Garantía', needsSave: true },
  { id: 'review', label: 'Revisar', needsSave: false },
];

// Initial form data
const initialFormData: PolicyCreationFormData = {
  property: {
    policyNumber: generatePolicyNumber(),
    internalCode: '',
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
    calculatedPrice: null,
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
};

export default function PolicyCreationWizard() {
  const router = useRouter();
  const { toast } = useToast();

  // Form data accumulated from each step
  const [formData, setFormData] = useState<PolicyCreationFormData>(initialFormData);
  const [sendInvitations, setSendInvitations] = useState(true);

  // Wizard tabs hook
  const wizard = useFormWizardTabs({
    tabs: POLICY_TABS,
    initialActiveTab: 'property',
  });

  // tRPC queries and mutations
  const packagesQuery = trpc.package.getAll.useQuery();

  const policyNumberQuery = trpc.policy.checkNumber.useQuery(
    { number: formData.property.policyNumber },
    { enabled: formData.property.policyNumber.length > 0 }
  );

  const calculatePriceMutation = trpc.pricing.calculate.useMutation({
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Error al calcular el precio',
        variant: 'destructive',
      });
    },
  });

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

  // Step save handlers
  const handlePropertySave = useCallback(async (data: PropertyStepData) => {
    setFormData(prev => ({
      ...prev,
      property: data as any,
    }));
    wizard.markTabSaved('property');
    wizard.goToNextTab({ ...wizard.tabSaved, property: true });
  }, [wizard]);

  const handlePricingSave = useCallback(async (data: PricingStepData) => {
    setFormData(prev => ({
      ...prev,
      pricing: data,
    }));
    wizard.markTabSaved('pricing');
    wizard.goToNextTab({ ...wizard.tabSaved, pricing: true });
  }, [wizard]);

  const handleLandlordSave = useCallback(async (data: LandlordStepData) => {
    setFormData(prev => ({
      ...prev,
      landlord: data as any,
    }));
    wizard.markTabSaved('landlord');
    wizard.goToNextTab({ ...wizard.tabSaved, landlord: true });
  }, [wizard]);

  const handleTenantSave = useCallback(async (data: TenantStepData) => {
    setFormData(prev => ({
      ...prev,
      tenant: data as any,
    }));
    wizard.markTabSaved('tenant');
    wizard.goToNextTab({ ...wizard.tabSaved, tenant: true });
  }, [wizard]);

  const handleGuarantorsSave = useCallback(async (data: GuarantorStepData) => {
    setFormData(prev => ({
      ...prev,
      guarantorType: data.guarantorType,
      jointObligors: (data as any).jointObligors || [],
      avals: (data as any).avals || [],
    }));
    wizard.markTabSaved('guarantors');
    wizard.goToNextTab({ ...wizard.tabSaved, guarantors: true });
  }, [wizard]);

  // Calculate pricing
  const handleCalculatePricing = useCallback((packageId: string) => {
    if (!formData.property.rentAmount || !packageId) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor ingrese la renta y seleccione un paquete',
        variant: 'destructive',
      });
      return;
    }

    calculatePriceMutation.mutate({
      packageId,
      rentAmount: parseFloat(formData.property.rentAmount),
      tenantPercentage: formData.pricing.tenantPercentage,
      landlordPercentage: formData.pricing.landlordPercentage,
      includeInvestigationFee: false,
    });
  }, [formData.property.rentAmount, formData.pricing, calculatePriceMutation, toast]);

  // Helper to sanitize empty objects to null
  const sanitizeAddressDetails = (details: any): any | null => {
    if (!details) return null;
    if (typeof details === 'object' && Object.keys(details).length === 0) return null;
    return details;
  };

  // Submit policy
  const handleSubmitPolicy = useCallback(() => {
    const policyData = {
      // Property
      policyNumber: formData.property.policyNumber,
      internalCode: formData.property.internalCode,
      propertyAddressDetails: sanitizeAddressDetails(formData.property.propertyAddressDetails),
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
      contractSigningAddressDetails: sanitizeAddressDetails(formData.property.contractSigningAddressDetails),

      // Pricing
      packageId: formData.pricing.packageId,
      tenantPercentage: formData.pricing.tenantPercentage,
      landlordPercentage: formData.pricing.landlordPercentage,
      totalPrice: formData.pricing.isManualOverride && formData.pricing.manualPrice
        ? formData.pricing.manualPrice * (1 + TAX_CONFIG.IVA_RATE)
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

      sendInvitations,
    };

    createPolicyMutation.mutate(policyData);
  }, [formData, sendInvitations, calculatePriceMutation.data, createPolicyMutation]);

  // Handle tab change with validation
  const handleTabChange = useCallback((tabId: string) => {
    const tabIndex = POLICY_TABS.findIndex(t => t.id === tabId);
    const currentIndex = POLICY_TABS.findIndex(t => t.id === wizard.activeTab);

    // Allow going back freely
    if (tabIndex < currentIndex) {
      wizard.setActiveTab(tabId);
      return;
    }

    // Check if we can access the tab
    if (wizard.canAccessTab(tabId, POLICY_TABS, false, wizard.tabSaved)) {
      wizard.setActiveTab(tabId);
    } else {
      toast({
        title: 'Paso incompleto',
        description: 'Complete el paso actual antes de continuar',
        variant: 'destructive',
      });
    }
  }, [wizard, toast]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    const tabOrder = POLICY_TABS.map(t => t.id);
    const currentIndex = tabOrder.indexOf(wizard.activeTab);
    if (currentIndex > 0) {
      wizard.setActiveTab(tabOrder[currentIndex - 1]);
    }
  }, [wizard]);

  // Trigger form submission for current step
  const handleNext = useCallback(() => {
    document.querySelector('form')?.requestSubmit();
  }, []);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/policies')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Protección</h1>
      </div>

      {/* Progress */}
      <FormWizardProgress tabs={POLICY_TABS} tabSaved={wizard.tabSaved} />

      {/* Wizard Tabs */}
      <FormWizardTabs
        tabs={POLICY_TABS}
        activeTab={wizard.activeTab}
        tabSaved={wizard.tabSaved}
        onTabChange={handleTabChange}
      >
        <div className="mt-6">
          {/* Property Step */}
          {wizard.activeTab === 'property' && (
            <PropertyStepRHF
              initialData={formData.property}
              onSave={handlePropertySave}
              policyNumberValidation={policyNumberQuery.data}
            />
          )}

          {/* Pricing Step */}
          {wizard.activeTab === 'pricing' && (
            <PricingStepRHF
              initialData={formData.pricing}
              rentAmount={formData.property.rentAmount}
              packages={packagesQuery.data || []}
              packagesLoading={packagesQuery.isLoading}
              onSave={handlePricingSave}
              onCalculate={handleCalculatePricing}
              isCalculating={calculatePriceMutation.isPending}
              pricingResult={calculatePriceMutation.data}
            />
          )}

          {/* Landlord Step */}
          {wizard.activeTab === 'landlord' && (
            <LandlordStepRHF
              initialData={formData.landlord}
              onSave={handleLandlordSave}
            />
          )}

          {/* Tenant Step */}
          {wizard.activeTab === 'tenant' && (
            <TenantStepRHF
              initialData={formData.tenant}
              onSave={handleTenantSave}
            />
          )}

          {/* Guarantors Step */}
          {wizard.activeTab === 'guarantors' && (
            <GuarantorStepRHF
              initialData={{
                guarantorType: formData.guarantorType,
                jointObligors: formData.jointObligors,
                avals: formData.avals,
              }}
              onSave={handleGuarantorsSave}
            />
          )}

          {/* Review Step */}
          {wizard.activeTab === 'review' && (
            <ReviewStep
              formData={formData}
              packages={packagesQuery.data || []}
              pricingResult={calculatePriceMutation.data}
              sendInvitations={sendInvitations}
              onSetSendInvitations={setSendInvitations}
              onSubmit={handleSubmitPolicy}
              onPrevious={handlePrevious}
              isSubmitting={createPolicyMutation.isPending}
            />
          )}
        </div>
      </FormWizardTabs>

      {/* Navigation Buttons (except for Review which has its own) */}
      {wizard.activeTab !== 'review' && (
        <div className="flex justify-between items-center pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={wizard.activeTab === 'property'}
          >
            Anterior
          </Button>

          <Button onClick={handleNext}>
            Guardar y Continuar
          </Button>
        </div>
      )}
    </div>
  );
}
