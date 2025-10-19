import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

interface ShareLinksData {
  policyNumber: string;
  shareLinks: ActorShareLink[];
}

interface UseShareLinksReturn {
  loading: boolean;
  error: Error | null;
  shareLinks: ActorShareLink[];
  policyNumber: string | null;
  copyToClipboard: (url: string, actorName: string) => Promise<void>;
  generateWhatsAppUrl: (phone: string, url: string, actorName: string, policyNumber: string) => string;
  resendEmail: (actorId: string, actorType: string) => Promise<void>;
  refetch: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [shareLinks, setShareLinks] = useState<ActorShareLink[]>([]);
  const [policyNumber, setPolicyNumber] = useState<string | null>(null);

  const fetchShareLinks = useCallback(async () => {
    if (!policyId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/policies/${policyId}/share-links`);

      if (!response.ok) {
        throw new Error('Failed to fetch share links');
      }

      const data = await response.json();

      if (data.success) {
        setShareLinks(data.data.shareLinks || []);
        setPolicyNumber(data.data.policyNumber || null);
      } else {
        throw new Error(data.error || 'Failed to fetch share links');
      }
    } catch (err) {
      console.error('Error fetching share links:', err);
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);

      toast({
        title: 'Error',
        description: 'No se pudieron cargar los enlaces de invitación',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [policyId, toast]);

  useEffect(() => {
    fetchShareLinks();
  }, [fetchShareLinks]);

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
    try {
      const response = await fetch(`/api/policies/${policyId}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actors: [actorType],
          resend: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast({
        title: 'Correo enviado',
        description: 'La invitación ha sido enviada exitosamente',
      });

      // Refetch share links after sending email
      await fetchShareLinks();
    } catch (err) {
      console.error('Error sending email:', err);

      toast({
        title: 'Error',
        description: 'No se pudo enviar el correo',
        variant: 'destructive',
      });

      throw err;
    }
  }, [policyId, toast, fetchShareLinks]);

  return {
    loading,
    error,
    shareLinks,
    policyNumber,
    copyToClipboard,
    generateWhatsAppUrl,
    resendEmail,
    refetch: fetchShareLinks,
  };
}
