'use client';

import { actorConfig } from '@/lib/constants/actorConfig';
import {
  useActorUpdateSave,
  type ActorWizardConfig,
  type WizardTab,
} from '@/components/actor/ActorWizard';
import JointObligorPersonalInfoTabRHF from './JointObligorPersonalInfoTab-RHF';
import JointObligorEmploymentTabRHF from './JointObligorEmploymentTab-RHF';
import JointObligorGuaranteeTabRHF from './JointObligorGuaranteeTab-RHF';
import JointObligorReferencesTabRHF from './JointObligorReferencesTab-RHF';
import JointObligorDocumentsSection from './JointObligorDocumentsSection';

export const jointObligorWizardConfig: ActorWizardConfig = {
  actorType: 'jointObligor',
  initialActiveTab: 'personal',

  resolveContext(initialData) {
    return {
      isCompany: (initialData?.jointObligorType || 'INDIVIDUAL') === 'COMPANY',
      self: initialData,
    };
  },

  getTabs(isCompany) {
    const cfg = actorConfig.jointObligor;
    return [...(isCompany ? cfg.companyTabs : cfg.personTabs)] as WizardTab[];
  },

  useSave({ token }) {
    return useActorUpdateSave('jointObligor', token);
  },

  getDocumentsSaveData(additionalInfo) {
    return { additionalInfo };
  },

  renderTab(tabId, ctx) {
    const jointObligorType = ctx.initialData?.jointObligorType || 'INDIVIDUAL';
    switch (tabId) {
      case 'personal':
        return (
          <JointObligorPersonalInfoTabRHF
            jointObligorType={jointObligorType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('personal')}
            disabled={ctx.disabled}
          />
        );
      case 'employment':
        return (
          <JointObligorEmploymentTabRHF
            initialData={ctx.initialData}
            onSave={ctx.saveTab('employment')}
            disabled={ctx.disabled}
          />
        );
      case 'guarantee':
        return (
          <JointObligorGuaranteeTabRHF
            jointObligorType={jointObligorType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('guarantee')}
            token={ctx.token}
            jointObligorId={ctx.initialData?.id}
            initialDocuments={ctx.initialData?.documents || []}
            disabled={ctx.disabled}
          />
        );
      case 'references':
        return (
          <JointObligorReferencesTabRHF
            jointObligorType={jointObligorType}
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
      <JointObligorDocumentsSection
        obligorId={ctx.initialData?.id}
        token={ctx.token}
        isCompany={ctx.isCompany}
        guaranteeMethod={ctx.initialData?.guaranteeMethod}
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
