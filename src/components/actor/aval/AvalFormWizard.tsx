'use client';

import { useState, useCallback, useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAvalForm } from '@/hooks/useAvalForm';
import { useAvalReferences } from '@/hooks/useAvalReferences';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';
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

  // Use custom form hooks
  const {
    formData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    validatePropertyTab,
    saveTab: saveFormTab,
  } = useAvalForm(initialData, isAdminEdit);

  const {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  } = useAvalReferences(
    initialData.references || [],
    initialData.commercialReferences || []
  );

  const isCompany = formData.isCompany;

  // Tab configuration
  const tabs = isCompany
    ? [
        { id: 'personal', label: 'Información', needsSave: true },
        { id: 'property', label: 'Propiedad', needsSave: true },
        { id: 'references', label: 'Referencias', needsSave: true },
        { id: 'documents', label: 'Documentos', needsSave: false },
      ]
    : [
        { id: 'personal', label: 'Personal', needsSave: true },
        { id: 'employment', label: 'Empleo', needsSave: true },
        { id: 'property', label: 'Propiedad', needsSave: true },
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
    validatePropertyTab,
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
        description: "Por favor cargue todos los documentos requeridos antes de enviar. La escritura y boleta predial de la propiedad en garantía son obligatorias.",
        variant: "destructive",
      });
      return;
    }

    wizard.setSavingTab('final');

    try {
      // Clean address fields before final submission
      const cleanFormData = cleanFormAddresses(
        { ...formData },
        ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails']
      );

      const submissionData = {
        ...cleanFormData,
        references: isCompany ? undefined : personalReferences,
        commercialReferences: isCompany ? commercialReferences : undefined,
        informationComplete: true,
      };

      // Use unified route - token can be either UUID (admin) or access token (actor)
      const submitUrl = `/api/actors/aval/${token}`;

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
