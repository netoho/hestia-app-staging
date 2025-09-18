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
import { ArrowLeft, Save, CheckCircle2, AlertCircle, User, Briefcase, Building, CreditCard, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface LandlordData {
  // Basic Information
  isCompany: boolean;
  fullName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;

  // Bank Information
  bankName?: string;
  accountNumber?: string;
  clabe?: string;

  // Work Information (for individuals)
  occupation?: string;
  companyName?: string;
  monthlyIncome?: number;

  // Status
  informationComplete: boolean;
}

interface PolicyData {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  status: string;
  landlord?: LandlordData;
}

export default function LandlordInformationPage({
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

  const [formData, setFormData] = useState<LandlordData>({
    isCompany: false,
    fullName: '',
    rfc: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    clabe: '',
    occupation: '',
    companyName: '',
    monthlyIncome: 0,
    informationComplete: false,
  });

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  // Fetch policy and landlord data
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
      setPolicy(data.data);

      // If landlord data exists, populate the form
      if (data.data.landlord) {
        setFormData({
          ...formData,
          ...data.data.landlord,
        });
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.fullName) newErrors.fullName = 'Nombre completo es requerido';
    if (!formData.rfc) newErrors.rfc = 'RFC es requerido';
    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.phone) newErrors.phone = 'Teléfono es requerido';
    if (!formData.address) newErrors.address = 'Dirección es requerida';

    // RFC validation
    const rfcPattern = formData.isCompany
      ? /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/ // Company RFC
      : /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/; // Individual RFC

    if (formData.rfc && !rfcPattern.test(formData.rfc)) {
      newErrors.rfc = formData.isCompany
        ? 'RFC de empresa inválido (formato: AAA123456XXX)'
        : 'RFC de persona física inválido (formato: AAAA123456XXX)';
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

    // CLABE validation (18 digits)
    if (formData.clabe && formData.clabe.replace(/\D/g, '').length !== 18) {
      newErrors.clabe = 'CLABE debe tener 18 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      // Find the first tab with errors
      if (errors.fullName || errors.rfc || errors.email || errors.phone || errors.address) {
        setCurrentTab('personal');
      } else if (errors.bankName || errors.accountNumber || errors.clabe) {
        setCurrentTab('bank');
      }
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/policies/${policyId}/landlord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          informationComplete: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save landlord information');
      }

      setSuccessMessage('Información del arrendador guardada exitosamente');

      // Update local state to mark as complete
      setFormData(prev => ({ ...prev, informationComplete: true }));

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/dashboard/policies/${policyId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving landlord information:', error);
      alert('Error al guardar la información. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    let filledFields = 0;
    let totalFields = 0;

    // Count basic fields
    ['fullName', 'rfc', 'email', 'phone', 'address'].forEach(field => {
      totalFields++;
      if (formData[field as keyof LandlordData]) filledFields++;
    });

    // Count bank fields (optional but counted for progress)
    ['bankName', 'clabe'].forEach(field => {
      totalFields++;
      if (formData[field as keyof LandlordData]) filledFields++;
    });

    // Count work fields for individuals
    if (!formData.isCompany) {
      ['occupation', 'companyName'].forEach(field => {
        totalFields++;
        if (formData[field as keyof LandlordData]) filledFields++;
      });
      totalFields++;
      if (formData.monthlyIncome && formData.monthlyIncome > 0) filledFields++;
    }

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

  const tabs = [
    { id: 'personal', label: 'Información Personal', icon: User },
    { id: 'bank', label: 'Información Bancaria', icon: CreditCard },
    ...(formData.isCompany ? [] : [{ id: 'work', label: 'Información Laboral', icon: Briefcase }]),
  ];

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
          <CardTitle>Información del Arrendador</CardTitle>
          <CardDescription>
            Complete la información del propietario del inmueble
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

          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isCompany"
                checked={formData.isCompany}
                onCheckedChange={(checked) => updateFormData('isCompany', checked)}
              />
              <Label htmlFor="isCompany" className="font-medium">
                El arrendador es una empresa
              </Label>
            </div>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="fullName">
                    {formData.isCompany ? 'Razón Social' : 'Nombre Completo'} *
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    placeholder={formData.isCompany ? 'Nombre de la empresa' : 'Nombre(s) y Apellidos'}
                    className={errors.fullName ? 'border-red-500' : ''}
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <Label htmlFor="rfc">RFC *</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => updateFormData('rfc', e.target.value.toUpperCase())}
                    placeholder={formData.isCompany ? 'AAA123456XXX' : 'AAAA123456XXX'}
                    maxLength={formData.isCompany ? 12 : 13}
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
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="Calle, Número, Colonia, Ciudad, Estado"
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentTab('bank')}>
                  Siguiente
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  La información bancaria es opcional pero recomendada para facilitar los pagos.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankName">Banco</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => updateFormData('bankName', e.target.value)}
                    placeholder="Nombre del banco"
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber">Número de Cuenta</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => updateFormData('accountNumber', e.target.value)}
                    placeholder="Número de cuenta bancaria"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="clabe">CLABE Interbancaria</Label>
                  <Input
                    id="clabe"
                    value={formData.clabe}
                    onChange={(e) => updateFormData('clabe', e.target.value)}
                    placeholder="18 dígitos"
                    maxLength={18}
                    className={errors.clabe ? 'border-red-500' : ''}
                  />
                  {errors.clabe && <p className="text-red-500 text-sm mt-1">{errors.clabe}</p>}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentTab('personal')}>
                  Anterior
                </Button>
                {formData.isCompany ? (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Información'}
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentTab('work')}>
                    Siguiente
                  </Button>
                )}
              </div>
            </TabsContent>

            {!formData.isCompany && (
              <TabsContent value="work" className="space-y-4 mt-4">
                <Alert>
                  <AlertDescription>
                    La información laboral es opcional para personas físicas.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="occupation">Ocupación</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => updateFormData('occupation', e.target.value)}
                      placeholder="Ej: Ingeniero, Médico, Empresario"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyName">Empresa</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => updateFormData('companyName', e.target.value)}
                      placeholder="Nombre de la empresa donde trabaja"
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
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentTab('bank')}>
                    Anterior
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Información'}
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {formData.informationComplete && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                La información del arrendador está completa
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}