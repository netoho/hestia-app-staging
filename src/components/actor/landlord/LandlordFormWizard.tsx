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
}

export default function LandlordFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
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

  // Form data state
  const [formData, setFormData] = useState<Partial<LandlordData>>({
    ...initialData,
    isCompany,
  });

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

  // Handle form field changes
  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handlePropertyChange = useCallback((field: string, value: any) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePolicyFinancialChange = useCallback((field: string, value: any) => {
    setPolicyFinancialData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save tab data
  const handleSaveTab = async (tabName: string, isPartial: boolean = true) => {
    setSavingTab(tabName);
    setErrors({});

    try {
      // Clean addressDetails to remove id and timestamps
      const cleanFormData = { ...formData };
      if (cleanFormData.addressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddress } = cleanFormData.addressDetails as any;
        cleanFormData.addressDetails = cleanAddress;
      }

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
      let submissionData: any = {
        landlord: {
          ...cleanFormData,
          isCompany,
        },
        propertyDetails: (tabName === 'property' || tabName === 'financial') ? propertyWithFinancial : undefined,
        partial: isPartial,
      };

      // For property tab saves, only send minimal landlord data
      if (tabName === 'property') {
        submissionData.landlord = {
          isCompany,
          // Only include essential fields needed for validation
          email: formData.email || '',
          phone: formData.phone || '',
          fullName: isCompany ? undefined : formData.fullName,
          companyName: isCompany ? formData.companyName : undefined,
        };
      }

      // For financial tab saves, include requiresCFDI
      if (tabName === 'financial') {
        submissionData.landlord = {
          ...submissionData.landlord,
          requiresCFDI: formData.requiresCFDI,
        };
      }

      // For partial saves, only send relevant fields
      if (isPartial && tabName === 'personal') {
        // Filter to only personal/company fields
        const relevantFields = isCompany
          ? ['isCompany', 'companyName', 'companyRfc', 'legalRepName', 'legalRepPosition',
             'legalRepRfc', 'legalRepPhone', 'legalRepEmail', 'email', 'phone',
             'address', 'addressDetails', 'workPhone', 'workEmail']
          : ['isCompany', 'fullName', 'rfc', 'curp', 'email', 'phone', 'address',
             'addressDetails', 'occupation', 'employerName', 'monthlyIncome',
             'personalEmail', 'workEmail', 'workPhone'];

        const filteredData: any = { isCompany };
        relevantFields.forEach(field => {
          if ((formData as any)[field] !== undefined) {
            // Clean addressDetails to remove id and timestamps
            if (field === 'addressDetails' && (formData as any)[field]) {
              const { id, createdAt, updatedAt, ...cleanAddress } = (formData as any)[field];
              filteredData[field] = cleanAddress;
            } else {
              filteredData[field] = (formData as any)[field];
            }
          }
        });
        submissionData.landlord = filteredData;
      }

      const response = await fetch(`/api/actor/landlord/${token}/submit`, {
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
          <TabsTrigger value="property" disabled={!tabSaved.personal}>
            {tabSaved.property && <Check className="h-3 w-3 mr-1" />}
            Detalles Propiedad
          </TabsTrigger>
          <TabsTrigger value="financial" disabled={!tabSaved.property}>
            {tabSaved.financial && <Check className="h-3 w-3 mr-1" />}
            Información Fiscal
          </TabsTrigger>
          <TabsTrigger value="documents" disabled={!tabSaved.financial}>Documentos</TabsTrigger>
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
                  setFormData(prev => ({ ...prev, isCompany: newIsCompany }));
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

          <Card>
            <CardHeader>
              <CardTitle>Información {isCompany ? 'de la Empresa' : 'Personal'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isCompany ? (
                <CompanyInformation
                  data={formData as Partial<CompanyActorData>}
                  onChange={handleFormChange}
                  errors={errors}
                  disabled={savingTab === 'personal'}
                  showAdditionalContact
                />
              ) : (
                <PersonInformation
                  data={formData as Partial<PersonActorData>}
                  onChange={handleFormChange}
                  errors={errors}
                  disabled={savingTab === 'personal'}
                  showEmploymentInfo
                  showAdditionalContact
                />
              )}

              <div className="mt-4">
                <AddressAutocomplete
                  label="Dirección *"
                  value={formData.addressDetails || {}}
                  onChange={(addressData) => {
                    handleFormChange('addressDetails', addressData);
                    handleFormChange('address',
                      `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                    );
                  }}
                  required
                  disabled={savingTab === 'personal'}
                />
              </div>
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

        {/* Financial Information Tab */}
        <TabsContent value="financial" className="space-y-4">
          <FinancialInfoForm
            landlordData={formData}
            policyFinancialData={policyFinancialData}
            onLandlordChange={handleFormChange}
            onPolicyFinancialChange={handlePolicyFinancialChange}
            errors={errors}
            disabled={savingTab === 'financial'}
            policy={policy}
            token={token}
            landlordId={formData.id}
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

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsSection
            landlordId={formData.id}
            token={token}
            isCompany={isCompany}
            allTabsSaved={tabSaved.personal && tabSaved.property && tabSaved.financial}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}