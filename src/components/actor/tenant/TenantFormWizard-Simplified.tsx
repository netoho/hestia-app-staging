'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { actorConfig } from '@/lib/constants/actorConfig';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import TenantPersonalInfoTabRHF from './TenantPersonalInfoTab-RHF';
import TenantEmploymentTabRHF from './TenantEmploymentTab-RHF';
import TenantRentalHistoryTabRHF from './TenantRentalHistoryTab-RHF';
import TenantReferencesTabRHF from './TenantReferencesTab-RHF';
import TenantDocumentsSection from './TenantDocumentsSection';
import type { TenantType } from '@/lib/schemas/tenant';

interface TenantFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function TenantFormWizardSimplified({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: TenantFormWizardProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [additionalInfo, setAdditionalInfo] = useState(initialData?.additionalInfo || '');
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Determine tenant type from initial data
  const tenantType: TenantType = initialData?.tenantType || 'INDIVIDUAL';
  const isCompany = tenantType === 'COMPANY';

  // Tab configuration
  const config = actorConfig.tenant;
  const tabs = (isCompany ? config.companyTabs : config.personTabs) as any;

  // Wizard tabs for navigation
  const wizard = useFormWizardTabs({
    tabs,
    isAdminEdit,
    initialActiveTab: 'personal',
  });

  // tRPC mutation for saving
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      utils.actor.getByToken.invalidate({
        type: 'tenant',
        token,
      });
    },
  });

  // Simplified save handler - each tab manages its own validation
  const handleTabSave = useCallback(async (tabName: string, data: any): Promise<void> => {
    try {
      toast({
        title: "Guardando...",
        description: "Guardando información...",
      });

      await updateMutation.mutateAsync({
        type: 'tenant',
        identifier: token,
        data: {
          ...data,
          partial: true,
          tabName,
        },
      });

      toast({
        title: "✓ Guardado",
        description: "Información guardada exitosamente",
      });

      // Mark tab as saved and advance (pass fresh state to avoid stale closure)
      const newTabSaved = { ...wizard.tabSaved, [tabName]: true };
      wizard.markTabSaved(tabName);
      wizard.goToNextTab(newTabSaved);

      // Call onComplete when all tabs are saved (only for public portal, not admin)
      if (wizard.isLastTabAndAllSaved() && !isAdminEdit) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar",
        variant: "destructive",
      });
    }
  }, [token, updateMutation, wizard, toast]);

  // Check if all tabs before documents are saved
  const allTabsSaved = tabs
    .filter((t: any) => t.id !== 'documents' && t.needsSave)
    .every((t: any) => wizard.tabSaved[t.id]);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <FormWizardProgress
        tabs={tabs}
        tabSaved={wizard.tabSaved}
      />

      {/* Tabs Navigation */}
      <FormWizardTabs
        tabs={tabs}
        activeTab={wizard.activeTab}
        tabSaved={wizard.tabSaved}
        isAdminEdit={isAdminEdit}
        onTabChange={(tabId) => {
          if (wizard.canAccessTab(tabId, tabs, isAdminEdit, wizard.tabSaved)) {
            wizard.setActiveTab(tabId);
          } else {
            toast({
              title: "Completar tab anterior",
              description: "Debe completar el tab anterior antes de continuar",
              variant: "destructive",
            });
          }
        }}
      >
        {/* Tab Content - Using RHF versions */}
        <div className="mt-6">
          {wizard.activeTab === 'personal' && (
            <TenantPersonalInfoTabRHF
              tenantType={tenantType}
              initialData={initialData}
              onSave={(data) => handleTabSave('personal', data)}
            />
          )}

          {wizard.activeTab === 'employment' && !isCompany && (
            <TenantEmploymentTabRHF
              initialData={initialData}
              onSave={(data) => handleTabSave('employment', data)}
            />
          )}

          {wizard.activeTab === 'rental' && !isCompany && (
            <TenantRentalHistoryTabRHF
              initialData={initialData}
              onSave={(data) => handleTabSave('rental', data)}
            />
          )}

          {wizard.activeTab === 'references' && (
            <TenantReferencesTabRHF
              tenantType={tenantType}
              initialData={initialData}
              onSave={(data) => handleTabSave('references', data)}
            />
          )}

          {wizard.activeTab === 'documents' && (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!requiredDocsUploaded) {
                toast({
                  title: "Documentos requeridos",
                  description: "Por favor cargue todos los documentos requeridos antes de continuar",
                  variant: "destructive",
                });
                return;
              }
              handleTabSave('documents', { additionalInfo });
            }}>
              <TenantDocumentsSection
                token={token}
                tenantId={initialData?.id}
                tenantType={tenantType}
                nationality={initialData?.nationality}
                allTabsSaved={allTabsSaved || isAdminEdit}
                initialDocuments={initialData?.documents || []}
                additionalInfo={additionalInfo}
                onAdditionalInfoChange={setAdditionalInfo}
                onRequiredDocsChange={setRequiredDocsUploaded}
                isAdminEdit={isAdminEdit}
              />
              <button type="submit" className="hidden" />
            </form>
          )}
        </div>
      </FormWizardTabs>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => {
            const currentIndex = tabs.findIndex((t: any) => t.id === wizard.activeTab);
            if (currentIndex > 0) {
              wizard.setActiveTab(tabs[currentIndex - 1].id);
            }
          }}
          disabled={tabs.findIndex((t: any) => t.id === wizard.activeTab) === 0}
        >
          Anterior
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              // Trigger form submission in the active tab
              document.querySelector('form')?.requestSubmit();
            }}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar y Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
