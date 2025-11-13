'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, Calculator, Info, Mail } from 'lucide-react';
import { PropertyType, GuarantorType, TenantType } from '@/lib/enums';
import { formatCurrency } from '@/lib/services/pricingService';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import {
  PropertyAddressSection,
  PropertyParkingSection,
  PropertyServicesSection,
  PropertyFeaturesSection,
  PropertyDatesSection,
} from '@/components/forms/property';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';
import { formatFullName } from '@/lib/utils/names';
import { generatePolicyNumber, validatePolicyNumber } from '@/lib/utils/policy';
import { RefreshCw } from 'lucide-react';

interface ActorForm {
  firstName: string;
  middleName?: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  phone: string;
  rfc?: string;
}

interface TenantForm extends ActorForm {
  tenantType: TenantType;
  companyName?: string;
}

export default function NewPolicyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('property');
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [pricing, setPricing] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Policy Number
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyNumberError, setPolicyNumberError] = useState('');

  // Property Information
  const [propertyData, setPropertyData] = useState<any>({
    internalCode: '',
    propertyAddress: '',
    propertyAddressDetails: null,
    propertyType: PropertyType.APARTMENT,
    propertyDescription: '',
    rentAmount: '',
    depositAmount: '',
    contractLength: 12,
    startDate: '',
    endDate: '',
    // New property features
    parkingSpaces: 0,
    parkingNumbers: '',
    isFurnished: false,
    hasPhone: false,
    hasElectricity: true,
    hasWater: true,
    hasGas: false,
    hasCableTV: false,
    hasInternet: false,
    utilitiesInLandlordName: false,
    // Financial details
    hasIVA: false,
    issuesTaxReceipts: false,
    securityDeposit: 1, // months
    maintenanceFee: '',
    maintenanceIncludedInRent: false,
    rentIncreasePercentage: '',
    paymentMethod: 'bank_transfer',
    // Additional info
    hasInventory: false,
    hasRules: false,
    rulesType: undefined,
    petsAllowed: false,
    propertyDeliveryDate: '',
    contractSigningDate: '',
    contractSigningAddressDetails: null,
  });

  // Package and Pricing
  const [packageId, setPackageId] = useState('');
  const [tenantPercentage, setTenantPercentage] = useState(100);
  const [landlordPercentage, setLandlordPercentage] = useState(0);
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [percentageError, setPercentageError] = useState('');

  // Landlord Information
  const [landlordData, setLandlordData] = useState<any>({
    isCompany: false,
    firstName: '',
    middleName: '',
    paternalLastName: '',
    maternalLastName: '',
    email: '',
    phone: '',
    rfc: '',
    // Company fields
    companyName: '',
    companyRfc: '',
    legalRepName: '',
    legalRepPosition: '',
    legalRepRfc: '',
    legalRepPhone: '',
    legalRepEmail: '',
  });

  // Tenant Information
  const [tenantData, setTenantData] = useState<TenantForm>({
    tenantType: TenantType.INDIVIDUAL,
    firstName: '',
    middleName: '',
    paternalLastName: '',
    maternalLastName: '',
    companyName: '',
    email: '',
    phone: '',
    rfc: '',
  });

  // Guarantor Type
  const [guarantorType, setGuarantorType] = useState<GuarantorType>(GuarantorType.NONE);

  // Joint Obligors
  const [jointObligors, setJointObligors] = useState<ActorForm[]>([]);

  // Avals
  const [avals, setAvals] = useState<ActorForm[]>([]);

  // Send invitations flag
  const [sendInvitations, setSendInvitations] = useState(true);

  // Load packages on mount
  useEffect(() => {
    fetchPackages();
    // Generate initial policy number
    setPolicyNumber(generatePolicyNumber());
  }, []);


  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const response = await fetch('/api/packages');
      const data = await response.json();

      // The API returns packages directly, not wrapped in a packages property
      if (data && Array.isArray(data)) {
        setPackages(data);
        // Set default package if available
        if (data.length > 0) {
          setPackageId(data[2].id);
        }
      } else if (data.packages) {
        // Fallback for wrapped response
        setPackages(data.packages);
        if (data.packages.length > 0) {
          setPackageId(data.packages[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      alert('Error al cargar los paquetes. Por favor, recarga la página.');
    } finally {
      setLoadingPackages(false);
    }
  };

  const calculatePricing = async () => {
    if (!propertyData.rentAmount || !packageId) return;

    setCalculatingPrice(true);
    try {
      const response = await fetch('/api/policies/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          rentAmount: parseFloat(propertyData.rentAmount),
          tenantPercentage,
          landlordPercentage,
          includeInvestigationFee: false // Don't include investigation fee for new policies
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
        // If not manually overridden, update the manual price with calculated subtotal (without IVA)
        if (!isManualOverride) {
          setManualPrice(data.subtotal);
        }
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleTenantPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0;
    if (percentage >= 0 && percentage <= 100) {
      setTenantPercentage(percentage);
      setLandlordPercentage(100 - percentage);
      setPercentageError('');
    }
  };

  const handleLandlordPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0;
    if (percentage >= 0 && percentage <= 100) {
      setLandlordPercentage(percentage);
      setTenantPercentage(100 - percentage);
      setPercentageError('');
    }
  };

  const validatePercentages = (): boolean => {
    const sum = tenantPercentage + landlordPercentage;
    if (Math.abs(sum - 100) > 0.01) {
      setPercentageError('Los porcentajes deben sumar 100%');
      return false;
    }
    setPercentageError('');
    return true;
  };

  const handleManualPriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    setManualPrice(price);
    setIsManualOverride(true);
  };

  const resetToCalculatedPrice = () => {
    if (pricing) {
      setManualPrice(pricing.subtotal);
      setIsManualOverride(false);
    }
  };

  const addJointObligor = () => {
    setJointObligors([...jointObligors, {
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
    }]);
  };

  const removeJointObligor = (index: number) => {
    setJointObligors(jointObligors.filter((_, i) => i !== index));
  };

  const updateJointObligor = (index: number, field: string, value: string) => {
    const updated = [...jointObligors];
    updated[index] = { ...updated[index], [field]: value };
    setJointObligors(updated);
  };

  const addAval = () => {
    setAvals([...avals, {
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
    }]);
  };

  const removeAval = (index: number) => {
    setAvals(avals.filter((_, i) => i !== index));
  };

  const updateAval = (index: number, field: string, value: string) => {
    const updated = [...avals];
    updated[index] = { ...updated[index], [field]: value };
    setAvals(updated);
  };

  const validateForm = () => {
    // Validate property data
    if (!propertyData.propertyAddress || !propertyData.rentAmount || !propertyData.startDate || !propertyData.endDate || !propertyData.contractLength) {
      alert('Por favor complete todos los campos de la propiedad');
      return false;
    }

    // Validate property address details if using Google Maps
    if (propertyData.propertyAddressDetails && (!propertyData.propertyAddressDetails.street || !propertyData.propertyAddressDetails.exteriorNumber)) {
      alert('Por favor complete la dirección con calle y número exterior');
      return false;
    }

    // Validate package selection
    if (!packageId) {
      alert('Por favor seleccione un paquete');
      return false;
    }

    // Validate percentages
    if (!validatePercentages()) {
      alert('Los porcentajes de pago deben sumar 100%');
      setCurrentTab('pricing');
      return false;
    }

    // Validate price
    if (!manualPrice || manualPrice <= 0) {
      alert('Por favor ingrese un precio válido');
      setCurrentTab('pricing');
      return false;
    }

    // Validate landlord data
    if (landlordData.isCompany) {
      if (!landlordData.companyName || !landlordData.companyRfc || !landlordData.email || !landlordData.legalRepName) {
        alert('Por favor complete todos los campos requeridos del arrendador empresa');
        return false;
      }
    } else {
      if (!landlordData.firstName || !landlordData.paternalLastName || !landlordData.maternalLastName || !landlordData.email) {
        alert('Por favor complete todos los campos del arrendador');
        return false;
      }
    }

    // Validate tenant data based on type
    if (tenantData.tenantType === TenantType.INDIVIDUAL) {
      if (!tenantData.firstName || !tenantData.paternalLastName || !tenantData.maternalLastName || !tenantData.email) {
        alert('Por favor complete todos los campos del inquilino');
        return false;
      }
    } else if (tenantData.tenantType === TenantType.COMPANY) {
      if (!tenantData.companyName || !tenantData.email || !tenantData.rfc) {
        alert('Por favor complete todos los campos de la empresa inquilina');
        return false;
      }
    }

    // Validate guarantors based on type
    if (guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) {
      if (jointObligors.length === 0) {
        alert('Por favor agregue al menos un obligado solidario');
        return false;
      }
      for (let i = 0; i < jointObligors.length; i++) {
        const jo = jointObligors[i];
        if (!jo.firstName || !jo.paternalLastName || !jo.maternalLastName || !jo.email) {
          alert(`Por favor complete todos los campos del obligado solidario ${i + 1}`);
          return false;
        }
        if (!jo.phone) {
          alert(`Por favor agregue el teléfono del obligado solidario ${i + 1}`);
          return false;
        }
      }
    }

    if (guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH) {
      if (avals.length === 0) {
        alert('Por favor agregue al menos un aval');
        return false;
      }
      for (let i = 0; i < avals.length; i++) {
        const aval = avals[i];
        if (!aval.firstName || !aval.paternalLastName || !aval.maternalLastName || !aval.email) {
          alert(`Por favor complete todos los campos del aval ${i + 1}`);
          return false;
        }
        if (!aval.phone) {
          alert(`Por favor agregue el teléfono del aval ${i + 1}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Validate policy number
    const policyValidation = await validatePolicyNumber(policyNumber);
    if (!policyValidation.isValid) {
      setPolicyNumberError(policyValidation.error || 'Número de póliza inválido');
      setCurrentTab('property'); // Go back to first tab where policy number is
      return;
    }

    setLoading(true);
    try {
      const policyData = {
        policyNumber,
        ...propertyData,
        rentAmount: parseFloat(propertyData.rentAmount),
        depositAmount: parseFloat(propertyData.depositAmount || propertyData.rentAmount),
        securityDeposit: propertyData.securityDeposit,
        maintenanceFee: propertyData.maintenanceFee ? parseFloat(propertyData.maintenanceFee) : undefined,
        rentIncreasePercentage: propertyData.rentIncreasePercentage ? parseFloat(propertyData.rentIncreasePercentage) : undefined,
        parkingNumbers: propertyData.parkingNumbers ? JSON.stringify(propertyData.parkingNumbers.split(',').map(s => s.trim())) : undefined,
        propertyDeliveryDate: propertyData.propertyDeliveryDate || undefined,
        contractSigningDate: propertyData.contractSigningDate || undefined,
        packageId,
        tenantPercentage,
        landlordPercentage,
        guarantorType,
        totalPrice: isManualOverride && manualPrice ? manualPrice * 1.16 : (pricing?.totalWithIva || 0),
        landlord: landlordData,
        tenant: tenantData,
        jointObligors: guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH ? jointObligors : [],
        avals: guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH ? avals : [],
        sendInvitations,
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData),
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/dashboard/policies/${data.data.policy.id}`);
      } else {
        alert('Error al crear la protección: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error al crear la protección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/policies')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Protección</h1>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="property">Propiedad</TabsTrigger>
          <TabsTrigger value="pricing">Precio</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Obligado S. / Aval</TabsTrigger>
          <TabsTrigger value="review">Revisar</TabsTrigger>
        </TabsList>

        <TabsContent value="property">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Propiedad</CardTitle>
              <CardDescription>Ingrese los detalles de la propiedad a asegurar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Policy Number Field */}
              <div>
                <Label htmlFor="policyNumber">
                  Número de Póliza <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="policyNumber"
                    value={policyNumber}
                    onChange={(e) => {
                      setPolicyNumber(e.target.value.toUpperCase());
                      setPolicyNumberError('');
                    }}
                    placeholder="POL-YYYYMMDD-XXX"
                    className={policyNumberError ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setPolicyNumber(generatePolicyNumber());
                      setPolicyNumberError('');
                    }}
                    title="Generar nuevo número"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {policyNumberError && (
                  <p className="text-sm text-red-500 mt-1">{policyNumberError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Formato: POL-YYYYMMDD-XXX (se validará al crear la póliza)
                </p>
              </div>

              {/* Internal Code Field */}
              <div>
                <Label htmlFor="internalCode">
                  Código Interno
                </Label>
                <Input
                  id="internalCode"
                  value={propertyData.internalCode}
                  onChange={(e) => setPropertyData({ ...propertyData, internalCode: e.target.value })}
                  placeholder="INV1, CONT 1, INC1, PP1, PL, PES1"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código de uso interno para clasificación (opcional)
                </p>
              </div>

              <PropertyAddressSection
                label="Dirección de la Propiedad"
                value={propertyData.propertyAddressDetails}
                onChange={(address) => {
                  setPropertyData({
                    ...propertyData,
                    propertyAddressDetails: address,
                    propertyAddress: address.formattedAddress ||
                      `${address.street} ${address.exteriorNumber}${address.interiorNumber ? ` Int. ${address.interiorNumber}` : ''}, ${address.neighborhood}, ${address.municipality}, ${address.state}`
                  });
                }}
                required
              />

              <div>
                <Label htmlFor="propertyDescription">Descripción de la Propiedad</Label>
                <Textarea
                  id="propertyDescription"
                  value={propertyData.propertyDescription}
                  onChange={(e) => setPropertyData({ ...propertyData, propertyDescription: e.target.value })}
                  placeholder="Descripción detallada de la propiedad, características, amenidades, etc."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Tipo de Propiedad</Label>
                <Select
                  value={propertyData.propertyType}
                  onValueChange={(value) => setPropertyData({ ...propertyData, propertyType: value as PropertyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PropertyType.HOUSE}>Casa</SelectItem>
                    <SelectItem value={PropertyType.APARTMENT}>Departamento</SelectItem>
                    <SelectItem value={PropertyType.COMMERCIAL}>Local Comercial</SelectItem>
                    <SelectItem value={PropertyType.OFFICE}>Oficina</SelectItem>
                    <SelectItem value={PropertyType.WAREHOUSE}>Bodega</SelectItem>
                    <SelectItem value={PropertyType.OTHER}>Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rentAmount">Renta Mensual</Label>
                  <Input
                    id="rentAmount"
                    value={propertyData.rentAmount}
                    onChange={(e) => setPropertyData({ ...propertyData, rentAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="depositAmount">Depósito</Label>
                  <Input
                    id="depositAmount"
                    value={propertyData.depositAmount}
                    onChange={(e) => setPropertyData({ ...propertyData, depositAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contractLength">Duración del Contrato (meses)</Label>
                <Input
                  id="contractLength"
                  value={propertyData.contractLength}
                  onChange={(e) => setPropertyData({ ...propertyData, contractLength: parseInt(e.target.value) || 12 })}
                  placeholder="12"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={propertyData.startDate}
                    onChange={(e) => setPropertyData({ ...propertyData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Fecha de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={propertyData.endDate}
                    onChange={(e) => setPropertyData({ ...propertyData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Property Features Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Características de la Propiedad</h3>

                {/* Parking */}
                <PropertyParkingSection
                  parkingSpaces={propertyData.parkingSpaces}
                  parkingNumbers={propertyData.parkingNumbers}
                  onParkingSpacesChange={(value) => setPropertyData({ ...propertyData, parkingSpaces: value || 0 })}
                  onParkingNumbersChange={(value) => setPropertyData({ ...propertyData, parkingNumbers: value })}
                />

                {/* Property Features */}
                <div className="mb-4">
                  <PropertyFeaturesSection
                    isFurnished={propertyData.isFurnished}
                    petsAllowed={propertyData.petsAllowed}
                    hasInventory={propertyData.hasInventory}
                    hasRules={propertyData.hasRules}
                    rulesType={propertyData.rulesType}
                    onChange={(field, value) => setPropertyData({ ...propertyData, [field]: value })}
                  />
                </div>

                {/* Utilities/Services Section */}
                <PropertyServicesSection
                  hasElectricity={propertyData.hasElectricity}
                  hasWater={propertyData.hasWater}
                  hasGas={propertyData.hasGas}
                  hasPhone={propertyData.hasPhone}
                  hasCableTV={propertyData.hasCableTV}
                  hasInternet={propertyData.hasInternet}
                  utilitiesInLandlordName={propertyData.utilitiesInLandlordName}
                  onChange={(field, value) => setPropertyData({ ...propertyData, [field]: value })}
                />
              </div>

              {/* Financial Details Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Detalles Financieros</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="securityDeposit">Depósito de Garantía (meses)</Label>
                    <Input
                      id="securityDeposit"
                      value={propertyData.securityDeposit}
                      onChange={(e) => setPropertyData({ ...propertyData, securityDeposit: parseFloat(e.target.value) || 1 })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenanceFee">Cuota de Mantenimiento</Label>
                    <Input
                      id="maintenanceFee"
                      value={propertyData.maintenanceFee}
                      onChange={(e) => setPropertyData({ ...propertyData, maintenanceFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="maintenanceIncludedInRent"
                      checked={propertyData.maintenanceIncludedInRent}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, maintenanceIncludedInRent: checked as boolean })}
                    />
                    <Label htmlFor="maintenanceIncludedInRent">Mantenimiento incluido en renta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasIVA"
                      checked={propertyData.hasIVA}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasIVA: checked as boolean })}
                    />
                    <Label htmlFor="hasIVA">Incluye IVA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="issuesTaxReceipts"
                      checked={propertyData.issuesTaxReceipts}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, issuesTaxReceipts: checked as boolean })}
                    />
                    <Label htmlFor="issuesTaxReceipts">Emite recibos fiscales</Label>
                  </div>
                </div>

                {propertyData.contractLength > 12 && (
                  <div>
                    <Label htmlFor="rentIncreasePercentage">% Incremento Anual (contratos &gt; 1 año)</Label>
                    <Input
                      id="rentIncreasePercentage"
                      value={propertyData.rentIncreasePercentage}
                      onChange={(e) => setPropertyData({ ...propertyData, rentIncreasePercentage: e.target.value })}
                      placeholder="Ej: 5.0"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <Label htmlFor="paymentMethod">Método de Pago Preferido</Label>
                  <Select
                    value={propertyData.paymentMethod}
                    onValueChange={(value) => setPropertyData({ ...propertyData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="deposit">Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contract Dates Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Fechas del Contrato</h3>
                <PropertyDatesSection
                  propertyDeliveryDate={propertyData.propertyDeliveryDate}
                  contractSigningDate={propertyData.contractSigningDate}
                  contractSigningAddressDetails={propertyData.contractSigningAddressDetails}
                  onChange={(field, value) => setPropertyData({ ...propertyData, [field]: value })}
                />
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => setCurrentTab('pricing')}>
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Precio</CardTitle>
              <CardDescription>Seleccione el paquete y configure la distribución del costo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="package">Paquete de Protección</Label>
                {loadingPackages ? (
                  <div className="flex items-center justify-center p-4 border rounded-md">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="ml-2">Cargando paquetes...</span>
                  </div>
                ) : packages.length > 0 ? (
                  <>
                    <Select
                      value={packageId}
                      onValueChange={setPackageId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un paquete" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.sort((a, b) => b.price - a.price).map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {packageId && packages.find(p => p.id === packageId) && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-gray-500">
                          {packages.find(p => p.id === packageId)?.description}
                        </p>
                        {packages.find(p => p.id === packageId)?.percentage && (
                          <p className="text-xs text-blue-600 font-medium">
                            Precio: {packages.find(p => p.id === packageId)?.percentage}% del monto de la renta
                            {packages.find(p => p.id === packageId)?.minAmount &&
                              ` (mínimo ${formatCurrency(packages.find(p => p.id === packageId)?.minAmount)})`
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No hay paquetes disponibles. Por favor, contacta al administrador.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Calculate Price Button */}
              <div className="flex justify-center my-6">
                <Button
                  type="button"
                  onClick={calculatePricing}
                  disabled={!propertyData.rentAmount || !packageId || calculatingPrice}
                  variant="outline"
                  size="lg"
                >
                  {calculatingPrice ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Precio
                    </>
                  )}
                </Button>
              </div>

              {/* Unified Cost Summary - Always visible with different states */}
              <div className="relative">
                {/* Loading overlay */}
                {calculatingPrice && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                    </div>
                  </div>
                )}

                {/* Main cost summary card - always visible */}
                <div className={`bg-gray-50 p-4 rounded-lg space-y-3 transition-all duration-300 ${
                  calculatingPrice ? 'opacity-50 blur-sm' : ''
                }`}>
                  <h4 className="font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Resumen de Costos
                  </h4>

                  {/* Calculation Summary - only show if pricing exists */}
                  {pricing?.calculationSummary && (
                    <div className="bg-white p-3 rounded border border-gray-200 space-y-2 text-sm">
                      <h5 className="font-medium text-gray-700">Desglose del Cálculo:</h5>

                      <div className="space-y-1 text-gray-600">
                        <div className="flex justify-between">
                          <span>Paquete:</span>
                          <span className="font-medium">{pricing.calculationSummary.packageName}</span>
                        </div>

                        {pricing.calculationSummary.calculationMethod === 'percentage' && (
                          <>
                            <div className="flex justify-between">
                              <span>Método:</span>
                              <span>{pricing.calculationSummary.percentage}% de la renta mensual</span>
                            </div>
                            {pricing.calculationSummary.minimumApplied && (
                              <div className="flex justify-between text-orange-600">
                                <span>Mínimo aplicado:</span>
                                <span>{formatCurrency(pricing.calculationSummary.minimumAmount || 0)}</span>
                              </div>
                            )}
                          </>
                        )}

                        {pricing.calculationSummary.calculationMethod === 'flat' && (
                          <div className="flex justify-between">
                            <span>Precio fijo:</span>
                            <span>{formatCurrency(pricing.calculationSummary.flatFee || 0)}</span>
                          </div>
                        )}

                        <div className="pt-1 border-t mt-2">
                          <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                            {pricing.calculationSummary.formula}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price breakdown - always show structure */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Precio del Paquete:</span>
                      <span className="font-medium">
                        {pricing ? formatCurrency(pricing.packagePrice) : '---'}
                      </span>
                    </div>

                    {pricing?.investigationFee !== null && pricing?.investigationFee > 0 && (
                      <div className="flex justify-between">
                        <span>Cuota de Investigación:</span>
                        <span className="font-medium">{formatCurrency(pricing.investigationFee)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {pricing ? formatCurrency(pricing.subtotal) : '---'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>IVA (16%):</span>
                      <span className="font-medium">
                        {pricing ? formatCurrency(pricing.iva) : '---'}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total con IVA:</span>
                      <span className="font-bold">
                        {pricing ? formatCurrency(pricing.totalWithIva) : '---'}
                      </span>
                    </div>

                    {isManualOverride && manualPrice !== null && (
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Precio Manual (sin IVA):</span>
                        <span>{formatCurrency(manualPrice)}</span>
                      </div>
                    )}

                    {isManualOverride && manualPrice !== null && (
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Total Manual con IVA:</span>
                        <span>{formatCurrency(manualPrice * 1.16)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-blue-600">
                        <span>Pago Inquilino ({tenantPercentage}%):</span>
                        <span className="font-medium">
                          {pricing || manualPrice ?
                            formatCurrency((isManualOverride && manualPrice ? manualPrice * 1.16 : pricing?.totalWithIva || 0) * tenantPercentage / 100) :
                            '---'}
                        </span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Pago Arrendador ({landlordPercentage}%):</span>
                        <span className="font-medium">
                          {pricing || manualPrice ?
                            formatCurrency((isManualOverride && manualPrice ? manualPrice * 1.16 : pricing?.totalWithIva || 0) * landlordPercentage / 100) :
                            '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution of Cost */}
              <div className="space-y-4">
                <Label>Distribución del Costo</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tenantPercentage">Porcentaje Inquilino</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="tenantPercentage"
                          value={tenantPercentage}
                          onChange={(e) => handleTenantPercentageChange(e.target.value)}
                          placeholder="100"
                        />
                        <span className="text-sm font-medium">%</span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="landlordPercentage">Porcentaje Arrendador</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="landlordPercentage"
                          value={landlordPercentage}
                          onChange={(e) => handleLandlordPercentageChange(e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-sm font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  {percentageError && (
                    <Alert className="mt-2" variant="destructive">
                      <AlertDescription>{percentageError}</AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      El costo puede ser compartido entre el inquilino y el arrendador según lo acordado. Los porcentajes deben sumar 100%.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Manual Price Override - moved to bottom */}
              <div className="space-y-4">
                <Label>Ajuste Manual de Precio</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualPrice">Precio Base (sin IVA)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manualPrice"
                        value={manualPrice || pricing?.subtotal || ''}
                        onChange={(e) => handleManualPriceChange(e.target.value)}
                        placeholder="0.00"
                      />
                      {isManualOverride && pricing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={resetToCalculatedPrice}
                          title="Restablecer al precio calculado"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {isManualOverride && (
                      <div className="space-y-1">
                        <p className="text-sm text-blue-600">
                          ⚠️ Precio manual activado (Calculado: {formatCurrency(pricing?.subtotal || 0)})
                        </p>
                        <p className="text-sm text-gray-600">
                          Total con IVA: {formatCurrency(manualPrice * 1.16)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('property')}>
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('landlord')}>
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landlord">
          <Card>
            <CardHeader>
              <CardTitle>Información del Arrendador</CardTitle>
              <CardDescription>Ingrese los datos del propietario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="landlordIsCompany"
                  checked={landlordData.isCompany}
                  onCheckedChange={(checked) => setLandlordData({ ...landlordData, isCompany: checked as boolean })}
                />
                <Label htmlFor="landlordIsCompany">El arrendador es una empresa</Label>
              </div>

              {landlordData.isCompany ? (
                <>
                  {/* Company Fields */}
                  <div>
                    <Label htmlFor="companyName">Razón Social *</Label>
                    <Input
                      id="companyName"
                      value={landlordData.companyName}
                      onChange={(e) => setLandlordData({ ...landlordData, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyRfc">RFC de la Empresa *</Label>
                    <Input
                      id="companyRfc"
                      value={landlordData.companyRfc}
                      onChange={(e) => setLandlordData({ ...landlordData, companyRfc: e.target.value.toUpperCase() })}
                      placeholder="AAA123456XXX"
                      maxLength={12}
                      required
                    />
                  </div>

                  <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                    <h4 className="font-medium text-sm text-gray-700">Representante Legal</h4>

                    <div>
                      <Label htmlFor="legalRepName">Nombre del Representante *</Label>
                      <Input
                        id="legalRepName"
                        value={landlordData.legalRepName}
                        onChange={(e) => setLandlordData({ ...landlordData, legalRepName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalRepPosition">Cargo</Label>
                      <Input
                        id="legalRepPosition"
                        value={landlordData.legalRepPosition}
                        onChange={(e) => setLandlordData({ ...landlordData, legalRepPosition: e.target.value })}
                        placeholder="Ej: Director General"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="legalRepRfc">RFC del Representante</Label>
                        <Input
                          id="legalRepRfc"
                          value={landlordData.legalRepRfc}
                          onChange={(e) => setLandlordData({ ...landlordData, legalRepRfc: e.target.value.toUpperCase() })}
                          placeholder="AAAA123456XXX"
                          maxLength={13}
                        />
                      </div>

                      <div>
                        <Label htmlFor="legalRepPhone">Teléfono del Representante</Label>
                        <Input
                          id="legalRepPhone"
                          value={landlordData.legalRepPhone}
                          onChange={(e) => setLandlordData({ ...landlordData, legalRepPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="legalRepEmail">Email del Representante</Label>
                      <Input
                        id="legalRepEmail"
                        type="email"
                        value={landlordData.legalRepEmail}
                        onChange={(e) => setLandlordData({ ...landlordData, legalRepEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="landlordEmail">Email de Contacto *</Label>
                      <Input
                        id="landlordEmail"
                        type="email"
                        value={landlordData.email}
                        onChange={(e) => setLandlordData({ ...landlordData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="landlordPhone">Teléfono de Contacto *</Label>
                      <Input
                        id="landlordPhone"
                        value={landlordData.phone}
                        onChange={(e) => setLandlordData({ ...landlordData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Individual Fields */}
                  <PersonNameFields
                    firstName={landlordData.firstName}
                    middleName={landlordData.middleName}
                    paternalLastName={landlordData.paternalLastName}
                    maternalLastName={landlordData.maternalLastName}
                    onChange={(field, value) => setLandlordData({ ...landlordData, [field]: value })}
                    required={true}
                  />

                  <div>
                    <Label htmlFor="landlordEmail">Email</Label>
                    <Input
                      id="landlordEmail"
                      type="email"
                      value={landlordData.email}
                      onChange={(e) => setLandlordData({ ...landlordData, email: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="landlordPhone">Teléfono</Label>
                      <Input
                        id="landlordPhone"
                        value={landlordData.phone}
                        onChange={(e) => setLandlordData({ ...landlordData, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="landlordRfc">RFC</Label>
                      <Input
                        id="landlordRfc"
                        value={landlordData.rfc}
                        onChange={(e) => setLandlordData({ ...landlordData, rfc: e.target.value.toUpperCase() })}
                        placeholder="AAAA123456XXX"
                        maxLength={13}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('pricing')}>
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('tenant')}>
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant">
          <Card>
            <CardHeader>
              <CardTitle>Información del Inquilino</CardTitle>
              <CardDescription>Ingrese los datos del inquilino</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tenantType">Tipo de Inquilino</Label>
                <Select
                  value={tenantData.tenantType}
                  onValueChange={(value) => setTenantData({ ...tenantData, tenantType: value as TenantType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TenantType.INDIVIDUAL}>Persona Física</SelectItem>
                    <SelectItem value={TenantType.COMPANY}>Persona Moral (Empresa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tenantData.tenantType === TenantType.COMPANY && (
                <div>
                  <Label htmlFor="tenantCompanyName">Razón Social</Label>
                  <Input
                    id="tenantCompanyName"
                    value={tenantData.companyName}
                    onChange={(e) => setTenantData({ ...tenantData, companyName: e.target.value })}
                    placeholder="Nombre de la empresa"
                    required
                  />
                </div>
              )}

              {tenantData.tenantType === TenantType.INDIVIDUAL && (
                <PersonNameFields
                  firstName={tenantData.firstName}
                  middleName={tenantData.middleName}
                  paternalLastName={tenantData.paternalLastName}
                  maternalLastName={tenantData.maternalLastName}
                  onChange={(field, value) => setTenantData({ ...tenantData, [field]: value })}
                  required={true}
                />
              )}

              {tenantData.tenantType === TenantType.COMPANY && (
                <>
                  <Label>Representante Legal</Label>
                  <PersonNameFields
                    firstName={tenantData.firstName}
                    middleName={tenantData.middleName}
                    paternalLastName={tenantData.paternalLastName}
                    maternalLastName={tenantData.maternalLastName}
                    onChange={(field, value) => setTenantData({ ...tenantData, [field]: value })}
                    required={false}
                  />
                </>
              )}

              <div>
                <Label htmlFor="tenantEmail">Email</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  value={tenantData.email}
                  onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenantPhone">Teléfono</Label>
                  <Input
                    id="tenantPhone"
                    value={tenantData.phone}
                    onChange={(e) => setTenantData({ ...tenantData, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tenantRfc">
                    {tenantData.tenantType === TenantType.COMPANY ? 'RFC' : 'RFC/CURP'}
                  </Label>
                  <Input
                    id="tenantRfc"
                    value={tenantData.rfc}
                    onChange={(e) => setTenantData({ ...tenantData, rfc: e.target.value })}
                    placeholder={tenantData.tenantType === TenantType.COMPANY ? 'RFC de la empresa' : 'RFC o CURP'}
                    required={tenantData.tenantType === TenantType.COMPANY}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('landlord')}>
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('guarantors')}>
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guarantors">
          <Card>
            <CardHeader>
              <CardTitle>Obligado S. / Aval</CardTitle>
              <CardDescription>Añada info de Obligado o Aval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guarantorType">Obligado S. / Aval</Label>
                <Select
                  value={guarantorType}
                  onValueChange={(value) => setGuarantorType(value as GuarantorType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GuarantorType.NONE}>Sin Garantía</SelectItem>
                    <SelectItem value={GuarantorType.JOINT_OBLIGOR}>Obligado Solidario</SelectItem>
                    <SelectItem value={GuarantorType.AVAL}>Aval</SelectItem>
                    <SelectItem value={GuarantorType.BOTH}>Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Obligados Solidarios</h3>
                    <Button size="sm" onClick={addJointObligor}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>

                  {jointObligors.map((jo, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Obligado Solidario {index + 1}</h4>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeJointObligor(index)}
                            disabled={jointObligors.length === 1}
                            title={jointObligors.length === 1 ? 'Debe haber al menos un obligado solidario' : 'Eliminar'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <PersonNameFields
                          firstName={jo.firstName}
                          middleName={jo.middleName}
                          paternalLastName={jo.paternalLastName}
                          maternalLastName={jo.maternalLastName}
                          onChange={(field, value) => updateJointObligor(index, field, value)}
                          required={true}
                        />
                        <Input
                          placeholder="Email *"
                          type="email"
                          value={jo.email}
                          onChange={(e) => updateJointObligor(index, 'email', e.target.value)}
                          required
                        />
                        <Input
                          placeholder="Teléfono *"
                          value={jo.phone}
                          onChange={(e) => updateJointObligor(index, 'phone', e.target.value)}
                          required
                        />
                      </CardContent>
                    </Card>
                  ))}
                  {jointObligors.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Debe agregar al menos un obligado solidario. Haga clic en "Agregar" para continuar.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {(guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH) && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Avales</h3>
                    <Button size="sm" onClick={addAval}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>

                  {avals.map((aval, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Aval {index + 1}</h4>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAval(index)}
                            disabled={avals.length === 1}
                            title={avals.length === 1 ? 'Debe haber al menos un aval' : 'Eliminar'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <PersonNameFields
                          firstName={aval.firstName}
                          middleName={aval.middleName}
                          paternalLastName={aval.paternalLastName}
                          maternalLastName={aval.maternalLastName}
                          onChange={(field, value) => updateAval(index, field, value)}
                          required={true}
                        />
                        <Input
                          placeholder="Email *"
                          type="email"
                          value={aval.email}
                          onChange={(e) => updateAval(index, 'email', e.target.value)}
                          required
                        />
                        <Input
                          placeholder="Teléfono *"
                          value={aval.phone}
                          onChange={(e) => updateAval(index, 'phone', e.target.value)}
                          required
                        />
                      </CardContent>
                    </Card>
                  ))}
                  {avals.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Debe agregar al menos un aval. Haga clic en "Agregar" para continuar.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('tenant')}>
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('review')}>
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Revisar y Confirmar</CardTitle>
              <CardDescription>Verifique que todos los datos sean correctos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Propiedad</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Número de Póliza:</dt>
                    <dd className="font-medium">{policyNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Dirección:</dt>
                    <dd>{propertyData.propertyAddress}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tipo:</dt>
                    <dd>{propertyData.propertyType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Renta:</dt>
                    <dd>{formatCurrency(parseFloat(propertyData.rentAmount || '0'))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Depósito:</dt>
                    <dd>{formatCurrency(parseFloat(propertyData.depositAmount || propertyData.rentAmount || '0'))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duración:</dt>
                    <dd>{propertyData.contractLength} meses</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-medium mb-2">Paquete y Precio</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Paquete:</dt>
                    <dd>{packages.find(p => p.id === packageId)?.name || 'No seleccionado'}</dd>
                  </div>
                  {pricing && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Costo Total:</dt>
                        <dd className="font-medium">{formatCurrency(pricing.total)}</dd>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <dt className="text-gray-500">Pago Inquilino ({tenantPercentage}%):</dt>
                        <dd>{formatCurrency(pricing.tenantAmount)}</dd>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <dt className="text-gray-500">Pago Arrendador ({landlordPercentage}%):</dt>
                        <dd>{formatCurrency(pricing.landlordAmount)}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-medium mb-2">Arrendador</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nombre:</dt>
                    <dd>{formatFullName(landlordData.firstName, landlordData.paternalLastName, landlordData.maternalLastName, landlordData.middleName)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd>{landlordData.email}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-medium mb-2">Inquilino</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tipo:</dt>
                    <dd>{tenantData.tenantType === TenantType.INDIVIDUAL ? 'Persona Física' : 'Persona Moral'}</dd>
                  </div>
                  {tenantData.tenantType === TenantType.COMPANY && tenantData.companyName && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Empresa:</dt>
                      <dd>{tenantData.companyName}</dd>
                    </div>
                  )}
                  {(tenantData.tenantType === TenantType.INDIVIDUAL ||
                    (tenantData.tenantType === TenantType.COMPANY && (tenantData.firstName || tenantData.lastName))) && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">
                        {tenantData.tenantType === TenantType.COMPANY ? 'Representante:' : 'Nombre:'}
                      </dt>
                      <dd>{formatFullName(tenantData.firstName, tenantData.paternalLastName, tenantData.maternalLastName, tenantData.middleName)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd>{tenantData.email}</dd>
                  </div>
                  {tenantData.phone && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Teléfono:</dt>
                      <dd>{tenantData.phone}</dd>
                    </div>
                  )}
                  {tenantData.rfc && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{tenantData.tenantType === TenantType.COMPANY ? 'RFC:' : 'RFC/CURP:'}</dt>
                      <dd>{tenantData.rfc}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {jointObligors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Obligados Solidarios</h3>
                  <ul className="space-y-1 text-sm">
                    {jointObligors.map((jo, index) => (
                      <li key={index}>{formatFullName(jo.firstName, jo.paternalLastName, jo.maternalLastName, jo.middleName)} - {jo.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              {avals.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Avales</h3>
                  <ul className="space-y-1 text-sm">
                    {avals.map((aval, index) => (
                      <li key={index}>{formatFullName(aval.firstName, aval.paternalLastName, aval.maternalLastName, aval.middleName)} - {aval.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="sendInvitations"
                    checked={sendInvitations}
                    onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="sendInvitations"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <Mail className="inline h-4 w-4 mr-1" />
                      Enviar invitaciones automáticamente
                    </Label>
                    <p className="text-sm text-gray-500">
                      Se enviarán invitaciones por correo a los actores para que completen su información
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentTab('guarantors')}>
                  Anterior
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Protección'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
