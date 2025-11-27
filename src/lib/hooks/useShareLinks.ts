import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

interface ActorShareLink {
  actorId: string;
  actorType: 'tenant' | 'landlord' | 'joint-obligor' | 'aval';
  actorName: string;
  email: string;
  phone?: string;
  url: string;
  tokenExpiry: string;
  informationComplete: boolean;
}

interface UseShareLinksReturn {
  loading: boolean;
  error: Error | null;
  shareLinks: ActorShareLink[];
  policyNumber: string | null;
  copyToClipboard: (url: string, actorName: string) => Promise<void>;
  generateWhatsAppUrl: (phone: string, url: string, actorName: string, policyNumber: string) => string;
  resendEmail: (actorId: string, actorType: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Hook to manage share links for policy actors
 *
 * Fetches share links from API and provides helpers for:
 * - Copy to clipboard
 * - WhatsApp sharing
 * - Email resending
 */
export function useShareLinks(policyId: string): UseShareLinksReturn {
  const { toast } = useToast();

  // tRPC query for share links
  const { data, isLoading, error, refetch } = trpc.policy.getShareLinks.useQuery(
    { policyId },
    { enabled: !!policyId }
  );

  // tRPC mutation for sending invitations
  const sendInvitationsMutation = trpc.policy.sendInvitations.useMutation({
    onSuccess: () => {
      toast({
        title: 'Correo enviado',
        description: 'La invitación ha sido enviada exitosamente',
      });
      refetch();
    },
    onError: (err) => {
      console.error('Error sending email:', err);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el correo',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = useCallback(async (url: string, actorName: string) => {
    try {
      await navigator.clipboard.writeText(url);

      toast({
        title: 'Enlace copiado',
        description: `El enlace para ${actorName} ha sido copiado al portapapeles`,
      });
    } catch (err) {
      console.error('Error copying to clipboard:', err);

      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });

      throw err;
    }
  }, [toast]);

  const generateWhatsAppUrl = useCallback((
    phone: string,
    url: string,
    actorName: string,
    policyNumber: string
  ): string => {
    const message = `Hola ${actorName}, te compartimos el enlace para completar tu información de la protección ${policyNumber}: ${url}`;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }, []);

  const resendEmail = useCallback(async (actorId: string, actorType: string) => {
    await sendInvitationsMutation.mutateAsync({
      policyId,
      actors: [actorType],
      resend: true,
    });
  }, [policyId, sendInvitationsMutation]);

  return {
    loading: isLoading,
    error: error ? new Error(error.message) : null,
    shareLinks: (data?.shareLinks || []) as ActorShareLink[],
    policyNumber: data?.policyNumber || null,
    copyToClipboard,
    generateWhatsAppUrl,
    resendEmail,
    refetch,
  };
}
