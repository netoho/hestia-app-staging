'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PropertyType, GuarantorType } from '@/types/policy';

interface ActorForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rfc?: string;
}

export default function NewPolicyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('property');

  // Property Information
  const [propertyData, setPropertyData] = useState({
    propertyAddress: '',
    propertyType: PropertyType.APARTMENT,
    rentAmount: '',
    depositAmount: '',
    startDate: '',
    endDate: '',
  });

  // Landlord Information
  const [landlordData, setLandlordData] = useState<ActorForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rfc: '',
  });

  // Tenant Information
  const [tenantData, setTenantData] = useState<ActorForm>({
    firstName: '',
    lastName: '',
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
    if (!propertyData.propertyAddress || !propertyData.rentAmount || !propertyData.startDate || !propertyData.endDate) {
      alert('Por favor complete todos los campos de la propiedad');
      return false;
    }

    // Validate landlord data
    if (!landlordData.firstName || !landlordData.lastName || !landlordData.email) {
      alert('Por favor complete todos los campos del arrendador');
      return false;
    }

    // Validate tenant data
    if (!tenantData.firstName || !tenantData.lastName || !tenantData.email) {
      alert('Por favor complete todos los campos del inquilino');
      return false;
    }

    // Validate guarantors based on type
    if (guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) {
      if (jointObligors.length === 0) {
        alert('Por favor agregue al menos un obligado solidario');
        return false;
      }
      for (const jo of jointObligors) {
        if (!jo.firstName || !jo.lastName || !jo.email) {
          alert('Por favor complete todos los campos de los obligados solidarios');
          return false;
        }
      }
    }

    if (guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH) {
      if (avals.length === 0) {
        alert('Por favor agregue al menos un aval');
        return false;
      }
      for (const aval of avals) {
        if (!aval.firstName || !aval.lastName || !aval.email) {
          alert('Por favor complete todos los campos de los avales');
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
        depositAmount: parseFloat(propertyData.depositAmount),
        landlord: landlordData,
        tenant: tenantData,
        jointObligors: guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH ? jointObligors : [],
        avals: guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH ? avals : [],
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
        alert('Error al crear la póliza: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error al crear la póliza');
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="property">Propiedad</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Garantías</TabsTrigger>
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
                <Label htmlFor="propertyAddress">Dirección de la Propiedad</Label>
                <Input
                  id="propertyAddress"
                  value={propertyData.propertyAddress}
                  onChange={(e) => setPropertyData({ ...propertyData, propertyAddress: e.target.value })}
                  placeholder="Calle, Número, Colonia, Ciudad, Estado"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={propertyData.startDate}
                    onChange={(e) => setPropertyData({ ...propertyData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Fecha de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={propertyData.endDate}
                    onChange={(e) => setPropertyData({ ...propertyData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
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
                    onChange={(e) => setLandlordData({ ...landlordData, rfc: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('property')}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenantFirstName">Nombre</Label>
                  <Input
                    id="tenantFirstName"
                    value={tenantData.firstName}
                    onChange={(e) => setTenantData({ ...tenantData, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="tenantLastName">Apellidos</Label>
                  <Input
                    id="tenantLastName"
                    value={tenantData.lastName}
                    onChange={(e) => setTenantData({ ...tenantData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tenantEmail">Email</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  value={tenantData.email}
                  onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenantPhone">Teléfono</Label>
                  <Input
                    id="tenantPhone"
                    value={tenantData.phone}
                    onChange={(e) => setTenantData({ ...tenantData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="tenantRfc">RFC/CURP</Label>
                  <Input
                    id="tenantRfc"
                    value={tenantData.rfc}
                    onChange={(e) => setTenantData({ ...tenantData, rfc: e.target.value })}
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
              <CardTitle>Garantías</CardTitle>
              <CardDescription>Configure el tipo de garantía para esta póliza</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guarantorType">Tipo de Garantía</Label>
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Nombre"
                            value={jo.firstName}
                            onChange={(e) => updateJointObligor(index, 'firstName', e.target.value)}
                          />
                          <Input
                            placeholder="Apellidos"
                            value={jo.lastName}
                            onChange={(e) => updateJointObligor(index, 'lastName', e.target.value)}
                          />
                        </div>
                        <Input
                          placeholder="Email"
                          type="email"
                          value={jo.email}
                          onChange={(e) => updateJointObligor(index, 'email', e.target.value)}
                        />
                        <Input
                          placeholder="Teléfono"
                          value={jo.phone}
                          onChange={(e) => updateJointObligor(index, 'phone', e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            placeholder="Nombre"
                            value={aval.firstName}
                            onChange={(e) => updateAval(index, 'firstName', e.target.value)}
                          />
                          <Input
                            placeholder="Apellidos"
                            value={aval.lastName}
                            onChange={(e) => updateAval(index, 'lastName', e.target.value)}
                          />
                        </div>
                        <Input
                          placeholder="Email"
                          type="email"
                          value={aval.email}
                          onChange={(e) => updateAval(index, 'email', e.target.value)}
                        />
                        <Input
                          placeholder="Teléfono"
                          value={aval.phone}
                          onChange={(e) => updateAval(index, 'phone', e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
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
                    <dt className="text-gray-500">Renta:</dt>
                    <dd>${propertyData.rentAmount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Depósito:</dt>
                    <dd>${propertyData.depositAmount}</dd>
                  </div>
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
                    <dt className="text-gray-500">Nombre:</dt>
                    <dd>{tenantData.firstName} {tenantData.lastName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd>{tenantData.email}</dd>
                  </div>
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