'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, CheckCircle2, AlertCircle, User, Briefcase, Building, Home, FileText, Users, XCircle, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';

interface AvalData {
  // Type
  avalType: 'INDIVIDUAL' | 'COMPANY';

  // Individual Information
  fullName?: string;
  nationality?: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  rfc?: string;
  passport?: string;

  // Company Information
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepId?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Contact Information
  email: string;
  phone: string;
  workPhone?: string;
  personalEmail?: string;
  workEmail?: string;

  // Address Information
  address?: string;
  addressDetails?: any;

  // Employment (for individuals)
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  employerAddress?: string;
  position?: string;
  monthlyIncome?: number;
  incomeSource?: string;

  // Property Guarantee Information (Aval specific)
  propertyAddress?: string;
  propertyAddressDetails?: any;
  propertyValue?: number;
  propertyDeedNumber?: string;
  propertyRegistry?: string;
  propertyType?: string;
  propertyOwnershipPercentage?: number;
  propertySurface?: number;
  propertyDescription?: string;

  // Status
  informationComplete: boolean;
  references?: any[];
  commercialReferences?: any[];
}

interface PolicyData {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  rentAmount: number;
  status: string;
}

export default function AvalPortalPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [currentTab, setCurrentTab] = useState('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<AvalData>({
    avalType: 'INDIVIDUAL',
    fullName: '',
    nationality: 'MEXICAN',
    curp: '',
    rfc: '',
    passport: '',
    companyName: '',
    companyRfc: '',
    legalRepName: '',
    legalRepId: '',
    legalRepPosition: '',
    legalRepRfc: '',
    legalRepPhone: '',
    legalRepEmail: '',
    email: '',
    phone: '',
    workPhone: '',
    personalEmail: '',
    workEmail: '',
    address: '',
    addressDetails: null,
    employmentStatus: '',
    occupation: '',
    employerName: '',
    employerAddress: '',
    position: '',
    monthlyIncome: 0,
    incomeSource: '',
    propertyAddress: '',
    propertyAddressDetails: null,
    propertyValue: 0,
    propertyDeedNumber: '',
    propertyRegistry: '',
    propertyType: '',
    propertyOwnershipPercentage: 100,
    propertySurface: 0,
    propertyDescription: '',
    informationComplete: false,
    references: [],
    commercialReferences: [],
  });

  // References state
  const [references, setReferences] = useState<any[]>([
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
  ]);

  const [commercialReferences, setCommercialReferences] = useState<any[]>([
    { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
    { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
    { companyName: '', contactName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
  ]);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setToken(resolvedParams.token);
    });
  }, [params]);

  // Fetch aval and policy data
  useEffect(() => {
    if (token) {
      validateTokenAndLoadData();
    }
  }, [token]);

  const validateTokenAndLoadData = async () => {
    try {
      const response = await fetch(`/api/actor/aval/${token}/validate`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Token inválido o expirado');
        setLoading(false);
        return;
      }

      setPolicy(data.policy);

      // If aval data exists, populate the form
      if (data.aval) {
        setFormData({
          ...formData,
          ...data.aval,
          addressDetails: data.aval.addressDetails || null,
          propertyAddressDetails: data.aval.propertyAddressDetails || null,
        });

        // Load references
        if (data.aval.references && data.aval.references.length > 0) {
          setReferences(data.aval.references);
        }

        // Load commercial references if company
        if (data.aval.commercialReferences && data.aval.commercialReferences.length > 0) {
          setCommercialReferences(data.aval.commercialReferences);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Error al validar el acceso. Por favor, intente nuevamente.');
      setLoading(false);
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

  const updateReference = (index: number, field: string, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const updateCommercialReference = (index: number, field: string, value: any) => {
    const updated = [...commercialReferences];
    updated[index] = { ...updated[index], [field]: value };
    setCommercialReferences(updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation based on type
    if (formData.avalType === 'INDIVIDUAL') {
      if (!formData.fullName) newErrors.fullName = 'Nombre completo es requerido';
      if (formData.nationality === 'MEXICAN' && !formData.curp) {
        newErrors.curp = 'CURP es requerido para ciudadanos mexicanos';
      }
      if (formData.nationality === 'FOREIGN' && !formData.passport) {
        newErrors.passport = 'Pasaporte es requerido para extranjeros';
      }
    } else {
      // Company validation
      if (!formData.companyName) newErrors.companyName = 'Razón social es requerida';
      if (!formData.companyRfc) newErrors.companyRfc = 'RFC de la empresa es requerido';
      if (!formData.legalRepName) newErrors.legalRepName = 'Nombre del representante es requerido';
    }

    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.phone) newErrors.phone = 'Teléfono es requerido';

    // Property validation (required for aval)
    if (!formData.propertyAddress && !formData.propertyAddressDetails) {
      newErrors.propertyAddress = 'Dirección de la propiedad es requerida';
    }
    if (!formData.propertyValue || formData.propertyValue <= 0) {
      newErrors.propertyValue = 'Valor de la propiedad debe ser mayor a 0';
    }
    if (!formData.propertyDeedNumber) {
      newErrors.propertyDeedNumber = 'Número de escritura es requerido';
    }

    // RFC validation
    if (formData.rfc) {
      const rfcPattern = formData.avalType === 'COMPANY'
        ? /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/ // Company RFC
        : /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/; // Individual RFC

      if (!rfcPattern.test(formData.rfc)) {
        newErrors.rfc = formData.avalType === 'COMPANY'
          ? 'RFC de empresa inválido (formato: AAA123456XXX)'
          : 'RFC de persona física inválido (formato: AAAA123456XXX)';
      }
    }

    // CURP validation (for Mexican individuals)
    if (formData.curp) {
      const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
      if (!curpPattern.test(formData.curp)) {
        newErrors.curp = 'CURP inválido';
      }
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailPattern.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Phone validation (10 digits)
    if (formData.phone && formData.phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Teléfono debe tener 10 dígitos';
    }

    // Validate references
    if (formData.avalType === 'INDIVIDUAL') {
      references.forEach((ref, index) => {
        if (!ref.name || !ref.phone || !ref.relationship) {
          newErrors[`reference${index}`] = `Complete la referencia personal ${index + 1}`;
        }
      });
    } else {
      commercialReferences.forEach((ref, index) => {
        if (!ref.companyName || !ref.contactName || !ref.phone) {
          newErrors[`commercialReference${index}`] = `Complete la referencia comercial ${index + 1}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const submitData = {
        ...formData,
        references: formData.avalType === 'INDIVIDUAL' ? references : undefined,
        commercialReferences: formData.avalType === 'COMPANY' ? commercialReferences : undefined,
        informationComplete: true,
      };

      const response = await fetch(`/api/actor/aval/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save aval information');
      }

      setSuccessMessage('Información del aval guardada exitosamente');
      toast({
        title: "✓ Información guardada",
        description: "Tu información ha sido guardada exitosamente",
      });

      // Update local state to mark as complete
      setFormData(prev => ({ ...prev, informationComplete: true }));

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/success';
      }, 2000);
    } catch (error) {
      console.error('Error saving aval information:', error);
      toast({
        title: "Error",
        description: "Error al guardar la información. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    let filledFields = 0;
    let totalFields = 0;

    if (formData.avalType === 'INDIVIDUAL') {
      // Count individual fields
      ['fullName', 'email', 'phone', 'curp'].forEach(field => {
        totalFields++;
        if (formData[field as keyof AvalData]) filledFields++;
      });

      // Count employment fields
      ['occupation', 'employerName', 'monthlyIncome'].forEach(field => {
        totalFields++;
        if (formData[field as keyof AvalData]) filledFields++;
      });

      // Count references
      references.forEach(ref => {
        totalFields++;
        if (ref.name && ref.phone && ref.relationship) filledFields++;
      });
    } else {
      // Count company fields
      ['companyName', 'companyRfc', 'legalRepName', 'email', 'phone'].forEach(field => {
        totalFields++;
        if (formData[field as keyof AvalData]) filledFields++;
      });

      // Count commercial references
      commercialReferences.forEach(ref => {
        totalFields++;
        if (ref.companyName && ref.contactName && ref.phone) filledFields++;
      });
    }

    // Count property fields (required for aval)
    ['propertyAddress', 'propertyValue', 'propertyDeedNumber'].forEach(field => {
      totalFields++;
      if (formData[field as keyof AvalData]) filledFields++;
    });

    return Math.round((filledFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
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

  // If already completed
  if (formData.informationComplete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Información Completa</strong>
                <p className="mt-2">
                  Ya has completado tu información para esta póliza. Si necesitas hacer cambios,
                  por favor contacta a soporte en soporte@hestiaplp.com.mx
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = formData.avalType === 'INDIVIDUAL'
    ? [
        { id: 'personal', label: 'Información Personal', icon: User },
        { id: 'employment', label: 'Información Laboral', icon: Briefcase },
        { id: 'property', label: 'Propiedad en Garantía', icon: Shield },
        { id: 'references', label: 'Referencias', icon: Users },
        { id: 'documents', label: 'Documentos', icon: FileText },
      ]
    : [
        { id: 'company', label: 'Información Empresarial', icon: Building },
        { id: 'representative', label: 'Representante Legal', icon: User },
        { id: 'property', label: 'Propiedad en Garantía', icon: Shield },
        { id: 'references', label: 'Referencias Comerciales', icon: Users },
        { id: 'documents', label: 'Documentos', icon: FileText },
      ];

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Información del Aval</CardTitle>
          <CardDescription>
            Complete su información para la póliza de arrendamiento con garantía de propiedad
          </CardDescription>
          {policy && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Póliza:</strong> {policy.policyNumber}<br />
                <strong>Propiedad:</strong> {policy.propertyAddress}<br />
                <strong>Renta mensual:</strong> ${policy.rentAmount?.toLocaleString('es-MX')}
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

          {/* Type Selection */}
          <div className="mb-6 p-4 border rounded-lg">
            <Label className="text-base font-medium mb-3 block">Tipo de Aval</Label>
            <RadioGroup
              value={formData.avalType}
              onValueChange={(value) => {
                updateFormData('avalType', value);
                setCurrentTab(value === 'INDIVIDUAL' ? 'personal' : 'company');
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="INDIVIDUAL" id="individual" />
                <Label htmlFor="individual" className="cursor-pointer">
                  Persona Física
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="COMPANY" id="company" />
                <Label htmlFor="company" className="cursor-pointer">
                  Persona Moral (Empresa)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-5 w-full">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                  <tab.icon className="h-4 w-4" />
                </TabsTrigger>
              ))}
            </TabsList>

            {/* INDIVIDUAL TABS */}
            {formData.avalType === 'INDIVIDUAL' && (
              <>
                <TabsContent value="personal" className="space-y-4 mt-4">
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
                      <Label>Nacionalidad *</Label>
                      <RadioGroup
                        value={formData.nationality}
                        onValueChange={(value) => updateFormData('nationality', value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="MEXICAN" id="mexican" />
                          <Label htmlFor="mexican">Mexicana</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="FOREIGN" id="foreign" />
                          <Label htmlFor="foreign">Extranjera</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.nationality === 'MEXICAN' ? (
                      <div>
                        <Label htmlFor="curp">CURP *</Label>
                        <Input
                          id="curp"
                          value={formData.curp}
                          onChange={(e) => updateFormData('curp', e.target.value.toUpperCase())}
                          placeholder="AAAA000000AAAAAA00"
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
                        placeholder="AAAA123456XXX"
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

                    <div className="md:col-span-2">
                      <AddressAutocomplete
                        label="Dirección Actual"
                        value={formData.addressDetails}
                        onChange={(address) => {
                          updateFormData('addressDetails', address);
                          updateFormData('address', address.formattedAddress ||
                            `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.municipality}`);
                        }}
                        placeholder="Buscar dirección..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentTab('employment')}>
                      Siguiente
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employmentStatus">Situación Laboral</Label>
                      <Select
                        value={formData.employmentStatus}
                        onValueChange={(value) => updateFormData('employmentStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employed">Empleado</SelectItem>
                          <SelectItem value="self_employed">Trabajador Independiente</SelectItem>
                          <SelectItem value="business_owner">Dueño de Negocio</SelectItem>
                          <SelectItem value="retired">Jubilado</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="occupation">Ocupación</Label>
                      <Input
                        id="occupation"
                        value={formData.occupation}
                        onChange={(e) => updateFormData('occupation', e.target.value)}
                        placeholder="Ej: Ingeniero, Médico, Contador"
                      />
                    </div>

                    <div>
                      <Label htmlFor="employerName">Nombre del Empleador</Label>
                      <Input
                        id="employerName"
                        value={formData.employerName}
                        onChange={(e) => updateFormData('employerName', e.target.value)}
                        placeholder="Nombre de la empresa"
                      />
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
                      <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN)</Label>
                      <Input
                        id="monthlyIncome"
                        type="number"
                        value={formData.monthlyIncome}
                        onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="incomeSource">Fuente de Ingresos</Label>
                      <Input
                        id="incomeSource"
                        value={formData.incomeSource}
                        onChange={(e) => updateFormData('incomeSource', e.target.value)}
                        placeholder="Ej: Salario, Honorarios, Renta"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="employerAddress">Dirección del Empleador</Label>
                      <Input
                        id="employerAddress"
                        value={formData.employerAddress}
                        onChange={(e) => updateFormData('employerAddress', e.target.value)}
                        placeholder="Dirección completa"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentTab('personal')}>
                      Anterior
                    </Button>
                    <Button onClick={() => setCurrentTab('property')}>
                      Siguiente
                    </Button>
                  </div>
                </TabsContent>
              </>
            )}

            {/* COMPANY TABS */}
            {formData.avalType === 'COMPANY' && (
              <>
                <TabsContent value="company" className="space-y-4 mt-4">
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
                      <Label htmlFor="email">Email de Contacto *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder="contacto@empresa.com"
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

                    <div>
                      <Label htmlFor="workPhone">Teléfono Secundario</Label>
                      <Input
                        id="workPhone"
                        value={formData.workPhone}
                        onChange={(e) => updateFormData('workPhone', e.target.value)}
                        placeholder="10 dígitos"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <AddressAutocomplete
                        label="Dirección de la Empresa"
                        value={formData.addressDetails}
                        onChange={(address) => {
                          updateFormData('addressDetails', address);
                          updateFormData('address', address.formattedAddress ||
                            `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.municipality}`);
                        }}
                        placeholder="Buscar dirección..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentTab('representative')}>
                      Siguiente
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="representative" className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Información del representante legal de la empresa
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="legalRepName">Nombre del Representante Legal *</Label>
                      <Input
                        id="legalRepName"
                        value={formData.legalRepName}
                        onChange={(e) => updateFormData('legalRepName', e.target.value)}
                        placeholder="Nombre completo"
                        className={errors.legalRepName ? 'border-red-500' : ''}
                      />
                      {errors.legalRepName && <p className="text-red-500 text-sm mt-1">{errors.legalRepName}</p>}
                    </div>

                    <div>
                      <Label htmlFor="legalRepId">Identificación del Representante</Label>
                      <Input
                        id="legalRepId"
                        value={formData.legalRepId}
                        onChange={(e) => updateFormData('legalRepId', e.target.value)}
                        placeholder="INE o Pasaporte"
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalRepPosition">Cargo</Label>
                      <Input
                        id="legalRepPosition"
                        value={formData.legalRepPosition}
                        onChange={(e) => updateFormData('legalRepPosition', e.target.value)}
                        placeholder="Ej: Director General"
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalRepRfc">RFC del Representante</Label>
                      <Input
                        id="legalRepRfc"
                        value={formData.legalRepRfc}
                        onChange={(e) => updateFormData('legalRepRfc', e.target.value.toUpperCase())}
                        placeholder="AAAA123456XXX"
                        maxLength={13}
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalRepPhone">Teléfono del Representante</Label>
                      <Input
                        id="legalRepPhone"
                        value={formData.legalRepPhone}
                        onChange={(e) => updateFormData('legalRepPhone', e.target.value)}
                        placeholder="10 dígitos"
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalRepEmail">Email del Representante</Label>
                      <Input
                        id="legalRepEmail"
                        type="email"
                        value={formData.legalRepEmail}
                        onChange={(e) => updateFormData('legalRepEmail', e.target.value)}
                        placeholder="representante@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentTab('company')}>
                      Anterior
                    </Button>
                    <Button onClick={() => setCurrentTab('property')}>
                      Siguiente
                    </Button>
                  </div>
                </TabsContent>
              </>
            )}

            {/* PROPERTY TAB (shared between individual and company) */}
            <TabsContent value="property" className="space-y-4 mt-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Como aval, debe proporcionar información sobre la propiedad que será garantía del arrendamiento.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de la Propiedad en Garantía</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <AddressAutocomplete
                        label="Dirección de la Propiedad en Garantía *"
                        value={formData.propertyAddressDetails}
                        onChange={(address) => {
                          updateFormData('propertyAddressDetails', address);
                          updateFormData('propertyAddress', address.formattedAddress ||
                            `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.municipality}`);
                        }}
                        placeholder="Buscar dirección..."
                        className={errors.propertyAddress ? 'border-red-500' : ''}
                      />
                      {errors.propertyAddress && <p className="text-red-500 text-sm mt-1">{errors.propertyAddress}</p>}
                    </div>

                    <div>
                      <Label htmlFor="propertyType">Tipo de Propiedad</Label>
                      <Select
                        value={formData.propertyType}
                        onValueChange={(value) => updateFormData('propertyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="house">Casa</SelectItem>
                          <SelectItem value="apartment">Departamento</SelectItem>
                          <SelectItem value="land">Terreno</SelectItem>
                          <SelectItem value="commercial">Local Comercial</SelectItem>
                          <SelectItem value="office">Oficina</SelectItem>
                          <SelectItem value="warehouse">Bodega</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="propertyValue">Valor de la Propiedad (MXN) *</Label>
                      <Input
                        id="propertyValue"
                        type="number"
                        value={formData.propertyValue}
                        onChange={(e) => updateFormData('propertyValue', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        className={errors.propertyValue ? 'border-red-500' : ''}
                      />
                      {errors.propertyValue && <p className="text-red-500 text-sm mt-1">{errors.propertyValue}</p>}
                    </div>

                    <div>
                      <Label htmlFor="propertyDeedNumber">Número de Escritura *</Label>
                      <Input
                        id="propertyDeedNumber"
                        value={formData.propertyDeedNumber}
                        onChange={(e) => updateFormData('propertyDeedNumber', e.target.value)}
                        placeholder="Número de escritura pública"
                        className={errors.propertyDeedNumber ? 'border-red-500' : ''}
                      />
                      {errors.propertyDeedNumber && <p className="text-red-500 text-sm mt-1">{errors.propertyDeedNumber}</p>}
                    </div>

                    <div>
                      <Label htmlFor="propertyRegistry">Folio del Registro Público</Label>
                      <Input
                        id="propertyRegistry"
                        value={formData.propertyRegistry}
                        onChange={(e) => updateFormData('propertyRegistry', e.target.value)}
                        placeholder="Folio real o partida registral"
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertySurface">Superficie (m²)</Label>
                      <Input
                        id="propertySurface"
                        type="number"
                        value={formData.propertySurface}
                        onChange={(e) => updateFormData('propertySurface', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertyOwnershipPercentage">Porcentaje de Propiedad (%)</Label>
                      <Input
                        id="propertyOwnershipPercentage"
                        type="number"
                        value={formData.propertyOwnershipPercentage}
                        onChange={(e) => updateFormData('propertyOwnershipPercentage', parseFloat(e.target.value) || 100)}
                        placeholder="100"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="propertyDescription">Descripción de la Propiedad</Label>
                      <Input
                        id="propertyDescription"
                        value={formData.propertyDescription}
                        onChange={(e) => updateFormData('propertyDescription', e.target.value)}
                        placeholder="Breve descripción de la propiedad"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentTab(formData.avalType === 'INDIVIDUAL' ? 'employment' : 'representative')}
                >
                  Anterior
                </Button>
                <Button onClick={() => setCurrentTab('references')}>
                  Siguiente
                </Button>
              </div>
            </TabsContent>

            {/* REFERENCES TAB - Individual */}
            {formData.avalType === 'INDIVIDUAL' && (
              <TabsContent value="references" className="space-y-4 mt-4">
                <Alert>
                  <AlertDescription>
                    Por favor proporcione 3 referencias personales (no familiares directos).
                  </AlertDescription>
                </Alert>

                {references.map((ref, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">Referencia Personal {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre Completo *</Label>
                          <Input
                            value={ref.name}
                            onChange={(e) => updateReference(index, 'name', e.target.value)}
                            placeholder="Nombre completo"
                          />
                        </div>

                        <div>
                          <Label>Relación *</Label>
                          <Input
                            value={ref.relationship}
                            onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                            placeholder="Ej: Amigo, Compañero de trabajo"
                          />
                        </div>

                        <div>
                          <Label>Teléfono *</Label>
                          <Input
                            value={ref.phone}
                            onChange={(e) => updateReference(index, 'phone', e.target.value)}
                            placeholder="10 dígitos"
                          />
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
                          <Label>Ocupación</Label>
                          <Input
                            value={ref.occupation}
                            onChange={(e) => updateReference(index, 'occupation', e.target.value)}
                            placeholder="Profesión u ocupación"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentTab('property')}>
                    Anterior
                  </Button>
                  <Button onClick={() => setCurrentTab('documents')}>
                    Siguiente
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* REFERENCES TAB - Company */}
            {formData.avalType === 'COMPANY' && (
              <TabsContent value="references" className="space-y-4 mt-4">
                <Alert>
                  <AlertDescription>
                    Por favor proporcione 3 referencias comerciales.
                  </AlertDescription>
                </Alert>

                {commercialReferences.map((ref, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">Referencia Comercial {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre de la Empresa *</Label>
                          <Input
                            value={ref.companyName}
                            onChange={(e) => updateCommercialReference(index, 'companyName', e.target.value)}
                            placeholder="Razón social"
                          />
                        </div>

                        <div>
                          <Label>Nombre del Contacto *</Label>
                          <Input
                            value={ref.contactName}
                            onChange={(e) => updateCommercialReference(index, 'contactName', e.target.value)}
                            placeholder="Nombre completo"
                          />
                        </div>

                        <div>
                          <Label>Teléfono *</Label>
                          <Input
                            value={ref.phone}
                            onChange={(e) => updateCommercialReference(index, 'phone', e.target.value)}
                            placeholder="10 dígitos"
                          />
                        </div>

                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={ref.email}
                            onChange={(e) => updateCommercialReference(index, 'email', e.target.value)}
                            placeholder="contacto@empresa.com"
                          />
                        </div>

                        <div>
                          <Label>Relación Comercial</Label>
                          <Select
                            value={ref.relationship}
                            onValueChange={(value) => updateCommercialReference(index, 'relationship', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supplier">Proveedor</SelectItem>
                              <SelectItem value="client">Cliente</SelectItem>
                              <SelectItem value="partner">Socio Comercial</SelectItem>
                              <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Años de Relación</Label>
                          <Input
                            type="number"
                            value={ref.yearsOfRelationship}
                            onChange={(e) => updateCommercialReference(index, 'yearsOfRelationship', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentTab('property')}>
                    Anterior
                  </Button>
                  <Button onClick={() => setCurrentTab('documents')}>
                    Siguiente
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* DOCUMENTS TAB (shared) */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Los documentos se pueden cargar después de guardar la información.
                  Por ahora, complete y guarde su información básica.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documentos Requeridos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.avalType === 'INDIVIDUAL' ? (
                      <ul className="space-y-2 text-sm">
                        <li>• Identificación oficial (INE o Pasaporte)</li>
                        <li>• Comprobante de ingresos (últimos 3 meses)</li>
                        <li>• Comprobante de domicilio (no mayor a 3 meses)</li>
                        <li>• Estados de cuenta bancarios (últimos 3 meses)</li>
                        <li>• <strong>Escritura de la propiedad en garantía</strong></li>
                        <li>• <strong>Boleta predial de la propiedad</strong></li>
                        <li>• <strong>Certificado de libertad de gravamen</strong></li>
                        {formData.nationality === 'FOREIGN' && (
                          <li>• Documento migratorio vigente</li>
                        )}
                      </ul>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        <li>• Acta constitutiva de la empresa</li>
                        <li>• Poder notarial del representante legal</li>
                        <li>• Identificación oficial del representante</li>
                        <li>• Constancia de situación fiscal</li>
                        <li>• Estados financieros (últimos 2 años)</li>
                        <li>• Estados de cuenta bancarios (últimos 6 meses)</li>
                        <li>• Comprobante de domicilio fiscal</li>
                        <li>• <strong>Escritura de la propiedad en garantía</strong></li>
                        <li>• <strong>Boleta predial de la propiedad</strong></li>
                        <li>• <strong>Certificado de libertad de gravamen</strong></li>
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentTab('references')}
                >
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
                La información del aval está completa
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}