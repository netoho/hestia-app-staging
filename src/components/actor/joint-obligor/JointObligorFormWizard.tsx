'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Loader2, User, Briefcase, Shield, Users, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useJointObligorForm } from '@/hooks/useJointObligorForm';
import { useJointObligorReferences } from '@/hooks/useJointObligorReferences';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
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

  // Form hooks
  const {
    formData,
    setFormData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    validateEmploymentTab,
    validateGuaranteeTab,
    saveTab,
  } = useJointObligorForm(initialData, isAdminEdit);

  const {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  } = useJointObligorReferences(
    initialData?.references || [],
    initialData?.commercialReferences || []
  );

  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Tab configuration
  const tabs = formData.isCompany
    ? [
        { id: 'personal', label: 'Información', needsSave: true },
        { id: 'guarantee', label: 'Garantía', needsSave: true },
        { id: 'references', label: 'Referencias', needsSave: true },
        { id: 'documents', label: 'Documentos', needsSave: false },
      ]
    : [
        { id: 'personal', label: 'Personal', needsSave: true },
        { id: 'employment', label: 'Empleo', needsSave: true },
        { id: 'guarantee', label: 'Garantía', needsSave: true },
        { id: 'references', label: 'Referencias', needsSave: true },
        { id: 'documents', label: 'Documentos', needsSave: false },
      ];

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({ tabs, isAdminEdit });

  // Initialize form data with initial data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));

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

  // Handle tab save
  const handleSaveTab = async (tabName: string) => {
    // Validation logic
    const validateTab = () => {
      if (tabName === 'personal') {
        return validatePersonalTab();
      } else if (tabName === 'employment' && !formData.isCompany) {
        return validateEmploymentTab();
      } else if (tabName === 'guarantee') {
        return validateGuaranteeTab();
      } else if (tabName === 'references') {
        const refValidation = formData.isCompany
          ? validateCommercialReferences()
          : validatePersonalReferences();
        if (!refValidation.valid) {
          setErrors(refValidation.errors);
        }
        return refValidation.valid;
      }
      return true;
    };

    // Save logic
    const saveData = async () => {
      const additionalData = tabName === 'references'
        ? {
            references: formData.isCompany ? undefined : personalReferences,
            commercialReferences: formData.isCompany ? commercialReferences : undefined,
          }
        : {};

      const success = await saveTab(token, tabName, additionalData);
      if (!success) {
        throw new Error('Failed to save');
      }
    };

    return wizard.handleTabSave(tabName, validateTab, saveData);
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (!requiredDocsUploaded) {
      toast({
        title: 'Documentos Faltantes',
        description: 'Por favor cargue todos los documentos requeridos antes de enviar',
        variant: 'destructive',
      });
      return;
    }

    wizard.setSavingTab('final');

    try {
      // Clean address fields before submission
      const cleanFormData = cleanFormAddresses(
        { ...formData },
        ['addressDetails', 'employerAddressDetails', 'propertyAddressDetails']
      );

      const submitData = {
        ...cleanFormData,
        references: formData.isCompany ? undefined : personalReferences,
        commercialReferences: formData.isCompany ? commercialReferences : undefined,
        informationComplete: true,
      };

      const submitUrl = isAdminEdit
        ? `/api/admin/actors/joint-obligor/${token}/submit`
        : `/api/actor/joint-obligor/${token}/submit`;

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la información');
      }

      toast({
        title: '✓ Información Enviada',
        description: 'Tu información ha sido enviada exitosamente',
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al enviar la información',
        variant: 'destructive',
      });
    } finally {
      wizard.setSavingTab(null);
    }
  };

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
