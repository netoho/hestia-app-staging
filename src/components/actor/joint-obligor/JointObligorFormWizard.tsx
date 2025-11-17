'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Loader2, User, Briefcase, Shield, Users, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActorFormState } from '@/hooks/useActorFormState';
import { useActorReferences } from '@/hooks/useActorReferences';
import { useFormWizardSubmission } from '@/hooks/useFormWizardSubmission';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import { actorConfig } from '@/lib/constants/actorConfig';
import { formMessages } from '@/lib/constants/formMessages';
import { validatePersonFields, validateContactInfo, validateFinancialInfo } from '@/lib/utils/actorValidation';
import JointObligorPersonalInfoTab from './JointObligorPersonalInfoTab';
import JointObligorEmploymentTab from './JointObligorEmploymentTab';
import JointObligorGuaranteeTab from './JointObligorGuaranteeTab';
import JointObligorReferencesTab from './JointObligorReferencesTab';
import JointObligorDocumentsSection from './JointObligorDocumentsSection';

interface JointObligorFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function JointObligorFormWizard({
  token,
  initialData,
  policy,
  onComplete,
  isAdminEdit = false,
}: JointObligorFormWizardProps) {
  const { toast } = useToast();

  // Use generic form state hook
  const formState = useActorFormState({
    actorType: 'jointObligor',
    initialData,
    policy,
    isAdminEdit,
    token,
  });

  // Extract what we need for compatibility
  const { formData, updateField, errors, setErrors } = formState as any;

  // References hook - using the actual return values
  const referencesHook = useActorReferences({
    actorType: 'jointObligor',
    initialReferences: initialData,
    allowAddRemove: false,
    minReferences: 3,
    maxReferences: 3,
    errorKeyPrefix: 'personalReference',
  });

  const personalReferences = (referencesHook as any).personalReferences || [];
  const updatePersonalReference = (referencesHook as any).updatePersonalReference || (() => {});
  const validatePersonalReferences = (referencesHook as any).validatePersonalReferences || (() => ({ valid: true, errors: {} }));

  // For commercial references (JointObligor specific)
  const commercialReferences = initialData?.commercialReferences || [];
  const updateCommercialReference = (index: number, field: string, value: any) => {
    // Handle commercial references update
  };
  const validateCommercialReferences = () => true;

  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use submission hook
  const { handleSaveTab: saveTabHandler, handleFinalSubmit: submitHandler } = useFormWizardSubmission({
    actorType: 'joint-obligor',
    token,
    isAdminEdit,
  });

  // Get tab configuration
  const config = actorConfig.jointObligor;
  const tabs = (formData.isCompany ? config.companyTabs : config.personTabs) as any;

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({
    tabs,
    isAdminEdit,
  });

  // Initialize form data with initial data
  useEffect(() => {
    if (initialData) {
      // Mark tabs as saved if data exists
      if (initialData.fullName || initialData.companyName) {
        wizard.markTabSaved('personal');
      }
      if (initialData.occupation || initialData.monthlyIncome) {
        wizard.markTabSaved('employment');
      }
      if (initialData.guaranteeMethod) {
        wizard.markTabSaved('guarantee');
      }
      if (initialData.references?.length > 0 || initialData.commercialReferences?.length > 0) {
        wizard.markTabSaved('references');
      }
    }
  }, [initialData]);

  // Validation functions for tabs
  const validatePersonalTab = useCallback(() => {
    if (formData.isCompany) {
      const result = validatePersonFields({
        ...formData,
        firstName: formData.legalRepFirstName,
        paternalLastName: formData.legalRepPaternalLastName,
        maternalLastName: formData.legalRepMaternalLastName,
      }, (errs: Record<string, string>) => setErrors(errs));
      return result;
    }
    return validatePersonFields(formData, (errs: Record<string, string>) => setErrors(errs));
  }, [formData, setErrors]);

  const validateEmploymentTab = useCallback(() => {
    const contactValid = validateContactInfo(formData, (errs: Record<string, string>) => setErrors(errs));
    const financialValid = validateFinancialInfo(formData, (errs: Record<string, string>) => setErrors(errs));
    return contactValid && financialValid;
  }, [formData, setErrors]);

  const validateGuaranteeTab = useCallback(() => {
    // Basic validation for guarantee method
    if (!formData.guaranteeMethod) {
      setErrors({ guaranteeMethod: 'Seleccione un método de garantía' });
      return false;
    }
    return true;
  }, [formData, setErrors]);

  // Handle tab save using consolidated logic
  const handleSaveTab = useCallback(async (tabName: string) => {
    const validateTab = () => {
      setErrors({}); // Clear errors before validation

      if (tabName === 'personal') {
        return validatePersonalTab();
      } else if (tabName === 'employment' && !formData.isCompany) {
        return validateEmploymentTab();
      } else if (tabName === 'guarantee') {
        return validateGuaranteeTab();
      } else if (tabName === 'references') {
        const refValidation = validatePersonalReferences();
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
          references: formData.isCompany ? undefined : personalReferences,
          commercialReferences: formData.isCompany ? commercialReferences : undefined,
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
    formData,
    personalReferences,
    commercialReferences,
    saveTabHandler,
    validatePersonalTab,
    validateEmploymentTab,
    validateGuaranteeTab,
    validatePersonalReferences,
    setErrors,
    wizard,
  ]);

  // Handle final submission using consolidated logic
  const handleFinalSubmit = useCallback(async () => {
    wizard.setSavingTab('final');

    try {
      const finalData = {
        ...formData,
        references: formData.isCompany ? undefined : personalReferences,
        commercialReferences: formData.isCompany ? commercialReferences : undefined,
      };

      const success = await submitHandler(
        () => finalData,
        requiredDocsUploaded,
        () => ({ personal: personalReferences, commercial: commercialReferences }),
        onComplete
      );

      if (success) {
        if (onComplete) {
          onComplete();
        } else if (isAdminEdit) {
          // Navigate to policy details page
          window.location.href = `/admin/policies/${policy?.id}`;
        } else {
          // Navigate to success page
          window.location.href = '/portal/success';
        }
      } else {
        wizard.setSavingTab(null);
      }
    } catch (error) {
      console.error('Submit error:', error);
      wizard.setSavingTab(null);
    }
  }, [
    formData,
    personalReferences,
    commercialReferences,
    submitHandler,
    wizard,
    onComplete,
    isAdminEdit,
    policy,
  ]);

  const { getProgress } = wizard;
  const progress = getProgress();
  const allTabsSaved = progress.isComplete;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Portal del Obligado Solidario</CardTitle>
          <CardDescription>
            Complete su información para la protección de arrendamiento
          </CardDescription>
          {policy && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Protección:</strong> {policy.policyNumber}<br />
                <strong>Propiedad:</strong> {policy.propertyAddress}<br />
                <strong>Renta mensual:</strong> ${policy.rentAmount?.toLocaleString('es-MX')}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <FormWizardProgress
        tabs={tabs}
        tabSaved={wizard.tabSaved}
        variant="progress"
      />

      {/* Form Wizard */}
      <Card>
        <CardContent className="pt-6">
          <FormWizardTabs
            tabs={tabs}
            activeTab={wizard.activeTab}
            tabSaved={wizard.tabSaved}
            isAdminEdit={isAdminEdit}
            onTabChange={wizard.setActiveTab}
          >

            {/* Personal/Company Tab */}
            <TabsContent value="personal">
              <JointObligorPersonalInfoTab
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

            {/* Employment Tab (Individuals only) */}
            {!formData.isCompany && (
              <TabsContent value="employment">
                <JointObligorEmploymentTab
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

            {/* Guarantee Tab */}
            <TabsContent value="guarantee">
              <JointObligorGuaranteeTab
                formData={formData}
                onFieldChange={updateField}
                errors={errors}
                disabled={wizard.savingTab === 'guarantee'}
                token={token}
                jointObligorId={formData.id}
                initialDocuments={initialData?.documents}
              />
              <SaveTabButton
                tabName="guarantee"
                savingTab={wizard.savingTab}
                isSaved={wizard.tabSaved.guarantee}
                onSave={() => handleSaveTab('guarantee')}
              />
            </TabsContent>

            {/* References Tab */}
            <TabsContent value="references">
              <JointObligorReferencesTab
                isCompany={formData.isCompany}
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
            <TabsContent value="documents">
              <JointObligorDocumentsSection
                obligorId={formData.id}
                token={token}
                isCompany={formData.isCompany}
                guaranteeMethod={formData.guaranteeMethod}
                nationality={formData.nationality}
                allTabsSaved={isAdminEdit || allTabsSaved}
                initialDocuments={initialData?.documents}
                additionalInfo={formData.additionalInfo}
                onAdditionalInfoChange={(value) => updateField('additionalInfo', value)}
                onRequiredDocsChange={setRequiredDocsUploaded}
                isAdminEdit={isAdminEdit}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleFinalSubmit}
                  disabled={wizard.savingTab === 'final' || !requiredDocsUploaded || !allTabsSaved}
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

              {(!requiredDocsUploaded || !allTabsSaved) && (
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {!allTabsSaved && 'Complete todas las secciones antes de enviar. '}
                    {!requiredDocsUploaded && 'Cargue todos los documentos requeridos antes de enviar.'}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </FormWizardTabs>
        </CardContent>
      </Card>
    </div>
  );
}
