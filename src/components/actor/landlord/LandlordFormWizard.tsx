'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActorFormState } from '@/hooks/useActorFormState';
import { useFormWizardSubmissionTRPC } from '@/hooks/useFormWizardSubmissionTRPC';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { actorConfig } from '@/lib/constants/actorConfig';
import { formMessages } from '@/lib/constants/formMessages';
import { validatePersonFields, validateContactInfo } from '@/lib/utils/actorValidation';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import LandlordOwnerInfoTab from './LandlordOwnerInfoTab';
import LandlordBankInfoTab from './LandlordBankInfoTab';
import PropertyDetailsForm from './PropertyDetailsForm';
import FinancialInfoForm from './FinancialInfoForm';
import DocumentsSection from './DocumentsSection';

interface LandlordFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
  canEdit?: boolean;
}

export default function LandlordFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
  canEdit = true,
}: LandlordFormWizardProps) {
  const { toast } = useToast();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use generic form state hook (multi-actor mode for landlord)
  const formState = useActorFormState({
    actorType: 'landlord',
    initialData: initialData?.landlords || initialData,
    policy,
    isAdminEdit,
    token,
  });

  // Extract what we need - Landlord has special multi-actor structure
  const {
    actors: landlords,
    updateActorField: updateLandlordField,
    addActor: addCoOwner,
    removeActor: removeCoOwner,
    propertyData,
    updatePropertyField,
    policyFinancialData,
    updateFinancialField,
    errors,
    setErrors,
  } = formState as any;

  const isCompany = landlords?.[0]?.isCompany || false;

  // Tab configuration using centralized config
  const config = actorConfig.landlord;
  const tabs = (isCompany ? config.companyTabs : config.personTabs) as any;

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({ tabs, isAdminEdit });

  // Use submission hook
  const { handleSaveTab: saveTabHandler, handleFinalSubmit: submitHandler } = useFormWizardSubmissionTRPC({
    actorType: 'landlord',
    token,
    isAdminEdit,
    isMultiActor: true,
  });

  // Initialize tabs as saved based on initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.landlords?.length > 0 || initialData.fullName || initialData.companyName) {
        wizard.markTabSaved('owner-info');
      }
      if (initialData.landlords?.[0]?.bankName || initialData.bankName) {
        wizard.markTabSaved('bank-info');
      }
      if (initialData.propertyAddress || propertyData?.address) {
        wizard.markTabSaved('property-info');
      }
      if (initialData.monthlyRent || policyFinancialData?.monthlyRent) {
        wizard.markTabSaved('financial-info');
      }
    }
  }, [initialData]);

  // Validation functions
  const validateOwnerInfo = useCallback(() => {
    let isValid = true;
    const localErrors: Record<string, string> = {};

    landlords.forEach((landlord: any, index: number) => {
      if (landlord.isCompany) {
        if (!landlord.companyName) {
          localErrors[`landlord${index}.companyName`] = 'Nombre de empresa requerido';
          isValid = false;
        }
        if (!landlord.rfc) {
          localErrors[`landlord${index}.rfc`] = 'RFC requerido';
          isValid = false;
        }
        // Validate ownership percentage
        if (!landlord.ownershipPercentage || landlord.ownershipPercentage <= 0) {
          localErrors[`landlord${index}.ownershipPercentage`] = 'Porcentaje requerido';
          isValid = false;
        }
      } else {
        validatePersonFields(landlord, localErrors);
        if (Object.keys(localErrors).length > 0) isValid = false;
      }

    });

    setErrors(localErrors);
    return isValid;
  }, [landlords, setErrors]);

  const validateBankInfo = useCallback(() => {
    const primaryLandlord = landlords[0];
    if (!primaryLandlord) return false;

    const localErrors: Record<string, string> = {};
    let isValid = true;

    if (!primaryLandlord.bankName) {
      localErrors['landlord0.bankName'] = 'Banco requerido';
      isValid = false;
    }
    if (!primaryLandlord.accountHolder) {
      localErrors['landlord0.accountHolder'] = 'Titular requerido';
      isValid = false;
    }
    if (!primaryLandlord.clabe || primaryLandlord.clabe.length !== 18) {
      localErrors['landlord0.clabe'] = 'CLABE debe tener 18 dígitos';
      isValid = false;
    }

    setErrors(localErrors);
    return isValid;
  }, [landlords, setErrors]);

  const validatePropertyInfo = useCallback(() => {
    const localErrors: Record<string, string> = {};
    let isValid = true;

    if (!propertyData.address) {
      localErrors['property.address'] = 'Dirección requerida';
      isValid = false;
    }
    if (!propertyData.propertyType) {
      localErrors['property.propertyType'] = 'Tipo de propiedad requerido';
      isValid = false;
    }

    setErrors(localErrors);
    return isValid;
  }, [propertyData, setErrors]);

  const validateFinancialInfo = useCallback(() => {
    const localErrors: Record<string, string> = {};
    let isValid = true;

    if (!policyFinancialData.monthlyRent || policyFinancialData.monthlyRent <= 0) {
      localErrors['financial.monthlyRent'] = 'Renta mensual requerida';
      isValid = false;
    }
    if (!policyFinancialData.deposit || policyFinancialData.deposit <= 0) {
      localErrors['financial.deposit'] = 'Depósito requerido';
      isValid = false;
    }

    setErrors(localErrors);
    return isValid;
  }, [policyFinancialData, setErrors]);

  // Handle tab save
  const handleSaveTab = useCallback(async (tabName: string) => {
    const validateTab = () => {
      setErrors({}); // Clear errors

      if (tabName === 'owner-info') {
        return validateOwnerInfo();
      } else if (tabName === 'bank-info') {
        return validateBankInfo();
      } else if (tabName === 'property-info') {
        return validatePropertyInfo();
      } else if (tabName === 'financial-info') {
        return validateFinancialInfo();
      }
      return true;
    };

    // Save logic using consolidated hook
    const saveData = async () => {
      const dataToSave = {
        landlords,
        propertyData,
        policyFinancialData,
      };

      const success = await saveTabHandler(
        tabName,
        validateTab,
        () => dataToSave,
        () => ({})
      );

      if (!success) {
        throw new Error(formMessages.error.saveFailed);
      }
    };

    return wizard.handleTabSave(tabName, validateTab, saveData);
  }, [
    landlords,
    propertyData,
    policyFinancialData,
    validateOwnerInfo,
    validateBankInfo,
    validatePropertyInfo,
    validateFinancialInfo,
    saveTabHandler,
    setErrors,
    wizard,
  ]);

  // Handle final submission
  const handleFinalSubmit = useCallback(async () => {
    wizard.setSavingTab('final');

    try {
      const finalData = {
        landlords,
        propertyData,
        policyFinancialData,
      };

      const success = await submitHandler(
        () => finalData,
        requiredDocsUploaded,
        () => ({}),
        onComplete
      );

      if (!success) {
        wizard.setSavingTab(null);
      }
    } catch (error) {
      console.error('Submit error:', error);
      wizard.setSavingTab(null);
    }
  }, [
    landlords,
    propertyData,
    policyFinancialData,
    submitHandler,
    requiredDocsUploaded,
    wizard,
    onComplete,
  ]);

  const { getProgress } = wizard;
  const progress = getProgress();
  const allTabsSaved = progress.isComplete;


  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <FormWizardProgress
        tabs={tabs}
        tabSaved={wizard.tabSaved}
        variant="bars"
      />

      <FormWizardTabs
        tabs={tabs}
        activeTab={wizard.activeTab}
        tabSaved={wizard.tabSaved}
        isAdminEdit={isAdminEdit}
        onTabChange={wizard.setActiveTab}
      >

        {/* Owner Info Tab */}
        <TabsContent value="owner-info" className="space-y-4">
          <LandlordOwnerInfoTab
            landlords={landlords}
            updateLandlordField={updateLandlordField}
            addCoOwner={addCoOwner}
            removeCoOwner={removeCoOwner}
            errors={errors}
            isAdminEdit={isAdminEdit}
            canEdit={canEdit}
          />
          <SaveTabButton
            tabName="owner-info"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved['owner-info']}
            onSave={() => handleSaveTab('owner-info')}
          />
        </TabsContent>

        {/* Bank Info Tab */}
        <TabsContent value="bank-info" className="space-y-4">
          <LandlordBankInfoTab
            landlords={landlords}
            updateLandlordField={updateLandlordField}
            errors={errors}
            isAdminEdit={isAdminEdit}
            canEdit={canEdit}
          />
          <SaveTabButton
            tabName="bank-info"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved['bank-info']}
            onSave={() => handleSaveTab('bank-info')}
          />
        </TabsContent>

        {/* Property Details Tab */}
        <TabsContent value="property-info" className="space-y-4">
          <PropertyDetailsForm
            data={propertyData}
            onChange={updatePropertyField}
            errors={errors}
            disabled={wizard.savingTab === 'property-info'}
          />

          <SaveTabButton
            tabName="property-info"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved['property-info']}
            onSave={() => handleSaveTab('property-info')}
          />
        </TabsContent>

        {/* Financial Information Tab */}
        <TabsContent value="financial-info" className="space-y-4">
          <FinancialInfoForm
            landlordData={landlords[0]}
            policyFinancialData={policyFinancialData}
            onLandlordChange={(field, value) => updateLandlordField(0, field, value)}
            onPolicyFinancialChange={updateFinancialField}
            errors={errors}
            disabled={wizard.savingTab === 'financial-info'}
            policy={policy}
            token={token}
            landlordId={landlords[0]?.id}
            isAdminEdit={isAdminEdit}
          />

          <SaveTabButton
            tabName="financial-info"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved['financial-info']}
            onSave={() => handleSaveTab('financial-info')}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentsSection
            landlordId={landlords[0]?.id}
            token={token}
            isCompany={landlords[0]?.isCompany || false}
            allTabsSaved={isAdminEdit || allTabsSaved}
            onRequiredDocsChange={setRequiredDocsUploaded}
            isAdminEdit={isAdminEdit}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleFinalSubmit}
              disabled={wizard.savingTab === 'final' || !requiredDocsUploaded || !allTabsSaved}
              className="w-full sm:w-auto"
              size="lg"
            >
              {wizard.savingTab === 'final' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Información'
              )}
            </Button>
          </div>
        </TabsContent>
      </FormWizardTabs>
    </div>
  );
}
