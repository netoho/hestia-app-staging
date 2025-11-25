'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { actorConfig } from '@/lib/constants/actorConfig';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import JointObligorPersonalInfoTabRHF from './JointObligorPersonalInfoTab-RHF';
import JointObligorEmploymentTabRHF from './JointObligorEmploymentTab-RHF';
import JointObligorGuaranteeTabRHF from './JointObligorGuaranteeTab-RHF';
import JointObligorReferencesTabRHF from './JointObligorReferencesTab-RHF';
import JointObligorDocumentsSection from './JointObligorDocumentsSection';
import type { JointObligorType } from '@prisma/client';

interface JointObligorFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function JointObligorFormWizardSimplified({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: JointObligorFormWizardProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Joint Obligor data
  const jointObligorType: JointObligorType = initialData?.jointObligorType || 'INDIVIDUAL';
  const isCompany = jointObligorType === 'COMPANY';

  // Tab configuration
  const config = actorConfig.jointObligor;
  const tabs = (isCompany ? config.companyTabs : config.personTabs) as any;

  // Wizard tabs for navigation
  const wizard = useFormWizardTabs({
    tabs,
    isAdminEdit,
    initialActiveTab: 'personal',
  });

  // Track required docs uploaded for documents tab
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // tRPC mutation for saving
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      utils.actor.getByToken.invalidate({
        type: 'jointObligor',
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
        type: 'jointObligor',
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
            <JointObligorPersonalInfoTabRHF
              jointObligorType={jointObligorType}
              initialData={initialData}
              onSave={(data) => handleTabSave('personal', data)}
            />
          )}

          {wizard.activeTab === 'employment' && !isCompany && (
            <JointObligorEmploymentTabRHF
              initialData={initialData}
              onSave={(data) => handleTabSave('employment', data)}
            />
          )}

          {wizard.activeTab === 'guarantee' && (
            <JointObligorGuaranteeTabRHF
              jointObligorType={jointObligorType}
              initialData={initialData}
              onSave={(data) => handleTabSave('guarantee', data)}
              token={token}
              jointObligorId={initialData?.id}
              initialDocuments={initialData?.documents || []}
            />
          )}

          {wizard.activeTab === 'references' && (
            <JointObligorReferencesTabRHF
              jointObligorType={jointObligorType}
              initialData={initialData}
              onSave={(data) => handleTabSave('references', data)}
            />
          )}

          {wizard.activeTab === 'documents' && (
            <JointObligorDocumentsSection
              obligorId={initialData?.id}
              token={token}
              isCompany={isCompany}
              guaranteeMethod={initialData?.guaranteeMethod}
              nationality={initialData?.nationality}
              allTabsSaved={allTabsSaved || isAdminEdit}
              initialDocuments={initialData?.documents || []}
              additionalInfo={initialData?.additionalInfo || ''}
              onAdditionalInfoChange={(value) => {
                handleTabSave('documents', { additionalInfo: value });
              }}
              onRequiredDocsChange={setRequiredDocsUploaded}
              isAdminEdit={isAdminEdit}
            />
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
