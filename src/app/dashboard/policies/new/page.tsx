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
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, Calculator, Info, Mail } from 'lucide-react';
import { PropertyType, GuarantorType, TenantType } from '@/types/policy';
import { formatCurrency } from '@/lib/services/pricingService';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';

interface ActorForm {
  firstName: string;
  lastName: string;
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

  // Property Information
  const [propertyData, setPropertyData] = useState<any>({
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
    petsAllowed: false,
    propertyDeliveryDate: '',
    contractSigningDate: '',
    contractSigningLocation: '',
  });

  // Package and Pricing
  const [packageId, setPackageId] = useState('');
  const [tenantPercentage, setTenantPercentage] = useState(100);
  const [landlordPercentage, setLandlordPercentage] = useState(0);

  // Landlord Information
  const [landlordData, setLandlordData] = useState<any>({
    isCompany: false,
    firstName: '',
    lastName: '',
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
    lastName: '',
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
  }, []);

  // Calculate pricing when relevant fields change
  useEffect(() => {
    if (propertyData.rentAmount && packageId) {
      calculatePricing();
    }
  }, [propertyData.rentAmount, packageId, tenantPercentage]);

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
          landlordPercentage
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handlePercentageChange = (value: number[]) => {
    setTenantPercentage(value[0]);
    setLandlordPercentage(100 - value[0]);
  };

  const addJointObligor = () => {
    setJointObligors([...jointObligors, {
      firstName: '',
      lastName: '',
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
      lastName: '',
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

    // Validate landlord data
    if (landlordData.isCompany) {
      if (!landlordData.companyName || !landlordData.companyRfc || !landlordData.email || !landlordData.legalRepName) {
        alert('Por favor complete todos los campos requeridos del arrendador empresa');
        return false;
      }
    } else {
      if (!landlordData.firstName || !landlordData.lastName || !landlordData.email) {
        alert('Por favor complete todos los campos del arrendador');
        return false;
      }
    }

    // Validate tenant data based on type
    if (tenantData.tenantType === TenantType.INDIVIDUAL) {
      if (!tenantData.firstName || !tenantData.lastName || !tenantData.email) {
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
        if (!jo.firstName || !jo.lastName || !jo.email) {
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
        if (!aval.firstName || !aval.lastName || !aval.email) {
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

    setLoading(true);
    try {
      const policyData = {
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
        totalPrice: pricing?.total || 0,
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
        <h1 className="text-3xl font-bold">Nueva Póliza</h1>
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
              <div>
                <AddressAutocomplete
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
                  placeholder="Buscar dirección..."
                />
              </div>

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
                    type="number"
                    value={propertyData.rentAmount}
                    onChange={(e) => setPropertyData({ ...propertyData, rentAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="depositAmount">Depósito</Label>
                  <Input
                    id="depositAmount"
                    type="number"
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
                  type="number"
                  min="1"
                  max="60"
                  value={propertyData.contractLength}
                  onChange={(e) => setPropertyData({ ...propertyData, contractLength: parseInt(e.target.value) })}
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="parkingSpaces">Espacios de Estacionamiento</Label>
                    <Input
                      id="parkingSpaces"
                      type="number"
                      min="0"
                      value={propertyData.parkingSpaces}
                      onChange={(e) => setPropertyData({ ...propertyData, parkingSpaces: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parkingNumbers">Números de Cajones</Label>
                    <Input
                      id="parkingNumbers"
                      value={propertyData.parkingNumbers}
                      onChange={(e) => setPropertyData({ ...propertyData, parkingNumbers: e.target.value })}
                      placeholder="Ej: A1, A2"
                    />
                  </div>
                </div>

                {/* Property Features Checkboxes */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFurnished"
                      checked={propertyData.isFurnished}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, isFurnished: checked as boolean })}
                    />
                    <Label htmlFor="isFurnished">Amueblado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="petsAllowed"
                      checked={propertyData.petsAllowed}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, petsAllowed: checked as boolean })}
                    />
                    <Label htmlFor="petsAllowed">Se permiten mascotas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasInventory"
                      checked={propertyData.hasInventory}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasInventory: checked as boolean })}
                    />
                    <Label htmlFor="hasInventory">Tiene inventario</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasRules"
                      checked={propertyData.hasRules}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasRules: checked as boolean })}
                    />
                    <Label htmlFor="hasRules">Tiene reglamento</Label>
                  </div>
                </div>

                {/* Utilities Section */}
                <h4 className="font-medium mb-2">Servicios Incluidos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasElectricity"
                      checked={propertyData.hasElectricity}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasElectricity: checked as boolean })}
                    />
                    <Label htmlFor="hasElectricity">Electricidad</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasWater"
                      checked={propertyData.hasWater}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasWater: checked as boolean })}
                    />
                    <Label htmlFor="hasWater">Agua</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasGas"
                      checked={propertyData.hasGas}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasGas: checked as boolean })}
                    />
                    <Label htmlFor="hasGas">Gas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasPhone"
                      checked={propertyData.hasPhone}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasPhone: checked as boolean })}
                    />
                    <Label htmlFor="hasPhone">Teléfono</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCableTV"
                      checked={propertyData.hasCableTV}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasCableTV: checked as boolean })}
                    />
                    <Label htmlFor="hasCableTV">Cable TV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasInternet"
                      checked={propertyData.hasInternet}
                      onCheckedChange={(checked) => setPropertyData({ ...propertyData, hasInternet: checked as boolean })}
                    />
                    <Label htmlFor="hasInternet">Internet</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="utilitiesInLandlordName"
                    checked={propertyData.utilitiesInLandlordName}
                    onCheckedChange={(checked) => setPropertyData({ ...propertyData, utilitiesInLandlordName: checked as boolean })}
                  />
                  <Label htmlFor="utilitiesInLandlordName">Los servicios están a nombre del arrendador</Label>
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Detalles Financieros</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="securityDeposit">Depósito de Garantía (meses)</Label>
                    <Input
                      id="securityDeposit"
                      type="number"
                      min="0"
                      step="0.5"
                      value={propertyData.securityDeposit}
                      onChange={(e) => setPropertyData({ ...propertyData, securityDeposit: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenanceFee">Cuota de Mantenimiento</Label>
                    <Input
                      id="maintenanceFee"
                      type="number"
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
                      type="number"
                      min="0"
                      step="0.1"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyDeliveryDate">Fecha de Entrega del Inmueble</Label>
                    <Input
                      id="propertyDeliveryDate"
                      type="date"
                      value={propertyData.propertyDeliveryDate}
                      onChange={(e) => setPropertyData({ ...propertyData, propertyDeliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractSigningDate">Fecha de Firma del Contrato</Label>
                    <Input
                      id="contractSigningDate"
                      type="date"
                      value={propertyData.contractSigningDate}
                      onChange={(e) => setPropertyData({ ...propertyData, contractSigningDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="contractSigningLocation">Lugar de Firma del Contrato</Label>
                  <Input
                    id="contractSigningLocation"
                    value={propertyData.contractSigningLocation}
                    onChange={(e) => setPropertyData({ ...propertyData, contractSigningLocation: e.target.value })}
                    placeholder="Ej: Ciudad de México"
                  />
                </div>
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

              <div className="space-y-4">
                <Label>Distribución del Costo</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Inquilino: {tenantPercentage}%</span>
                      <span>Arrendador: {landlordPercentage}%</span>
                    </div>
                    <Slider
                      value={[tenantPercentage]}
                      onValueChange={handlePercentageChange}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      El costo puede ser compartido entre el inquilino y el arrendador según lo acordado.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {pricing && !calculatingPrice && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Resumen de Costos
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Precio del Paquete:</span>
                      <span className="font-medium">{formatCurrency(pricing.packagePrice)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">{formatCurrency(pricing.total)}</span>
                    </div>
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-blue-600">
                        <span>Pago Inquilino ({tenantPercentage}%):</span>
                        <span className="font-medium">{formatCurrency(pricing.tenantAmount)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Pago Arrendador ({landlordPercentage}%):</span>
                        <span className="font-medium">{formatCurrency(pricing.landlordAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculatingPrice && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Calculando precio...</span>
                  </div>
                </div>
              )}

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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="landlordFirstName">Nombre</Label>
                      <Input
                        id="landlordFirstName"
                        value={landlordData.firstName}
                        onChange={(e) => setLandlordData({ ...landlordData, firstName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="landlordLastName">Apellidos</Label>
                      <Input
                        id="landlordLastName"
                        value={landlordData.lastName}
                        onChange={(e) => setLandlordData({ ...landlordData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenantFirstName">Nombre</Label>
                    <Input
                      id="tenantFirstName"
                      value={tenantData.firstName}
                      onChange={(e) => setTenantData({ ...tenantData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tenantLastName">Apellidos</Label>
                    <Input
                      id="tenantLastName"
                      value={tenantData.lastName}
                      onChange={(e) => setTenantData({ ...tenantData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {tenantData.tenantType === TenantType.COMPANY && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenantRepFirstName">Nombre del Representante</Label>
                    <Input
                      id="tenantRepFirstName"
                      value={tenantData.firstName}
                      onChange={(e) => setTenantData({ ...tenantData, firstName: e.target.value })}
                      placeholder="Nombre del representante legal"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tenantRepLastName">Apellidos del Representante</Label>
                    <Input
                      id="tenantRepLastName"
                      value={tenantData.lastName}
                      onChange={(e) => setTenantData({ ...tenantData, lastName: e.target.value })}
                      placeholder="Apellidos del representante legal"
                    />
                  </div>
                </div>
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Input
                              placeholder="Nombre *"
                              value={jo.firstName}
                              onChange={(e) => updateJointObligor(index, 'firstName', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Input
                              placeholder="Apellidos *"
                              value={jo.lastName}
                              onChange={(e) => updateJointObligor(index, 'lastName', e.target.value)}
                              required
                            />
                          </div>
                        </div>
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Input
                              placeholder="Nombre *"
                              value={aval.firstName}
                              onChange={(e) => updateAval(index, 'firstName', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Input
                              placeholder="Apellidos *"
                              value={aval.lastName}
                              onChange={(e) => updateAval(index, 'lastName', e.target.value)}
                              required
                            />
                          </div>
                        </div>
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
                    <dd>{landlordData.firstName} {landlordData.lastName}</dd>
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
                      <dd>{tenantData.firstName} {tenantData.lastName}</dd>
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
                      <li key={index}>{jo.firstName} {jo.lastName} - {jo.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              {avals.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Avales</h3>
                  <ul className="space-y-1 text-sm">
                    {avals.map((aval, index) => (
                      <li key={index}>{aval.firstName} {aval.lastName} - {aval.email}</li>
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
                  {loading ? 'Creando...' : 'Crear Póliza'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
