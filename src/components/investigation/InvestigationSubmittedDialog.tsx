'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  MessageCircle,
  CheckCircle2,
  User,
  Building2,
} from 'lucide-react';

interface ApprovalUrls {
  broker: string;
  landlord: string;
  brokerPhone?: string | null;
  landlordPhone?: string | null;
  brokerName: string;
  landlordName: string;
}

interface InvestigationSubmittedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  policyNumber: string;
  actorName: string;
  approvalUrls: ApprovalUrls;
}

export function InvestigationSubmittedDialog({
  isOpen,
  onClose,
  policyId,
  policyNumber,
  actorName,
  approvalUrls,
}: InvestigationSubmittedDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopyLink = async (url: string, recipientName: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast({
        title: 'Enlace copiado',
        description: `El enlace para ${recipientName} ha sido copiado al portapapeles`,
      });

      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  };

  const handleWhatsApp = (phone: string, url: string, recipientName: string) => {
    const message = `Hola ${recipientName}, te compartimos el enlace para aprobar la investigación de la protección ${policyNumber}: ${url}`;
    // Normalize phone: remove non-digits, add +52 for Mexican numbers
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `52${normalizedPhone}`;
    } else if (normalizedPhone.startsWith('1') && normalizedPhone.length === 11) {
      // US number format
      normalizedPhone = normalizedPhone;
    } else if (!normalizedPhone.startsWith('52') && normalizedPhone.length < 12) {
      normalizedPhone = `52${normalizedPhone}`;
    }
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClose = () => {
    onClose();
    router.push(`/dashboard/policies/${policyId}/investigations`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle>Investigación Enviada</DialogTitle>
              <DialogDescription>
                La investigación de <strong>{actorName}</strong> ha sido enviada para aprobación.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Se han enviado correos de notificación. Si necesitas compartir los enlaces manualmente:
          </p>

          {/* Broker Link */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{approvalUrls.brokerName}</span>
              <Badge variant="outline" className="text-xs">Broker</Badge>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded text-xs font-mono">
              <span className="flex-1 truncate">{approvalUrls.broker}</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(approvalUrls.broker, approvalUrls.brokerName)}
                className="flex-1"
              >
                {copiedUrl === approvalUrls.broker ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Landlord Link */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{approvalUrls.landlordName}</span>
              <Badge variant="outline" className="text-xs">Arrendador</Badge>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded text-xs font-mono">
              <span className="flex-1 truncate">{approvalUrls.landlord}</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(approvalUrls.landlord, approvalUrls.landlordName)}
                className="flex-1"
              >
                {copiedUrl === approvalUrls.landlord ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
              {approvalUrls.landlordPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleWhatsApp(
                      approvalUrls.landlordPhone!,
                      approvalUrls.landlord,
                      approvalUrls.landlordName
                    )
                  }
                  className="text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            Ver Investigaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InvestigationSubmittedDialog;
