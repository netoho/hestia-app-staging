'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { PaymentBreakdown } from '@/lib/services/paymentService';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentSummaryCardProps {
  breakdown: PaymentBreakdown;
  totalPaid: number;
  totalRemaining: number;
  overallStatus: 'pending' | 'partial' | 'completed';
}

const OVERALL_STATUS_CONFIG = {
  pending: { label: 'Pendiente', variant: 'secondary' as const },
  partial: { label: 'Pago Parcial', variant: 'default' as const },
  completed: { label: 'Completado', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
};

export function PaymentSummaryCard({
  breakdown,
  totalPaid,
  totalRemaining,
  overallStatus,
}: PaymentSummaryCardProps) {
  const statusConfig = OVERALL_STATUS_CONFIG[overallStatus];
  const progressPercentage = breakdown.totalWithIva > 0
    ? Math.round((totalPaid / breakdown.totalWithIva) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Resumen de Pagos</CardTitle>
          <Badge variant={statusConfig.variant} className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(breakdown.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA (16%)</span>
            <span>{formatCurrency(breakdown.iva)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>Total con IVA</span>
            <span>{formatCurrency(breakdown.totalWithIva)}</span>
          </div>
        </div>

        {/* Distribution info */}
        {(breakdown.tenantPercentage > 0 || breakdown.landlordPercentage > 0) && (
          <div className="space-y-1 text-sm text-muted-foreground border-t pt-3">
            {breakdown.tenantPercentage > 0 && (
              <div className="flex justify-between">
                <span>Inquilino ({breakdown.tenantPercentage}%)</span>
                <span>{formatCurrency(breakdown.tenantAmount)}</span>
              </div>
            )}
            {breakdown.landlordPercentage > 0 && (
              <div className="flex justify-between">
                <span>Arrendador ({breakdown.landlordPercentage}%)</span>
                <span>{formatCurrency(breakdown.landlordAmount)}</span>
              </div>
            )}
            {breakdown.includesInvestigationFee && breakdown.investigationFee > 0 && (
              <div className="flex justify-between text-xs">
                <span>Cuota de investigación (deducida del inquilino)</span>
                <span>{formatCurrency(breakdown.investigationFee)}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2 pt-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Pagado: <span className="text-green-600 font-medium">{formatCurrency(totalPaid)}</span>
            </span>
            <span className="text-muted-foreground">
              Pendiente: <span className="text-orange-600 font-medium">{formatCurrency(totalRemaining)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
