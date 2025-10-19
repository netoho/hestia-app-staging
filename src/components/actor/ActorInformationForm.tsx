'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, User, Briefcase, Users, FileText, Send, Shield } from 'lucide-react';

// Import sub-components
import PersonalInfoTab from './PersonalInfoTab';
import EmploymentInfoTab from './EmploymentInfoTab';
import PersonalReferencesTab, { PersonalReference } from './PersonalReferencesTab';
import EnhancedDocumentsTab from './EnhancedDocumentsTab';
import PropertyInfoTab from './PropertyInfoTab';

interface ActorData {
  // Personal Information
  fullName: string;
  email: string;
  phone: string;
  nationality: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  passport?: string;
  address?: string;
  additionalInfo?: string;

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
    additionalInfo: initialData?.additionalInfo || '',
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
    if (!formData.phone) newErrors.phone = 'Teléfono es requerido';
    if (!formData.nationality) newErrors.nationality = 'Nacionalidad es requerida';

    if (formData.nationality === 'MEXICAN') {
      if (!formData.curp) newErrors.curp = 'CURP es requerido';
      if (formData.curp && !/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/.test(formData.curp)) {
        newErrors.curp = 'CURP inválido';
      }
    } else {
      if (!formData.passport) newErrors.passport = 'Número de pasaporte es requerido';
    }

    // Employment validation
    if (!formData.employmentStatus) newErrors.employmentStatus = 'Situación laboral es requerida';
    if (!formData.occupation) newErrors.occupation = 'Ocupación es requerida';
    if (formData.monthlyIncome <= 0) newErrors.monthlyIncome = 'Ingreso mensual debe ser mayor a 0';

    // References validation
    formData.references.forEach((ref, index) => {
      if (!ref.name) newErrors[`ref_${index}_name`] = 'Nombre es requerido';
      if (!ref.phone) newErrors[`ref_${index}_phone`] = 'Teléfono es requerido';
      if (!ref.relationship) newErrors[`ref_${index}_relationship`] = 'Relación es requerida';
    });

    // Aval specific validation
    if (actorType === 'aval') {
      if (!formData.propertyAddress) newErrors.propertyAddress = 'Dirección de la propiedad es requerida';
      if (!formData.propertyValue || formData.propertyValue <= 0) {
        newErrors.propertyValue = 'Valor de la propiedad debe ser mayor a 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Find first tab with errors
      if (Object.keys(errors).some(key => ['fullName', 'phone', 'nationality', 'curp', 'passport'].includes(key))) {
        setCurrentTab('personal');
      } else if (Object.keys(errors).some(key => ['employmentStatus', 'occupation', 'monthlyIncome'].includes(key))) {
        setCurrentTab('employment');
      } else if (Object.keys(errors).some(key => key.startsWith('ref_'))) {
        setCurrentTab('references');
      } else if (actorType === 'aval' && Object.keys(errors).some(key => ['propertyAddress', 'propertyValue'].includes(key))) {
        setCurrentTab('property');
      }
      return;
    }

    setLoading(true);
    try {

      // Submit form data
      if (onSubmit) {
        await onSubmit(formData);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error al enviar la información. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    let completed = 0;
    let total = 0;

    // Personal info
    total += 4;
    if (formData.fullName) completed++;
    if (formData.phone) completed++;
    if (formData.nationality) completed++;
    if (formData.nationality === 'MEXICAN' ? formData.curp : formData.passport) completed++;

    // Employment info
    total += 4;
    if (formData.employmentStatus) completed++;
    if (formData.occupation) completed++;
    if (formData.monthlyIncome > 0) completed++;
    if (formData.incomeSource) completed++;

    // References
    total += formData.references.length * 3;
    formData.references.forEach(ref => {
      if (ref.name) completed++;
      if (ref.phone) completed++;
      if (ref.relationship) completed++;
    });

    // // Documents
    // total += 2; // ID and income proof are required
    // if (documents.identification || existingDocuments.identification) completed++;
    // if (documents.incomeProof || existingDocuments.incomeProof) completed++;

    // Aval property info
    if (actorType === 'aval') {
      total += 2;
      if (formData.propertyAddress) completed++;
      if (formData.propertyValue && formData.propertyValue > 0) completed++;
    }

    return Math.round((completed / total) * 100);
  };

  const actorTypeLabels = {
    'tenant': 'Inquilino',
    'joint-obligor': 'Obligado Solidario',
    'aval': 'Aval'
  };

  const tabs = [
    { id: 'personal', label: 'Información Personal', icon: User },
    { id: 'employment', label: 'Información Laboral', icon: Briefcase },
    { id: 'references', label: 'Referencias', icon: Users },
    ...(actorType === 'aval' ? [{ id: 'property', label: 'Propiedad en Garantía', icon: Shield }] : []),
    { id: 'documents', label: 'Documentos', icon: FileText },
  ];

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Información Enviada!</h2>
          <p className="text-gray-600">
            Gracias por completar su información. Revisaremos sus datos y le notificaremos sobre el estado de su solicitud.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          Información del {actorTypeLabels[actorType]}
        </CardTitle>
        <CardDescription>
          Complete toda la información requerida para procesar su solicitud
        </CardDescription>
        {policyData && (
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Protección:</strong> {policyData.policyNumber}<br />
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
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="personal">
            <PersonalInfoTab
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
            />
          </TabsContent>

          <TabsContent value="employment">
            <EmploymentInfoTab
              formData={formData}
              errors={errors}
              updateFormData={updateFormData}
              actorType={actorType}
            />
          </TabsContent>

          <TabsContent value="references">
            <PersonalReferencesTab
              references={formData.references}
              errors={errors}
              updateReference={updateReference}
              addReference={addReference}
              removeReference={removeReference}
            />
          </TabsContent>

          {actorType === 'aval' && (
            <TabsContent value="property">
              <PropertyInfoTab
                formData={formData}
                errors={errors}
                updateFormData={updateFormData}
              />
            </TabsContent>
          )}

          <TabsContent value="documents">
            <EnhancedDocumentsTab
              token={token}
              actorType={actorType}
              additionalInfo={formData.additionalInfo}
              updateFormData={updateFormData}
              isAval={actorType === 'aval'}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
          >
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
      </CardContent>
    </Card>
  );
}
