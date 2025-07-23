'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

interface PolicyPaymentStepProps {
  token: string;
  policy: {
    id: string;
    packageName?: string | null;
    price?: number | null;
    paymentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  };
  onNext: () => void;
  onBack: () => void;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  stripeIntentId?: string;
  stripeSessionId?: string;
  paidAt?: string;
  errorMessage?: string;
}

export function PolicyPaymentStep({ token, policy, onNext, onBack }: PolicyPaymentStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const { toast } = useToast();

  // Fetch existing payments for this policy
  useEffect(() => {
    fetchPayments();
  }, [token]);

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const response = await fetch(`/api/tenant/${token}/payments`);
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const formatPrice = (price: number | null | undefined, currency = 'MXN') => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getPaymentStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'PENDING': { label: t.wizard.payment.status.pending, variant: 'outline' },
      'PROCESSING': { label: t.wizard.payment.status.processing, variant: 'secondary' },
      'COMPLETED': { label: t.wizard.payment.status.completed, variant: 'default' },
      'FAILED': { label: t.wizard.payment.status.failed, variant: 'destructive' },
      'REFUNDED': { label: t.wizard.payment.status.refunded, variant: 'secondary' }
    };
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const handleCreatePayment = async () => {
    if (!policy.price) {
      toast({
        title: t.misc.error,
        description: t.wizard.payment.messages.noPriceSet,
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingPayment(true);
    try {
      const response = await fetch(`/api/tenant/${token}/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: policy.price,
          currency: 'MXN',
          description: `${t.wizard.payment.paymentFor} ${policy.packageName || 'Hestia Policy'}`,
          returnUrl: `${window.location.origin}/policy/${token}?step=5`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.wizard.payment.messages.paymentCreationFailed);
      }

      // If we get a checkout URL, redirect to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // If we get a payment intent client secret, we could handle it here
      // For now, we'll refresh payments and show success
      await fetchPayments();
      
      toast({
        title: t.wizard.payment.messages.paymentCreated,
        description: t.wizard.payment.messages.paymentCreatedDescription,
      });

    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: t.misc.error,
        description: error instanceof Error ? error.message : t.wizard.payment.messages.paymentCreationFailed,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleContinue = () => {
    // Check if payment is completed
    const hasCompletedPayment = payments.some(p => p.status === 'COMPLETED') || policy.paymentStatus === 'COMPLETED';
    
    if (!hasCompletedPayment) {
      toast({
        title: t.wizard.payment.messages.paymentRequired,
        description: t.wizard.payment.messages.paymentRequiredDescription,
        variant: 'destructive',
      });
      return;
    }

    onNext();
  };

  const hasCompletedPayment = payments.some(p => p.status === 'COMPLETED') || policy.paymentStatus === 'COMPLETED';
  const hasFailedPayment = payments.some(p => p.status === 'FAILED');
  const hasPendingPayment = payments.some(p => p.status === 'PENDING' || p.status === 'PROCESSING');

  return (
    <div className="space-y-6">
      {/* Payment Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t.wizard.payment.title}
          </CardTitle>
          <CardDescription>
            {t.wizard.payment.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Package and Price Info */}
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <div>
                <div className="font-medium">{policy.packageName || t.wizard.payment.package}</div>
                <div className="text-sm text-muted-foreground">{t.wizard.payment.packageDescription}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatPrice(policy.price)}</div>
                <div className="text-xs text-muted-foreground">{t.wizard.payment.oneTimePayment}</div>
              </div>
            </div>

            {/* Current Payment Status */}
            {policy.paymentStatus && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.wizard.payment.currentStatus}:</span>
                  <Badge variant={getPaymentStatusDisplay(policy.paymentStatus).variant}>
                    {getPaymentStatusDisplay(policy.paymentStatus).label}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.wizard.payment.paymentHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatPrice(payment.amount, payment.currency)}</div>
                      <div className="text-xs text-muted-foreground">
                        {payment.method && t.wizard.payment.method}: {payment.method}
                      </div>
                      {payment.paidAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getPaymentStatusDisplay(payment.status).variant}>
                      {getPaymentStatusDisplay(payment.status).label}
                    </Badge>
                    {payment.errorMessage && (
                      <div className="text-xs text-destructive mt-1">{payment.errorMessage}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Status Messages */}
      {hasCompletedPayment && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t.wizard.payment.messages.paymentCompleted}
          </AlertDescription>
        </Alert>
      )}

      {hasFailedPayment && !hasCompletedPayment && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t.wizard.payment.messages.paymentFailed}
          </AlertDescription>
        </Alert>
      )}

      {hasPendingPayment && !hasCompletedPayment && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {t.wizard.payment.messages.paymentPending}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.wizard.payment.backToDocuments}
        </Button>

        <div className="flex-1" />

        {!hasCompletedPayment && (
          <Button
            onClick={handleCreatePayment}
            disabled={isCreatingPayment || !policy.price}
            className="flex items-center gap-2"
          >
            {isCreatingPayment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {isCreatingPayment ? t.wizard.payment.processing : t.wizard.payment.payNow}
          </Button>
        )}

        <Button
          onClick={handleContinue}
          disabled={!hasCompletedPayment}
          className="flex items-center gap-2"
        >
          {hasCompletedPayment ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {t.wizard.payment.continueToReview}
        </Button>
      </div>
    </div>
  );
}