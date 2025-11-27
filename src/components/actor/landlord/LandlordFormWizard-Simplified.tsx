'use client';

import { useCallback, useState } from 'react';
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
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Landlord data - can be array (multi-actor) or single
  const landlords = initialData?.landlords || (initialData ? [initialData] : []);
  const primaryLandlord = landlords.find((landlord: any) => landlord.isPrimary) || {};
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

  // tRPC mutation for saving actor data (owner-info, financial-info, documents)
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      utils.actor.getManyByToken.invalidate({
        type: 'landlord',
        token,
      });
    },
  });

  // tRPC mutation for saving property details (property-info tab)
  const savePropertyDetailsMutation = trpc.actor.savePropertyDetails.useMutation({
    onSuccess: () => {
      utils.actor.getManyByToken.invalidate({
        type: 'landlord',
        token,
      });
    },
  });

  // tRPC mutation for saving policy financial data (financial-info tab)
  const savePolicyFinancialMutation = trpc.actor.savePolicyFinancial.useMutation({
    onSuccess: () => {
      utils.actor.getManyByToken.invalidate({
        type: 'landlord',
        token,
      });
    },
  });

  // tRPC mutation for deleting co-owners
  const deleteMutation = trpc.actor.deleteCoOwner.useMutation({
    onSuccess: () => {
      utils.actor.getManyByToken.invalidate({
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

      // Property-info tab uses a dedicated mutation for PropertyDetails
      if (tabName === 'property-info') {
        await savePropertyDetailsMutation.mutateAsync({
          type: 'landlord',
          identifier: token,
          propertyDetails: data,
        });
      } else if (tabName === 'financial-info') {
        // Financial-info tab needs to save both landlord banking data AND policy financial data
        const { policyFinancial, ...landlordData } = data;

        // 1. Save landlord banking data (bankName, accountNumber, clabe, etc.)
        await updateMutation.mutateAsync({
          type: 'landlord',
          identifier: token,
          data: {
            ...landlordData,
            partial: true,
            tabName,
          },
        });

        // 2. Save policy financial data (securityDeposit, maintenanceFee, hasIVA, etc.)
        if (policyFinancial) {
          await savePolicyFinancialMutation.mutateAsync({
            type: 'landlord',
            identifier: token,
            policyFinancial,
          });
        }
      } else {
        // Other tabs use the standard actor update
        await updateMutation.mutateAsync({
          type: 'landlord',
          identifier: token,
          data: {
            ...data,
            partial: true,
            tabName,
          },
        });
      }

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
  }, [token, updateMutation, savePropertyDetailsMutation, savePolicyFinancialMutation, wizard, toast]);

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

          {/*{wizard.activeTab === 'bank-info' && (*/}
          {/*  <LandlordBankInfoTabRHF*/}
          {/*    initialData={primaryLandlord}*/}
          {/*    onSave={(data) => handleTabSave('bank-info', data)}*/}
          {/*  />*/}
          {/*)}*/}

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
              handleTabSave('documents', {});
            }}>
              <DocumentsSection
                token={token}
                landlordId={primaryLandlord?.id}
                isCompany={isCompany}
                allTabsSaved={allTabsSaved || isAdminEdit}
                initialDocuments={initialData?.documents || []}
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
            disabled={updateMutation.isPending || savePropertyDetailsMutation.isPending || savePolicyFinancialMutation.isPending}
          >
            {(updateMutation.isPending || savePropertyDetailsMutation.isPending || savePolicyFinancialMutation.isPending) ? 'Guardando...' : 'Guardar y Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
