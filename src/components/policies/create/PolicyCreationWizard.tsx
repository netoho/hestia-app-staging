'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { usePolicyCreation } from './hooks/usePolicyCreation';

// Import step components (to be created)
import PropertyStep from './steps/PropertyStep';
import PricingStep from './steps/PricingStep';
import LandlordStep from './steps/LandlordStep';
import TenantStep from './steps/TenantStep';
import GuarantorStep from './steps/GuarantorStep';
import ReviewStep from './steps/ReviewStep';

/**
 * Main wizard component for policy creation
 * This is a much cleaner version compared to the 1715-line original
 */
export default function PolicyCreationWizard() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('property');

  const {
    formData,
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
    calculatePricing,
    submitPolicy,
    packages,
    packagesLoading,
    policyNumberValidation,
    isCreating,
    isCalculating,
    pricingResult,
  } = usePolicyCreation();

  // Navigation handlers
  const handleNext = () => {
    const tabOrder = ['property', 'pricing', 'landlord', 'tenant', 'guarantors', 'review'];
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex < tabOrder.length - 1) {
      setCurrentTab(tabOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const tabOrder = ['property', 'pricing', 'landlord', 'tenant', 'guarantors', 'review'];
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(tabOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    submitPolicy();
  };

  const validateForm = () => {
    // Basic validation - can be expanded
    if (!formData.property.propertyAddress || !formData.property.rentAmount) {
      alert('Por favor complete todos los campos de la propiedad');
      setCurrentTab('property');
      return false;
    }

    if (!formData.pricing.packageId) {
      alert('Por favor seleccione un paquete');
      setCurrentTab('pricing');
      return false;
    }

    const percentageSum = formData.pricing.tenantPercentage + formData.pricing.landlordPercentage;
    if (Math.abs(percentageSum - 100) > 0.01) {
      alert('Los porcentajes deben sumar 100%');
      setCurrentTab('pricing');
      return false;
    }

    if (!formData.landlord.email) {
      alert('Por favor ingrese el email del arrendador');
      setCurrentTab('landlord');
      return false;
    }

    if (!formData.tenant.email) {
      alert('Por favor ingrese el email del inquilino');
      setCurrentTab('tenant');
      return false;
    }

    return true;
  };

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

      {/* Wizard Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="property">Propiedad</TabsTrigger>
          <TabsTrigger value="pricing">Precio</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Obligado S. / Aval</TabsTrigger>
          <TabsTrigger value="review">Revisar</TabsTrigger>
        </TabsList>

        {/* Property Step */}
        <TabsContent value="property">
          <PropertyStep
            data={formData.property}
            onUpdate={updatePropertyData}
            policyNumberValidation={policyNumberValidation}
            onNext={handleNext}
          />
        </TabsContent>

        {/* Pricing Step */}
        <TabsContent value="pricing">
          <PricingStep
            propertyData={formData.property}
            pricingData={formData.pricing}
            packages={packages}
            packagesLoading={packagesLoading}
            onUpdate={updatePricingData}
            onCalculate={calculatePricing}
            isCalculating={isCalculating}
            pricingResult={pricingResult}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </TabsContent>

        {/* Landlord Step */}
        <TabsContent value="landlord">
          <LandlordStep
            data={formData.landlord}
            onUpdate={updateLandlordData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </TabsContent>

        {/* Tenant Step */}
        <TabsContent value="tenant">
          <TenantStep
            data={formData.tenant}
            onUpdate={updateTenantData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </TabsContent>

        {/* Guarantors Step */}
        <TabsContent value="guarantors">
          <GuarantorStep
            guarantorType={formData.guarantorType}
            jointObligors={formData.jointObligors}
            avals={formData.avals}
            onSetGuarantorType={setGuarantorType}
            onAddJointObligor={addJointObligor}
            onRemoveJointObligor={removeJointObligor}
            onUpdateJointObligor={updateJointObligor}
            onAddAval={addAval}
            onRemoveAval={removeAval}
            onUpdateAval={updateAval}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </TabsContent>

        {/* Review Step */}
        <TabsContent value="review">
          <ReviewStep
            formData={formData}
            packages={packages}
            pricingResult={pricingResult}
            sendInvitations={formData.sendInvitations}
            onSetSendInvitations={setSendInvitations}
            onSubmit={handleSubmit}
            onPrevious={handlePrevious}
            isSubmitting={isCreating}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}