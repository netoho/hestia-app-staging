'use client';

import { actorConfig } from '@/lib/constants/actorConfig';
import {
  useActorUpdateSave,
  type ActorWizardConfig,
  type WizardTab,
} from '@/components/actor/ActorWizard';
import AvalPersonalInfoTabRHF from './AvalPersonalInfoTab-RHF';
import AvalEmploymentTabRHF from './AvalEmploymentTab-RHF';
import AvalPropertyGuaranteeTabRHF from './AvalPropertyGuaranteeTab-RHF';
import AvalReferencesTabRHF from './AvalReferencesTab-RHF';
import AvalDocumentsSection from './AvalDocumentsSection';

export const avalWizardConfig: ActorWizardConfig = {
  actorType: 'aval',
  initialActiveTab: 'personal',

  resolveContext(initialData) {
    return {
      isCompany: (initialData?.avalType || 'INDIVIDUAL') === 'COMPANY',
      self: initialData,
    };
  },

  getTabs(isCompany) {
    const cfg = actorConfig.aval;
    return [...(isCompany ? cfg.companyTabs : cfg.personTabs)] as WizardTab[];
  },

  useSave({ token }) {
    return useActorUpdateSave('aval', token);
  },

  getDocumentsSaveData(additionalInfo) {
    return { additionalInfo };
  },

  renderTab(tabId, ctx) {
    const avalType = ctx.initialData?.avalType || 'INDIVIDUAL';
    switch (tabId) {
      case 'personal':
        return (
          <AvalPersonalInfoTabRHF
            avalType={avalType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('personal')}
            disabled={ctx.disabled}
          />
        );
      case 'employment':
        return (
          <AvalEmploymentTabRHF
            avalType={avalType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('employment')}
            disabled={ctx.disabled}
          />
        );
      case 'property':
        return (
          <AvalPropertyGuaranteeTabRHF
            avalType={avalType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('property')}
            token={ctx.token}
            avalId={ctx.initialData?.id}
            initialDocuments={ctx.initialData?.documents || []}
            disabled={ctx.disabled}
          />
        );
      case 'references':
        return (
          <AvalReferencesTabRHF
            avalType={avalType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('references')}
            disabled={ctx.disabled}
          />
        );
      default:
        return null;
    }
  },

  renderDocumentsSection(ctx) {
    return (
      <AvalDocumentsSection
        avalId={ctx.initialData?.id}
        token={ctx.token}
        isCompany={ctx.isCompany}
        nationality={ctx.initialData?.nationality}
        allTabsSaved={ctx.allTabsSaved || ctx.isAdminEdit}
        initialDocuments={ctx.initialData?.documents || []}
        additionalInfo={ctx.additionalInfo}
        onAdditionalInfoChange={ctx.setAdditionalInfo}
        onRequiredDocsChange={ctx.setRequiredDocsUploaded}
        isAdminEdit={ctx.isAdminEdit}
      />
    );
  },
};
