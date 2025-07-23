'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Package } from 'lucide-react';
import { t } from '@/lib/i18n';

interface PolicyPaymentInfoProps {
  packageId?: string | null | undefined;
  packageName?: string | null | undefined;
  price?: number | null | undefined;
  paymentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
}

export function PolicyPaymentInfo({ 
  packageId, 
  packageName, 
  price, 
  paymentStatus 
}: PolicyPaymentInfoProps) {
  // Don't render if no payment information is available
  if (!packageName && !price && !paymentStatus) {
    return null;
  }

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const getPaymentStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'PENDING': { label: t.pages.policies.details.payment.status.pending, variant: 'outline' },
      'PROCESSING': { label: t.pages.policies.details.payment.status.processing, variant: 'secondary' },
      'COMPLETED': { label: t.pages.policies.details.payment.status.completed, variant: 'default' },
      'FAILED': { label: t.pages.policies.details.payment.status.failed, variant: 'destructive' },
      'REFUNDED': { label: t.pages.policies.details.payment.status.refunded, variant: 'secondary' }
    };
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const getPackageDisplay = (packageName: string | null | undefined, packageId: string | null | undefined) => {
    if (packageName) return packageName;
    if (packageId) {
      // Map package IDs to display names as fallback
      const packageMap: Record<string, string> = {
        'basic': 'Escudo Básico',
        'standard': 'Seguro Estándar', 
        'premium': 'Fortaleza Premium'
      };
      return packageMap[packageId] || packageId;
    }
    return t.pages.policies.details.payment.noPackageSelected;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t.pages.policies.details.payment.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Package Information */}
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {t.pages.policies.details.payment.package}
            </p>
            <p className="font-medium">{getPackageDisplay(packageName, packageId)}</p>
            {packageId && (
              <p className="text-xs text-muted-foreground">ID: {packageId}</p>
            )}
          </div>

          {/* Price Information */}
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.payment.price}</p>
            <p className="font-medium text-lg">{formatPrice(price)}</p>
            {price && (
              <p className="text-xs text-muted-foreground">{t.pages.policies.details.payment.oneTimePayment}</p>
            )}
          </div>

          {/* Payment Status */}
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.payment.paymentStatus}</p>
            <div className="mt-1">
              {paymentStatus ? (
                <Badge variant={getPaymentStatusDisplay(paymentStatus).variant}>
                  {getPaymentStatusDisplay(paymentStatus).label}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">{t.pages.policies.details.payment.noPaymentStatus}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}