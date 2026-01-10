'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  CreditCard,
  FileText,
  AlertTriangle,
  Ban,
  Download,
} from 'lucide-react';
import { PaymentStatus, PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';
import type { PaymentWithStatus } from '@/lib/services/paymentService';

interface PaymentCardProps {
  payment: PaymentWithStatus;
  expectedAmount: number;
  isStaffOrAdmin: boolean;
  onManualPayment?: () => void;
  onVerify?: () => void;
  onRegenerateUrl?: () => void;
  onCancel?: () => void;
  isRegenerating?: boolean;
  isCancelling?: boolean;
}

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon: React.ElementType }
> = {
  [PaymentStatus.PENDING]: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  [PaymentStatus.PROCESSING]: { label: 'Procesando', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600', icon: Loader2 },
  [PaymentStatus.COMPLETED]: { label: 'Completado', variant: 'default', className: 'bg-green-500 hover:bg-green-600', icon: CheckCircle2 },
  [PaymentStatus.FAILED]: { label: 'Fallido', variant: 'destructive', icon: XCircle },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsado', variant: 'outline', icon: RefreshCw },
  [PaymentStatus.PARTIAL]: { label: 'Parcial', variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600', icon: Clock },
  [PaymentStatus.PENDING_VERIFICATION]: { label: 'Por Verificar', variant: 'default', className: 'bg-orange-500 hover:bg-orange-600', icon: Eye },
};

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

function getExpiryInfo(expiryDate: Date | string | null | undefined): { text: string; isExpired: boolean; isWarning: boolean } {
  if (!expiryDate) return { text: '', isExpired: false, isWarning: false };

  const expiry = new Date(expiryDate);
  const now = new Date();
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return { text: 'Link expirado', isExpired: true, isWarning: false };
  }

  if (hoursRemaining <= 6) {
    return { text: `Expira en ${Math.ceil(hoursRemaining)} horas`, isExpired: false, isWarning: true };
  }

  return { text: `Expira: ${formatDate(expiryDate)}`, isExpired: false, isWarning: false };
}

export function PaymentCard({
  payment,
  isStaffOrAdmin,
  onManualPayment,
  onVerify,
  onRegenerateUrl,
  onCancel,
  isRegenerating = false,
  isCancelling = false,
}: PaymentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

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

  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status as PaymentStatus];
  const StatusIcon = statusConfig.icon;
  const typeLabel = PAYMENT_TYPE_LABELS[payment.type as PaymentType] || payment.type;
  const payerLabel = PAYER_TYPE_LABELS[payment.paidBy as PayerType] || payment.paidBy;

  const expiryInfo = getExpiryInfo(payment.checkoutUrlExpiry);
  const isPending = payment.status === PaymentStatus.PENDING;
  const isPendingVerification = payment.status === PaymentStatus.PENDING_VERIFICATION;
  const isCompleted = payment.status === PaymentStatus.COMPLETED;
  const hasCheckoutUrl = payment.checkoutUrl && !payment.isExpired;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{typeLabel}</CardTitle>
          <Badge variant={statusConfig.variant} className={statusConfig.className}>
            <StatusIcon className={`h-3 w-3 mr-1 ${payment.status === PaymentStatus.PROCESSING ? 'animate-spin' : ''}`} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Amount and payer */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-medium">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagador</span>
            <span>{payerLabel}</span>
          </div>
          {payment.reference && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referencia</span>
              <span className="font-mono text-xs">{payment.reference}</span>
            </div>
          )}
          {isCompleted && payment.paidAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha de pago</span>
              <span>{formatDate(payment.paidAt)}</span>
            </div>
          )}
        </div>

        {/* Expiry warning */}
        {isPending && payment.checkoutUrl && (
          <div className={`flex items-center gap-2 text-xs ${expiryInfo.isExpired ? 'text-red-600' : expiryInfo.isWarning ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {(expiryInfo.isExpired || expiryInfo.isWarning) && <AlertTriangle className="h-3 w-3" />}
            {expiryInfo.text}
          </div>
        )}

        {/* Receipt info */}
        {payment.receiptFileName && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              <span>Comprobante: {payment.receiptFileName}</span>
            </div>
            {payment.receiptS3Key && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Pay with Stripe button */}
          {isPending && hasCheckoutUrl && (
            <Button
              size="sm"
              onClick={() => window.open(payment.checkoutUrl!, '_blank')}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Pagar con Stripe
            </Button>
          )}

          {/* Regenerate URL button (admin, expired) */}
          {isPending && payment.isExpired && isStaffOrAdmin && onRegenerateUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerateUrl}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Regenerar Link
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

          {/* Cancel payment button (admin, pending) */}
          {isPending && isStaffOrAdmin && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onCancel}
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
      </CardContent>
    </Card>
  );
}
