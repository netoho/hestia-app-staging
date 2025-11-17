'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FormWizardProgress } from '@/components/forms/FormWizardProgress';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { useActorFormState } from '@/hooks/useActorFormState';
import { useActorReferences } from '@/hooks/useActorReferences';
import { useFormWizardSubmission } from '@/hooks/useFormWizardSubmission';
import { actorConfig } from '@/lib/constants/actorConfig';
import { formMessages } from '@/lib/constants/formMessages';
import { ActorType } from '@/lib/enums';
import type { Policy } from '@prisma/client';

// Props for the generic form wizard
type ActorFormWizardProps = {
  actorType: ActorType;
  token?: string | null;
  initialData?: any;
  policy?: Policy | null;
  isAdminEdit?: boolean;
  onComplete?: () => void;
};

// Component for rendering loading state
const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
    <span>Guardando...</span>
  </div>
);

export function ActorFormWizard({
  actorType,
  token,
  initialData,
  policy,
  isAdminEdit = false,
  onComplete,
}: ActorFormWizardProps) {
  const router = useRouter();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);

  // Get actor-specific configuration
  const config = actorConfig[actorType];
  if (!config) {
    console.error(`No configuration found for actor type: ${actorType}`);
    return <div>Error: Invalid actor type</div>;
  }

  // Initialize form state based on actor type
  const formState = useActorFormState({
    actorType,
    initialData,
    policy,
    isAdminEdit,
    token,
  });

  // Determine if it's a company based on actor type and data
  const isCompany = formState.isMultiActor
    ? formState.actors[0]?.isCompany || false
    : actorType === 'tenant'
    ? (formState.formData as any).tenantType === 'COMPANY'
    : (formState.formData as any).isCompany || false;

  // Get tabs configuration based on entity type
  const tabs = isCompany ? config.companyTabs : config.personTabs;

  // Initialize wizard state
  const wizard = useFormWizardTabs({
    initialTabs: tabs.map(tab => tab.id),
    isAdminEdit,
  });

  // Initialize references hook if actor has references
  const hasReferences = tabs.some(tab => tab.id === 'references');
  const references = hasReferences
    ? useActorReferences({
        actorType,
        initialReferences: (formState.isMultiActor ? null : formState.formData) as any,
        allowAddRemove: actorType === 'tenant',
        minReferences: 1,
        maxReferences: actorType === 'tenant' ? 5 : 3,
        errorKeyPrefix: actorType === 'tenant' ? 'reference' : 'personalReference',
      })
    : null;

  // Initialize submission hook
  const { saveTabHandler, submitHandler } = useFormWizardSubmission({
    actorType,
    token,
    isAdminEdit,
  });

  // Import tab components dynamically based on actor type
  const [TabComponents, setTabComponents] = useState<any>(null);

  useEffect(() => {
    const loadTabComponents = async () => {
      let components: any = {};

      switch (actorType) {
        case 'tenant':
          const tenantModule = await import('@/components/actor/tenant/tabs');
          components = tenantModule;
          break;
        case 'aval':
          const avalModule = await import('@/components/actor/aval/tabs');
          components = avalModule;
          break;
        case 'jointObligor':
          const jointModule = await import('@/components/actor/joint-obligor/tabs');
          components = jointModule;
          break;
        case 'landlord':
          const landlordModule = await import('@/components/actor/landlord/tabs');
          components = landlordModule;
          break;
      }

      setTabComponents(components);
    };

    loadTabComponents();
  }, [actorType]);

  // Validate tab based on actor type and tab name
  const validateTab = useCallback((tabName: string): boolean => {
    // Clear previous errors
    formState.setErrors({});

    // Import validation functions based on actor type
    // This would be imported from actor-specific validation files
    // For now, return true to allow saving
    return true;
  }, [formState, actorType]);

  // Handle tab save
  const handleSaveTab = useCallback(async (tabName: string) => {
    // Prepare validation function
    const validateTabData = () => validateTab(tabName);

    // Prepare additional data (references for references tab)
    const getAdditionalData = () => {
      if (tabName === 'references' && references) {
        return {
          references: references.references.filter(ref =>
            ref.name || ref.phone || ref.email || ref.relationship
          ),
        };
      }
      return {};
    };

    // Prepare save function
    const saveData = async () => {
      let dataToSave: any;

      if (formState.isMultiActor) {
        // Landlord: Include all state objects
        dataToSave = {
          landlords: formState.actors,
          propertyData: formState.propertyData,
          policyFinancialData: formState.policyFinancialData,
          ...getAdditionalData(),
        };
      } else {
        // Other actors: Include formData and additional data
        dataToSave = {
          ...formState.formData,
          ...getAdditionalData(),
        };
      }

      const success = await saveTabHandler(
        dataToSave,
        tabName,
        true // isPartial
      );

      if (!success) {
        throw new Error(formMessages.error.saveFailed);
      }
    };

    // Execute save with wizard's error handling
    return wizard.handleTabSave(tabName, validateTabData, saveData);
  }, [
    formState,
    references,
    saveTabHandler,
    validateTab,
    wizard,
  ]);

  // Handle final submit
  const handleFinalSubmit = useCallback(async () => {
    wizard.setSavingTab('final');

    try {
      let finalData: any;

      if (formState.isMultiActor) {
        // Landlord submission
        finalData = {
          landlords: formState.actors,
          propertyData: formState.propertyData,
          policyFinancialData: formState.policyFinancialData,
        };
      } else {
        // Other actors submission
        finalData = {
          ...formState.formData,
          ...(references ? {
            references: references.references.filter(ref =>
              ref.name || ref.phone || ref.email || ref.relationship
            ),
          } : {}),
        };
      }

      const success = await submitHandler(finalData);

      if (success) {
        if (onComplete) {
          onComplete();
        } else if (isAdminEdit) {
          router.push(`/admin/policies/${policy?.id}`);
        } else {
          router.push('/portal/success');
        }
      } else {
        wizard.setSavingTab(null);
      }
    } catch (error) {
      console.error('Submit error:', error);
      wizard.setSavingTab(null);
    }
  }, [
    formState,
    references,
    submitHandler,
    wizard,
    isAdminEdit,
    onComplete,
    policy,
    router,
  ]);

  // Check if all required tabs are saved
  const allTabsSaved = tabs
    .filter(tab => tab.required)
    .every(tab => wizard.tabSaved[tab.id]);

  // If tab components haven't loaded yet, show loading
  if (!TabComponents) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <FormWizardProgress
        tabs={tabs}
        tabSaved={wizard.tabSaved}
        variant="bars"
      />

      {/* Tabs Container */}
      <Tabs value={wizard.activeTab} onValueChange={wizard.setActiveTab}>
        {/* Tab List */}
        <div className="flex space-x-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => wizard.setActiveTab(tab.id)}
              disabled={!isAdminEdit && !wizard.canAccessTab(tab.id)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${wizard.activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
                ${!isAdminEdit && !wizard.canAccessTab(tab.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
              `}
            >
              {tab.label}
              {wizard.tabSaved[tab.id] && (
                <span className="ml-2 text-green-600">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tabs.map((tab) => {
          const TabComponent = TabComponents[tab.component];

          if (!TabComponent) {
            console.error(`Tab component not found: ${tab.component}`);
            return null;
          }

          return (
            <div
              key={tab.id}
              className={wizard.activeTab === tab.id ? 'block' : 'hidden'}
            >
              <div className="space-y-4">
                {/* Render the actor-specific tab component */}
                <TabComponent
                  {...(formState.isMultiActor ? {
                    landlords: formState.actors,
                    updateLandlordField: formState.updateActorField,
                    addCoOwner: formState.addActor,
                    removeCoOwner: formState.removeActor,
                    propertyData: formState.propertyData,
                    updatePropertyField: formState.updatePropertyField,
                    policyFinancialData: formState.policyFinancialData,
                    updateFinancialField: formState.updateFinancialField,
                  } : {
                    formData: formState.formData,
                    updateField: formState.updateField,
                    ...(references && tab.id === 'references' ? {
                      references: references.references,
                      updateReference: references.updateReference,
                      addReference: references.addReference,
                      removeReference: references.removeReference,
                    } : {}),
                  })}
                  errors={formState.errors}
                  isAdminEdit={isAdminEdit}
                  policy={policy}
                  token={token}
                  setRequiredDocsUploaded={tab.id === 'documents' ? setRequiredDocsUploaded : undefined}
                />

                {/* Save Button (except for documents tab) */}
                {tab.id !== 'documents' && (
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => handleSaveTab(tab.id)}
                      disabled={wizard.savingTab === tab.id || wizard.tabSaved[tab.id]}
                      size="lg"
                      variant={wizard.tabSaved[tab.id] ? 'outline' : 'default'}
                    >
                      {wizard.savingTab === tab.id ? (
                        <LoadingSpinner />
                      ) : wizard.tabSaved[tab.id] ? (
                        <>✓ {formMessages.button.saved}</>
                      ) : (
                        formMessages.button.saveProgress
                      )}
                    </Button>
                  </div>
                )}

                {/* Submit Button (documents tab only) */}
                {tab.id === 'documents' && (
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleFinalSubmit}
                      disabled={
                        wizard.savingTab === 'final' ||
                        !allTabsSaved ||
                        (!isAdminEdit && !requiredDocsUploaded)
                      }
                      size="lg"
                      variant="default"
                    >
                      {wizard.savingTab === 'final' ? (
                        <LoadingSpinner />
                      ) : (
                        formMessages.button.submitInfo
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Tabs>
    </div>
  );
}