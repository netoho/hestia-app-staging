'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, User, Briefcase, Shield, Users, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useJointObligorForm } from '@/hooks/useJointObligorForm';
import { useJointObligorReferences } from '@/hooks/useJointObligorReferences';
import JointObligorPersonalInfoTab from './JointObligorPersonalInfoTab';
import JointObligorEmploymentTab from './JointObligorEmploymentTab';
import JointObligorGuaranteeTab from './JointObligorGuaranteeTab';
import JointObligorReferencesTab from './JointObligorReferencesTab';
import JointObligorDocumentsSection from './JointObligorDocumentsSection';

interface JointObligorFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function JointObligorFormWizard({
  token,
  initialData,
  policy,
  onComplete,
  isAdminEdit = false,
}: JointObligorFormWizardProps) {
  const { toast } = useToast();

  // Form hooks
  const {
    formData,
    setFormData,
    updateField,
    errors,
    setErrors,
    saving,
    validatePersonalTab,
    validateEmploymentTab,
    validateGuaranteeTab,
    saveTab,
  } = useJointObligorForm(initialData, isAdminEdit);

  const {
    personalReferences,
    commercialReferences,
    updatePersonalReference,
    updateCommercialReference,
    validatePersonalReferences,
    validateCommercialReferences,
  } = useJointObligorReferences(
    initialData?.references || [],
    initialData?.commercialReferences || []
  );

  // Tab state
  const [activeTab, setActiveTab] = useState('personal');
  const [tabSaved, setTabSaved] = useState({
    personal: false,
    employment: false,
    guarantee: false,
    references: false,
  });
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data with initial data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));

      // Mark tabs as saved if data exists
      if (initialData.fullName || initialData.companyName) {
        setTabSaved(prev => ({ ...prev, personal: true }));
      }
      if (initialData.occupation || initialData.monthlyIncome) {
        setTabSaved(prev => ({ ...prev, employment: true }));
      }
      if (initialData.guaranteeMethod) {
        setTabSaved(prev => ({ ...prev, guarantee: true }));
      }
      if (initialData.references?.length > 0 || initialData.commercialReferences?.length > 0) {
        setTabSaved(prev => ({ ...prev, references: true }));
      }
    }
  }, [initialData]);

  // Define tabs based on company type
  const tabs = formData.isCompany
    ? [
        { id: 'personal', label: 'Información', icon: User, needsSave: true },
        { id: 'guarantee', label: 'Garantía', icon: Shield, needsSave: true },
        { id: 'references', label: 'Referencias', icon: Users, needsSave: true },
        { id: 'documents', label: 'Documentos', icon: FileText, needsSave: false },
      ]
    : [
        { id: 'personal', label: 'Personal', icon: User, needsSave: true },
        { id: 'employment', label: 'Empleo', icon: Briefcase, needsSave: true },
        { id: 'guarantee', label: 'Garantía', icon: Shield, needsSave: true },
        { id: 'references', label: 'Referencias', icon: Users, needsSave: true },
        { id: 'documents', label: 'Documentos', icon: FileText, needsSave: false },
      ];

  // Check if tab can be accessed
  const canAccessTab = (tabId: string) => {
    // Admin can access all tabs
    if (isAdminEdit) return true;

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === 0) return true;

    // Check if all previous tabs are saved
    for (let i = 0; i < tabIndex; i++) {
      const prevTab = tabs[i];
      if (prevTab.needsSave && !tabSaved[prevTab.id as keyof typeof tabSaved]) {
        return false;
      }
    }
    return true;
  };

  // Calculate progress
  const savedCount = Object.values(tabSaved).filter(Boolean).length;
  const totalTabs = tabs.filter(t => t.needsSave).length;
  const progress = (savedCount / totalTabs) * 100;

  // Handle tab save
  const handleSaveTab = async (tabName: string) => {
    setErrors({});

    // Validate based on tab
    let valid = false;
    if (tabName === 'personal') {
      valid = validatePersonalTab();
    } else if (tabName === 'employment' && !formData.isCompany) {
      valid = validateEmploymentTab();
    } else if (tabName === 'guarantee') {
      valid = validateGuaranteeTab();
    } else if (tabName === 'references') {
      const refValidation = formData.isCompany
        ? validateCommercialReferences()
        : validatePersonalReferences();
      valid = refValidation.valid;
      if (!valid) {
        setErrors(refValidation.errors);
      }
    }

    if (!valid) {
      toast({
        title: 'Error de validación',
        description: 'Por favor complete todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    // Save data
    const additionalData = tabName === 'references'
      ? {
          references: formData.isCompany ? undefined : personalReferences,
          commercialReferences: formData.isCompany ? commercialReferences : undefined,
        }
      : {};

    const success = await saveTab(token, tabName, additionalData);

    if (success) {
      setTabSaved(prev => ({ ...prev, [tabName]: true }));

      // Auto-advance to next tab
      const currentIndex = tabs.findIndex(t => t.id === tabName);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
      }
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (!requiredDocsUploaded) {
      toast({
        title: 'Documentos Faltantes',
        description: 'Por favor cargue todos los documentos requeridos antes de enviar',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        references: formData.isCompany ? undefined : personalReferences,
        commercialReferences: formData.isCompany ? commercialReferences : undefined,
        informationComplete: true,
      };

      const submitUrl = isAdminEdit
        ? `/api/admin/actors/joint-obligor/${token}/submit`
        : `/api/actor/joint-obligor/${token}/submit`;

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la información');
      }

      toast({
        title: '✓ Información Enviada',
        description: 'Tu información ha sido enviada exitosamente',
      });

      if (onComplete) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al enviar la información',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allTabsSaved = tabs.filter(t => t.needsSave).every(t => tabSaved[t.id as keyof typeof tabSaved]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Portal del Obligado Solidario</CardTitle>
          <CardDescription>
            Complete su información para la protección de arrendamiento
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
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progreso de Completado</span>
              <span className="text-sm text-muted-foreground">
                {savedCount} de {totalTabs} secciones guardadas
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Form Wizard */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={!canAccessTab(tab.id)}
                  className="flex items-center gap-1"
                >
                  {tabSaved[tab.id as keyof typeof tabSaved] && (
                    <Check className="h-3 w-3" />
                  )}
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Personal/Company Tab */}
            <TabsContent value="personal">
              <JointObligorPersonalInfoTab
                formData={formData}
                onFieldChange={updateField}
                errors={errors}
                disabled={saving}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleSaveTab('personal')}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : tabSaved.personal ? (
                    'Guardado - Continuar'
                  ) : (
                    'Guardar y Continuar'
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Employment Tab (Individuals only) */}
            {!formData.isCompany && (
              <TabsContent value="employment">
                <JointObligorEmploymentTab
                  formData={formData}
                  onFieldChange={updateField}
                  errors={errors}
                  disabled={saving}
                />
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('personal')}
                  >
                    Anterior
                  </Button>
                  <Button
                    onClick={() => handleSaveTab('employment')}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : tabSaved.employment ? (
                      'Guardado - Continuar'
                    ) : (
                      'Guardar y Continuar'
                    )}
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* Guarantee Tab */}
            <TabsContent value="guarantee">
              <JointObligorGuaranteeTab
                formData={formData}
                onFieldChange={updateField}
                errors={errors}
                disabled={saving}
                token={token}
                jointObligorId={formData.id}
                initialDocuments={initialData?.documents}
              />
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab(formData.isCompany ? 'personal' : 'employment')}
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => handleSaveTab('guarantee')}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : tabSaved.guarantee ? (
                    'Guardado - Continuar'
                  ) : (
                    'Guardar y Continuar'
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* References Tab */}
            <TabsContent value="references">
              <JointObligorReferencesTab
                isCompany={formData.isCompany}
                personalReferences={personalReferences}
                commercialReferences={commercialReferences}
                onUpdatePersonalReference={updatePersonalReference}
                onUpdateCommercialReference={updateCommercialReference}
                errors={errors}
                disabled={saving}
              />
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('guarantee')}
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => handleSaveTab('references')}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : tabSaved.references ? (
                    'Guardado - Continuar'
                  ) : (
                    'Guardar y Continuar'
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <JointObligorDocumentsSection
                obligorId={formData.id}
                token={token}
                isCompany={formData.isCompany}
                guaranteeMethod={formData.guaranteeMethod}
                nationality={formData.nationality}
                allTabsSaved={isAdminEdit || allTabsSaved}
                initialDocuments={initialData?.documents}
                additionalInfo={formData.additionalInfo}
                onAdditionalInfoChange={(value) => updateField('additionalInfo', value)}
                onRequiredDocsChange={setRequiredDocsUploaded}
                isAdminEdit={isAdminEdit}
              />
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('references')}
                >
                  Anterior
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={submitting || !requiredDocsUploaded || !allTabsSaved}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Información'
                  )}
                </Button>
              </div>

              {(!requiredDocsUploaded || !allTabsSaved) && (
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {!allTabsSaved && 'Complete todas las secciones antes de enviar. '}
                    {!requiredDocsUploaded && 'Cargue todos los documentos requeridos antes de enviar.'}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
