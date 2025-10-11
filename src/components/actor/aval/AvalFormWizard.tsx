'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAvalForm } from '@/hooks/useAvalForm';
import { useAvalReferences } from '@/hooks/useAvalReferences';
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
}

export default function AvalFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
}: AvalFormWizardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [tabSaved, setTabSaved] = useState<Record<string, boolean>>({
    personal: false,
    employment: false,
    property: false,
    references: false,
  });
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use custom hooks
  const {
    formData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    validatePropertyTab,
    saveTab: saveFormTab,
  } = useAvalForm(initialData);

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

  // Save tab handler
  const handleSaveTab = useCallback(async (tabName: string) => {
    setSavingTab(tabName);
    setErrors({});

    try {
      // Validate based on tab
      let isValid = true;
      if (tabName === 'personal') {
        isValid = validatePersonalTab();
      } else if (tabName === 'property') {
        isValid = validatePropertyTab();
      } else if (tabName === 'references') {
        const refValidation = isCompany
          ? validateCommercialReferences()
          : validatePersonalReferences();
        isValid = refValidation.valid;
        if (!isValid) {
          setErrors(refValidation.errors);
        }
      }

      if (!isValid) {
        toast({
          title: "Error de validación",
          description: "Por favor complete todos los campos requeridos",
          variant: "destructive",
        });
        return;
      }

      // Prepare additional data for save
      const additionalData: any = {};
      if (tabName === 'references') {
        additionalData.references = isCompany ? undefined : personalReferences;
        additionalData.commercialReferences = isCompany ? commercialReferences : undefined;
      }

      // Save
      const success = await saveFormTab(token, tabName, additionalData);

      if (success) {
        setTabSaved(prev => ({ ...prev, [tabName]: true }));

        // Auto advance to next tab
        const tabs = isCompany
          ? ['personal', 'property', 'references', 'documents']
          : ['personal', 'employment', 'property', 'references', 'documents'];

        const currentIndex = tabs.indexOf(tabName);
        if (currentIndex < tabs.length - 1) {
          setTimeout(() => setActiveTab(tabs[currentIndex + 1]), 1000);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: 'Error al guardar la información',
        variant: "destructive",
      });
    } finally {
      setSavingTab(null);
    }
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
    toast,
    setErrors,
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

    setSavingTab('final');

    try {
      // Clean address fields before final submission
      const cleanFormData = { ...formData };
      if (cleanFormData.addressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.addressDetails as any;
        cleanFormData.addressDetails = cleanAddress;
      }
      if (cleanFormData.employerAddressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.employerAddressDetails as any;
        cleanFormData.employerAddressDetails = cleanAddress;
      }
      if (cleanFormData.guaranteePropertyDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.guaranteePropertyDetails as any;
        cleanFormData.guaranteePropertyDetails = cleanAddress;
      }

      const submissionData = {
        ...cleanFormData,
        references: isCompany ? undefined : personalReferences,
        commercialReferences: isCompany ? commercialReferences : undefined,
        informationComplete: true,
      };

      const response = await fetch(`/api/actor/aval/${token}/submit`, {
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
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: 'Error al enviar la información',
        variant: "destructive",
      });
    } finally {
      setSavingTab(null);
    }
  }, [formData, isCompany, personalReferences, commercialReferences, token, toast, onComplete, requiredDocsUploaded]);

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

  const allTabsSaved = tabs
    .filter(tab => tab.needsSave)
    .every(tab => tabSaved[tab.id]);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso de Completado</span>
                <span className="text-sm text-muted-foreground">
                  {Object.values(tabSaved).filter(Boolean).length} de {tabs.filter(t => t.needsSave).length} secciones guardadas
                </span>
              </div>
              <div className="flex gap-2">
                {tabs.filter(t => t.needsSave).map(tab => (
                  <div
                    key={tab.id}
                    className={`flex-1 h-2 rounded-full ${
                      tabSaved[tab.id] ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
          {tabs.map((tab, index) => {
            const previousTab = index > 0 ? tabs[index - 1] : null;
            const isDisabled = previousTab && previousTab.needsSave && !tabSaved[previousTab.id];

            return (
              <TabsTrigger key={tab.id} value={tab.id} disabled={isDisabled}>
                {tabSaved[tab.id] && <Check className="h-3 w-3 mr-1" />}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-4">
          <AvalPersonalInfoTab
            formData={formData}
            onFieldChange={updateField}
            errors={errors}
            disabled={savingTab === 'personal'}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('personal')}
              disabled={savingTab === 'personal'}
              className="w-full sm:w-auto"
            >
              {savingTab === 'personal' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : tabSaved.personal ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Guardado - Continuar
                </>
              ) : (
                'Guardar y Continuar'
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Employment Tab (Individual only) */}
        {!isCompany && (
          <TabsContent value="employment" className="space-y-4">
            <AvalEmploymentTab
              formData={formData}
              onFieldChange={updateField}
              errors={errors}
              disabled={savingTab === 'employment'}
            />

            <div className="flex justify-end">
              <Button
                onClick={() => handleSaveTab('employment')}
                disabled={savingTab === 'employment'}
                className="w-full sm:w-auto"
              >
                {savingTab === 'employment' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : tabSaved.employment ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Guardado - Continuar
                  </>
                ) : (
                  'Guardar y Continuar'
                )}
              </Button>
            </div>
          </TabsContent>
        )}

        {/* Property Guarantee Tab */}
        <TabsContent value="property" className="space-y-4">
          <AvalPropertyGuaranteeTab
            formData={formData}
            onFieldChange={updateField}
            errors={errors}
            disabled={savingTab === 'property'}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('property')}
              disabled={savingTab === 'property'}
              className="w-full sm:w-auto"
            >
              {savingTab === 'property' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : tabSaved.property ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Guardado - Continuar
                </>
              ) : (
                'Guardar y Continuar'
              )}
            </Button>
          </div>
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="space-y-4">
          <AvalReferencesTab
            personalReferences={personalReferences}
            commercialReferences={commercialReferences}
            onPersonalReferenceChange={updatePersonalReference}
            onCommercialReferenceChange={updateCommercialReference}
            errors={errors}
            disabled={savingTab === 'references'}
            isCompany={isCompany}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('references')}
              disabled={savingTab === 'references'}
              className="w-full sm:w-auto"
            >
              {savingTab === 'references' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : tabSaved.references ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Guardado - Continuar
                </>
              ) : (
                'Guardar y Continuar'
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <AvalDocumentsSection
            avalId={formData.id}
            token={token}
            isCompany={isCompany}
            nationality={formData.nationality}
            allTabsSaved={allTabsSaved}
            initialDocuments={initialData.documents || []}
            additionalInfo={formData.additionalInfo}
            onAdditionalInfoChange={(value) => updateField('additionalInfo', value)}
            onRequiredDocsChange={setRequiredDocsUploaded}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleFinalSubmit}
              disabled={savingTab === 'final' || !allTabsSaved || !requiredDocsUploaded}
              className="w-full sm:w-auto"
              size="lg"
            >
              {savingTab === 'final' ? (
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
      </Tabs>
    </div>
  );
}
