'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, CheckCircle, AlertCircle, Building2, User, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';

interface LandlordData {
  id: string;
  isCompany: boolean;
  // Individual fields
  fullName?: string;
  rfc?: string;
  curp?: string;
  // Company fields
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;
  // Contact
  email: string;
  phone: string;
  workPhone?: string;
  personalEmail?: string;
  workEmail?: string;
  // Address
  address?: string;
  addressDetails?: any;
  // Bank info
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  accountHolder?: string;
  // Work info
  occupation?: string;
  employerName?: string;
  monthlyIncome?: number;
  // Property management
  propertyDeedNumber?: string;
  propertyRegistryFolio?: string;
  requiresCFDI: boolean;
  cfdiData?: string;
  informationComplete: boolean;
  documents: any[];
  additionalInfo?: string;
}

interface PropertyDetails {
  parkingSpaces?: number;
  parkingNumbers?: string;
  isFurnished: boolean;
  hasPhone: boolean;
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasCableTV: boolean;
  hasInternet: boolean;
  otherServices?: string;
  utilitiesInLandlordName: boolean;
  hasIVA: boolean;
  issuesTaxReceipts: boolean;
  securityDeposit?: number;
  maintenanceFee?: number;
  maintenanceIncludedInRent: boolean;
  rentIncreasePercentage?: number;
  paymentMethod?: string;
  hasInventory: boolean;
  hasRules: boolean;
  petsAllowed: boolean;
  propertyDeliveryDate?: string;
  contractSigningDate?: string;
  contractSigningLocation?: string;
  propertyAddressDetails?: any;
}

export default function LandlordPortalPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [tabSaved, setTabSaved] = useState<Record<string, boolean>>({
    personal: false,
    property: false,
    financial: false,
  });
  const [landlord, setLandlord] = useState<LandlordData | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [documents, setDocuments] = useState<any[]>([]);

  // Form state
  const [isCompany, setIsCompany] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [propertyData, setPropertyData] = useState<PropertyDetails>({
    isFurnished: false,
    hasPhone: false,
    hasElectricity: true,
    hasWater: true,
    hasGas: false,
    hasCableTV: false,
    hasInternet: false,
    utilitiesInLandlordName: false,
    hasIVA: false,
    issuesTaxReceipts: false,
    maintenanceIncludedInRent: false,
    hasInventory: false,
    hasRules: false,
    petsAllowed: false,
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/actor/landlord/${token}/validate`);
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || 'Token inválido',
          variant: "destructive",
        });
        router.push('/');
        return;
      }

      setLandlord(data.landlord);
      setPolicy(data.policy);
      setIsCompany(data.landlord.isCompany || false);

      // Pre-fill form with existing data
      setFormData({
        ...data.landlord,
        address: data.landlord.address || '',
      });

      // Pre-fill property data
      if (data.policy) {
        setPropertyData(prev => ({
          ...prev,
          parkingSpaces: data.policy.parkingSpaces,
          parkingNumbers: data.policy.parkingNumbers,
          isFurnished: data.policy.isFurnished || false,
          hasPhone: data.policy.hasPhone || false,
          hasElectricity: data.policy.hasElectricity !== false,
          hasWater: data.policy.hasWater !== false,
          hasGas: data.policy.hasGas || false,
          hasCableTV: data.policy.hasCableTV || false,
          hasInternet: data.policy.hasInternet || false,
          otherServices: data.policy.otherServices,
          utilitiesInLandlordName: data.policy.utilitiesInLandlordName || false,
          hasIVA: data.policy.hasIVA || false,
          issuesTaxReceipts: data.policy.issuesTaxReceipts || false,
          securityDeposit: data.policy.securityDeposit,
          maintenanceFee: data.policy.maintenanceFee,
          maintenanceIncludedInRent: data.policy.maintenanceIncludedInRent || false,
          rentIncreasePercentage: data.policy.rentIncreasePercentage,
          paymentMethod: data.policy.paymentMethod,
          hasInventory: data.policy.hasInventory || false,
          hasRules: data.policy.hasRules || false,
          petsAllowed: data.policy.petsAllowed || false,
          propertyDeliveryDate: data.policy.propertyDeliveryDate,
          contractSigningDate: data.policy.contractSigningDate,
          contractSigningLocation: data.policy.contractSigningLocation,
        }));
      }

      setDocuments(data.landlord.documents || []);
    } catch (error) {
      console.error('Error validating token:', error);
      toast({
        title: "Error",
        description: 'Error al validar el acceso',
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const sanitizeFormData = (data: any) => {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip empty strings, convert to null
      if (value === '') {
        sanitized[key] = null;
      }
      // Handle NaN for numbers
      else if (typeof value === 'number' && isNaN(value)) {
        sanitized[key] = null;
      }
      // Keep non-empty values
      else if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  const handleSaveTab = async (tabName: string) => {
    setSavingTab(tabName);
    try {
      // Sanitize form data before sending
      const cleanedFormData = sanitizeFormData(formData);
      const cleanedPropertyData = sanitizeFormData(propertyData);

      const response = await fetch(`/api/actor/landlord/${token}/submit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landlord: {
            ...cleanedFormData,
            isCompany,
          },
          propertyDetails: cleanedPropertyData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          // Only show validation errors for the current tab's fields
          const relevantErrors = data.details.filter((detail: any) => {
            const field = detail.field.toLowerCase();
            if (tabName === 'personal') {
              return !field.includes('property') && !field.includes('bank') && !field.includes('cfdi');
            }
            if (tabName === 'property') {
              return field.includes('property') || field.includes('parking') || field.includes('services');
            }
            if (tabName === 'financial') {
              return field.includes('bank') || field.includes('cfdi') || field.includes('tax');
            }
            return true;
          });

          if (relevantErrors.length > 0) {
            relevantErrors.forEach((detail: any) => {
              toast({
                title: "Error de validación",
                description: `${detail.field}: ${detail.message}`,
                variant: "destructive",
              });
            });
            return;
          }
        } else {
          toast({
            title: "Error",
            description: data.error || 'Error al guardar información',
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "✓ Guardado",
        description: `Información de ${tabName === 'personal' ? 'información personal' : tabName === 'property' ? 'la propiedad' : 'información fiscal'} guardada exitosamente`,
      });

      setTabSaved(prev => ({ ...prev, [tabName]: true }));

      // Auto advance to next tab after successful save
      if (tabName === 'personal') {
        setTimeout(() => setActiveTab('property'), 1000);
      } else if (tabName === 'property') {
        setTimeout(() => setActiveTab('financial'), 1000);
      } else if (tabName === 'financial' && !landlord?.informationComplete) {
        setLandlord(prev => prev ? { ...prev, informationComplete: true } : null);
        setTimeout(() => setActiveTab('documents'), 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: 'Error al guardar la información',
        variant: "destructive",
      });
    } finally {
      setSavingTab(null);
    }
  };

  const handleSubmit = async () => {
    await handleSaveTab('financial');
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    try {
      const response = await fetch(`/api/actor/landlord/${token}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || 'Error al cargar documento',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: 'Documento cargado exitosamente',
      });
      setDocuments(prev => [...prev, data.document]);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: 'Error al cargar el documento',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!landlord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Token inválido o expirado</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Portal del Arrendador</CardTitle>
            <CardDescription>
              Complete la información solicitada para la protección #{policy?.policyNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Propiedad:</span>
                <span className="font-medium">{policy?.propertyAddress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renta mensual:</span>
                <span className="font-medium">${policy?.rentAmount?.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <Card className="mb-6">
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
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <div className="flex items-center justify-center">
                {tabSaved.personal ? (
                  <Check className="h-3 w-3 text-green-500 mr-1" />
                ) : null}
                <span className={tabSaved.personal ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  Personal
                </span>
              </div>
              <div className="flex items-center justify-center">
                {tabSaved.property ? (
                  <Check className="h-3 w-3 text-green-500 mr-1" />
                ) : null}
                <span className={tabSaved.property ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  Propiedad
                </span>
              </div>
              <div className="flex items-center justify-center">
                {tabSaved.financial ? (
                  <Check className="h-3 w-3 text-green-500 mr-1" />
                ) : null}
                <span className={tabSaved.financial ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  Fiscal
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="property">Detalles Propiedad</TabsTrigger>
            <TabsTrigger value="financial">Información Fiscal</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Arrendador</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={isCompany ? 'company' : 'individual'}
                  onValueChange={(value) => setIsCompany(value === 'company')}
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
              <CardContent className="space-y-4">
                {isCompany ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyName">Razón Social *</Label>
                        <Input
                          id="companyName"
                          value={formData.companyName || ''}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyRfc">RFC de la Empresa *</Label>
                        <Input
                          id="companyRfc"
                          value={formData.companyRfc || ''}
                          onChange={(e) => setFormData({ ...formData, companyRfc: e.target.value })}
                          maxLength={13}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="legalRepName">Nombre del Representante Legal *</Label>
                        <Input
                          id="legalRepName"
                          value={formData.legalRepName || ''}
                          onChange={(e) => setFormData({ ...formData, legalRepName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="legalRepPosition">Cargo del Representante *</Label>
                        <Input
                          id="legalRepPosition"
                          value={formData.legalRepPosition || ''}
                          onChange={(e) => setFormData({ ...formData, legalRepPosition: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="legalRepRfc">RFC del Representante</Label>
                        <Input
                          id="legalRepRfc"
                          value={formData.legalRepRfc || ''}
                          onChange={(e) => setFormData({ ...formData, legalRepRfc: e.target.value })}
                          maxLength={13}
                        />
                      </div>
                      <div>
                        <Label htmlFor="legalRepPhone">Teléfono del Representante *</Label>
                        <Input
                          id="legalRepPhone"
                          type="tel"
                          value={formData.legalRepPhone || ''}
                          onChange={(e) => setFormData({ ...formData, legalRepPhone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="legalRepEmail">Email del Representante *</Label>
                      <Input
                        id="legalRepEmail"
                        type="email"
                        value={formData.legalRepEmail || ''}
                        onChange={(e) => setFormData({ ...formData, legalRepEmail: e.target.value })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">Nombre Completo *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName || ''}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="rfc">RFC</Label>
                        <Input
                          id="rfc"
                          value={formData.rfc || ''}
                          onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                          maxLength={13}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="curp">CURP</Label>
                        <Input
                          id="curp"
                          value={formData.curp || ''}
                          onChange={(e) => setFormData({ ...formData, curp: e.target.value })}
                          maxLength={18}
                        />
                      </div>
                      <div>
                        <Label htmlFor="occupation">Ocupación</Label>
                        <Input
                          id="occupation"
                          value={formData.occupation || ''}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="employerName">Empleador</Label>
                        <Input
                          id="employerName"
                          value={formData.employerName || ''}
                          onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthlyIncome">Ingreso Mensual</Label>
                        <Input
                          id="monthlyIncome"
                          type="number"
                          value={formData.monthlyIncome || ''}
                          onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value ? parseFloat(e.target.value) : null })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Principal *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono Principal *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <AddressAutocomplete
                    label="Dirección *"
                    value={formData.addressDetails || {}}
                    onChange={(addressData) => {
                      setFormData({
                        ...formData,
                        addressDetails: addressData,
                        address: `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`,
                      });
                    }}
                    required
                    disabled={submitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save button for Personal Information tab */}
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

          <TabsContent value="property" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ubicación de la Propiedad</CardTitle>
              </CardHeader>
              <CardContent>
                <AddressAutocomplete
                  label="Dirección del Inmueble *"
                  value={propertyData.propertyAddressDetails || {}}
                  onChange={(addressData) => {
                    setPropertyData({
                      ...propertyData,
                      propertyAddressDetails: addressData,
                    });
                  }}
                  required
                  disabled={submitting}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Características de la Propiedad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parkingSpaces">Espacios de Estacionamiento</Label>
                    <Input
                      id="parkingSpaces"
                      type="number"
                      min="0"
                      value={propertyData.parkingSpaces || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, parkingSpaces: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parkingNumbers">Números de Cajones (separados por comas)</Label>
                    <Input
                      id="parkingNumbers"
                      value={propertyData.parkingNumbers || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, parkingNumbers: e.target.value })}
                      placeholder="Ej: A-12, B-5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Servicios Incluidos</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasElectricity"
                        checked={propertyData.hasElectricity}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasElectricity: !!checked })
                        }
                      />
                      <Label htmlFor="hasElectricity">Luz</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasWater"
                        checked={propertyData.hasWater}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasWater: !!checked })
                        }
                      />
                      <Label htmlFor="hasWater">Agua</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasGas"
                        checked={propertyData.hasGas}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasGas: !!checked })
                        }
                      />
                      <Label htmlFor="hasGas">Gas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasInternet"
                        checked={propertyData.hasInternet}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasInternet: !!checked })
                        }
                      />
                      <Label htmlFor="hasInternet">Internet</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasCableTV"
                        checked={propertyData.hasCableTV}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasCableTV: !!checked })
                        }
                      />
                      <Label htmlFor="hasCableTV">Cable TV</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPhone"
                        checked={propertyData.hasPhone}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasPhone: !!checked })
                        }
                      />
                      <Label htmlFor="hasPhone">Teléfono</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Características Adicionales</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFurnished"
                        checked={propertyData.isFurnished}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, isFurnished: !!checked })
                        }
                      />
                      <Label htmlFor="isFurnished">Amueblado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="petsAllowed"
                        checked={propertyData.petsAllowed}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, petsAllowed: !!checked })
                        }
                      />
                      <Label htmlFor="petsAllowed">Se permiten mascotas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasInventory"
                        checked={propertyData.hasInventory}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasInventory: !!checked })
                        }
                      />
                      <Label htmlFor="hasInventory">Tiene inventario</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasRules"
                        checked={propertyData.hasRules}
                        onCheckedChange={(checked) =>
                          setPropertyData({ ...propertyData, hasRules: !!checked })
                        }
                      />
                      <Label htmlFor="hasRules">Tiene reglamento</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="utilitiesInLandlordName"
                    checked={propertyData.utilitiesInLandlordName}
                    onCheckedChange={(checked) =>
                      setPropertyData({ ...propertyData, utilitiesInLandlordName: !!checked })
                    }
                  />
                  <Label htmlFor="utilitiesInLandlordName">Los servicios están a nombre del arrendador</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fechas Importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyDeliveryDate">Fecha de Entrega del Inmueble</Label>
                    <Input
                      id="propertyDeliveryDate"
                      type="date"
                      value={propertyData.propertyDeliveryDate || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, propertyDeliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractSigningDate">Fecha de Firma del Contrato</Label>
                    <Input
                      id="contractSigningDate"
                      type="date"
                      value={propertyData.contractSigningDate || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, contractSigningDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contractSigningLocation">Lugar de Firma del Contrato</Label>
                  <Input
                    id="contractSigningLocation"
                    value={propertyData.contractSigningLocation || ''}
                    onChange={(e) => setPropertyData({ ...propertyData, contractSigningLocation: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save button for Property Details tab */}
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

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Bancaria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Banco</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Número de Cuenta</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clabe">CLABE Interbancaria</Label>
                    <Input
                      id="clabe"
                      value={formData.clabe || ''}
                      onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                      maxLength={18}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountHolder">Titular de la Cuenta</Label>
                    <Input
                      id="accountHolder"
                      value={formData.accountHolder || ''}
                      onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyDeedNumber">Número de Escritura</Label>
                    <Input
                      id="propertyDeedNumber"
                      value={formData.propertyDeedNumber || ''}
                      onChange={(e) => setFormData({ ...formData, propertyDeedNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyRegistryFolio">Folio del Registro Público</Label>
                    <Input
                      id="propertyRegistryFolio"
                      value={formData.propertyRegistryFolio || ''}
                      onChange={(e) => setFormData({ ...formData, propertyRegistryFolio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="securityDeposit">Depósito en Garantía (meses)</Label>
                    <Input
                      id="securityDeposit"
                      type="number"
                      min="0"
                      step="0.5"
                      value={propertyData.securityDeposit || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, securityDeposit: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenanceFee">Cuota de Mantenimiento</Label>
                    <Input
                      id="maintenanceFee"
                      type="number"
                      min="0"
                      value={propertyData.maintenanceFee || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, maintenanceFee: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasIVA"
                      checked={propertyData.hasIVA}
                      onCheckedChange={(checked) =>
                        setPropertyData({ ...propertyData, hasIVA: !!checked })
                      }
                    />
                    <Label htmlFor="hasIVA">La renta incluye IVA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="issuesTaxReceipts"
                      checked={propertyData.issuesTaxReceipts}
                      onCheckedChange={(checked) =>
                        setPropertyData({ ...propertyData, issuesTaxReceipts: !!checked })
                      }
                    />
                    <Label htmlFor="issuesTaxReceipts">Emite comprobantes fiscales</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="maintenanceIncludedInRent"
                      checked={propertyData.maintenanceIncludedInRent}
                      onCheckedChange={(checked) =>
                        setPropertyData({ ...propertyData, maintenanceIncludedInRent: !!checked })
                      }
                    />
                    <Label htmlFor="maintenanceIncludedInRent">Mantenimiento incluido en la renta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiresCFDI"
                      checked={formData.requiresCFDI}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requiresCFDI: !!checked })
                      }
                    />
                    <Label htmlFor="requiresCFDI">Requiere CFDI</Label>
                  </div>
                </div>

                {policy?.contractLength > 12 && (
                  <div>
                    <Label htmlFor="rentIncreasePercentage">
                      Porcentaje de Incremento Anual (%)
                    </Label>
                    <Input
                      id="rentIncreasePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={propertyData.rentIncreasePercentage || ''}
                      onChange={(e) => setPropertyData({ ...propertyData, rentIncreasePercentage: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="paymentMethod">Método de Pago Preferido</Label>
                  <Select
                    value={propertyData.paymentMethod || ''}
                    onValueChange={(value) => setPropertyData({ ...propertyData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="deposit">Depósito Bancario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Save button for Financial Information tab */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={savingTab === 'financial' || landlord?.informationComplete}
                className="w-full sm:w-auto"
              >
                {savingTab === 'financial' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : landlord?.informationComplete ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Información Completa
                  </>
                ) : tabSaved.financial ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Guardado - Ver Documentos
                  </>
                ) : (
                  'Guardar y Finalizar'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {landlord.informationComplete ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor complete primero la información personal y de la propiedad antes de cargar documentos.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Documentos Requeridos</CardTitle>
                    <CardDescription>
                      Cargue los documentos solicitados en formato PDF, JPG o PNG (máx. 10MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isCompany ? (
                      <>
                        <DocumentUpload
                          label="Escritura Constitutiva"
                          documentType="company_constitution"
                          onUpload={handleFileUpload}
                          uploaded={documents.some(d => d.documentType === 'company_constitution')}
                        />
                        <DocumentUpload
                          label="Poderes del Representante Legal"
                          documentType="legal_powers"
                          onUpload={handleFileUpload}
                          uploaded={documents.some(d => d.documentType === 'legal_powers')}
                        />
                        <DocumentUpload
                          label="Constancia de Situación Fiscal"
                          documentType="rfc_document"
                          onUpload={handleFileUpload}
                          uploaded={documents.some(d => d.documentType === 'rfc_document')}
                        />
                      </>
                    ) : (
                      <>
                        <DocumentUpload
                          label="Identificación Oficial (INE/Pasaporte)"
                          documentType="ine"
                          onUpload={handleFileUpload}
                          uploaded={documents.some(d => d.documentType === 'ine')}
                        />
                        <DocumentUpload
                          label="RFC (opcional)"
                          documentType="rfc_document"
                          onUpload={handleFileUpload}
                          uploaded={documents.some(d => d.documentType === 'rfc_document')}
                        />
                      </>
                    )}

                    <DocumentUpload
                      label="Escritura de la Propiedad"
                      documentType="property_deed"
                      onUpload={handleFileUpload}
                      uploaded={documents.some(d => d.documentType === 'property_deed')}
                    />
                    <DocumentUpload
                      label="Boleta Predial"
                      documentType="property_tax"
                      onUpload={handleFileUpload}
                      uploaded={documents.some(d => d.documentType === 'property_tax')}
                    />
                    <DocumentUpload
                      label="Estado de Cuenta Bancario"
                      documentType="bank_statement"
                      onUpload={handleFileUpload}
                      uploaded={documents.some(d => d.documentType === 'bank_statement')}
                    />
                  </CardContent>
                </Card>

                {documents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Documentos Cargados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{doc.fileName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DocumentUpload({
  label,
  documentType,
  onUpload,
  uploaded,
}: {
  label: string;
  documentType: string;
  onUpload: (type: string, file: File) => void;
  uploaded: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(documentType, file);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        {uploaded ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Upload className="h-5 w-5 text-gray-400" />
        )}
        <span className={uploaded ? 'text-green-700' : ''}>{label}</span>
      </div>
      <Label htmlFor={documentType} className="cursor-pointer">
        <Input
          id={documentType}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
        />
        <Button variant="outline" size="sm" asChild>
          <span>{uploaded ? 'Reemplazar' : 'Cargar'}</span>
        </Button>
      </Label>
    </div>
  );
}
