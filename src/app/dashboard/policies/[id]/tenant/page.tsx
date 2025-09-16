'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, User, Briefcase, Building, Users } from 'lucide-react';
import { individualTenantSchema, companyTenantSchema, personalReferenceSchema } from '@/lib/validations/policy';
import { z } from 'zod';

interface TenantData {
  // Common fields
  email: string;
  phone: string;
  tenantType: 'INDIVIDUAL' | 'COMPANY';

  // Individual fields
  fullName?: string;
  nationality?: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  rfc?: string;
  passport?: string;
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  position?: string;
  monthlyIncome?: number;
  incomeSource?: string;

  // Company fields
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepId?: string;
  companyAddress?: string;

  // Status
  informationComplete: boolean;
  additionalInfo?: string;
}

interface Reference {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  occupation?: string;
}

interface PolicyData {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  status: string;
  tenant?: TenantData;
}

export default function TenantInformationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [policyId, setPolicyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [currentTab, setCurrentTab] = useState('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [references, setReferences] = useState<Reference[]>([]);

  const [formData, setFormData] = useState<TenantData>({
    tenantType: 'INDIVIDUAL',
    email: '',
    phone: '',
    fullName: '',
    nationality: 'MEXICAN',
    curp: '',
    rfc: '',
    passport: '',
    employmentStatus: '',
    occupation: '',
    employerName: '',
    position: '',
    monthlyIncome: 0,
    incomeSource: '',
    companyName: '',
    companyRfc: '',
    legalRepName: '',
    legalRepId: '',
    companyAddress: '',
    informationComplete: false,
    additionalInfo: '',
  });

  // Check authorization
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN' && session.user?.role !== 'STAFF') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  // Fetch policy and tenant data
  useEffect(() => {
    if (policyId) {
      fetchPolicyData();
    }
  }, [policyId]);

  const fetchPolicyData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}`);
      if (!response.ok) throw new Error('Failed to fetch policy');

      const data = await response.json();
      setPolicy(data.data || data);

      // If tenant data exists, populate the form
      if (data.data?.tenant || data.tenant) {
        const tenantData = data.data?.tenant || data.tenant;
        setFormData({
          ...formData,
          ...tenantData,
        });

        // Fetch references if tenant exists
        if (tenantData.id) {
          fetchReferences(tenantData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferences = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}/tenant/${tenantId}/references`);
      if (response.ok) {
        const data = await response.json();
        setReferences(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching references:', error);
    }
  };

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

  const addReference = () => {
    if (references.length < 5) {
      setReferences([...references, {
        name: '',
        phone: '',
        email: '',
        relationship: '',
        occupation: ''
      }]);
    }
  };

  const removeReference = (index: number) => {
    if (references.length > 3) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const updateReference = (index: number, field: string, value: string) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setReferences(newReferences);
  };

  const validateForm = (): boolean => {
    try {
      // Create the appropriate schema based on tenant type
      if (formData.tenantType === 'COMPANY') {
        companyTenantSchema.parse({
          ...formData,
          tenantType: 'COMPANY',
          fullName: null,
          nationality: null,
          employmentStatus: null,
          occupation: null,
          monthlyIncome: null,
        });
      } else {
        individualTenantSchema.parse({
          ...formData,
          tenantType: 'INDIVIDUAL',
          companyName: null,
          companyRfc: null,
          legalRepName: null,
          legalRepId: null,
          companyAddress: null,
        });
      }

      // Validate references
      if (references.length < 3) {
        throw new Error('Se requieren al menos 3 referencias');
      }

      references.forEach((ref, index) => {
        try {
          personalReferenceSchema.parse(ref);
        } catch (err) {
          if (err instanceof z.ZodError) {
            err.errors.forEach(error => {
              const path = error.path.join('.');
              setErrors(prev => ({
                ...prev,
                [`ref_${index}_${path}`]: error.message
              }));
            });
          }
          throw err;
        }
      });

      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({ general: error.message });
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      // Find the first tab with errors
      const errorKeys = Object.keys(errors);
      if (errorKeys.some(key => ['fullName', 'email', 'phone', 'nationality', 'curp', 'passport', 'companyName', 'companyRfc', 'legalRepName'].includes(key))) {
        setCurrentTab('personal');
      } else if (errorKeys.some(key => ['employmentStatus', 'occupation', 'monthlyIncome'].includes(key))) {
        setCurrentTab('employment');
      } else if (errorKeys.some(key => key.startsWith('ref_'))) {
        setCurrentTab('references');
      }
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/policies/${policyId}/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          informationComplete: true,
          references,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tenant information');
      }

      setSuccessMessage('Información del inquilino guardada exitosamente');

      // Update local state to mark as complete
      setFormData(prev => ({ ...prev, informationComplete: true }));

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/dashboard/policies/${policyId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving tenant information:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la información. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    let filledFields = 0;
    let totalFields = 0;

    if (formData.tenantType === 'INDIVIDUAL') {
      // Count individual fields
      ['fullName', 'email', 'phone', 'nationality', 'employmentStatus', 'occupation'].forEach(field => {
        totalFields++;
        if (formData[field as keyof TenantData]) filledFields++;
      });

      if (formData.nationality === 'MEXICAN' && formData.curp) filledFields++;
      if (formData.nationality === 'FOREIGN' && formData.passport) filledFields++;
      totalFields++;

      if (formData.monthlyIncome && formData.monthlyIncome > 0) filledFields++;
      totalFields++;
    } else {
      // Count company fields
      ['companyName', 'companyRfc', 'legalRepName', 'legalRepId', 'companyAddress', 'email', 'phone'].forEach(field => {
        totalFields++;
        if (formData[field as keyof TenantData]) filledFields++;
      });
    }

    // Count references
    totalFields += 3; // Minimum 3 references
    const validReferences = references.filter(ref => ref.name && ref.phone && ref.relationship).length;
    filledFields += Math.min(validReferences, 3);

    return Math.round((filledFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar la información de la póliza.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push(`/dashboard/policies/${policyId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a la póliza
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Información del Inquilino</CardTitle>
          <CardDescription>
            Editar la información del inquilino para la póliza
          </CardDescription>
          {policy && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Póliza:</strong> {policy.policyNumber}<br />
                <strong>Propiedad:</strong> {policy.propertyAddress}
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
          {successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {errors.general && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">Tipo de Inquilino</Label>
            <RadioGroup
              value={formData.tenantType}
              onValueChange={(value) => updateFormData('tenantType', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="INDIVIDUAL" id="individual" />
                <Label htmlFor="individual">Persona Física</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="COMPANY" id="company" />
                <Label htmlFor="company">Empresa</Label>
              </div>
            </RadioGroup>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="personal">
                {formData.tenantType === 'COMPANY' ? (
                  <><Building className="h-4 w-4 mr-2" />Empresa</>
                ) : (
                  <><User className="h-4 w-4 mr-2" />Personal</>
                )}
              </TabsTrigger>
              {formData.tenantType === 'INDIVIDUAL' && (
                <TabsTrigger value="employment">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Laboral
                </TabsTrigger>
              )}
              <TabsTrigger value="references">
                <Users className="h-4 w-4 mr-2" />
                Referencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              {formData.tenantType === 'INDIVIDUAL' ? (
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
                    <Label htmlFor="nationality">Nacionalidad *</Label>
                    <Select
                      value={formData.nationality}
                      onValueChange={(value) => updateFormData('nationality', value)}
                    >
                      <SelectTrigger className={errors.nationality ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Seleccione nacionalidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEXICAN">Mexicana</SelectItem>
                        <SelectItem value="FOREIGN">Extranjera</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality}</p>}
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
                        onChange={(e) => updateFormData('passport', e.target.value)}
                        placeholder="Número de pasaporte"
                        className={errors.passport ? 'border-red-500' : ''}
                      />
                      {errors.passport && <p className="text-red-500 text-sm mt-1">{errors.passport}</p>}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="rfc">RFC</Label>
                    <Input
                      id="rfc"
                      value={formData.rfc}
                      onChange={(e) => updateFormData('rfc', e.target.value.toUpperCase())}
                      placeholder="RFC (opcional)"
                      maxLength={13}
                      className={errors.rfc ? 'border-red-500' : ''}
                    />
                    {errors.rfc && <p className="text-red-500 text-sm mt-1">{errors.rfc}</p>}
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
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">Razón Social *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => updateFormData('companyName', e.target.value)}
                      placeholder="Nombre de la empresa"
                      className={errors.companyName ? 'border-red-500' : ''}
                    />
                    {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="companyRfc">RFC de la Empresa *</Label>
                    <Input
                      id="companyRfc"
                      value={formData.companyRfc}
                      onChange={(e) => updateFormData('companyRfc', e.target.value.toUpperCase())}
                      placeholder="AAA123456XXX"
                      maxLength={12}
                      className={errors.companyRfc ? 'border-red-500' : ''}
                    />
                    {errors.companyRfc && <p className="text-red-500 text-sm mt-1">{errors.companyRfc}</p>}
                  </div>

                  <div>
                    <Label htmlFor="legalRepName">Representante Legal *</Label>
                    <Input
                      id="legalRepName"
                      value={formData.legalRepName}
                      onChange={(e) => updateFormData('legalRepName', e.target.value)}
                      placeholder="Nombre del representante"
                      className={errors.legalRepName ? 'border-red-500' : ''}
                    />
                    {errors.legalRepName && <p className="text-red-500 text-sm mt-1">{errors.legalRepName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="legalRepId">ID del Representante *</Label>
                    <Input
                      id="legalRepId"
                      value={formData.legalRepId}
                      onChange={(e) => updateFormData('legalRepId', e.target.value)}
                      placeholder="INE/Pasaporte del representante"
                      className={errors.legalRepId ? 'border-red-500' : ''}
                    />
                    {errors.legalRepId && <p className="text-red-500 text-sm mt-1">{errors.legalRepId}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="companyAddress">Dirección de la Empresa *</Label>
                    <Input
                      id="companyAddress"
                      value={formData.companyAddress}
                      onChange={(e) => updateFormData('companyAddress', e.target.value)}
                      placeholder="Dirección completa"
                      className={errors.companyAddress ? 'border-red-500' : ''}
                    />
                    {errors.companyAddress && <p className="text-red-500 text-sm mt-1">{errors.companyAddress}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Email de Contacto *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="correo@empresa.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono de Contacto *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="10 dígitos"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setCurrentTab(formData.tenantType === 'INDIVIDUAL' ? 'employment' : 'references')}>
                  Siguiente
                </Button>
              </div>
            </TabsContent>

            {formData.tenantType === 'INDIVIDUAL' && (
              <TabsContent value="employment" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employmentStatus">Situación Laboral *</Label>
                    <Select
                      value={formData.employmentStatus}
                      onValueChange={(value) => updateFormData('employmentStatus', value)}
                    >
                      <SelectTrigger className={errors.employmentStatus ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Seleccione situación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Empleado</SelectItem>
                        <SelectItem value="self_employed">Independiente</SelectItem>
                        <SelectItem value="business_owner">Empresario</SelectItem>
                        <SelectItem value="retired">Jubilado</SelectItem>
                        <SelectItem value="student">Estudiante</SelectItem>
                        <SelectItem value="unemployed">Desempleado</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
                  </div>

                  <div>
                    <Label htmlFor="occupation">Ocupación *</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => updateFormData('occupation', e.target.value)}
                      placeholder="Ej: Ingeniero, Médico, Contador"
                      className={errors.occupation ? 'border-red-500' : ''}
                    />
                    {errors.occupation && <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>}
                  </div>

                  <div>
                    <Label htmlFor="employerName">Nombre de la Empresa</Label>
                    <Input
                      id="employerName"
                      value={formData.employerName}
                      onChange={(e) => updateFormData('employerName', e.target.value)}
                      placeholder="Donde trabaja actualmente"
                    />
                  </div>

                  <div>
                    <Label htmlFor="position">Puesto</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => updateFormData('position', e.target.value)}
                      placeholder="Cargo actual"
                    />
                  </div>

                  <div>
                    <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN) *</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      className={errors.monthlyIncome ? 'border-red-500' : ''}
                    />
                    {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
                  </div>

                  <div>
                    <Label htmlFor="incomeSource">Fuente de Ingreso</Label>
                    <Select
                      value={formData.incomeSource}
                      onValueChange={(value) => updateFormData('incomeSource', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione fuente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salary">Salario</SelectItem>
                        <SelectItem value="business">Negocio propio</SelectItem>
                        <SelectItem value="investments">Inversiones</SelectItem>
                        <SelectItem value="pension">Pensión</SelectItem>
                        <SelectItem value="other">Otros</SelectItem>
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
            )}

            <TabsContent value="references" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Se requieren al menos 3 referencias personales. Máximo 5.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {references.map((ref, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">Referencia {index + 1}</h4>
                      {references.length > 3 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeReference(index)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nombre Completo *</Label>
                        <Input
                          value={ref.name}
                          onChange={(e) => updateReference(index, 'name', e.target.value)}
                          placeholder="Nombre de la referencia"
                          className={errors[`ref_${index}_name`] ? 'border-red-500' : ''}
                        />
                        {errors[`ref_${index}_name`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <Label>Teléfono *</Label>
                        <Input
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
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={ref.email}
                          onChange={(e) => updateReference(index, 'email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Relación *</Label>
                        <Input
                          value={ref.relationship}
                          onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                          placeholder="Ej: Amigo, Familiar, Colega"
                          className={errors[`ref_${index}_relationship`] ? 'border-red-500' : ''}
                        />
                        {errors[`ref_${index}_relationship`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_relationship`]}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label>Ocupación</Label>
                        <Input
                          value={ref.occupation}
                          onChange={(e) => updateReference(index, 'occupation', e.target.value)}
                          placeholder="Ocupación de la referencia"
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                {references.length < 5 && (
                  <Button
                    variant="outline"
                    onClick={addReference}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Agregar Referencia
                  </Button>
                )}
              </div>

              <div className="mt-4">
                <Label htmlFor="additionalInfo">Información Adicional</Label>
                <Input
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  placeholder="Cualquier información adicional relevante"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab(formData.tenantType === 'INDIVIDUAL' ? 'employment' : 'personal')}>
                  Anterior
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Información'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {formData.informationComplete && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                La información del inquilino está completa
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}