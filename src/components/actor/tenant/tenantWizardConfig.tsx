'use client';

import { actorConfig } from '@/lib/constants/actorConfig';
import {
  useActorUpdateSave,
  type ActorWizardConfig,
  type WizardTab,
} from '@/components/actor/ActorWizard';
import TenantPersonalInfoTabRHF from './TenantPersonalInfoTab-RHF';
import TenantEmploymentTabRHF from './TenantEmploymentTab-RHF';
import TenantRentalHistoryTabRHF from './TenantRentalHistoryTab-RHF';
import TenantReferencesTabRHF from './TenantReferencesTab-RHF';
import TenantDocumentsSection from './TenantDocumentsSection';

export const tenantWizardConfig: ActorWizardConfig = {
  actorType: 'tenant',
  initialActiveTab: 'personal',

  resolveContext(initialData) {
    return {
      isCompany: (initialData?.tenantType || 'INDIVIDUAL') === 'COMPANY',
      self: initialData,
    };
  },

  getTabs(isCompany) {
    const cfg = actorConfig.tenant;
    return [...(isCompany ? cfg.companyTabs : cfg.personTabs)] as WizardTab[];
  },

  useSave({ token }) {
    return useActorUpdateSave('tenant', token);
  },

  getDocumentsSaveData(additionalInfo) {
    return { additionalInfo };
  },

  renderTab(tabId, ctx) {
    const tenantType = ctx.initialData?.tenantType || 'INDIVIDUAL';
    switch (tabId) {
      case 'personal':
        return (
          <TenantPersonalInfoTabRHF
            tenantType={tenantType}
            initialData={ctx.initialData}
            onSave={ctx.saveTab('personal')}
            disabled={ctx.disabled}
          />
        );
      case 'employment':
        return (
          <TenantEmploymentTabRHF
            initialData={ctx.initialData}
            onSave={ctx.saveTab('employment')}
            disabled={ctx.disabled}
          />
        );
      case 'rental':
        return (
          <TenantRentalHistoryTabRHF
            initialData={ctx.initialData}
            onSave={ctx.saveTab('rental')}
            disabled={ctx.disabled}
          />
        );
      case 'references':
        return (
          <TenantReferencesTabRHF
            tenantType={tenantType}
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
      <TenantDocumentsSection
        token={ctx.token}
        tenantId={ctx.initialData?.id}
        tenantType={ctx.initialData?.tenantType || 'INDIVIDUAL'}
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
