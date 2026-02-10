'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  Building2, CreditCard, Copy, Check, RefreshCw, Download,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { PaymentStatus, PaymentType } from '@/prisma/generated/prisma-client/enums';
import { PAYMENT_TYPE_LABELS } from '@/lib/constants/paymentConfig';
import { brandInfo } from '@/lib/config/brand';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-medium truncate">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleCopy} className="ml-2 shrink-0">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function SpeiPaymentPage() {
  const params = useParams();
  const paymentId = params.id as string;

  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const getStripeReceipt = trpc.payment.getStripePublicReceipt.useMutation();

  const handleDownloadReceipt = async () => {
    setIsDownloadingReceipt(true);
    try {
      const result = await getStripeReceipt.mutateAsync({ paymentId });
      if (result.receiptUrl) {
        window.open(result.receiptUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  // Fetch payment info
  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = trpc.payment.getPublicPayment.useQuery(
    { paymentId },
    { retry: false }
  );

  // Create SPEI session mutation
  const createSpeiSession = trpc.payment.createSpeiSession.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // SPEI details query (for fresh fundedAmount)
  const {
    data: speiDetails,
    refetch: refetchSpei,
    isRefetching: isRefetchingSpei,
  } = trpc.payment.getSpeiDetails.useQuery(
    { paymentId },
    { enabled: !!payment?.hasSpei }
  );

  // Auto-create SPEI session on first visit if not yet created
  useEffect(() => {
    if (payment && payment.status === PaymentStatus.PENDING && !payment.hasSpei && !payment.isManual) {
      createSpeiSession.mutate({ paymentId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id, payment?.hasSpei]);

  const handleRefresh = () => {
    refetch();
    refetchSpei();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando informacion del pago...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle>Pago no encontrado</CardTitle>
            <CardDescription>
              El enlace de pago no es valido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Si crees que esto es un error, contacta a {brandInfo.name}.
            </p>
            <Button variant="outline" asChild>
              <a href={`mailto:${brandInfo.supportEmail}`}>Contactar Soporte</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabel = payment.type
    ? PAYMENT_TYPE_LABELS[payment.type as PaymentType] || payment.type
    : 'Pago';

  // Payment completed
  if (payment.status === PaymentStatus.COMPLETED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-green-700">Pago Completado</CardTitle>
            <CardDescription>
              Tu pago ha sido procesado exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ID de transaccion</span>
                  <span className="font-mono text-xs">{payment.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Poliza</span>
                  <span className="font-medium">{payment.policyNumber}</span>
                </div>
                {payment.subtotal && payment.iva && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(payment.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%)</span>
                      <span>{formatCurrency(payment.iva)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadReceipt}
                disabled={isDownloadingReceipt}
              >
                {isDownloadingReceipt ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar Comprobante
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Recibiras un correo de confirmacion con los detalles de tu pago.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment cancelled/failed
  if (payment.status === PaymentStatus.CANCELLED || payment.status === PaymentStatus.FAILED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-red-700">
              {payment.status === PaymentStatus.CANCELLED ? 'Pago Cancelado' : 'Pago Fallido'}
            </CardTitle>
            <CardDescription>
              Este enlace de pago ya no esta activo
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Si necesitas realizar este pago, contacta a {brandInfo.name} para obtener un nuevo enlace.
            </p>
            <Button variant="outline" asChild>
              <a href={`mailto:${brandInfo.supportEmail}`}>Contactar Soporte</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual payment pending verification
  if (payment.status === PaymentStatus.PENDING_VERIFICATION || payment.isManual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle>Pago en Verificacion</CardTitle>
            <CardDescription>
              Tu pago esta siendo revisado por nuestro equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Te notificaremos por correo electronico cuando tu pago sea verificado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Creating SPEI session
  if (createSpeiSession.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Generando datos de transferencia...</p>
              <p className="text-sm text-muted-foreground">Por favor espera un momento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error creating SPEI
  if (createSpeiSession.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Error al generar transferencia</CardTitle>
            <CardDescription>No se pudieron obtener los datos de SPEI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline" onClick={() => createSpeiSession.reset()}>
              Reintentar
            </Button>
            <Button className="w-full" variant="ghost" asChild>
              <Link href={`/payments/${paymentId}`}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar con tarjeta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SPEI details view
  const details = speiDetails || (payment.hasSpei ? {
    clabe: payment.speiClabe || '',
    bankName: payment.speiBankName || '',
    reference: payment.speiReference || '',
    amount: payment.amount,
    fundedAmount: payment.speiFundedAmount || 0,
    hostedUrl: payment.speiHostedUrl,
    status: payment.status,
  } : null);

  if (details) {
    const fundedPercent = details.amount > 0
      ? Math.min(100, Math.round((details.fundedAmount / details.amount) * 100))
      : 0;
    const hasPartialPayment = details.fundedAmount > 0 && details.fundedAmount < details.amount;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-16 w-16 text-blue-600" />
            </div>
            <CardTitle>Transferencia SPEI</CardTitle>
            <CardDescription>
              Realiza una transferencia bancaria con los siguientes datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* SPEI Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1 divide-y divide-blue-100">
                <CopyableField label="CLABE" value={details.clabe} />
                <CopyableField label="Banco" value={details.bankName} />
                <CopyableField label="Referencia" value={details.reference} />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">Monto a transferir</p>
                  <p className="font-bold text-lg">{formatCurrency(details.amount)}</p>
                </div>
              </div>

              {/* Partial payment progress */}
              {hasPartialPayment && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700 font-medium">Pago parcial recibido</span>
                    <span className="font-medium">{fundedPercent}%</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${fundedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-orange-600">
                    <span>Recibido: {formatCurrency(details.fundedAmount)}</span>
                    <span>Falta: {formatCurrency(details.amount - details.fundedAmount)}</span>
                  </div>
                </div>
              )}

              {/* Info text */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-700">
                  Despues de transferir, tu pago se reflejara automaticamente.
                </p>
                <p className="text-xs text-muted-foreground">
                  Las transferencias SPEI generalmente se procesan en minutos, pero pueden tomar hasta 1 dia habil.
                </p>
              </div>

              {/* Refresh button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRefresh}
                disabled={isRefetchingSpei}
              >
                {isRefetchingSpei ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar estado del pago
              </Button>

              {/* Alternative: pay by card */}
              <div className="pt-2 border-t">
                <Button variant="ghost" className="w-full" asChild>
                  <Link href={`/payments/${paymentId}`}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar con tarjeta en su lugar
                  </Link>
                </Button>
              </div>

              {/* Stripe hosted instructions fallback */}
              {details.hostedUrl && (
                <p className="text-center">
                  <a
                    href={details.hostedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Ver instrucciones completas
                  </a>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback: waiting for SPEI data
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Generando datos de transferencia...</p>
            <p className="text-sm text-muted-foreground">Por favor espera un momento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
