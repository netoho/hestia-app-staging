'use client';

import { useState, useCallback } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { actorConfig } from '@/lib/constants/actorConfig';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import AvalPersonalInfoTabRHF from './AvalPersonalInfoTab-RHF';
import AvalEmploymentTabRHF from './AvalEmploymentTab-RHF';
import AvalPropertyGuaranteeTabRHF from './AvalPropertyGuaranteeTab-RHF';
import AvalReferencesTabRHF from './AvalReferencesTab-RHF';
import AvalDocumentsSection from './AvalDocumentsSection';

interface AvalFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function AvalFormWizard({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: AvalFormWizardProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Determine aval type from initial data
  const avalType = initialData?.avalType || 'INDIVIDUAL';
  const isCompany = avalType === 'COMPANY';

  // Tab configuration
  const config = actorConfig.aval;
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
        type: 'aval',
        token,
      });
    },
  });

  // Simplified save handler - each tab manages its own validation
  const handleTabSave = useCallback(async (tabName: string, data: any) => {
    try {
      toast({
        title: "Guardando...",
        description: "Guardando información...",
      });

      await updateMutation.mutateAsync({
        type: 'aval',
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

      return true;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar",
        variant: "destructive",
      });
      return false;
    }
  }, [token, updateMutation, wizard, toast, utils]);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <FormWizardProgress
        currentTab={wizard.activeTab}
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
      />

      {/* Tab Content - Using RHF versions */}
      <div className="mt-6">
        {wizard.activeTab === 'personal' && (
          <AvalPersonalInfoTabRHF
            avalType={avalType}
            initialData={initialData}
            onSave={(data) => handleTabSave('personal', data)}
          />
        )}

        {wizard.activeTab === 'employment' && !isCompany && (
          <AvalEmploymentTabRHF
            avalType={avalType}
            initialData={initialData}
            onSave={(data) => handleTabSave('employment', data)}
          />
        )}

        {wizard.activeTab === 'property' && (
          <AvalPropertyGuaranteeTabRHF
            avalType={avalType}
            initialData={initialData}
            onSave={(data) => handleTabSave('property', data)}
            token={token}
            avalId={initialData?.id}
            initialDocuments={initialData?.documents || []}
          />
        )}

        {wizard.activeTab === 'references' && (
          <AvalReferencesTabRHF
            avalType={avalType}
            initialData={initialData}
            onSave={(data) => handleTabSave('references', data)}
          />
        )}

        {wizard.activeTab === 'documents' && (
          <AvalDocumentsSection
            formData={initialData}
            onFieldChange={(field, value) => {
              // Simple update without complex state management
              handleTabSave('documents', { [field]: value });
            }}
            errors={{}}
            token={token}
            avalId={initialData?.id}
            initialDocuments={initialData?.documents || []}
          />
        )}
      </div>

      {/* Save Button for Current Tab */}
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
              // Note: This requires each RHF tab to expose form submission
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
