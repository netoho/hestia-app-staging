'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { ActorType } from '@/lib/utils/actor';
import { downloadPolicyPdf } from '@/lib/pdf/downloadPdf';
import { downloadContractCover } from '@/lib/docx/downloadDocx';
import { t } from '@/lib/i18n';

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
      toast({
        title: toastKeys.error,
        description: error.message || toastKeys.approvalError,
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
    },
    onError: (error) => {
      toast({
        title: toastKeys.error,
        description: error.message || toastKeys.markCompleteError,
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

  const handleMarkComplete = (skipValidation: boolean) => {
    if (!markCompleteActor) return;
    adminSubmitMutation.mutate({
      type: markCompleteActor.type,
      id: markCompleteActor.actorId,
      skipValidation,
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
      toast({
        title: toastKeys.error,
        description: error instanceof Error ? error.message : 'Error al descargar PDF',
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
      toast({
        title: toastKeys.error,
        description: error instanceof Error ? error.message : 'Error al descargar carátula',
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
  const closeMarkComplete = () => setMarkCompleteActor(null);

  return {
    // State
    sending,
    editingActor,
    markCompleteActor,
    downloadingPdf,
    downloadingDocx,
    pendingAction,

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
    handleDownloadPdf,
    handleDownloadDocx,

    // Actor callbacks
    handleEditActor,
    handleMarkActorComplete,
    closeEditingActor,
    closeMarkComplete,
  };
}
