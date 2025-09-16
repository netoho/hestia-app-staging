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
import { ArrowLeft, Save, CheckCircle2, AlertCircle, User, Briefcase, Users } from 'lucide-react';
import { jointObligorSchema, personalReferenceSchema } from '@/lib/validations/policy';
import { z } from 'zod';

interface JointObligorData {
  fullName: string;
  email: string;
  phone: string;
  nationality: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  rfc?: string;
  passport?: string;
  address?: string;
  employmentStatus: string;
  occupation: string;
  companyName: string;
  position: string;
  monthlyIncome: number;
  incomeSource: string;
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

export default function JointObligorEditPage({
  params
}: {
  params: Promise<{ id: string; actorId: string }>
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [policyId, setPolicyId] = useState<string>('');
  const [actorId, setActorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [policyInfo, setPolicyInfo] = useState<{ policyNumber: string; propertyAddress: string } | null>(null);

  const [formData, setFormData] = useState<JointObligorData>({
    fullName: '',
    email: '',
    phone: '',
    nationality: 'MEXICAN',
    curp: '',
    rfc: '',
    passport: '',
    address: '',
    employmentStatus: '',
    occupation: '',
    companyName: '',
    position: '',
    monthlyIncome: 0,
    incomeSource: '',
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
      setActorId(resolvedParams.actorId);
    });
  }, [params]);

  // Fetch joint obligor data
  useEffect(() => {
    if (policyId && actorId) {
      fetchJointObligorData();
    }
  }, [policyId, actorId]);

  const fetchJointObligorData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/joint-obligor/${actorId}`);
      if (!response.ok) throw new Error('Failed to fetch joint obligor');

      const data = await response.json();

      if (data.success && data.data) {
        const jointObligor = data.data;
        setFormData({
          fullName: jointObligor.fullName || '',
          email: jointObligor.email || '',
          phone: jointObligor.phone || '',
          nationality: jointObligor.nationality || 'MEXICAN',
          curp: jointObligor.curp || '',
          rfc: jointObligor.rfc || '',
          passport: jointObligor.passport || '',
          address: jointObligor.address || '',
          employmentStatus: jointObligor.employmentStatus || '',
          occupation: jointObligor.occupation || '',
          companyName: jointObligor.companyName || '',
          position: jointObligor.position || '',
          monthlyIncome: jointObligor.monthlyIncome || 0,
          incomeSource: jointObligor.incomeSource || '',
          informationComplete: jointObligor.informationComplete || false,
          additionalInfo: jointObligor.additionalInfo || '',
        });
        setReferences(jointObligor.references || []);
        setPolicyInfo({
          policyNumber: data.policyNumber || '',
          propertyAddress: data.propertyAddress || ''
        });
      }
    } catch (error) {
      console.error('Error fetching joint obligor:', error);
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
    setErrors({});
    try {
      jointObligorSchema.parse(formData);

      // Validate references
      if (references.length < 3) {
        throw new Error('Se requieren al menos 3 referencias');
      }

      const refErrors: Record<string, string> = {};

      references.forEach((ref, index) => {
        const referencesResult = personalReferenceSchema.safeParse(ref);
        if(!referencesResult.success){
          referencesResult.error.issues.forEach(error => {
            const path = error.path.join('.');
            refErrors[`ref_${index}_${path}`] = error.message;
          });
        }
      })

      if (Object.keys(refErrors).length > 0) {
        setErrors(prev => {
          return {
            ...prev,
            ...refErrors
          }
        })
        return false;
      }

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
      if (errorKeys.some(key => ['fullName', 'email', 'phone', 'nationality', 'curp', 'passport'].includes(key))) {
        setCurrentTab('personal');
      } else if (errorKeys.some(key => ['employmentStatus', 'occupation', 'companyName', 'position', 'monthlyIncome'].includes(key))) {
        setCurrentTab('employment');
      } else if (errorKeys.some(key => key.startsWith('ref_'))) {
        setCurrentTab('references');
      }
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/policies/${policyId}/joint-obligor/${actorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          informationComplete: true,
          references,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save joint obligor information');
      }

      setSuccessMessage('Información del obligado solidario guardada exitosamente');
      setFormData(prev => ({ ...prev, informationComplete: true }));

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/dashboard/policies/${policyId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving joint obligor information:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la información');
    } finally {
      setSaving(false);
    }
  };

  const getProgress = () => {
    let filledFields = 0;
    let totalFields = 0;

    // Count basic fields
    ['fullName', 'email', 'phone', 'nationality', 'employmentStatus', 'occupation', 'companyName', 'position'].forEach(field => {
      totalFields++;
      if (formData[field as keyof JointObligorData]) filledFields++;
    });

    if (formData.nationality === 'MEXICAN' && formData.curp) filledFields++;
    if (formData.nationality === 'FOREIGN' && formData.passport) filledFields++;
    totalFields++;

    if (formData.monthlyIncome && formData.monthlyIncome > 0) filledFields++;
    if (formData.incomeSource) filledFields++;
    totalFields += 2;

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
          <CardTitle>Información del Obligado Solidario</CardTitle>
          <CardDescription>
            Editar la información del obligado solidario para la póliza
          </CardDescription>
          {policyInfo && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Póliza:</strong> {policyInfo.policyNumber}<br />
                <strong>Propiedad:</strong> {policyInfo.propertyAddress}
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

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="employment">
                <Briefcase className="h-4 w-4 mr-2" />
                Laboral
              </TabsTrigger>
              <TabsTrigger value="references">
                <Users className="h-4 w-4 mr-2" />
                Referencias
              </TabsTrigger>
            </TabsList>

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
                  />
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
                  <p>{formData.phone}</p>
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
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="Dirección completa (opcional)"
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
                  <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    placeholder="Donde trabaja actualmente"
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                </div>

                <div>
                  <Label htmlFor="position">Puesto *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => updateFormData('position', e.target.value)}
                    placeholder="Cargo actual"
                    className={errors.position ? 'border-red-500' : ''}
                  />
                  {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position}</p>}
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
                  <Label htmlFor="incomeSource">Fuente de Ingreso *</Label>
                  <Select
                    value={formData.incomeSource}
                    onValueChange={(value) => updateFormData('incomeSource', value)}
                  >
                    <SelectTrigger className={errors.incomeSource ? 'border-red-500' : ''}>
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
                  {errors.incomeSource && <p className="text-red-500 text-sm mt-1">{errors.incomeSource}</p>}
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
                <Button variant="outline" onClick={() => setCurrentTab('employment')}>
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
                La información del obligado solidario está completa
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
