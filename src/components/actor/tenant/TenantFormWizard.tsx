'use client';

import { useState, useCallback, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useTenantForm } from '@/hooks/useTenantForm';
import { useTenantReferences } from '@/hooks/useTenantReferences';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
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

  // Use custom hooks
  const {
    formData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    saveTab: saveFormTab,
  } = useTenantForm(initialData, isAdminEdit);

  const {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  } = useTenantReferences(
    initialData.references || [],
    initialData.commercialReferences || []
  );

  const isCompany = formData.tenantType === 'COMPANY';

  // Tab configuration
  const tabs = isCompany
    ? [
        { id: 'personal', label: 'Información', needsSave: true },
        { id: 'rental', label: 'Historial', needsSave: true },
        { id: 'references', label: 'Referencias', needsSave: true },
        { id: 'documents', label: 'Documentos', needsSave: false },
      ]
    : [
        { id: 'personal', label: 'Personal', needsSave: true },
        { id: 'employment', label: 'Empleo', needsSave: true },
        { id: 'rental', label: 'Historial', needsSave: true },
        { id: 'references', label: 'Referencias', needsSave: true },
        { id: 'documents', label: 'Documentos', needsSave: false },
      ];

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({ tabs, isAdminEdit });

  // Save tab handler
  const handleSaveTab = useCallback(async (tabName: string) => {
    // Validation logic
    const validateTab = () => {
      if (tabName === 'personal') {
        return validatePersonalTab();
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

    // Save logic
    const saveData = async () => {
      const additionalData: any = {};
      if (tabName === 'references') {
        additionalData.references = isCompany ? undefined : personalReferences;
        additionalData.commercialReferences = isCompany ? commercialReferences : undefined;
      }

      const success = await saveFormTab(token, tabName, additionalData);
      if (!success) {
        throw new Error('Failed to save');
      }
    };

    return wizard.handleTabSave(tabName, validateTab, saveData);
  }, [
    validatePersonalTab,
    validatePersonalReferences,
    validateCommercialReferences,
    saveFormTab,
    token,
    isCompany,
    personalReferences,
    commercialReferences,
    setErrors,
    wizard
  ]);

  // Final submit handler
  const handleFinalSubmit = useCallback(async () => {
    if (!requiredDocsUploaded) {
      toast({
        title: "Documentos requeridos",
        description: "Por favor cargue todos los documentos requeridos antes de enviar",
        variant: "destructive",
      });
      return;
    }

    wizard.setSavingTab('final');

    try {
      // Clean address fields before final submission
      const cleanFormData = cleanFormAddresses(
        { ...formData },
        ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails']
      );

      const submissionData = {
        ...cleanFormData,
        references: isCompany ? undefined : personalReferences,
        commercialReferences: isCompany ? commercialReferences : undefined,
        informationComplete: true,
      };

      const submitUrl = isAdminEdit
        ? `/api/admin/actors/tenant/${token}/submit`
        : `/api/actor/tenant/${token}/submit`;

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit information');
      }

      toast({
        title: "✓ Información Enviada",
        description: 'Tu información ha sido enviada exitosamente',
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: 'Error al enviar la información',
        variant: "destructive",
      });
    } finally {
      wizard.setSavingTab(null);
    }
  }, [formData, isCompany, personalReferences, commercialReferences, token, toast, onComplete, requiredDocsUploaded, wizard]);

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
