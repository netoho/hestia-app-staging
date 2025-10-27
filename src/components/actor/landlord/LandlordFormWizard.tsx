'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, Loader2, CheckCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLandlordForm } from '@/hooks/useLandlordForm';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { SaveTabButton } from '@/components/actor/shared/SaveTabButton';
import { cleanFormAddresses } from '@/lib/utils/addressUtils';

import PersonInformation from '@/components/actor/shared/PersonInformation';
import CompanyInformation from '@/components/actor/shared/CompanyInformation';
import PropertyDetailsForm from './PropertyDetailsForm';
import FinancialInfoForm from './FinancialInfoForm';
import DocumentsSection from './DocumentsSection';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';

import {
  LandlordData,
  PropertyDetails,
  PolicyFinancialDetails,
  PersonActorData,
  CompanyActorData
} from '@/lib/types/actor';

interface LandlordFormWizardProps {
  token: string;
  initialData?: Partial<LandlordData>;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean; // New prop to indicate admin mode
}

export default function LandlordFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: LandlordFormWizardProps) {
  const { toast } = useToast();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Use the landlord form hook
  const {
    landlords,
    propertyData,
    policyFinancialData,
    errors,
    saving,
    updateLandlordField,
    updatePropertyField,
    updateFinancialField,
    addCoOwner,
    removeCoOwner,
    setErrors,
    validatePersonalTab,
    validatePropertyTab,
    validateFinancialTab,
    saveTab: saveFormTab
  } = useLandlordForm({ token, initialData, policy, isAdminEdit });

  const isCompany = landlords[0]?.isCompany || false;

  // Tab configuration
  const tabs = [
    { id: 'personal', label: isCompany ? 'Información' : 'Personal', needsSave: true },
    { id: 'property', label: 'Propiedad', needsSave: true },
    { id: 'financial', label: 'Fiscal', needsSave: true },
    { id: 'documents', label: 'Documentos', needsSave: false },
  ];

  // Use wizard tabs hook
  const wizard = useFormWizardTabs({ tabs, isAdminEdit });

  // Handle tab save
  const handleSaveTab = async (tabName: string) => {
    // Validation logic
    const validateTab = () => {
      if (tabName === 'personal') {
        const result = validatePersonalTab();
        if (!result.valid && result.errors) {
          setErrors(result.errors);
        }
        return result.valid;
      } else if (tabName === 'property') {
        const result = validatePropertyTab();
        if (!result.valid && result.errors) {
          setErrors(result.errors);
        }
        return result.valid;
      } else if (tabName === 'financial') {
        const result = validateFinancialTab();
        if (!result.valid && result.errors) {
          setErrors(result.errors);
        }
        return result.valid;
      }
      return true;
    };

    // Save logic
    const saveData = async () => {
      const success = await saveFormTab(tabName, true);
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
        title: "Documentos requeridos",
        description: "Por favor cargue todos los documentos requeridos antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    wizard.setSavingTab('final');

    try {
      // Final submission is just a save with partial=false
      const success = await saveFormTab('final', false);

      if (success) {
        toast({
          title: "✓ Información Enviada",
          description: 'Tu información ha sido enviada exitosamente. Gracias por completar el formulario.',
        });

        if (onComplete) {
          setTimeout(() => onComplete(), 1500);
        }
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
  };

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

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Arrendador</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={isCompany ? 'company' : 'individual'}
                onValueChange={(value) => {
                  const newIsCompany = value === 'company';
                  setIsCompany(newIsCompany);
                  updateLandlordField(0, 'isCompany', newIsCompany);
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex items-center cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Persona Física
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company" className="flex items-center cursor-pointer">
                    <Building2 className="h-4 w-4 mr-2" />
                    Persona Moral (Empresa)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Render all landlords */}
          {landlords.map((landlord, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {index === 0 ? 'Arrendador Principal (Contacto Principal)' : `Co-propietario ${index}`}
                  </CardTitle>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoOwner(index)}
                      disabled={wizard.savingTab === 'personal'}
                    >
                      ✕ Eliminar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {landlord.isCompany ? (
                  <CompanyInformation
                    data={landlord as Partial<CompanyActorData>}
                    onChange={(field, value) => updateLandlordField(index, field, value)}
                    errors={errors}
                    disabled={wizard.savingTab === 'personal'}
                    showAdditionalContact={index === 0} // Only show for primary
                  />
                ) : (
                  <PersonInformation
                    data={landlord as Partial<PersonActorData>}
                    onChange={(field, value) => updateLandlordField(index, field, value)}
                    errors={errors}
                    disabled={wizard.savingTab === 'personal'}
                    showEmploymentInfo={index === 0} // Only show for primary
                    showAdditionalContact={index === 0} // Only show for primary
                  />
                )}

                <div className="mt-4">
                  <AddressAutocomplete
                    label="Dirección *"
                    value={landlord.addressDetails || {}}
                    onChange={(addressData) => {
                      updateLandlordField(index, 'addressDetails', addressData);
                      updateLandlordField(index, 'address',
                        `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                      );
                    }}
                    required
                    disabled={wizard.savingTab === 'personal'}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Co-owner Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                onClick={addCoOwner}
                disabled={wizard.savingTab === 'personal'}
                className="w-full"
              >
                + Agregar Co-propietario
              </Button>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Agregue co-propietarios si la propiedad tiene múltiples dueños (ej: cónyuges, socios)
              </p>
            </CardContent>
          </Card>

          <SaveTabButton
            tabName="personal"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.personal}
            onSave={() => handleSaveTab('personal')}
          />
        </TabsContent>

        {/* Property Details Tab */}
        <TabsContent value="property" className="space-y-4">
          <PropertyDetailsForm
            data={propertyData}
            onChange={updatePropertyField}
            errors={errors}
            disabled={wizard.savingTab === 'property'}
          />

          <SaveTabButton
            tabName="property"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.property}
            onSave={() => handleSaveTab('property')}
          />
        </TabsContent>

        {/* Financial Information Tab - Only for Primary Landlord */}
        <TabsContent value="financial" className="space-y-4">
          <FinancialInfoForm
            landlordData={landlords[0]}
            policyFinancialData={policyFinancialData}
            onLandlordChange={(field, value) => updateLandlordField(0, field, value)}
            onPolicyFinancialChange={updateFinancialField}
            errors={errors}
            disabled={wizard.savingTab === 'financial'}
            policy={policy}
            token={token}
            landlordId={landlords[0].id}
            isAdminEdit={isAdminEdit}
          />

          <SaveTabButton
            tabName="financial"
            savingTab={wizard.savingTab}
            isSaved={wizard.tabSaved.financial}
            onSave={() => handleSaveTab('financial')}
          />
        </TabsContent>

        {/* Documents Tab - Only for Primary Landlord */}
        <TabsContent value="documents" className="space-y-4">
          <Alert className="mb-4">
            <AlertDescription>
              Los documentos (escrituras, información bancaria, CFDI) solo son requeridos del arrendador principal.
              Los co-propietarios solo necesitan proporcionar identificación.
            </AlertDescription>
          </Alert>
          <DocumentsSection
            landlordId={landlords[0].id} // Primary landlord only
            token={token}
            isCompany={landlords[0].isCompany || false}
            allTabsSaved={isAdminEdit || (wizard.tabSaved.personal && wizard.tabSaved.property && wizard.tabSaved.financial)}
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
