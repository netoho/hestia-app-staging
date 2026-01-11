'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';
import { PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';
import type { PaymentWithStatus } from '@/lib/services/paymentService';

interface VerifyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithStatus;
  onSuccess: () => void;
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.INVESTIGATION_FEE]: 'Cuota de Investigación',
  [PaymentType.TENANT_PORTION]: 'Porción del Inquilino',
  [PaymentType.LANDLORD_PORTION]: 'Porción del Arrendador',
  [PaymentType.POLICY_PREMIUM]: 'Prima de Póliza',
  [PaymentType.PARTIAL_PAYMENT]: 'Pago Parcial',
  [PaymentType.INCIDENT_PAYMENT]: 'Pago por Incidencia',
  [PaymentType.REFUND]: 'Reembolso',
};

const PAYER_TYPE_LABELS: Record<PayerType, string> = {
  [PayerType.TENANT]: 'Inquilino',
  [PayerType.LANDLORD]: 'Arrendador',
  [PayerType.JOINT_OBLIGOR]: 'Obligado Solidario',
  [PayerType.AVAL]: 'Aval',
  [PayerType.COMPANY]: 'Empresa',
};

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VerifyPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: VerifyPaymentDialogProps) {
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const verifyPayment = trpc.payment.verifyPayment.useMutation();

  const isSubmitting = verifyPayment.isPending;

  const handleVerify = async (approved: boolean) => {
    setAction(approved ? 'approve' : 'reject');

    try {
      await verifyPayment.mutateAsync({
        paymentId: payment.id,
        approved,
        notes: notes || undefined,
      });

      setNotes('');
      setAction(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setAction(null);
    }
  };

  const typeLabel = PAYMENT_TYPE_LABELS[payment.type as PaymentType] || payment.type;
  const payerLabel = PAYER_TYPE_LABELS[payment.paidBy as PayerType] || payment.paidBy;

  const handleDownloadReceipt = async () => {
    if (!payment.receiptS3Key) return;

    try {
      const response = await fetch(`/api/payments/${payment.id}/receipt`);
      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificar Pago Manual</DialogTitle>
          <DialogDescription>
            Revise los detalles del pago y apruebe o rechace la solicitud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment details */}
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de Pago</span>
              <span className="font-medium">{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagado Por</span>
              <span>{payerLabel}</span>
            </div>
            {payment.reference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-mono text-xs">{payment.reference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registrado</span>
              <span>{formatDate(payment.createdAt)}</span>
            </div>
          </div>

          {/* Receipt download */}
          {payment.receiptFileName && (
            <div className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{payment.receiptFileName}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadReceipt}
              >
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
            </div>
          )}

          {/* Notes input */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas de Verificación (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregue notas sobre la verificación..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleVerify(false)}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'reject' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </>
            )}
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleVerify(true)}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'approve' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aprobando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprobar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
