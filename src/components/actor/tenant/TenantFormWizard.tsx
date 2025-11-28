'use client';

import { useState, useCallback, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useActorFormState } from '@/hooks/useActorFormState';
import { useActorReferences } from '@/hooks/useActorReferences';
import { useFormWizardSubmissionTRPC } from '@/hooks/useFormWizardSubmissionTRPC';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { actorConfig } from '@/lib/constants/actorConfig';
import { formMessages } from '@/lib/constants/formMessages';
import {
  validateTenantData,
  TENANT_VALIDATION_MESSAGES,
  getTenantTabSchema
} from '@/lib/schemas/tenant';
import { validatePersonFields, validateContactInfo, validateFinancialInfo } from '@/lib/utils/actorValidation';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import PersonalInfoTab from './PersonalInfoTab';
import EmploymentTab from './EmploymentTab';
import RentalHistoryTab from './RentalHistoryTab';
import ReferencesTab from './ReferencesTab';
import TenantDocumentsSection from './TenantDocumentsSection';

interface TenantFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function TenantFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: TenantFormWizardProps) {
  const { toast } = useToast();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use generic form state hook
  const formState = useActorFormState({
    actorType: 'tenant',
    initialData,
    policy,
    isAdminEdit,
    token,
  });

  // Extract what we need
  const { formData, updateField, errors, setErrors } = formState as any;

  // References hook - Tenant allows dynamic add/remove
  const referencesHook = useActorReferences({
    initialPersonal: initialData.personalReferences || [],
    allowAddRemove: true,
    errorKeyPrefix: 'reference',
  });

  const personalReferences = referencesHook.personalReferences || [];
  const commercialReferences = referencesHook.commercialReferences || [];
  const updatePersonalReference = referencesHook.updatePersonalReference || (() => {});
  const updateCommercialReference = referencesHook.updateCommercialReference || (() => {});
  const validatePersonalReferences = referencesHook.validatePersonalReferences || (() => ({ valid: true, errors: {} }));
  const validateCommercialReferences = referencesHook.validateCommercialReferences || (() => ({ valid: true, errors: {} }));
  const addPersonalReference = referencesHook.addPersonalReference || (() => {});
  const removePersonalReference = referencesHook.removePersonalReference || (() => {});
  const addCommercialReference = referencesHook.addCommercialReference || (() => {});
  const removeCommercialReference = referencesHook.removeCommercialReference || (() => {});

  // Use submission hook
  const { handleSaveTab: saveTabHandler, handleFinalSubmit: submitHandler } = useFormWizardSubmissionTRPC({
    actorType: 'tenant',
    token,
    isAdminEdit,
  });

  const isCompany = formData.tenantType === 'COMPANY';

  // Tab configuration using centralized config
  const config = actorConfig.tenant;
  const tabs = (isCompany ? config.companyTabs : config.personTabs) as any;

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({ tabs, isAdminEdit });

  // Initialize tabs as saved based on initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.fullName || initialData.companyName) {
        wizard.markTabSaved('personal');
      }
      if (initialData.occupation || initialData.monthlyIncome) {
        wizard.markTabSaved('employment');
      }
      if (initialData.previousLandlordName) {
        wizard.markTabSaved('rental');
      }
      if (initialData.references?.length > 0 || initialData.commercialReferences?.length > 0) {
        wizard.markTabSaved('references');
      }
    }
  }, [initialData]);

  // Validation functions using master schema
  const validatePersonalTab = useCallback(() => {
    const tenantType = isCompany ? 'COMPANY' : 'INDIVIDUAL';
    const result = validateTenantData(formData, {
      tenantType,
      mode: 'partial',
      tabName: 'personal',
    });

    console.log('Personal Tab Validation Result:', result, formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err: any) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      setErrors(errors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData, isCompany, setErrors]);

  const validateEmploymentTab = useCallback(() => {
    const result = validateTenantData(formData, {
      tenantType: 'INDIVIDUAL',
      mode: 'partial',
      tabName: 'employment',
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err: any) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      setErrors(errors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData, setErrors]);

  // Save tab handler using consolidated logic
  const handleSaveTab = useCallback(async (tabName: string) => {
    const validateTab = () => {
      setErrors({}); // Clear errors before validation

      if (tabName === 'personal') {
        return validatePersonalTab();
      } else if (tabName === 'employment' && !isCompany) {
        return validateEmploymentTab();
      } else if (tabName === 'rental' && !isCompany) {
        // Rental history is optional - validate if data provided
        const result = validateTenantData(formData, {
          tenantType: 'INDIVIDUAL',
          mode: 'partial',
          tabName: 'rental',
        });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.errors.forEach((err: any) => {
            const path = err.path.join('.');
            errors[path] = err.message;
          });
          setErrors(errors);
          return false;
        }
        return true;
      } else if (tabName === 'references') {
        const refValidation = isCompany
          ? validateCommercialReferences()
          : validatePersonalReferences();
        if (!refValidation.valid) {
          setErrors(refValidation.errors);
        }
        return refValidation.valid;
      }
      return true;
    };

    const getAdditionalData = () => {
      if (tabName === 'references') {
        return {
          personalReferences: isCompany ? undefined : personalReferences,
          commercialReferences: isCompany ? commercialReferences : undefined,
        };
      }
      return {};
    };

    // Use consolidated save logic
    const saveData = async () => {
      const dataToSave = {
        ...formData,
        ...getAdditionalData(),
      };

      const success = await saveTabHandler(
        tabName,
        validateTab,
        () => dataToSave,
        () => getAdditionalData()
      );

      if (!success) {
        throw new Error(formMessages.error.saveFailed);
      }
    };

    return wizard.handleTabSave(tabName, validateTab, saveData);
  }, [
    validatePersonalTab,
    validateEmploymentTab,
    validatePersonalReferences,
    validateCommercialReferences,
    saveTabHandler,
    formData,
    isCompany,
    personalReferences,
    commercialReferences,
    setErrors,
    wizard,
    formMessages.error.saveFailed,
  ]);

  // Final submit handler using consolidated logic
  const handleFinalSubmit = useCallback(async () => {
    wizard.setSavingTab('final');

    try {
      const getReferences = () => ({
        personal: isCompany ? undefined : personalReferences,
        commercial: isCompany ? commercialReferences : undefined,
      });

      const success = await submitHandler(
        () => formData,
        requiredDocsUploaded,
        getReferences,
        onComplete
      );

      if (!success) {
        wizard.setSavingTab(null);
      }
    } catch (error) {
      console.error('Submit error:', error);
      wizard.setSavingTab(null);
    }
  }, [formData, isCompany, personalReferences, commercialReferences, submitHandler, onComplete, requiredDocsUploaded, wizard]);

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

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-4">
          <PersonalInfoTab
            formData={formData}
            onFieldChange={updateField}
            errors={errors}
            disabled={wizard.savingTab === 'personal'}
          />

          <SaveTabButton
            tabName="personal"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.personal}
            onSave={() => handleSaveTab('personal')}
          />
        </TabsContent>

        {/* Employment Tab (Individual only) */}
        {!isCompany && (
          <TabsContent value="employment" className="space-y-4">
            <EmploymentTab
              formData={formData}
              onFieldChange={updateField}
              errors={errors}
              disabled={wizard.savingTab === 'employment'}
            />

            <SaveTabButton
              tabName="employment"
              savingTab={wizard.savingTab}
              isSaved={wizard.tabSaved.employment}
              onSave={() => handleSaveTab('employment')}
            />
          </TabsContent>
        )}

        {/* Rental History Tab (Individual only) */}
        {!isCompany && (
          <TabsContent value="rental" className="space-y-4">
            <RentalHistoryTab
              formData={formData}
              onFieldChange={updateField}
              errors={errors}
              disabled={wizard.savingTab === 'rental'}
            />

            <SaveTabButton
              tabName="rental"
              savingTab={wizard.savingTab}
              isSaved={wizard.tabSaved.rental}
              onSave={() => handleSaveTab('rental')}
            />
          </TabsContent>
        )}

        {/* References Tab */}
        <TabsContent value="references" className="space-y-4">
          <ReferencesTab
            tenantType={formData.tenantType}
            personalReferences={personalReferences}
            commercialReferences={commercialReferences}
            onUpdatePersonalReference={updatePersonalReference}
            onUpdateCommercialReference={updateCommercialReference}
            errors={errors}
            disabled={wizard.savingTab === 'references'}
          />

          <SaveTabButton
            tabName="references"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.references}
            onSave={() => handleSaveTab('references')}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <TenantDocumentsSection
            tenantId={formData.id}
            token={token}
            tenantType={formData.tenantType}
            nationality={formData.nationality}
            allTabsSaved={isAdminEdit || allTabsSaved}
            initialDocuments={initialData.documents || []}
            additionalInfo={formData.additionalInfo}
            onAdditionalInfoChange={(value) => updateField('additionalInfo', value)}
            onRequiredDocsChange={setRequiredDocsUploaded}
            isAdminEdit={isAdminEdit}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleFinalSubmit}
              disabled={wizard.savingTab === 'final' || !allTabsSaved || !requiredDocsUploaded}
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
