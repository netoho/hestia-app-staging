'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, Loader2, CheckCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  isAdminEdit = false, // Default to false for regular actor access
}: LandlordFormWizardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [isCompany, setIsCompany] = useState(initialData.isCompany || false);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [tabSaved, setTabSaved] = useState<Record<string, boolean>>({
    personal: false,
    property: false,
    financial: false,
  });
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Form data state - support multiple landlords
  const [landlords, setLandlords] = useState<Partial<LandlordData>[]>([
    {
      ...initialData,
      isCompany,
      isPrimary: true, // First landlord is always primary
    }
  ]);

  const [propertyData, setPropertyData] = useState<Partial<PropertyDetails>>({
    isFurnished: false,
    hasElectricity: true,
    hasWater: true,
    hasGas: false,
    hasCableTV: false,
    hasInternet: false,
    hasPhone: false,
    utilitiesInLandlordName: false,
    hasInventory: false,
    hasRules: false,
    petsAllowed: false,
    // Property data now comes from policy.propertyDetails
    ...(policy?.propertyDetails || {}),
  });

  const [policyFinancialData, setPolicyFinancialData] = useState<Partial<PolicyFinancialDetails>>({
    hasIVA: false,
    issuesTaxReceipts: false,
    maintenanceIncludedInRent: false,
    // Financial data comes from policy, not propertyDetails
    ...(policy ? {
      hasIVA: policy.hasIVA,
      issuesTaxReceipts: policy.issuesTaxReceipts,
      securityDeposit: policy.securityDeposit,
      maintenanceFee: policy.maintenanceFee,
      maintenanceIncludedInRent: policy.maintenanceIncludedInRent,
      rentIncreasePercentage: policy.rentIncreasePercentage,
      paymentMethod: policy.paymentMethod,
    } : {}),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle form field changes for specific landlord
  const handleFormChange = useCallback((landlordIndex: number, field: string, value: any) => {
    setLandlords(prev => {
      const updated = [...prev];
      updated[landlordIndex] = { ...updated[landlordIndex], [field]: value };
      return updated;
    });
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${landlordIndex}_${field}`];
      return newErrors;
    });
  }, []);

  // Add co-owner landlord
  const addCoOwner = useCallback(() => {
    setLandlords(prev => [
      ...prev,
      {
        isCompany: false,
        isPrimary: false,
        email: '',
        phone: '',
        address: '',
      }
    ]);
  }, []);

  // Remove co-owner landlord
  const removeCoOwner = useCallback((index: number) => {
    if (index === 0) return; // Can't remove primary landlord
    setLandlords(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handlePropertyChange = useCallback((field: string, value: any) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePolicyFinancialChange = useCallback((field: string, value: any) => {
    setPolicyFinancialData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save tab data
  const handleSaveTab = async (tabName: string, isPartial: boolean = true) => {
      if (!requiredDocsUploaded && tabName === 'final') {
          toast({
              title: "Documentos requeridos",
              description: "Por favor cargue todos los documentos requeridos antes de enviar.",
              variant: "destructive",
          });
          return;
      }

      setSavingTab(tabName);
    setErrors({});

    try {
      // Clean addressDetails for all landlords
      const cleanedLandlords = landlords.map(landlord => {
        const cleaned = { ...landlord };
        if (cleaned.addressDetails) {
          const { id, createdAt, updatedAt, ...cleanAddress } = cleaned.addressDetails as any;
          cleaned.addressDetails = cleanAddress;
        }
        return cleaned;
      });

      // Clean propertyAddressDetails if present
      let cleanPropertyData = { ...propertyData };
      if (cleanPropertyData.propertyAddressDetails) {
        const { id, createdAt, updatedAt, ...cleanPropertyAddress } = cleanPropertyData.propertyAddressDetails as any;
        cleanPropertyData.propertyAddressDetails = cleanPropertyAddress;
      }

      // Normalize dates to YYYY-MM-DD format (strip time from ISO strings)
      if (cleanPropertyData.propertyDeliveryDate) {
        cleanPropertyData.propertyDeliveryDate = cleanPropertyData.propertyDeliveryDate.split('T')[0];
      }
      if (cleanPropertyData.contractSigningDate) {
        cleanPropertyData.contractSigningDate = cleanPropertyData.contractSigningDate.split('T')[0];
      }

      // Merge financial data into propertyDetails for submission
      // (Backend will extract financial fields and save to Policy)
      const propertyWithFinancial = tabName === 'financial'
        ? { ...cleanPropertyData, ...policyFinancialData }
        : cleanPropertyData;

      // Prepare submission data based on tab
      // For personal tab, submit all landlords
      let submissionData: any = {
        landlords: cleanedLandlords, // Send array of landlords
        propertyDetails: (tabName === 'property' || tabName === 'financial') ? propertyWithFinancial : undefined,
        partial: isPartial,
      };

      // For property tab saves, only send primary landlord minimal data
      if (tabName === 'property') {
        submissionData.landlords = [{
          ...cleanedLandlords[0],
          isPrimary: true,
        }];
      }

      // For financial tab saves, include requiresCFDI on primary landlord only
      if (tabName === 'financial') {
        submissionData.landlords = [{
          ...cleanedLandlords[0],
          isPrimary: true,
          requiresCFDI: cleanedLandlords[0].requiresCFDI,
        }];
      }

      // Use admin endpoint if in admin mode, otherwise use regular actor endpoint
      const submitUrl = isAdminEdit
        ? `/api/admin/actors/landlord/${token}/submit` // token is actually the actor ID in admin mode
        : `/api/actor/landlord/${token}/submit`; // token is the access token in regular mode

      const response = await fetch(submitUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details.errors)) {
          // Convert validation errors to field errors
          const fieldErrors: Record<string, string> = {};
          data.details.errors.forEach((error: any) => {
            if (error.field) {
              fieldErrors[error.field.split('.').pop()] = error.message;
            }
          });
          setErrors(fieldErrors);
        }

        toast({
          title: "Error",
          description: data.error || 'Error al guardar información',
          variant: "destructive",
        });
        return;
      }

      // Handle final submission differently
      if (tabName === 'final') {
        toast({
          title: "✓ Información Enviada",
          description: 'Tu información ha sido enviada exitosamente. Gracias por completar el formulario.',
        });

        // Call onComplete callback if provided
        if (onComplete) {
          setTimeout(() => onComplete(), 1500);
        }
      } else {
        toast({
          title: "✓ Guardado",
          description: `Información ${tabName === 'personal' ? 'personal' : tabName === 'property' ? 'de la propiedad' : 'fiscal'} guardada exitosamente`,
        });

        setTabSaved(prev => ({ ...prev, [tabName]: true }));

        // Auto advance to next tab
        if (tabName === 'personal') {
          setTimeout(() => setActiveTab('property'), 1000);
        } else if (tabName === 'property') {
          setTimeout(() => setActiveTab('financial'), 1000);
        } else if (tabName === 'financial') {
          setTimeout(() => setActiveTab('documents'), 1000);
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
  };


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
                  {Object.values(tabSaved).filter(Boolean).length} de 3 secciones guardadas
                </span>
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 h-2 rounded-full ${tabSaved.personal ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${tabSaved.property ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${tabSaved.financial ? 'bg-green-500' : 'bg-gray-200'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">
            {tabSaved.personal && <Check className="h-3 w-3 mr-1" />}
            Información Personal
          </TabsTrigger>
          <TabsTrigger value="property" disabled={!isAdminEdit && !tabSaved.personal}>
            {tabSaved.property && <Check className="h-3 w-3 mr-1" />}
            Detalles Propiedad
          </TabsTrigger>
          <TabsTrigger value="financial" disabled={!isAdminEdit && !tabSaved.property}>
            {tabSaved.financial && <Check className="h-3 w-3 mr-1" />}
            Información Fiscal
          </TabsTrigger>
          <TabsTrigger value="documents" disabled={!isAdminEdit && !tabSaved.financial}>Documentos</TabsTrigger>
        </TabsList>

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
                  handleFormChange(0, 'isCompany', newIsCompany);
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
                      disabled={savingTab === 'personal'}
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
                    onChange={(field, value) => handleFormChange(index, field, value)}
                    errors={errors}
                    disabled={savingTab === 'personal'}
                    showAdditionalContact={index === 0} // Only show for primary
                  />
                ) : (
                  <PersonInformation
                    data={landlord as Partial<PersonActorData>}
                    onChange={(field, value) => handleFormChange(index, field, value)}
                    errors={errors}
                    disabled={savingTab === 'personal'}
                    showEmploymentInfo={index === 0} // Only show for primary
                    showAdditionalContact={index === 0} // Only show for primary
                  />
                )}

                <div className="mt-4">
                  <AddressAutocomplete
                    label="Dirección *"
                    value={landlord.addressDetails || {}}
                    onChange={(addressData) => {
                      handleFormChange(index, 'addressDetails', addressData);
                      handleFormChange(index, 'address',
                        `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                      );
                    }}
                    required
                    disabled={savingTab === 'personal'}
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
                disabled={savingTab === 'personal'}
                className="w-full"
              >
                + Agregar Co-propietario
              </Button>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Agregue co-propietarios si la propiedad tiene múltiples dueños (ej: cónyuges, socios)
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('personal', true)}
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

        {/* Property Details Tab */}
        <TabsContent value="property" className="space-y-4">
          <PropertyDetailsForm
            data={propertyData}
            onChange={handlePropertyChange}
            errors={errors}
            disabled={savingTab === 'property'}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('property', true)}
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

        {/* Financial Information Tab - Only for Primary Landlord */}
        <TabsContent value="financial" className="space-y-4">
          <FinancialInfoForm
            landlordData={landlords[0]}
            policyFinancialData={policyFinancialData}
            onLandlordChange={(field, value) => handleFormChange(0, field, value)}
            onPolicyFinancialChange={handlePolicyFinancialChange}
            errors={errors}
            disabled={savingTab === 'financial'}
            policy={policy}
            token={token}
            landlordId={landlords[0].id}
            isAdminEdit={isAdminEdit}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('financial', true)}
              disabled={savingTab === 'financial'}
              className="w-full sm:w-auto"
            >
              {savingTab === 'financial' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : tabSaved.financial ? (
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
            allTabsSaved={isAdminEdit || (tabSaved.personal && tabSaved.property && tabSaved.financial)}
            onRequiredDocsChange={setRequiredDocsUploaded}
            isAdminEdit={isAdminEdit}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => handleSaveTab('final', false)}
              disabled={savingTab === 'final' || !requiredDocsUploaded}
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
