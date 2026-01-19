'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { ActorType } from '@/lib/utils/actor';
import { downloadPolicyPdf } from '@/lib/pdf/downloadPdf';
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

export function usePolicyActions({ policyId, policyNumber, onRefresh }: UsePolicyActionsProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [sending, setSending] = useState<string | null>(null);
  const [editingActor, setEditingActor] = useState<EditingActor | null>(null);
  const [markCompleteActor, setMarkCompleteActor] = useState<MarkCompleteActor | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Send invitations mutation
  const sendInvitationsMutation = trpc.policy.sendInvitations.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invitaciones enviadas',
        description: 'Las invitaciones han sido enviadas exitosamente',
      });
      onRefresh();
    },
    onError: (error) => {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Error',
        description: 'Error al enviar invitaciones',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setSending(null);
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.policy.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Protección aprobada',
        description: 'La protección ha sido aprobada exitosamente',
      });
      onRefresh();
    },
    onError: (error) => {
      console.error('Error updating policy status:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar el estado de la protección',
        variant: 'destructive',
      });
    },
  });

  // Admin submit actor mutation (mark as complete)
  const adminSubmitMutation = trpc.actor.adminSubmitActor.useMutation({
    onSuccess: () => {
      toast({
        title: 'Actor marcado como completo',
        description: 'El actor ha sido marcado como completo exitosamente',
      });
      utils.actor.listByPolicy.invalidate({ policyId });
      onRefresh();
      setMarkCompleteActor(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al marcar como completo',
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

  const approvePolicy = () => {
    if (!confirm('¿Estás seguro de que deseas aprobar esta protección?')) return;
    updateStatusMutation.mutate({
      policyId,
      status: 'APPROVED' as const,
    });
  };

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
        title: t.pages.policies.details.toast.pdfGenerated,
        description: t.pages.policies.details.toast.pdfGeneratedDesc,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al descargar PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
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

    // Mutations loading states
    isSending: sendInvitationsMutation.isPending,
    isApproving: updateStatusMutation.isPending,
    isMarkingComplete: adminSubmitMutation.isPending,

    // Handlers
    handleSendInvitations,
    sendIndividualInvitation,
    approvePolicy,
    handleMarkComplete,
    handleDownloadPdf,

    // Actor callbacks
    handleEditActor,
    handleMarkActorComplete,
    closeEditingActor,
    closeMarkComplete,
  };
}
