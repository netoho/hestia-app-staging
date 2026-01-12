'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { PaymentType, PaymentStatus } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { PaymentCard } from './PaymentCard';
import { ManualPaymentDialog } from './ManualPaymentDialog';
import { VerifyPaymentDialog } from './VerifyPaymentDialog';
import PaymentsTabSkeleton from './PaymentsTabSkeleton';
import type { PaymentWithStatus } from '@/lib/services/paymentService';

interface PaymentsTabProps {
  policyId: string;
  isStaffOrAdmin: boolean;
}

export default function PaymentsTab({ policyId, isStaffOrAdmin }: PaymentsTabProps) {
  const [manualPaymentDialog, setManualPaymentDialog] = useState<{
    open: boolean;
    paymentType: PaymentType;
    expectedAmount: number;
  }>({
    open: false,
    paymentType: PaymentType.INVESTIGATION_FEE,
    expectedAmount: 0,
  });

  const [verifyDialog, setVerifyDialog] = useState<{
    open: boolean;
    payment: PaymentWithStatus | null;
  }>({
    open: false,
    payment: null,
  });

  const [regeneratingPaymentId, setRegeneratingPaymentId] = useState<string | null>(null);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);

  const {
    data: paymentSummary,
    isLoading,
    error,
    refetch,
  } = trpc.payment.getPaymentDetails.useQuery({ policyId });

  const generatePaymentLinks = trpc.payment.generatePaymentLinks.useMutation({
    onSuccess: () => refetch(),
  });

  const regeneratePaymentUrl = trpc.payment.regeneratePaymentUrl.useMutation({
    onSuccess: () => {
      setRegeneratingPaymentId(null);
      refetch();
    },
    onError: () => {
      setRegeneratingPaymentId(null);
    },
  });

  const cancelPayment = trpc.payment.cancelPayment.useMutation({
    onSuccess: () => {
      setCancellingPaymentId(null);
      refetch();
    },
    onError: () => {
      setCancellingPaymentId(null);
    },
  });

  const handleGenerateLinks = async () => {
    await generatePaymentLinks.mutateAsync({ policyId });
  };

  const handleRegenerateUrl = (paymentId: string) => {
    setRegeneratingPaymentId(paymentId);
    regeneratePaymentUrl.mutate({ paymentId });
  };

  const handleCancelPayment = (paymentId: string) => {
    setCancellingPaymentId(paymentId);
    cancelPayment.mutate({ paymentId });
  };

  const openManualPaymentDialog = (paymentType: PaymentType, expectedAmount: number) => {
    setManualPaymentDialog({
      open: true,
      paymentType,
      expectedAmount,
    });
  };

  const openVerifyDialog = (payment: PaymentWithStatus) => {
    setVerifyDialog({
      open: true,
      payment,
    });
  };

  if (isLoading) {
    return <PaymentsTabSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-600">Error al cargar los pagos</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentSummary) {
    return null;
  }

  const { breakdown, payments, overallStatus, totalPaid, totalRemaining } = paymentSummary;

  // Find existing payments by type
  const findPaymentByType = (type: PaymentType) =>
    payments.find((p) => p.type === type && p.status !== PaymentStatus.FAILED);

  const investigationPayment = findPaymentByType(PaymentType.INVESTIGATION_FEE);
  const tenantPayment = findPaymentByType(PaymentType.TENANT_PORTION);
  const landlordPayment = findPaymentByType(PaymentType.LANDLORD_PORTION);

  // Check if we have any pending payments (with checkout URLs)
  const hasPendingPayments = payments.some(
    (p) => p.status === PaymentStatus.PENDING && p.checkoutUrl
  );

  // Check if we can generate payment links
  const canGenerateLinks = isStaffOrAdmin && !hasPendingPayments && breakdown.totalWithIva > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <PaymentSummaryCard
        breakdown={breakdown}
        totalPaid={totalPaid}
        totalRemaining={totalRemaining}
        overallStatus={overallStatus}
      />

      {/* Generate Links Button (when no payments exist) */}
      {canGenerateLinks && payments.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-4">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No hay pagos registrados</p>
                <p className="text-sm text-muted-foreground">
                  Genere links de pago para que los actores puedan realizar sus pagos
                </p>
              </div>
              <Button onClick={handleGenerateLinks} disabled={generatePaymentLinks.isPending}>
                {generatePaymentLinks.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Generar Links de Pago
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investigation Fee Payment */}
      {breakdown.investigationFee > 0 && investigationPayment && (
        <PaymentCard
          payment={investigationPayment}
          isStaffOrAdmin={isStaffOrAdmin}
          onManualPayment={() =>
            openManualPaymentDialog(PaymentType.INVESTIGATION_FEE, breakdown.investigationFee)
          }
          onVerify={
            investigationPayment.status === PaymentStatus.PENDING_VERIFICATION
              ? () => openVerifyDialog(investigationPayment)
              : undefined
          }
          onRegenerateUrl={
            investigationPayment.isExpired
              ? () => handleRegenerateUrl(investigationPayment.id)
              : undefined
          }
          onCancel={() => handleCancelPayment(investigationPayment.id)}
          isRegenerating={regeneratingPaymentId === investigationPayment.id}
          isCancelling={cancellingPaymentId === investigationPayment.id}
        />
      )}

      {/* Tenant Payment */}
      {breakdown.tenantPercentage > 0 && breakdown.tenantAmountAfterFee > 0 && tenantPayment && (
        <PaymentCard
          payment={tenantPayment}
          isStaffOrAdmin={isStaffOrAdmin}
          onManualPayment={() =>
            openManualPaymentDialog(PaymentType.TENANT_PORTION, breakdown.tenantAmountAfterFee)
          }
          onVerify={
            tenantPayment.status === PaymentStatus.PENDING_VERIFICATION
              ? () => openVerifyDialog(tenantPayment)
              : undefined
          }
          onRegenerateUrl={
            tenantPayment.isExpired ? () => handleRegenerateUrl(tenantPayment.id) : undefined
          }
          onCancel={() => handleCancelPayment(tenantPayment.id)}
          isRegenerating={regeneratingPaymentId === tenantPayment.id}
          isCancelling={cancellingPaymentId === tenantPayment.id}
        />
      )}

      {/* Landlord Payment */}
      {breakdown.landlordPercentage > 0 && breakdown.landlordAmount > 0 && landlordPayment && (
        <PaymentCard
          payment={landlordPayment}
          isStaffOrAdmin={isStaffOrAdmin}
          onManualPayment={() =>
            openManualPaymentDialog(PaymentType.LANDLORD_PORTION, breakdown.landlordAmount)
          }
          onVerify={
            landlordPayment.status === PaymentStatus.PENDING_VERIFICATION
              ? () => openVerifyDialog(landlordPayment)
              : undefined
          }
          onRegenerateUrl={
            landlordPayment.isExpired ? () => handleRegenerateUrl(landlordPayment.id) : undefined
          }
          onCancel={() => handleCancelPayment(landlordPayment.id)}
          isRegenerating={regeneratingPaymentId === landlordPayment.id}
          isCancelling={cancellingPaymentId === landlordPayment.id}
        />
      )}

      {/* Manual Payment Dialog */}
      <ManualPaymentDialog
        open={manualPaymentDialog.open}
        onOpenChange={(open) => setManualPaymentDialog((prev) => ({ ...prev, open }))}
        policyId={policyId}
        paymentType={manualPaymentDialog.paymentType}
        expectedAmount={manualPaymentDialog.expectedAmount}
        onSuccess={() => refetch()}
      />

      {/* Verify Payment Dialog */}
      {verifyDialog.payment && (
        <VerifyPaymentDialog
          open={verifyDialog.open}
          onOpenChange={(open) => setVerifyDialog((prev) => ({ ...prev, open }))}
          payment={verifyDialog.payment}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
