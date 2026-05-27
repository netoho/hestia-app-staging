'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { ActorType } from '@/lib/utils/actor';
import { downloadPolicyPdf } from '@/lib/pdf/downloadPdf';
import { downloadContractCover } from '@/lib/docx/downloadDocx';
import { t } from '@/lib/i18n';
import {
  getFriendlyError,
  readForceCompleteState,
  type MissingField,
} from '@/lib/utils/trpcErrors';

interface UsePolicyActionsProps {
  policyId: string;
  policyNumber: string;
  onRefresh: () => Promise<void>;
}

interface MarkCompleteActor {
  type: ActorType;
  actorId: string;
  name: string;
}

interface EditingActor {
  type: ActorType;
  actorId: string;
}

export type PendingActionType = 'approve' | null;

export function usePolicyActions({ policyId, policyNumber, onRefresh }: UsePolicyActionsProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const toastKeys = t.pages.policies.details.toast;

  const [sending, setSending] = useState<string | null>(null);
  const [editingActor, setEditingActor] = useState<EditingActor | null>(null);
  const [markCompleteActor, setMarkCompleteActor] = useState<MarkCompleteActor | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingActionType>(null);
  // When the first submit attempt fails with `requiresForce: true`, we
  // remember what was missing so the dialog can show the confirm-force
  // step with the exact fields/documents the admin is about to override.
  const [forceCompleteState, setForceCompleteState] = useState<
    { missingFields: MissingField[]; missingDocuments: string[] } | null
  >(null);

  // Send invitations mutation
  const sendInvitationsMutation = trpc.policy.sendInvitations.useMutation({
    onSuccess: () => {
      toast({
        title: toastKeys.invitationsSent,
        description: toastKeys.invitationsSentDesc,
      });
      onRefresh();
    },
    onError: (error) => {
      console.error('Error sending invitations:', error);
      toast({
        title: toastKeys.error,
        description: toastKeys.invitationsError,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setSending(null);
    },
  });

  // Update status mutation (handles approve → ACTIVE)
  const updateStatusMutation = trpc.policy.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: toastKeys.policyApproved,
        description: toastKeys.policyApprovedDesc,
      });
      onRefresh();
    },
    onError: (error) => {
      console.error('Error updating policy status:', error);
      const friendly = getFriendlyError(error);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: 'destructive',
      });
    },
  });

  // Admin submit actor mutation (mark as complete)
  const adminSubmitMutation = trpc.actor.adminSubmitActor.useMutation({
    onSuccess: () => {
      toast({
        title: toastKeys.actorMarkedComplete,
        description: toastKeys.actorMarkedCompleteDesc,
      });
      utils.actor.listByPolicy.invalidate({ policyId });
      onRefresh();
      setMarkCompleteActor(null);
      setForceCompleteState(null);
    },
    onError: (error) => {
      // Smart fallback: if the server says `requiresForce`, switch the dialog
      // into a confirm-force step with the exact missing data. No toast yet.
      const force = readForceCompleteState(error);
      if (force.requiresForce) {
        setForceCompleteState({
          missingFields: force.missingFields,
          missingDocuments: force.missingDocuments,
        });
        return;
      }
      setForceCompleteState(null);
      const friendly = getFriendlyError(error);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleSendInvitations = () => {
    setSending('all');
    sendInvitationsMutation.mutate({
      policyId,
      resend: true,
    });
  };

  const sendIndividualInvitation = (actorType: string, actorId: string) => {
    setSending(actorId);
    sendInvitationsMutation.mutate({
      policyId,
      actors: [actorType],
      resend: true,
    });
  };

  // Instead of confirm(), set pending action state
  const approvePolicy = () => setPendingAction('approve');

  // Called from the AlertDialog confirm button
  const confirmPendingAction = () => {
    switch (pendingAction) {
      case 'approve':
        updateStatusMutation.mutate({ policyId, status: 'ACTIVE' as const });
        break;
    }
    setPendingAction(null);
  };

  const cancelPendingAction = () => setPendingAction(null);

  // First click: try a strict submit. Server may respond with
  // requiresForce, in which case the mutation's onError populates
  // forceCompleteState and the dialog adapts to step 2.
  const handleMarkComplete = () => {
    if (!markCompleteActor) return;
    adminSubmitMutation.mutate({
      type: markCompleteActor.type,
      id: markCompleteActor.actorId,
      skipValidation: false,
    });
  };

  // Step 2: admin confirms after seeing what's missing.
  const handleConfirmForceComplete = () => {
    if (!markCompleteActor) return;
    adminSubmitMutation.mutate({
      type: markCompleteActor.type,
      id: markCompleteActor.actorId,
      skipValidation: true,
    });
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadPolicyPdf(policyId, policyNumber);
      toast({
        title: toastKeys.pdfGenerated,
        description: toastKeys.pdfGeneratedDesc,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      const friendly = getFriendlyError(error);
      toast({
        title: friendly.title,
        description: friendly.description || 'Error al descargar PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      await downloadContractCover(policyId, policyNumber);
      toast({
        title: 'Carátula generada',
        description: 'La carátula se descargó correctamente',
      });
    } catch (error) {
      console.error('Error downloading cover page:', error);
      const friendly = getFriendlyError(error);
      toast({
        title: friendly.title,
        description: friendly.description || 'Error al descargar carátula',
        variant: 'destructive',
      });
    } finally {
      setDownloadingDocx(false);
    }
  };

  // Actor callbacks for ActorCard
  const handleEditActor = (type: ActorType, actorId: string) => {
    setEditingActor({ type, actorId });
  };

  const handleMarkActorComplete = (type: ActorType, actorId: string, name: string) => {
    setMarkCompleteActor({ type, actorId, name });
  };

  const closeEditingActor = () => setEditingActor(null);
  const closeMarkComplete = () => {
    setMarkCompleteActor(null);
    setForceCompleteState(null);
  };

  return {
    // State
    sending,
    editingActor,
    markCompleteActor,
    downloadingPdf,
    downloadingDocx,
    pendingAction,
    forceCompleteState,

    // Mutations loading states
    isSending: sendInvitationsMutation.isPending,
    isApproving: updateStatusMutation.isPending,
    isMarkingComplete: adminSubmitMutation.isPending,

    // Handlers
    handleSendInvitations,
    sendIndividualInvitation,
    approvePolicy,
    confirmPendingAction,
    cancelPendingAction,
    handleMarkComplete,
    handleConfirmForceComplete,
    handleDownloadPdf,
    handleDownloadDocx,

    // Actor callbacks
    handleEditActor,
    handleMarkActorComplete,
    closeEditingActor,
    closeMarkComplete,
  };
}
