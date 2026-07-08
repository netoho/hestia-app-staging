'use client';

import { useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { actorConfig } from '@/lib/constants/actorConfig';
import type {
  ActorWizardConfig,
  ActorWizardSave,
  WizardTab,
} from '@/components/actor/ActorWizard';
import LandlordOwnerInfoTabRHF from './LandlordOwnerInfoTab-RHF';
import PropertyDetailsFormRHF from './PropertyDetailsForm-RHF';
import FinancialInfoFormRHF from './FinancialInfoForm-RHF';
import DocumentsSection from './DocumentsSection';

/**
 * Landlord is the divergent actor: the portal is a COLLECTIVE form (every
 * co-owner's card), saves fan out to three mutations (actor.update,
 * savePropertyDetails, savePolicyFinancial) plus deleteCoOwner, and the
 * session is scoped to the TOKEN's landlord (selfId) — keying anything off
 * the legacy "primary" gave a company co-owner the individual doc set
 * (PR #178). Primary/first remain only as fallbacks for admin-edit flows
 * that pass no selfId.
 */
function useLandlordSave({ token }: { token: string }): ActorWizardSave {
  const utils = trpc.useUtils();
  const invalidate = () => utils.actor.getManyByToken.invalidate({ type: 'landlord', token });

  const updateMutation = trpc.actor.update.useMutation({ onSuccess: invalidate });
  const savePropertyDetailsMutation = trpc.actor.savePropertyDetails.useMutation({
    onSuccess: invalidate,
  });
  const savePolicyFinancialMutation = trpc.actor.savePolicyFinancial.useMutation({
    onSuccess: invalidate,
  });
  const deleteMutation = trpc.actor.deleteCoOwner.useMutation({ onSuccess: invalidate });

  const saveTab = useCallback(
    async (tabName: string, data: any) => {
      if (tabName === 'property-info') {
        // Dedicated mutation for PropertyDetails
        await savePropertyDetailsMutation.mutateAsync({
          type: 'landlord',
          identifier: token,
          propertyDetails: data,
        });
        return;
      }

      if (tabName === 'financial-info') {
        // Saves both landlord banking data AND policy financial data
        const { policyFinancial, ...landlordData } = data;
        await updateMutation.mutateAsync({
          type: 'landlord',
          identifier: token,
          data: { ...landlordData, partial: true, tabName },
        });
        if (policyFinancial) {
          await savePolicyFinancialMutation.mutateAsync({
            type: 'landlord',
            identifier: token,
            policyFinancial,
          });
        }
        return;
      }

      await updateMutation.mutateAsync({
        type: 'landlord',
        identifier: token,
        data: { ...data, partial: true, tabName },
      });
    },
    [token, updateMutation, savePropertyDetailsMutation, savePolicyFinancialMutation],
  );

  const deleteLandlord = useCallback(
    async (landlordId: string) => {
      await deleteMutation.mutateAsync({ type: 'landlord', id: landlordId });
    },
    [deleteMutation],
  );

  return {
    saveTab,
    isSaving:
      updateMutation.isPending ||
      savePropertyDetailsMutation.isPending ||
      savePolicyFinancialMutation.isPending,
    extras: { deleteLandlord },
  };
}

export const landlordWizardConfig: ActorWizardConfig = {
  actorType: 'landlord',
  initialActiveTab: 'owner-info',

  resolveContext(initialData, selfId) {
    const landlords = initialData?.landlords || (initialData ? [initialData] : []);
    const self =
      (selfId ? landlords.find((l: any) => l.id === selfId) : undefined) ??
      landlords.find((l: any) => l.isPrimary) ??
      landlords[0] ??
      {};
    return { isCompany: self?.isCompany ?? false, self };
  },

  getTabs(isCompany) {
    const cfg = actorConfig.landlord;
    return [...(isCompany ? cfg.companyTabs : cfg.personTabs)] as WizardTab[];
  },

  useSave: useLandlordSave,

  getDocumentsSaveData() {
    return {};
  },

  renderTab(tabId, ctx) {
    switch (tabId) {
      case 'owner-info':
        return (
          <LandlordOwnerInfoTabRHF
            initialData={ctx.initialData?.landlords || [ctx.initialData]}
            onSave={ctx.saveTab('owner-info')}
            onDelete={ctx.extras.deleteLandlord as (landlordId: string) => Promise<void>}
            disabled={ctx.disabled}
          />
        );
      case 'property-info':
        return (
          <PropertyDetailsFormRHF
            initialData={ctx.initialData?.propertyDetails || {}}
            onSave={ctx.saveTab('property-info')}
            disabled={ctx.disabled}
          />
        );
      case 'financial-info':
        return (
          <FinancialInfoFormRHF
            initialData={{
              landlord: ctx.self,
              policyFinancial: ctx.initialData?.policyFinancialData || {},
            }}
            onSave={ctx.saveTab('financial-info')}
            policy={ctx.policy}
            token={ctx.token}
            landlordId={ctx.self?.id}
            isAdminEdit={ctx.isAdminEdit}
            disabled={ctx.disabled}
          />
        );
      default:
        return null;
    }
  },

  renderDocumentsSection(ctx) {
    return (
      <DocumentsSection
        token={ctx.token}
        landlordId={ctx.self?.id}
        isCompany={ctx.isCompany}
        allTabsSaved={ctx.allTabsSaved || ctx.isAdminEdit}
        initialDocuments={ctx.initialData?.documents || []}
        onRequiredDocsChange={ctx.setRequiredDocsUploaded}
        isAdminEdit={ctx.isAdminEdit}
      />
    );
  },
};
