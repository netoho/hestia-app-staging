'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { actorConfig } from '@/lib/constants/actorConfig';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import LandlordOwnerInfoTabRHF from './LandlordOwnerInfoTab-RHF';
import LandlordBankInfoTabRHF from './LandlordBankInfoTab-RHF';
import PropertyDetailsFormRHF from './PropertyDetailsForm-RHF';
import FinancialInfoFormRHF from './FinancialInfoForm-RHF';
import DocumentsSection from './DocumentsSection';

interface LandlordFormWizardProps {
  token: string;
  initialData?: any;
  policy?: any;
  onComplete?: () => void;
  isAdminEdit?: boolean;
}

export default function LandlordFormWizardSimplified({
  token,
  initialData = {},
  policy,
  onComplete,
  isAdminEdit = false,
}: LandlordFormWizardProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Landlord data - can be array (multi-actor) or single
  const landlords = initialData?.landlords || (initialData ? [initialData] : []);
  const primaryLandlord = landlords[0] || {};
  const isCompany = primaryLandlord?.isCompany ?? false;

  // Tab configuration
  const config = actorConfig.landlord;
  const tabs = (isCompany ? config.companyTabs : config.personTabs) as any;

  // Wizard tabs for navigation
  const wizard = useFormWizardTabs({
    tabs,
    isAdminEdit,
    initialActiveTab: 'owner-info',
  });

  // tRPC mutation for saving
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      utils.actor.getByToken.invalidate({
        type: 'landlord',
        token,
      });
    },
  });

  // tRPC mutation for deleting co-owners
  const deleteMutation = trpc.actor.deleteCoOwner.useMutation({
    onSuccess: () => {
      utils.actor.getByToken.invalidate({
        type: 'landlord',
        token,
      });
    },
  });

  // Delete handler for co-owners
  const handleDeleteLandlord = useCallback(async (landlordId: string) => {
    await deleteMutation.mutateAsync({
      type: 'landlord',
      id: landlordId,
    });
  }, [deleteMutation]);

  // Simplified save handler - each tab manages its own validation
  const handleTabSave = useCallback(async (tabName: string, data: any): Promise<void> => {
    try {
      toast({
        title: "Guardando...",
        description: "Guardando información...",
      });

      await updateMutation.mutateAsync({
        type: 'landlord',
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
          {wizard.activeTab === 'owner-info' && (
            <LandlordOwnerInfoTabRHF
              initialData={landlords}
              onSave={(data) => handleTabSave('owner-info', data)}
              onDelete={handleDeleteLandlord}
            />
          )}

          {wizard.activeTab === 'bank-info' && (
            <LandlordBankInfoTabRHF
              initialData={primaryLandlord}
              onSave={(data) => handleTabSave('bank-info', data)}
            />
          )}

          {wizard.activeTab === 'property-info' && (
            <PropertyDetailsFormRHF
              initialData={initialData?.propertyDetails || {}}
              onSave={(data) => handleTabSave('property-info', data)}
            />
          )}

          {wizard.activeTab === 'financial-info' && (
            <FinancialInfoFormRHF
              initialData={{
                landlord: primaryLandlord,
                policyFinancial: initialData?.policyFinancialData || {},
              }}
              onSave={(data) => handleTabSave('financial-info', data)}
              policy={policy}
              token={token}
              landlordId={primaryLandlord?.id}
              isAdminEdit={isAdminEdit}
            />
          )}

          {wizard.activeTab === 'documents' && (
            <DocumentsSection
              token={token}
              landlordId={primaryLandlord?.id}
              isCompany={isCompany}
              allTabsSaved={allTabsSaved}
              initialDocuments={initialData?.documents || []}
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
