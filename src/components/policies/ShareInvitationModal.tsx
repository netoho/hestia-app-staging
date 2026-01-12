'use client';

import {useEffect, useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import {
  Copy,
  Mail,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  Phone,
  AlertCircle,
} from 'lucide-react';

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

interface ShareInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  policyNumber: string;
}

export default function ShareInvitationModal({
  isOpen,
  onClose,
  policyId,
  policyNumber,
}: ShareInvitationModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedActors, setSelectedActors] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<Set<string>>(new Set());

  // Fetch share links using tRPC
  const { data, isLoading, error } = trpc.policy.getShareLinks.useQuery(
    { policyId },
    {
      enabled: isOpen && !!policyId,
      refetchOnWindowFocus: false,
    }
  );

  const shareLinks = data?.shareLinks || [];

  const handleCopyLink = async (url: string, actorName: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast({
        title: 'Enlace copiado',
        description: `El enlace para ${actorName} ha sido copiado al portapapeles`,
      });

      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  };

  const handleWhatsApp = (phone: string, url: string, actorName: string) => {
    const message = `Hola ${actorName}, te compartimos el enlace para completar tu información de la protección ${policyNumber}: ${url}`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // tRPC mutation for sending emails
  const sendInvitations = trpc.policy.sendInvitations.useMutation({
    onSuccess: () => {
      toast({
        title: 'Correo enviado',
        description: 'La invitación ha sido enviada exitosamente',
      });
      // Invalidate and refetch share links and related data
      utils.policy.getShareLinks.invalidate({ policyId });
      utils.policy.getById.invalidate({ id: policyId });
      utils.actor.listByPolicy.invalidate({ policyId });
    },
    onError: (error) => {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el correo',
        variant: 'destructive',
      });
    },
  });

  const handleSendEmail = async (actorId: string, actorType: string) => {
    setSendingEmail(prev => new Set(prev).add(actorId));

    try {
      await sendInvitations.mutateAsync({
        policyId,
        actors: [actorType],
        resend: true,
      });
    } finally {
      setSendingEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(actorId);
        return newSet;
      });
    }
  };

  const handleBatchCopy = () => {
    const selectedLinks = shareLinks
      .filter(link => selectedActors.has(link.actorId))
      .map(link => `${link.actorName}: ${link.url}`)
      .join('\n\n');

    navigator.clipboard.writeText(selectedLinks);
    toast({
      title: 'Enlaces copiados',
      description: `${selectedActors.size} enlaces han sido copiados`,
    });
  };

  const handleBatchEmail = async () => {
    const selectedTypes = shareLinks
      .filter(link => selectedActors.has(link.actorId))
      .map(link => link.actorType);

    try {
      await sendInvitations.mutateAsync({
        policyId,
        actors: selectedTypes,
        resend: true,
      });

      toast({
        title: 'Correos enviados',
        description: `${selectedActors.size} invitaciones han sido enviadas`,
      });

      setSelectedActors(new Set());
    } catch (error) {
      // Error is already handled by the mutation onError
    }
  };

  const toggleActorSelection = (actorId: string) => {
    setSelectedActors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actorId)) {
        newSet.delete(actorId);
      } else {
        newSet.add(actorId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedActors.size === shareLinks.length) {
      setSelectedActors(new Set());
    } else {
      setSelectedActors(new Set(shareLinks.map(link => link.actorId)));
    }
  };

  const getActorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tenant: 'Inquilino',
      landlord: 'Arrendador',
      'joint-obligor': 'Obligado Solidario',
      aval: 'Aval',
    };
    return labels[type] || type;
  };

  const isTokenExpired = (expiry: string) => {
    return new Date(expiry) < new Date();
  };

  useEffect(() => {
    if (isOpen) {
      utils.policy.getShareLinks.invalidate({ policyId });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartir Enlaces de Invitación</DialogTitle>
          <DialogDescription>
            Enlaces de acceso de la protección <strong>{policyNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">
              Error al cargar los enlaces. Por favor, intenta de nuevo.
            </p>
          </div>
        ) : shareLinks.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No hay enlaces disponibles. Primero envía las invitaciones para generar los tokens.
            </p>
          </div>
        ) : (
          <>
            {/* Batch Actions */}
            {selectedActors.size > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900">
                  {selectedActors.size} actor(es) seleccionado(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchCopy}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Enlaces
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBatchEmail}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Correos
                  </Button>
                </div>
              </div>
            )}

            {/* Select All */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={selectedActors.size === shareLinks.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">Seleccionar todos</span>
            </div>

            {/* Actor List */}
            <div className="space-y-4">
              {shareLinks.map((link) => {
                const expired = isTokenExpired(link.tokenExpiry);

                return (
                  <div
                    key={link.actorId}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedActors.has(link.actorId)}
                        onCheckedChange={() => toggleActorSelection(link.actorId)}
                        className="mt-1"
                      />

                      {/* Actor Info */}
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">{link.actorName}</span>
                              <Badge variant="outline" className="text-xs">
                                {getActorTypeLabel(link.actorType)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {link.email}
                              </span>
                              {link.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {link.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex flex-col items-end gap-1">
                            {link.informationComplete ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completo
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-500 text-white">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive" className="text-xs">
                                Token Expirado
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* URL Display */}
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded text-xs font-mono max-w-md">
                          <span className="flex-1 truncate">{link.url}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(link.url, link.actorName)}
                            disabled={expired}
                          >
                            {copiedUrl === link.url ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Enlace
                              </>
                            )}
                          </Button>

                          {link.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWhatsApp(link.phone!, link.url, link.actorName)}
                              disabled={expired}
                              className="text-green-600 hover:text-green-700"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail(link.actorId, link.actorType)}
                            disabled={sendingEmail.has(link.actorId) || expired}
                          >
                            {sendingEmail.has(link.actorId) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Mail className="h-4 w-4 mr-2" />
                                Enviar Correo
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expiry Info */}
                        <div className="text-xs text-gray-500">
                          {expired ? (
                            <span className="text-red-600">
                              El token expiró el {new Date(link.tokenExpiry).toLocaleDateString()}
                            </span>
                          ) : (
                            <span>
                              Enlace válida hasta: {new Date(link.tokenExpiry).toLocaleDateString()} a las{' '}
                              {new Date(link.tokenExpiry).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { handleClose(); }}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
