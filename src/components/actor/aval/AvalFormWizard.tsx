'use client';

import { useState, useCallback, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActorFormState } from '@/hooks/useActorFormState';
import { useActorReferences } from '@/hooks/useActorReferences';
import { useFormWizardSubmission } from '@/hooks/useFormWizardSubmission';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { actorConfig } from '@/lib/constants/actorConfig';
import { formMessages } from '@/lib/constants/formMessages';
import { validatePersonFields, validateContactInfo, validateFinancialInfo } from '@/lib/utils/actorValidation';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import AvalPersonalInfoTab from './AvalPersonalInfoTab';
import AvalEmploymentTab from './AvalEmploymentTab';
import AvalPropertyGuaranteeTab from './AvalPropertyGuaranteeTab';
import AvalReferencesTab from './AvalReferencesTab';
import AvalDocumentsSection from './AvalDocumentsSection';

interface AvalFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function AvalFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: AvalFormWizardProps) {
  const { toast } = useToast();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use generic form state hook
  const formState = useActorFormState({
    actorType: 'aval',
    initialData,
    policy,
    isAdminEdit,
    token,
  });

  // Extract what we need
  const { formData, updateField, errors, setErrors } = formState as any;

  // References hook
  const referencesHook = useActorReferences({
    actorType: 'aval',
    initialReferences: initialData,
    allowAddRemove: false,
    minReferences: 3,
    maxReferences: 3,
    errorKeyPrefix: 'personalReference',
  });

  const personalReferences = (referencesHook as any).personalReferences || [];
  const commercialReferences = (referencesHook as any).commercialReferences || [];
  const updatePersonalReference = (referencesHook as any).updatePersonalReference || (() => {});
  const updateCommercialReference = (referencesHook as any).updateCommercialReference || (() => {});
  const validatePersonalReferences = (referencesHook as any).validatePersonalReferences || (() => ({ valid: true, errors: {} }));
  const validateCommercialReferences = (referencesHook as any).validateCommercialReferences || (() => ({ valid: true, errors: {} }));

  // Use submission hook
  const { handleSaveTab: saveTabHandler, handleFinalSubmit: submitHandler } = useFormWizardSubmission({
    actorType: 'aval',
    token,
    isAdminEdit,
  });

  const isCompany = formData.isCompany || false;

  // Tab configuration using centralized config
  const config = actorConfig.aval;
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
      if (initialData.propertyAddress || initialData.propertyValue) {
        wizard.markTabSaved('property');
      }
      if (initialData.references?.length > 0 || initialData.commercialReferences?.length > 0) {
        wizard.markTabSaved('references');
      }
    }
  }, [initialData]);

  // Validation functions
  const validatePersonalTab = useCallback(() => {
    if (isCompany) {
      return validatePersonFields({
        ...formData,
        firstName: formData.legalRepFirstName,
        paternalLastName: formData.legalRepPaternalLastName,
        maternalLastName: formData.legalRepMaternalLastName,
      }, (errs: Record<string, string>) => setErrors(errs));
    }
    return validatePersonFields(formData, (errs: Record<string, string>) => setErrors(errs));
  }, [formData, isCompany, setErrors]);

  const validateEmploymentTab = useCallback(() => {
    const contactValid = validateContactInfo(formData, (errs: Record<string, string>) => setErrors(errs));
    const financialValid = validateFinancialInfo(formData, (errs: Record<string, string>) => setErrors(errs));
    return contactValid && financialValid;
  }, [formData, setErrors]);

  const validatePropertyTab = useCallback(() => {
    // Basic validation for property guarantee
    if (!formData.propertyAddress || !formData.propertyValue) {
      setErrors({
        propertyAddress: !formData.propertyAddress ? 'La dirección es requerida' : '',
        propertyValue: !formData.propertyValue ? 'El valor es requerido' : '',
      });
      return false;
    }
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
      } else if (tabName === 'property') {
        return validatePropertyTab();
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
          references: isCompany ? undefined : personalReferences,
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
    validatePropertyTab,
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
          <AvalPersonalInfoTab
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
            <AvalEmploymentTab
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

        {/* Property Guarantee Tab */}
        <TabsContent value="property" className="space-y-4">
          <AvalPropertyGuaranteeTab
            formData={formData}
            onFieldChange={updateField}
            errors={errors}
            disabled={wizard.savingTab === 'property'}
            token={token}
            avalId={formData.id}
            initialDocuments={initialData.documents || []}
          />

          <SaveTabButton
            tabName="property"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.property}
            onSave={() => handleSaveTab('property')}
          />
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="space-y-4">
          <AvalReferencesTab
            personalReferences={personalReferences}
            commercialReferences={commercialReferences}
            onPersonalReferenceChange={updatePersonalReference}
            onCommercialReferenceChange={updateCommercialReference}
            errors={errors}
            disabled={wizard.savingTab === 'references'}
            isCompany={isCompany}
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
          <AvalDocumentsSection
            avalId={formData.id}
            token={token}
            isCompany={isCompany}
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
