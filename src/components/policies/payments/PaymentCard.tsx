'use client';

import { useState } from 'react';
import { useDialogState } from '@/lib/hooks/useDialogState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  FileText,
  Ban,
  Download,
  Copy,
  Check,
  Pencil,
  RefreshCw,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { PaymentStatus, PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';
import type { PaymentWithStatus } from '@/lib/services/paymentService';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/formatting';
import { PAYMENT_TYPE_LABELS, PAYER_TYPE_LABELS } from '@/lib/constants/paymentConfig';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';

interface PaymentCardProps {
  payment: PaymentWithStatus;
  isStaffOrAdmin: boolean;
  onManualPayment?: () => void;
  onVerify?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  isCancelling?: boolean;
  isHistorical?: boolean;
}

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon: React.ElementType }
> = {
  [PaymentStatus.PENDING]: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  [PaymentStatus.PROCESSING]: { label: 'Procesando', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600', icon: Loader2 },
  [PaymentStatus.COMPLETED]: { label: 'Completado', variant: 'default', className: 'bg-green-500 hover:bg-green-600', icon: CheckCircle2 },
  [PaymentStatus.FAILED]: { label: 'Fallido', variant: 'destructive', icon: XCircle },
  [PaymentStatus.CANCELLED]: { label: 'Cancelado', variant: 'outline', icon: Ban },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsado', variant: 'outline', icon: RefreshCw },
  [PaymentStatus.PARTIAL]: { label: 'Parcial', variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600', icon: Clock },
  [PaymentStatus.PENDING_VERIFICATION]: { label: 'Por Verificar', variant: 'default', className: 'bg-orange-500 hover:bg-orange-600', icon: Eye },
};

export function PaymentCard({
  payment,
  isStaffOrAdmin,
  onManualPayment,
  onVerify,
  onCancel,
  onEdit,
  isCancelling = false,
  isHistorical = false,
}: PaymentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingStripeReceipt, setIsDownloadingStripeReceipt] = useState(false);
  const [isCopiedCard, setIsCopiedCard] = useState(false);
  const [isCopiedSpei, setIsCopiedSpei] = useState(false);
  const cancelDialog = useDialogState();
  const { toast } = useToast();
  const getStripeReceipt = trpc.payment.getStripeReceipt.useMutation();

  const getPaymentUrl = (type: 'card' | 'spei') => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${baseUrl}/payments/${payment.id}`;
    return type === 'spei' ? `${base}/spei` : base;
  };

  const handleCopyUrl = async (type: 'card' | 'spei') => {
    try {
      await navigator.clipboard.writeText(getPaymentUrl(type));
      const setter = type === 'card' ? setIsCopiedCard : setIsCopiedSpei;
      setter(true);
      toast({
        title: 'URL copiada',
        description: `El link de pago por ${type === 'card' ? 'tarjeta' : 'SPEI'} ha sido copiado al portapapeles`,
      });
      setTimeout(() => setter(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el link',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReceipt = async () => {
    if (!payment.receiptS3Key) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}/receipt`);
      if (!response.ok) throw new Error('Failed to get download URL');

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading receipt:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStripeReceipt = async () => {
    setIsDownloadingStripeReceipt(true);
    try {
      const result = await getStripeReceipt.mutateAsync({ paymentId: payment.id });
      if (result.receiptUrl) {
        window.open(result.receiptUrl, '_blank');
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo obtener el comprobante de Stripe',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al obtener el comprobante',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingStripeReceipt(false);
    }
  };

  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status as PaymentStatus];
  const StatusIcon = statusConfig.icon;
  const typeLabel = PAYMENT_TYPE_LABELS[payment.type as PaymentType] || payment.type;
  const payerLabel = PAYER_TYPE_LABELS[payment.paidBy as PayerType] || payment.paidBy;

  const isPending = payment.status === PaymentStatus.PENDING;
  const isPendingVerification = payment.status === PaymentStatus.PENDING_VERIFICATION;
  const isCompleted = payment.status === PaymentStatus.COMPLETED;
  const isFailed = payment.status === PaymentStatus.FAILED;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{typeLabel}</CardTitle>
          <Badge variant={statusConfig.variant} className={statusConfig.className}>
            <StatusIcon className={`h-3.5 w-3.5 mr-1 ${payment.status === PaymentStatus.PROCESSING ? 'animate-spin' : ''}`} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Amount breakdown and payer */}
        <div className="space-y-1 text-base">
          {/* IVA Breakdown - use stored values with fallback for legacy payments */}
          {(() => {
            // Use stored subtotal/iva if available, otherwise calculate (legacy payments)
            const subtotal = payment.subtotal ?? Math.round((payment.amount / (1 + TAX_CONFIG.IVA_RATE)) * 100) / 100;
            const iva = payment.iva ?? Math.round((payment.amount - subtotal) * 100) / 100;
            return (
              <div className="space-y-0.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
                {payment.speiFundedAmount != null && payment.speiFundedAmount > 0 && (
                  <>
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Pagado</span>
                      <span>{formatCurrency(payment.speiFundedAmount)}</span>
                    </div>
                    {!isCompleted && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Restante</span>
                        <span>{formatCurrency(payment.amount - payment.speiFundedAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                {payment.overpaymentAmount != null && payment.overpaymentAmount > 0 && (
                  <div className="flex justify-between text-orange-600 font-semibold">
                    <span>Sobrepago</span>
                    <span>{formatCurrency(payment.overpaymentAmount)}</span>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex justify-between pt-1 border-t">
            <span className="text-muted-foreground">Pagador</span>
            <span>{payerLabel}</span>
          </div>
          {payment.reference && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referencia</span>
              <span className="font-mono text-sm">{payment.reference}</span>
            </div>
          )}
          {isCompleted && payment.paidAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha de pago</span>
              <span>{formatDateTime(payment.paidAt)}</span>
            </div>
          )}
        </div>

        {/* Receipt info (manual payments) */}
        {payment.receiptFileName && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Comprobante: {payment.receiptFileName}</span>
            </div>
            {payment.receiptS3Key && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Stripe receipt download (for completed Stripe payments without manual receipt) */}
        {isCompleted && payment.stripeIntentId && !payment.receiptS3Key && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Pago con tarjeta</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={handleDownloadStripeReceipt}
              disabled={isDownloadingStripeReceipt}
            >
              {isDownloadingStripeReceipt ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  <span>Comprobante</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* SPEI Transfers history */}
        {payment.transfers && payment.transfers.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-sm text-muted-foreground px-0 h-8">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {payment.transfers.length} transferencia{payment.transfers.length > 1 ? 's' : ''} SPEI
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                {payment.transfers.map((transfer) => (
                  <div key={transfer.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="text-muted-foreground">
                      {formatDateTime(transfer.receivedAt)}
                    </span>
                    <span className="font-medium text-green-700">
                      +{formatCurrency(transfer.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions (hidden for historical payments) */}
        {!isHistorical && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2">
          {/* Copy payment URL buttons */}
          {isPending && !payment.isManual && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyUrl('card')}
                disabled={isCopiedCard}
              >
                {isCopiedCard ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                {isCopiedCard ? 'Copiado' : 'Copiar Tarjeta'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyUrl('spei')}
                disabled={isCopiedSpei}
              >
                {isCopiedSpei ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {isCopiedSpei ? 'Copiado' : 'Copiar SPEI'}
              </Button>
            </div>
          )}

          {/* Secondary actions - row */}
          <div className="flex flex-wrap gap-2">

            {/* Edit amount button (admin, pending) */}
            {isPending && isStaffOrAdmin && onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar Monto
              </Button>
            )}

            {/* Record manual payment button (admin, pending) */}
            {isPending && isStaffOrAdmin && onManualPayment && (
              <Button
                size="sm"
                variant="outline"
                onClick={onManualPayment}
              >
                <FileText className="h-4 w-4 mr-1" />
                Registrar Pago Manual
              </Button>
            )}

            {/* Verify payment button (admin, pending verification) */}
            {isPendingVerification && isStaffOrAdmin && onVerify && (
              <Button
                size="sm"
                variant="default"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={onVerify}
              >
                <Eye className="h-4 w-4 mr-1" />
                Verificar Pago
              </Button>
            )}

            {/* Cancel payment button (admin, pending or failed) */}
            {(isPending || isFailed) && isStaffOrAdmin && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={cancelDialog.open}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-1" />
                )}
                Cancelar
              </Button>
            )}
          </div>
        </div>
        )}
      </CardContent>

      {/* Cancel Payment Confirmation Dialog */}
      <AlertDialog open={cancelDialog.isOpen} onOpenChange={(open) => !open && cancelDialog.close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pago</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea cancelar este pago? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancel?.();
                cancelDialog.close();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}
