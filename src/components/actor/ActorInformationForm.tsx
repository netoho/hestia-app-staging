'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Upload, User, Briefcase, Users, FileText, Send } from 'lucide-react';

interface PersonalReference {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  occupation?: string;
}

interface ActorData {
  // Personal Information
  fullName: string;
  email: string;
  phone: string;
  nationality: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  passport?: string;
  address?: string;

  // Employment Information
  employmentStatus: string;
  occupation: string;
  companyName: string;
  position: string;
  monthlyIncome: number;
  incomeSource: string;

  // References (3 required)
  references: PersonalReference[];

  // Additional for Aval
  propertyAddress?: string;
  propertyValue?: number;
  propertyDeedNumber?: string;
  propertyRegistry?: string;
}

interface ActorInformationFormProps {
  actorType: 'tenant' | 'joint-obligor' | 'aval';
  token: string;
  policyData?: {
    policyNumber: string;
    propertyAddress: string;
  };
  initialData?: Partial<ActorData>;
  onSubmit?: (data: ActorData) => Promise<void>;
}

export default function ActorInformationForm({
  actorType,
  token,
  policyData,
  initialData,
  onSubmit
}: ActorInformationFormProps) {
  const [currentTab, setCurrentTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState<ActorData>({
    fullName: initialData?.fullName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    nationality: initialData?.nationality || 'MEXICAN',
    curp: initialData?.curp || '',
    passport: initialData?.passport || '',
    address: initialData?.address || '',
    employmentStatus: initialData?.employmentStatus || 'employed',
    occupation: initialData?.occupation || '',
    companyName: initialData?.companyName || '',
    position: initialData?.position || '',
    monthlyIncome: initialData?.monthlyIncome || 0,
    incomeSource: initialData?.incomeSource || 'salary',
    references: initialData?.references || [
      { name: '', phone: '', email: '', relationship: '', occupation: '' },
      { name: '', phone: '', email: '', relationship: '', occupation: '' },
      { name: '', phone: '', email: '', relationship: '', occupation: '' },
    ],
    propertyAddress: initialData?.propertyAddress || '',
    propertyValue: initialData?.propertyValue || 0,
    propertyDeedNumber: initialData?.propertyDeedNumber || '',
    propertyRegistry: initialData?.propertyRegistry || '',
  });

  // Documents tracking
  const [documents, setDocuments] = useState({
    identification: null as File | null,
    incomeProof: null as File | null,
    addressProof: null as File | null,
    propertyDeed: null as File | null, // For aval only
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateReference = (index: number, field: string, value: string) => {
    const newReferences = [...formData.references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setFormData(prev => ({ ...prev, references: newReferences }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Personal info validation
    if (!formData.fullName) newErrors.fullName = 'Nombre completo es requerido';
    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.phone) newErrors.phone = 'Teléfono es requerido';
    if (formData.nationality === 'MEXICAN' && !formData.curp) {
      newErrors.curp = 'CURP es requerido para ciudadanos mexicanos';
    }
    if (formData.nationality === 'FOREIGN' && !formData.passport) {
      newErrors.passport = 'Pasaporte es requerido para extranjeros';
    }

    // Employment validation
    if (!formData.occupation) newErrors.occupation = 'Ocupación es requerida';
    if (!formData.companyName) newErrors.companyName = 'Nombre de empresa es requerido';
    if (!formData.monthlyIncome || formData.monthlyIncome <= 0) {
      newErrors.monthlyIncome = 'Ingreso mensual debe ser mayor a 0';
    }

    // References validation
    formData.references.forEach((ref, index) => {
      if (!ref.name) newErrors[`ref_${index}_name`] = `Nombre de referencia ${index + 1} es requerido`;
      if (!ref.phone) newErrors[`ref_${index}_phone`] = `Teléfono de referencia ${index + 1} es requerido`;
      if (!ref.relationship) newErrors[`ref_${index}_relationship`] = `Relación de referencia ${index + 1} es requerida`;
    });

    // Aval specific validation
    if (actorType === 'aval') {
      if (!formData.propertyAddress) newErrors.propertyAddress = 'Dirección de propiedad es requerida';
      if (!formData.propertyValue || formData.propertyValue <= 0) {
        newErrors.propertyValue = 'Valor de propiedad debe ser mayor a 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Find the first tab with errors
      if (errors.fullName || errors.email || errors.phone || errors.curp || errors.passport) {
        setCurrentTab('personal');
      } else if (errors.occupation || errors.companyName || errors.monthlyIncome) {
        setCurrentTab('employment');
      } else if (Object.keys(errors).some(key => key.startsWith('ref_'))) {
        setCurrentTab('references');
      } else if (actorType === 'aval' && (errors.propertyAddress || errors.propertyValue)) {
        setCurrentTab('property');
      }
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission to API
        const response = await fetch(`/api/actor/${actorType}/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Error al enviar la información');
        }
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al enviar la información. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    let filledFields = 0;
    let totalFields = 0;

    // Count personal fields
    ['fullName', 'email', 'phone', 'address'].forEach(field => {
      totalFields++;
      if (formData[field as keyof ActorData]) filledFields++;
    });

    // Count ID field
    totalFields++;
    if (formData.nationality === 'MEXICAN' && formData.curp) filledFields++;
    if (formData.nationality === 'FOREIGN' && formData.passport) filledFields++;

    // Count employment fields
    ['occupation', 'companyName', 'position'].forEach(field => {
      totalFields++;
      if (formData[field as keyof ActorData]) filledFields++;
    });
    totalFields++;
    if (formData.monthlyIncome > 0) filledFields++;

    // Count references
    formData.references.forEach(ref => {
      totalFields += 3;
      if (ref.name) filledFields++;
      if (ref.phone) filledFields++;
      if (ref.relationship) filledFields++;
    });

    // Count aval fields
    if (actorType === 'aval') {
      totalFields += 2;
      if (formData.propertyAddress) filledFields++;
      if (formData.propertyValue && formData.propertyValue > 0) filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  };

  const actorTypeNames = {
    'tenant': 'Inquilino',
    'joint-obligor': 'Obligado Solidario',
    'aval': 'Aval'
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">¡Información Enviada!</h2>
            <p className="text-gray-600 mb-4">
              Hemos recibido tu información correctamente. Te notificaremos por correo cuando tu póliza esté lista.
            </p>
            {policyData && (
              <div className="bg-gray-50 rounded-lg p-4 mt-6 text-left">
                <p className="text-sm text-gray-600">
                  <strong>Número de Póliza:</strong> {policyData.policyNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Propiedad:</strong> {policyData.propertyAddress}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Laboral', icon: Briefcase },
    { id: 'references', label: 'Referencias', icon: Users },
    ...(actorType === 'aval' ? [{ id: 'property', label: 'Propiedad', icon: FileText }] : []),
    { id: 'documents', label: 'Documentos', icon: Upload },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del {actorTypeNames[actorType]}</CardTitle>
        <CardDescription>
          Complete toda la información requerida para procesar su póliza
        </CardDescription>
        {policyData && (
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Póliza:</strong> {policyData.policyNumber}<br />
              <strong>Propiedad:</strong> {policyData.propertyAddress}
            </AlertDescription>
          </Alert>
        )}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso</span>
            <span>{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-5 w-full">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                <tab.icon className="h-4 w-4 mr-1" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  placeholder="Nombre(s) y Apellidos"
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="10 dígitos"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="nationality">Nacionalidad *</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(value) => updateFormData('nationality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEXICAN">Mexicana</SelectItem>
                    <SelectItem value="FOREIGN">Extranjera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.nationality === 'MEXICAN' ? (
                <div>
                  <Label htmlFor="curp">CURP *</Label>
                  <Input
                    id="curp"
                    value={formData.curp}
                    onChange={(e) => updateFormData('curp', e.target.value.toUpperCase())}
                    placeholder="18 caracteres"
                    maxLength={18}
                    className={errors.curp ? 'border-red-500' : ''}
                  />
                  {errors.curp && <p className="text-red-500 text-sm mt-1">{errors.curp}</p>}
                </div>
              ) : (
                <div>
                  <Label htmlFor="passport">Pasaporte *</Label>
                  <Input
                    id="passport"
                    value={formData.passport}
                    onChange={(e) => updateFormData('passport', e.target.value.toUpperCase())}
                    placeholder="Número de pasaporte"
                    className={errors.passport ? 'border-red-500' : ''}
                  />
                  {errors.passport && <p className="text-red-500 text-sm mt-1">{errors.passport}</p>}
                </div>
              )}

              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  placeholder="Calle, Número, Colonia, Ciudad, Estado"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentTab('employment')}>
                Siguiente
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employmentStatus">Situación Laboral *</Label>
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(value) => updateFormData('employmentStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Empleado</SelectItem>
                    <SelectItem value="self_employed">Trabajador Independiente</SelectItem>
                    <SelectItem value="business_owner">Empresario</SelectItem>
                    <SelectItem value="retired">Jubilado</SelectItem>
                    <SelectItem value="student">Estudiante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="occupation">Ocupación *</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => updateFormData('occupation', e.target.value)}
                  placeholder="Ej: Ingeniero, Médico, Comerciante"
                  className={errors.occupation ? 'border-red-500' : ''}
                />
                {errors.occupation && <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>}
              </div>

              <div>
                <Label htmlFor="companyName">Nombre de Empresa *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  placeholder="Empresa donde trabaja"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <Label htmlFor="position">Puesto</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => updateFormData('position', e.target.value)}
                  placeholder="Cargo o posición"
                />
              </div>

              <div>
                <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN) *</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  className={errors.monthlyIncome ? 'border-red-500' : ''}
                />
                {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
              </div>

              <div>
                <Label htmlFor="incomeSource">Fuente de Ingresos *</Label>
                <Select
                  value={formData.incomeSource}
                  onValueChange={(value) => updateFormData('incomeSource', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salario</SelectItem>
                    <SelectItem value="business">Negocio Propio</SelectItem>
                    <SelectItem value="investments">Inversiones</SelectItem>
                    <SelectItem value="pension">Pensión</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentTab('personal')}>
                Anterior
              </Button>
              <Button onClick={() => setCurrentTab('references')}>
                Siguiente
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="references" className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Proporcione información de 3 referencias personales (no familiares directos)
            </p>

            {formData.references.map((ref, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">Referencia {index + 1} *</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`ref_${index}_name`}>Nombre Completo *</Label>
                    <Input
                      id={`ref_${index}_name`}
                      value={ref.name}
                      onChange={(e) => updateReference(index, 'name', e.target.value)}
                      placeholder="Nombre completo"
                      className={errors[`ref_${index}_name`] ? 'border-red-500' : ''}
                    />
                    {errors[`ref_${index}_name`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`ref_${index}_phone`}>Teléfono *</Label>
                    <Input
                      id={`ref_${index}_phone`}
                      value={ref.phone}
                      onChange={(e) => updateReference(index, 'phone', e.target.value)}
                      placeholder="10 dígitos"
                      className={errors[`ref_${index}_phone`] ? 'border-red-500' : ''}
                    />
                    {errors[`ref_${index}_phone`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_phone`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`ref_${index}_email`}>Email</Label>
                    <Input
                      id={`ref_${index}_email`}
                      type="email"
                      value={ref.email}
                      onChange={(e) => updateReference(index, 'email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`ref_${index}_relationship`}>Relación *</Label>
                    <Input
                      id={`ref_${index}_relationship`}
                      value={ref.relationship}
                      onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                      placeholder="Ej: Amigo, Colega, Vecino"
                      className={errors[`ref_${index}_relationship`] ? 'border-red-500' : ''}
                    />
                    {errors[`ref_${index}_relationship`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_relationship`]}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={`ref_${index}_occupation`}>Ocupación</Label>
                    <Input
                      id={`ref_${index}_occupation`}
                      value={ref.occupation}
                      onChange={(e) => updateReference(index, 'occupation', e.target.value)}
                      placeholder="Ocupación de la referencia"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentTab('employment')}>
                Anterior
              </Button>
              <Button onClick={() => setCurrentTab(actorType === 'aval' ? 'property' : 'documents')}>
                Siguiente
              </Button>
            </div>
          </TabsContent>

          {actorType === 'aval' && (
            <TabsContent value="property" className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Información de la propiedad que será usada como garantía
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="propertyAddress">Dirección de la Propiedad *</Label>
                  <Input
                    id="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={(e) => updateFormData('propertyAddress', e.target.value)}
                    placeholder="Dirección completa de la propiedad"
                    className={errors.propertyAddress ? 'border-red-500' : ''}
                  />
                  {errors.propertyAddress && (
                    <p className="text-red-500 text-sm mt-1">{errors.propertyAddress}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyValue">Valor de la Propiedad (MXN) *</Label>
                    <Input
                      id="propertyValue"
                      type="number"
                      value={formData.propertyValue}
                      onChange={(e) => updateFormData('propertyValue', parseFloat(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      className={errors.propertyValue ? 'border-red-500' : ''}
                    />
                    {errors.propertyValue && (
                      <p className="text-red-500 text-sm mt-1">{errors.propertyValue}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="propertyDeedNumber">Número de Escritura</Label>
                    <Input
                      id="propertyDeedNumber"
                      value={formData.propertyDeedNumber}
                      onChange={(e) => updateFormData('propertyDeedNumber', e.target.value)}
                      placeholder="Número de escritura pública"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="propertyRegistry">Registro Público</Label>
                  <Input
                    id="propertyRegistry"
                    value={formData.propertyRegistry}
                    onChange={(e) => updateFormData('propertyRegistry', e.target.value)}
                    placeholder="Datos del registro público de la propiedad"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('references')}>
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('documents')}>
                  Siguiente
                </Button>
              </div>
            </TabsContent>
          )}

          <TabsContent value="documents" className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Cargue los documentos requeridos (máximo 10MB por archivo)
            </p>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identificación Oficial *</CardTitle>
                  <CardDescription>INE, Pasaporte o Cédula Profesional</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocuments(prev => ({ ...prev, identification: file }));
                    }}
                  />
                  {documents.identification && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.identification.name}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comprobante de Ingresos *</CardTitle>
                  <CardDescription>Recibos de nómina, estados de cuenta o declaración fiscal</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocuments(prev => ({ ...prev, incomeProof: file }));
                    }}
                  />
                  {documents.incomeProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.incomeProof.name}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comprobante de Domicilio</CardTitle>
                  <CardDescription>Recibo de servicios (luz, agua, gas, teléfono)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocuments(prev => ({ ...prev, addressProof: file }));
                    }}
                  />
                  {documents.addressProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.addressProof.name}
                    </p>
                  )}
                </CardContent>
              </Card>

              {actorType === 'aval' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Escritura de Propiedad *</CardTitle>
                    <CardDescription>Documento que acredite la propiedad</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocuments(prev => ({ ...prev, propertyDeed: file }));
                      }}
                    />
                    {documents.propertyDeed && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {documents.propertyDeed.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <Alert>
              <AlertDescription>
                Los documentos marcados con * son obligatorios. Puede enviar el formulario ahora y cargar los documentos más tarde.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentTab(actorType === 'aval' ? 'property' : 'references')}
              >
                Anterior
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Información
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}