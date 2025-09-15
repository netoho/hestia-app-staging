'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  User,
  Briefcase,
  Users,
  FileText,
  Home,
  Loader2
} from 'lucide-react';
import {
  NationalityType,
  DocumentCategory,
  PersonalReference
} from '@/types/policy';

interface ActorInfo {
  type: 'tenant' | 'joint_obligor' | 'aval';
  policyNumber: string;
  propertyAddress: string;
  status: 'pending' | 'completed';
}

export default function ActorFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [actorInfo, setActorInfo] = useState<ActorInfo | null>(null);
  const [currentStep, setCurrentStep] = useState('personal');

  // Form data
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationality: NationalityType.MEXICAN,
    curp: '',
    passport: '',
    address: '',
  });

  const [employmentInfo, setEmploymentInfo] = useState({
    employmentStatus: '',
    occupation: '',
    companyName: '',
    position: '',
    monthlyIncome: 0,
    incomeSource: '',
  });

  const [references, setReferences] = useState<PersonalReference[]>([
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
    { name: '', phone: '', email: '', relationship: '', occupation: '' },
  ]);

  const [propertyGuarantee, setPropertyGuarantee] = useState({
    propertyAddress: '',
    propertyValue: 0,
    propertyDeedNumber: '',
    propertyRegistry: '',
  });

  const [documents, setDocuments] = useState<{
    identification: File[];
    income: File[];
    address: File[];
    property: File[];
    other: File[];
  }>({
    identification: [],
    income: [],
    address: [],
    property: [],
    other: [],
  });

  // Load actor data
  useEffect(() => {
    loadActorData();
  }, [token]);

  const loadActorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/actors/public/${token}`);

      if (!response.ok) {
        throw new Error('Invalid or expired link');
      }

      const data = await response.json();
      setActorInfo(data.actorInfo);

      // Pre-fill any existing data
      if (data.existingData) {
        if (data.existingData.personalInfo) {
          setPersonalInfo(prev => ({ ...prev, ...data.existingData.personalInfo }));
        }
        if (data.existingData.employmentInfo) {
          setEmploymentInfo(prev => ({ ...prev, ...data.existingData.employmentInfo }));
        }
        if (data.existingData.references) {
          setReferences(data.existingData.references);
        }
        if (data.existingData.propertyGuarantee) {
          setPropertyGuarantee(prev => ({ ...prev, ...data.existingData.propertyGuarantee }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (category: keyof typeof documents, files: FileList | null) => {
    if (files) {
      setDocuments(prev => ({
        ...prev,
        [category]: Array.from(files),
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const formData = new FormData();

      // Add text data
      formData.append('personalInfo', JSON.stringify(personalInfo));
      formData.append('employmentInfo', JSON.stringify(employmentInfo));
      formData.append('references', JSON.stringify(references));

      if (actorInfo?.type === 'aval') {
        formData.append('propertyGuarantee', JSON.stringify(propertyGuarantee));
      }

      // Add files
      Object.entries(documents).forEach(([category, files]) => {
        files.forEach(file => {
          formData.append(`documents_${category}`, file);
        });
      });

      const response = await fetch(`/api/actors/public/${token}/submit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit form');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/policy/success');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const validateStep = (step: string): boolean => {
    switch (step) {
      case 'personal':
        return !!(
          personalInfo.fullName &&
          personalInfo.email &&
          personalInfo.phone &&
          ((personalInfo.nationality === NationalityType.MEXICAN && personalInfo.curp) ||
           (personalInfo.nationality === NationalityType.FOREIGN && personalInfo.passport))
        );
      case 'employment':
        return !!(
          employmentInfo.employmentStatus &&
          employmentInfo.occupation &&
          employmentInfo.companyName &&
          employmentInfo.monthlyIncome > 0
        );
      case 'references':
        return references.every(ref => ref.name && ref.phone && ref.relationship);
      case 'property':
        return !!(
          propertyGuarantee.propertyAddress &&
          propertyGuarantee.propertyValue > 0
        );
      case 'documents':
        return documents.identification.length > 0 && documents.income.length > 0;
      default:
        return true;
    }
  };

  const getStepProgress = (): number => {
    const steps = ['personal', 'employment', 'references'];
    if (actorInfo?.type === 'aval') {
      steps.push('property');
    }
    steps.push('documents');

    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !actorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>¡Información Enviada!</AlertTitle>
          <AlertDescription>
            Tu información ha sido enviada exitosamente. Serás redirigido en unos momentos...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const actorTypeNames = {
    'tenant': 'Inquilino',
    'joint_obligor': 'Obligado Solidario',
    'aval': 'Aval'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Formulario de {actorInfo ? actorTypeNames[actorInfo.type] : 'Actor'}
          </h1>
          <p className="text-gray-600">
            Póliza: {actorInfo?.policyNumber} | Propiedad: {actorInfo?.propertyAddress}
          </p>
          <Progress value={getStepProgress()} className="mt-4" />
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Completa tu Información</CardTitle>
            <CardDescription>
              Por favor completa todos los campos requeridos para continuar con el proceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentStep} onValueChange={setCurrentStep}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-5 mb-8">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Empleo</span>
                </TabsTrigger>
                <TabsTrigger value="references" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Referencias</span>
                </TabsTrigger>
                {actorInfo?.type === 'aval' && (
                  <TabsTrigger value="property" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Garantía</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Documentos</span>
                </TabsTrigger>
              </TabsList>

              {/* Personal Information */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="fullName">Nombre Completo *</Label>
                    <Input
                      id="fullName"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Correo Electrónico *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Nacionalidad *</Label>
                    <RadioGroup
                      value={personalInfo.nationality}
                      onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, nationality: value as NationalityType }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={NationalityType.MEXICAN} id="mexican" />
                        <Label htmlFor="mexican">Mexicana</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={NationalityType.FOREIGN} id="foreign" />
                        <Label htmlFor="foreign">Extranjera</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {personalInfo.nationality === NationalityType.MEXICAN ? (
                    <div>
                      <Label htmlFor="curp">CURP *</Label>
                      <Input
                        id="curp"
                        value={personalInfo.curp}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, curp: e.target.value }))}
                        maxLength={18}
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="passport">Número de Pasaporte *</Label>
                      <Input
                        id="passport"
                        value={personalInfo.passport}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, passport: e.target.value }))}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      value={personalInfo.address}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Employment Information */}
              <TabsContent value="employment" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="employmentStatus">Situación Laboral *</Label>
                    <Select
                      value={employmentInfo.employmentStatus}
                      onValueChange={(value) => setEmploymentInfo(prev => ({ ...prev, employmentStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Empleado</SelectItem>
                        <SelectItem value="self-employed">Autoempleado</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="business-owner">Dueño de Negocio</SelectItem>
                        <SelectItem value="retired">Jubilado</SelectItem>
                        <SelectItem value="student">Estudiante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="occupation">Ocupación *</Label>
                      <Input
                        id="occupation"
                        value={employmentInfo.occupation}
                        onChange={(e) => setEmploymentInfo(prev => ({ ...prev, occupation: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Puesto *</Label>
                      <Input
                        id="position"
                        value={employmentInfo.position}
                        onChange={(e) => setEmploymentInfo(prev => ({ ...prev, position: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                    <Input
                      id="companyName"
                      value={employmentInfo.companyName}
                      onChange={(e) => setEmploymentInfo(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN) *</Label>
                      <Input
                        id="monthlyIncome"
                        type="number"
                        value={employmentInfo.monthlyIncome}
                        onChange={(e) => setEmploymentInfo(prev => ({ ...prev, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="incomeSource">Fuente de Ingresos *</Label>
                      <Select
                        value={employmentInfo.incomeSource}
                        onValueChange={(value) => setEmploymentInfo(prev => ({ ...prev, incomeSource: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">Salario</SelectItem>
                          <SelectItem value="business">Negocio Propio</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="investments">Inversiones</SelectItem>
                          <SelectItem value="pension">Pensión</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* References */}
              <TabsContent value="references" className="space-y-4">
                <div className="space-y-6">
                  {references.map((ref, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">Referencia #{index + 1} *</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div>
                          <Label>Nombre Completo *</Label>
                          <Input
                            value={ref.name}
                            onChange={(e) => {
                              const newRefs = [...references];
                              newRefs[index].name = e.target.value;
                              setReferences(newRefs);
                            }}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Teléfono *</Label>
                            <Input
                              type="tel"
                              value={ref.phone}
                              onChange={(e) => {
                                const newRefs = [...references];
                                newRefs[index].phone = e.target.value;
                                setReferences(newRefs);
                              }}
                              required
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={ref.email || ''}
                              onChange={(e) => {
                                const newRefs = [...references];
                                newRefs[index].email = e.target.value;
                                setReferences(newRefs);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Relación *</Label>
                            <Select
                              value={ref.relationship}
                              onValueChange={(value) => {
                                const newRefs = [...references];
                                newRefs[index].relationship = value;
                                setReferences(newRefs);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="family">Familiar</SelectItem>
                                <SelectItem value="friend">Amigo</SelectItem>
                                <SelectItem value="colleague">Colega</SelectItem>
                                <SelectItem value="business">Socio de Negocios</SelectItem>
                                <SelectItem value="other">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Ocupación</Label>
                            <Input
                              value={ref.occupation || ''}
                              onChange={(e) => {
                                const newRefs = [...references];
                                newRefs[index].occupation = e.target.value;
                                setReferences(newRefs);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Property Guarantee (Aval only) */}
              {actorInfo?.type === 'aval' && (
                <TabsContent value="property" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="propertyAddress">Dirección de la Propiedad en Garantía *</Label>
                      <Textarea
                        id="propertyAddress"
                        value={propertyGuarantee.propertyAddress}
                        onChange={(e) => setPropertyGuarantee(prev => ({ ...prev, propertyAddress: e.target.value }))}
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertyValue">Valor de la Propiedad (MXN) *</Label>
                      <Input
                        id="propertyValue"
                        type="number"
                        value={propertyGuarantee.propertyValue}
                        onChange={(e) => setPropertyGuarantee(prev => ({ ...prev, propertyValue: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="propertyDeedNumber">Número de Escritura</Label>
                        <Input
                          id="propertyDeedNumber"
                          value={propertyGuarantee.propertyDeedNumber}
                          onChange={(e) => setPropertyGuarantee(prev => ({ ...prev, propertyDeedNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="propertyRegistry">Registro Público</Label>
                        <Input
                          id="propertyRegistry"
                          value={propertyGuarantee.propertyRegistry}
                          onChange={(e) => setPropertyGuarantee(prev => ({ ...prev, propertyRegistry: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Documents */}
              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <Label>Identificación Oficial *</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('identification', e.target.files)}
                      />
                      <p className="text-sm text-gray-500 mt-1">INE, pasaporte o documento oficial</p>
                    </div>
                  </div>

                  <div>
                    <Label>Comprobantes de Ingresos *</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('income', e.target.files)}
                      />
                      <p className="text-sm text-gray-500 mt-1">Últimos 3 recibos de nómina o estados de cuenta</p>
                    </div>
                  </div>

                  <div>
                    <Label>Comprobante de Domicilio</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('address', e.target.files)}
                      />
                      <p className="text-sm text-gray-500 mt-1">Recibo de luz, agua, teléfono, etc.</p>
                    </div>
                  </div>

                  {actorInfo?.type === 'aval' && (
                    <div>
                      <Label>Documentos de la Propiedad en Garantía</Label>
                      <div className="mt-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => handleFileUpload('property', e.target.files)}
                        />
                        <p className="text-sm text-gray-500 mt-1">Escrituras, predial, etc.</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Otros Documentos</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileUpload('other', e.target.files)}
                      />
                      <p className="text-sm text-gray-500 mt-1">Cualquier documento adicional relevante</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => {
                  const steps = ['personal', 'employment', 'references'];
                  if (actorInfo?.type === 'aval') steps.push('property');
                  steps.push('documents');

                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1]);
                  }
                }}
                disabled={currentStep === 'personal'}
              >
                Anterior
              </Button>

              {currentStep === 'documents' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateStep(currentStep) || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Información'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const steps = ['personal', 'employment', 'references'];
                    if (actorInfo?.type === 'aval') steps.push('property');
                    steps.push('documents');

                    const currentIndex = steps.indexOf(currentStep);
                    if (currentIndex < steps.length - 1) {
                      setCurrentStep(steps[currentIndex + 1]);
                    }
                  }}
                  disabled={!validateStep(currentStep)}
                >
                  Siguiente
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}