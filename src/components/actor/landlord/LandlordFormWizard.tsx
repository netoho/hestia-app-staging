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
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import LandlordOwnerInfoTab from './LandlordOwnerInfoTab';
import LandlordBankInfoTab from './LandlordBankInfoTab';
import PropertyDetailsForm from './PropertyDetailsForm';
import FinancialInfoForm from './FinancialInfoForm';
import DocumentsSection from './DocumentsSection';
// Import new schema validation
import { validateLandlordData, getLandlordTabSchema } from '@/lib/schemas/landlord';
import { filterLandlordFieldsByTab } from '@/lib/constants/landlordTabFields';
import { prepareLandlordForDB, prepareMultiLandlordsForDB } from '@/lib/utils/landlord/prepareForDB';

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
      // if (initialData.landlords?.[0]?.bankName || initialData.bankName) {
      //   wizard.markTabSaved('bank-info');
      // }
      if (initialData.propertyAddress || propertyData?.address) {
        wizard.markTabSaved('property-info');
      }
      if (initialData.monthlyRent || policyFinancialData?.monthlyRent) {
        wizard.markTabSaved('financial-info');
      }
    }
  }, [initialData]);

  // Schema-based validation functions
  const validateTab = useCallback((tabName: string) => {
    const localErrors: Record<string, string> = {};
    let isValid = true;

    switch (tabName) {
      case 'owner-info':
        // Validate each landlord using schema
        landlords.forEach((landlord: any, index: number) => {
          const result = validateLandlordData(landlord, {
            isCompany: Boolean(landlord.isCompany),
            mode: 'partial', // Tab validation is partial
            tabName: 'owner-info'
          });

          if (!result.success) {
            result.error.issues.forEach(issue => {
              const fieldPath = issue.path.join('.');
              localErrors[`landlord${index}.${fieldPath}`] = issue.message;
            });
            isValid = false;
          }
        });

        // Validate primary landlord designation
        const primaryCount = landlords.filter((l: any) => l.isPrimary).length;
        if (primaryCount === 0) {
          localErrors['general'] = 'Debe designar un arrendador principal';
          isValid = false;
        } else if (primaryCount > 1) {
          localErrors['general'] = 'Solo puede haber un arrendador principal';
          isValid = false;
        }
        break;

      case 'bank-info':
        // Only validate primary landlord's bank info
        const primaryLandlord = landlords.find((l: any) => l.isPrimary) || landlords[0];
        if (primaryLandlord) {
          const result = validateLandlordData(primaryLandlord, {
            isCompany: Boolean(primaryLandlord.isCompany),
            mode: 'partial',
            tabName: 'bank-info'
          });

          if (!result.success) {
            result.error.issues.forEach(issue => {
              const fieldPath = issue.path.join('.');
              localErrors[`landlord0.${fieldPath}`] = issue.message;
            });
            isValid = false;
          }
        }
        break;

      case 'property-info':
        // Use primary landlord for property validation
        const primaryForProperty = landlords.find((l: any) => l.isPrimary) || landlords[0];
        if (primaryForProperty) {
          // Map propertyData to expected schema format
          const propertyDataForValidation = {
            ...primaryForProperty,
            propertyDeedNumber: propertyData.propertyDeedNumber,
            propertyRegistryFolio: propertyData.propertyRegistryFolio,
            propertyValue: propertyData.propertyValue,
          };

          const result = validateLandlordData(propertyDataForValidation, {
            isCompany: Boolean(primaryForProperty.isCompany),
            mode: 'partial',
            tabName: 'property-info'
          });

          if (!result.success) {
            result.error.issues.forEach(issue => {
              const fieldPath = issue.path.join('.');
              localErrors[`property.${fieldPath}`] = issue.message;
            });
            isValid = false;
          }
        }
        break;

      case 'financial-info':
        // Validate financial data
        const primaryForFinancial = landlords.find((l: any) => l.isPrimary) || landlords[0];
        if (primaryForFinancial) {
          const financialDataForValidation = {
            ...primaryForFinancial,
            ...policyFinancialData,
          };

          const result = validateLandlordData(financialDataForValidation, {
            isCompany: Boolean(primaryForFinancial.isCompany),
            mode: 'partial',
            tabName: 'financial-info'
          });

          if (!result.success) {
            result.error.issues.forEach(issue => {
              const fieldPath = issue.path.join('.');
              localErrors[`financial.${fieldPath}`] = issue.message;
            });
            isValid = false;
          }
        }
        break;

      case 'documents':
        // Documents validation is handled separately
        break;
    }

    setErrors(localErrors);
    return isValid;
  }, [landlords, propertyData, policyFinancialData, setErrors]);

  // Handle tab save
  const handleSaveTab = useCallback(async (tabName: string) => {
    // Clear errors first
    setErrors({});

    // Validate using schema validation
    const isValid = validateTab(tabName);
    if (!isValid) {
      return false;
    }

    // Save logic using consolidated hook
    const saveData = async () => {
      // Prepare data for database using our utility
      const { landlords: preparedLandlords, policyData } = prepareMultiLandlordsForDB(
        landlords.map((l: any) => ({
          ...l,
          isPrimary: l.isPrimary || false,
        })),
        { isPartial: true }
      );

      // Combine all data
      const dataToSave = {
        landlords: preparedLandlords,
        propertyData: {
          ...propertyData,
          propertyDeedNumber: propertyData.propertyDeedNumber,
          propertyRegistryFolio: propertyData.propertyRegistryFolio,
        },
        policyFinancialData: {
          ...policyFinancialData,
          ...policyData, // Include extracted policy fields
        },
      };

      const success = await saveTabHandler(
        tabName,
        () => true, // Validation already done above
        () => dataToSave,
        () => filterLandlordFieldsByTab(dataToSave, Boolean(landlords[0]?.isCompany), tabName)
      );

      if (!success) {
        throw new Error(formMessages.error.saveFailed);
      }
    };

    return wizard.handleTabSave(tabName, () => isValid, saveData);
  }, [
    landlords,
    propertyData,
    policyFinancialData,
    validateTab,
    saveTabHandler,
    setErrors,
    wizard,
  ]);

  // Handle final submission
  const handleFinalSubmit = useCallback(async () => {
    wizard.setSavingTab('final');

    try {
      // Validate all tabs first
      const allTabsValid = ['owner-info', 'bank-info', 'property-info', 'financial-info']
        .every(tab => validateTab(tab));

      if (!allTabsValid) {
        toast({
          title: 'Validación fallida',
          description: 'Por favor revise todos los campos requeridos',
          variant: 'destructive',
        });
        wizard.setSavingTab(null);
        return;
      }

      // Prepare data for final submission
      const { landlords: preparedLandlords, policyData } = prepareMultiLandlordsForDB(
        landlords.map((l: any) => ({
          ...l,
          isPrimary: l.isPrimary || false,
        })),
        { isPartial: false } // Final submission is not partial
      );

      const finalData = {
        landlords: preparedLandlords,
        propertyData: {
          ...propertyData,
          propertyDeedNumber: propertyData.propertyDeedNumber,
          propertyRegistryFolio: propertyData.propertyRegistryFolio,
        },
        policyFinancialData: {
          ...policyFinancialData,
          ...policyData,
        },
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
    validateTab,
    submitHandler,
    requiredDocsUploaded,
    wizard,
    toast,
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
