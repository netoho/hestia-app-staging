'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Upload, User, Briefcase, Users, FileText, Send, Plus, Trash2 } from 'lucide-react';

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

  // Upload status tracking
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [existingDocuments, setExistingDocuments] = useState<Record<string, any>>({});

  // Load existing documents on mount
  useEffect(() => {
    if (token && actorType) {
      loadExistingDocuments();
    }
  }, [token, actorType]);

  const loadExistingDocuments = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/actor/${actorType}/${token}/documents`);
      const result = await response.json();

      if (result.success && result.data.documents) {
        const docsMap: Record<string, any> = {};
        const statusMap: Record<string, 'success'> = {};

        result.data.documents.forEach((doc: any) => {
          // Map document type to our form field names
          const fieldName = mapDocumentTypeToField(doc.documentType);
          if (fieldName) {
            docsMap[fieldName] = doc;
            statusMap[fieldName] = 'success';
          }
        });

        setExistingDocuments(docsMap);
        setUploadStatus(prev => ({ ...prev, ...statusMap }));
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  const mapDocumentTypeToField = (docType: string): string | null => {
    const mapping: Record<string, string> = {
      'identification': 'identification',
      'income_proof': 'incomeProof',
      'address_proof': 'addressProof',
      'property_deed': 'propertyDeed',
    };
    return mapping[docType] || null;
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
    const newReferences = [...formData.references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setFormData(prev => ({ ...prev, references: newReferences }));
  };

  const addReference = () => {
    if (formData.references.length < 5) {
      setFormData(prev => ({
        ...prev,
        references: [
          ...prev.references,
          { name: '', phone: '', email: '', relationship: '', occupation: '' }
        ]
      }));
    }
  };

  const removeReference = (index: number) => {
    if (formData.references.length > 3) {
      setFormData(prev => ({
        ...prev,
        references: prev.references.filter((_, i) => i !== index)
      }));
      // Clear any errors for this reference
      const newErrors = { ...errors };
      delete newErrors[`ref_${index}_name`];
      delete newErrors[`ref_${index}_phone`];
      delete newErrors[`ref_${index}_relationship`];
      setErrors(newErrors);
    }
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

  const uploadDocument = async (file: File, documentType: string, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('category', category);

    setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    try {
      const response = await fetch(`/api/actor/${actorType}/${token}/documents`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
      return true;
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: error instanceof Error ? error.message : 'Upload failed',
      }));
      return false;
    }
  };

  const handleDocumentChange = async (documentType: string, category: string, file: File | null) => {
    if (!file) return;

    // Validate file immediately
    const validation = validateFileClient(file);
    if (!validation.valid) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: validation.error || 'Invalid file',
      }));
      return;
    }

    // Clear previous errors
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    // Store file for later upload or immediate upload
    setDocuments(prev => ({ ...prev, [documentType]: file }));

    // Upload immediately
    await uploadDocument(file, documentType, category);
  };


  const validateFileClient = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${maxSize / (1024 * 1024)}MB`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Use PDF o imágenes (JPG, PNG)',
      };
    }

    return { valid: true };
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
      // First submit the form data
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

      // Then upload any documents that were selected
      const uploadPromises: Promise<boolean>[] = [];

      if (documents.identification) {
        uploadPromises.push(uploadDocument(documents.identification, 'identification', 'identification'));
      }
      if (documents.incomeProof) {
        uploadPromises.push(uploadDocument(documents.incomeProof, 'income_proof', 'income_proof'));
      }
      if (documents.addressProof) {
        uploadPromises.push(uploadDocument(documents.addressProof, 'address_proof', 'address_proof'));
      }
      if (actorType === 'aval' && documents.propertyDeed) {
        uploadPromises.push(uploadDocument(documents.propertyDeed, 'property_deed', 'property_deed'));
      }

      // Wait for all uploads to complete
      if (uploadPromises.length > 0) {
        const uploadResults = await Promise.all(uploadPromises);
        const allUploadsSuccessful = uploadResults.every(result => result);

        if (!allUploadsSuccessful) {
          console.warn('Some documents failed to upload, but form was submitted successfully');
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
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Proporcione información de 3 a 5 referencias personales (no familiares directos)
              </p>
              {formData.references.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReference}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Referencia
                </Button>
              )}
            </div>

            {formData.references.map((ref, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Referencia {index + 1} *</CardTitle>
                  {formData.references.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReference(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
                      if (file) {
                        handleDocumentChange('identification', 'identification', file);
                      }
                    }}
                  />
                  {documents.identification && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.identification.name}
                    </p>
                  )}
                  {existingDocuments.identification && !documents.identification && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {existingDocuments.identification.fileName} (subido previamente)
                    </p>
                  )}
                  {uploadStatus.identification === 'uploading' && (
                    <p className="text-sm text-blue-600 mt-2">Subiendo...</p>
                  )}
                  {uploadStatus.identification === 'success' && (
                    <p className="text-sm text-green-600 mt-2">✓ Subido exitosamente</p>
                  )}
                  {uploadErrors.identification && (
                    <p className="text-sm text-red-600 mt-2">{uploadErrors.identification}</p>
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
                      if (file) {
                        handleDocumentChange('incomeProof', 'income_proof', file);
                      }
                    }}
                  />
                  {documents.incomeProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.incomeProof.name}
                    </p>
                  )}
                  {existingDocuments.incomeProof && !documents.incomeProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {existingDocuments.incomeProof.fileName} (subido previamente)
                    </p>
                  )}
                  {uploadStatus.incomeProof === 'uploading' && (
                    <p className="text-sm text-blue-600 mt-2">Subiendo...</p>
                  )}
                  {uploadStatus.incomeProof === 'success' && (
                    <p className="text-sm text-green-600 mt-2">✓ Subido exitosamente</p>
                  )}
                  {uploadErrors.incomeProof && (
                    <p className="text-sm text-red-600 mt-2">{uploadErrors.incomeProof}</p>
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
                      if (file) {
                        handleDocumentChange('addressProof', 'address_proof', file);
                      }
                    }}
                  />
                  {documents.addressProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {documents.addressProof.name}
                    </p>
                  )}
                  {existingDocuments.addressProof && !documents.addressProof && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {existingDocuments.addressProof.fileName} (subido previamente)
                    </p>
                  )}
                  {uploadStatus.addressProof === 'uploading' && (
                    <p className="text-sm text-blue-600 mt-2">Subiendo...</p>
                  )}
                  {uploadStatus.addressProof === 'success' && (
                    <p className="text-sm text-green-600 mt-2">✓ Subido exitosamente</p>
                  )}
                  {uploadErrors.addressProof && (
                    <p className="text-sm text-red-600 mt-2">{uploadErrors.addressProof}</p>
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
                        if (file) {
                          handleDocumentChange('propertyDeed', 'property_deed', file);
                        }
                      }}
                    />
                    {documents.propertyDeed && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {documents.propertyDeed.name}
                      </p>
                    )}
                    {existingDocuments.propertyDeed && !documents.propertyDeed && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {existingDocuments.propertyDeed.fileName} (subido previamente)
                      </p>
                    )}
                    {uploadStatus.propertyDeed === 'uploading' && (
                      <p className="text-sm text-blue-600 mt-2">Subiendo...</p>
                    )}
                    {uploadStatus.propertyDeed === 'success' && (
                      <p className="text-sm text-green-600 mt-2">✓ Subido exitosamente</p>
                    )}
                    {uploadErrors.propertyDeed && (
                      <p className="text-sm text-red-600 mt-2">{uploadErrors.propertyDeed}</p>
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