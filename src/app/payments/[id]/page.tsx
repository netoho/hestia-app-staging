'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, CreditCard, Download } from 'lucide-react';
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

  // Mutation to create checkout session
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        // Session not eligible (payment completed, cancelled, etc.)
        setIsRedirecting(false);
        refetch();
      }
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  // Auto-redirect to Stripe for pending payments (unless returning from Stripe)
  useEffect(() => {
    if (
      payment &&
      payment.status === PaymentStatus.PENDING &&
      !payment.isManual &&
      !statusParam &&
      !isRedirecting
    ) {
      setIsRedirecting(true);
      createCheckoutSession.mutate({ paymentId });
    }
  }, [payment, statusParam, isRedirecting, paymentId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando información del pago...</p>
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
              El enlace de pago no es válido o ha expirado.
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

  // Redirecting to Stripe
  if (isRedirecting || createCheckoutSession.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Redirigiendo a la página de pago...</p>
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
                  <span className="text-muted-foreground">ID de transacción</span>
                  <span className="font-mono text-xs">{payment.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Póliza</span>
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
                Recibirás un correo de confirmación con los detalles de tu pago.
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
              Has cancelado el proceso de pago. No se ha realizado ningún cargo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Póliza</span>
                  <span className="font-medium">{payment.policyNumber}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total pendiente</span>
                  <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Puedes intentar de nuevo cuando estés listo. Si tienes problemas, contáctanos.
              </p>

              <Button
                className="w-full"
                onClick={() => {
                  setIsRedirecting(true);
                  createCheckoutSession.mutate({ paymentId });
                }}
                disabled={createCheckoutSession.isPending}
              >
                {createCheckoutSession.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Intentar de nuevo
                  </>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href={`mailto:${brandInfo.supportEmail}`}>
                  ¿Necesitas ayuda?
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
              Este enlace de pago ya no está activo
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
            <CardTitle>Pago en Verificación</CardTitle>
            <CardDescription>
              Tu pago está siendo revisado por nuestro equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concepto</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Póliza</span>
                  <span className="font-medium">{payment.policyNumber}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Monto</span>
                  <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                </div>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Te notificaremos por correo electrónico cuando tu pago sea verificado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending payment - show pay button (fallback if auto-redirect didn't work)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CreditCard className="h-16 w-16 text-primary" />
          </div>
          <CardTitle>Pago Pendiente</CardTitle>
          <CardDescription>
            Completa tu pago de forma segura con Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Concepto</span>
                <span className="font-medium">{typeLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Póliza</span>
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

            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setIsRedirecting(true);
                createCheckoutSession.mutate({ paymentId });
              }}
              disabled={createCheckoutSession.isPending}
            >
              {createCheckoutSession.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar {formatCurrency(payment.amount)}
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Serás redirigido a Stripe para completar tu pago de forma segura.
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <span>Powered by</span>
                <svg className="h-4" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.58 10.58 0 0 1-4.56.95c-4.01 0-6.83-2.5-6.83-7.28 0-4.19 2.39-7.34 6.42-7.34 4.04 0 5.78 3.15 5.78 7.34v1.4zm-6.2-5.95c-.98 0-1.96.73-2.1 2.18h4.09c-.08-1.3-.85-2.18-2-2.18zM43.72 20.14V5.53h4.1V7c.98-1.12 2.5-1.65 4.05-1.65v4.1c-.27-.07-.61-.1-1.02-.1-1.1 0-2.47.42-3.04 1.23v9.57h-4.09zm-5.3 0h4.1V5.53h-4.1v14.6zm2.04-16.42c1.25 0 2.28-1.02 2.28-2.21 0-1.2-1.03-2.21-2.28-2.21a2.23 2.23 0 0 0-2.28 2.21c0 1.2 1.02 2.21 2.28 2.21zM30.47 5.53h4.1v4.67c.79-1.1 2.28-1.79 3.9-1.79 3.1 0 5.07 2.05 5.07 5.64v6.09h-4.09v-5.57c0-1.65-.79-2.62-2.14-2.62-1.06 0-2.11.65-2.74 1.52v6.67h-4.1V5.53zm-6.14 0h4.09v4.67c.79-1.1 2.29-1.79 3.9-1.79v3.9c-.3-.07-.65-.1-1.03-.1-1.06 0-2.21.42-2.87 1.3v6.63h-4.09V5.53zM13.7 20.27c-3.63 0-5.91-1.84-5.91-4.62 0-2.47 1.65-4.19 5.01-4.82l4.04-.78V9.42c0-1-.73-1.72-2.08-1.72-.95 0-1.84.35-2.79.85l-.95-3.1c1.4-.88 3.1-1.4 5.13-1.4 3.35 0 5.27 1.62 5.27 5.33v10.77h-3.27l-.27-1.1c-1.06.85-2.4 1.22-4.18 1.22zm.75-3.27c1.26 0 2.4-.4 3.15-1.23v-2.1l-2.67.55c-1.25.27-1.8.8-1.8 1.52 0 .75.61 1.26 1.32 1.26zm-5-11.47H5.4V20.14H.5V5.53h3.46V2.9L7.5.73v4.8h2.95v4z" fill="#635BFF"/>
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
