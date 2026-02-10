'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  CreditCard, Download,
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

function PaymentSummary({ payment, typeLabel }: {
  payment: { amount: number; subtotal: number | null; iva: number | null; policyNumber: string };
  typeLabel: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
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
        <span className="font-medium">Total a pagar</span>
        <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const statusParam = searchParams.get('status');

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  // Stripe receipt mutation
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

  // Mutation to create checkout session (card)
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setIsRedirecting(false);
        refetch();
      }
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  const handleCardPayment = () => {
    setIsRedirecting(true);
    createCheckoutSession.mutate({ paymentId });
  };

  // Auto-redirect to Stripe checkout when payment is pending
  useEffect(() => {
    if (payment && payment.status === PaymentStatus.PENDING && !payment.isManual && !statusParam) {
      handleCardPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id]);

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

  // Redirecting to Stripe (card)
  if (isRedirecting || createCheckoutSession.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Redirigiendo a la pagina de pago...</p>
              <p className="text-sm text-muted-foreground">Por favor espera un momento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment completed
  if (payment.status === PaymentStatus.COMPLETED || statusParam === 'success') {
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

  // Payment cancelled by user (returned from Stripe)
  if (statusParam === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle>Pago Cancelado</CardTitle>
            <CardDescription>
              Has cancelado el proceso de pago. No se ha realizado ningun cargo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PaymentSummary payment={payment} typeLabel={typeLabel} />

              <p className="text-sm text-muted-foreground text-center">
                Puedes intentar de nuevo cuando estes listo. Si tienes problemas, contactanos.
              </p>

              <Button className="w-full" onClick={handleCardPayment} disabled={createCheckoutSession.isPending}>
                <CreditCard className="h-4 w-4 mr-2" />
                Reintentar pago con tarjeta
              </Button>

              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href={`mailto:${brandInfo.supportEmail}`}>
                  Necesitas ayuda?
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment cancelled/failed by admin
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
              <PaymentSummary payment={payment} typeLabel={typeLabel} />
              <p className="text-sm text-center text-muted-foreground">
                Te notificaremos por correo electronico cuando tu pago sea verificado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Pending payment — auto-redirect should have fired, show fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle>Pago Pendiente</CardTitle>
          <CardDescription>
            Pago con tarjeta de credito o debito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PaymentSummary payment={payment} typeLabel={typeLabel} />

            <Button
              className="w-full"
              size="lg"
              onClick={handleCardPayment}
              disabled={createCheckoutSession.isPending}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Pagar con tarjeta
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Procesado de forma segura por Stripe.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
