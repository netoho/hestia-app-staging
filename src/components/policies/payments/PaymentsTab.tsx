'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle, Plus } from 'lucide-react';
import { PaymentType, PaymentStatus } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { PaymentCard } from './PaymentCard';
import { ManualPaymentDialog } from './ManualPaymentDialog';
import { VerifyPaymentDialog } from './VerifyPaymentDialog';
import { EditPaymentDialog } from './EditPaymentDialog';
import { AddPaymentDialog } from './AddPaymentDialog';
import PaymentsTabSkeleton from './PaymentsTabSkeleton';
import type { PaymentWithStatus } from '@/lib/services/paymentService';

interface PaymentsTabProps {
  policyId: string;
  isStaffOrAdmin: boolean;
}

export default function PaymentsTab({ policyId, isStaffOrAdmin }: PaymentsTabProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

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

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    payment: PaymentWithStatus | null;
  }>({
    open: false,
    payment: null,
  });

  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);

  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);

  const {
    data: paymentSummary,
    isLoading,
    error,
    refetch,
  } = trpc.payment.getPaymentDetails.useQuery({ policyId });

  const invalidatePayments = () => {
    utils.payment.getPaymentDetails.invalidate({ policyId });
  };

  const generatePaymentLinks = trpc.payment.generatePaymentLinks.useMutation({
    onSuccess: invalidatePayments,
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al generar links de pago',
        variant: 'destructive',
      });
    },
  });

  const cancelPayment = trpc.payment.cancelPayment.useMutation({
    onSuccess: () => {
      setCancellingPaymentId(null);
      invalidatePayments();
    },
    onError: (error) => {
      setCancellingPaymentId(null);
      toast({
        title: 'Error',
        description: error.message || 'Error al cancelar el pago',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateLinks = async () => {
    await generatePaymentLinks.mutateAsync({ policyId });
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

  const openEditDialog = (payment: PaymentWithStatus) => {
    setEditDialog({
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

  // Separate current payments from historical (tenant replaced) payments
  // Use explicit null check to avoid issues with empty strings
  const currentPayments = payments.filter((p) => p.paidByTenantName === null || p.paidByTenantName === undefined);
  const historicalPayments = payments.filter((p) => p.paidByTenantName !== null && p.paidByTenantName !== undefined);

  // Group historical payments by tenant name
  const historicalByTenant = historicalPayments.reduce((acc, payment) => {
    const name = payment.paidByTenantName!;
    if (!acc[name]) acc[name] = [];
    acc[name].push(payment);
    return acc;
  }, {} as Record<string, typeof historicalPayments>);

  // Find existing payments by type (only from current payments)
  const findPaymentByType = (type: PaymentType) =>
    currentPayments.find((p) => p.type === type && p.status !== PaymentStatus.CANCELLED);

  const investigationPayment = findPaymentByType(PaymentType.INVESTIGATION_FEE);
  const tenantPayment = findPaymentByType(PaymentType.TENANT_PORTION);
  const landlordPayment = findPaymentByType(PaymentType.LANDLORD_PORTION);

  // Get additional payments (everything except standard policy payments)
  // Using exclusion so new payment types are automatically included
  const standardPaymentTypes = [
    PaymentType.INVESTIGATION_FEE,
    PaymentType.TENANT_PORTION,
    PaymentType.LANDLORD_PORTION,
  ];
  const additionalPayments = currentPayments.filter(
    (p) =>
      !standardPaymentTypes.includes(p.type as PaymentType) &&
      p.status !== PaymentStatus.FAILED &&
      p.status !== PaymentStatus.CANCELLED
  );

  // Get cancelled/failed payments to show at the end
  const cancelledPayments = currentPayments.filter(
    (p) => p.status === PaymentStatus.CANCELLED || p.status === PaymentStatus.FAILED
  );

  // Check if we have any pending payments (with checkout URLs) - only current payments
  const hasPendingPayments = currentPayments.some(
    (p) => p.status === PaymentStatus.PENDING && p.checkoutUrl
  );

  // Check if we can generate payment links (no current active payments)
  const hasActiveCurrentPayments = currentPayments.some(
    (p) => p.status !== PaymentStatus.CANCELLED
  );
  const canGenerateLinks = isStaffOrAdmin && !hasActiveCurrentPayments && breakdown.totalWithIva > 0;

  // Check for payments needing verification
  const pendingVerificationPayments = currentPayments.filter(
    (p) => p.status === PaymentStatus.PENDING_VERIFICATION
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Payment button */}
      {isStaffOrAdmin && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddPaymentDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Pago
          </Button>
        </div>
      )}

      {/* Summary Card */}
      <PaymentSummaryCard
        breakdown={breakdown}
        totalPaid={totalPaid}
        totalRemaining={totalRemaining}
        overallStatus={overallStatus}
      />

      {/* Pending Verification Alert */}
      {isStaffOrAdmin && pendingVerificationPayments.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {pendingVerificationPayments.length === 1
              ? '1 pago pendiente de verificación'
              : `${pendingVerificationPayments.length} pagos pendientes de verificación`}
          </AlertDescription>
        </Alert>
      )}

      {/* Generate Links Button (when no current active payments exist) */}
      {canGenerateLinks && (
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
          onCancel={() => handleCancelPayment(investigationPayment.id)}
          onEdit={
            investigationPayment.status === PaymentStatus.PENDING
              ? () => openEditDialog(investigationPayment)
              : undefined
          }
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
          onCancel={() => handleCancelPayment(tenantPayment.id)}
          onEdit={
            tenantPayment.status === PaymentStatus.PENDING
              ? () => openEditDialog(tenantPayment)
              : undefined
          }
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
          onCancel={() => handleCancelPayment(landlordPayment.id)}
          onEdit={
            landlordPayment.status === PaymentStatus.PENDING
              ? () => openEditDialog(landlordPayment)
              : undefined
          }
          isCancelling={cancellingPaymentId === landlordPayment.id}
        />
      )}

      {/* Additional Payments (PARTIAL_PAYMENT, INCIDENT_PAYMENT) */}
      {additionalPayments.map((payment) => (
        <PaymentCard
          key={payment.id}
          payment={payment}
          isStaffOrAdmin={isStaffOrAdmin}
          onManualPayment={() =>
            openManualPaymentDialog(payment.type as PaymentType, payment.amount)
          }
          onVerify={
            payment.status === PaymentStatus.PENDING_VERIFICATION
              ? () => openVerifyDialog(payment)
              : undefined
          }
          onCancel={() => handleCancelPayment(payment.id)}
          onEdit={
            payment.status === PaymentStatus.PENDING
              ? () => openEditDialog(payment)
              : undefined
          }
          isCancelling={cancellingPaymentId === payment.id}
        />
      ))}

      {/* Cancelled/Failed Payments */}
      {cancelledPayments.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
            Pagos Cancelados
          </h3>
          {cancelledPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              isStaffOrAdmin={isStaffOrAdmin}
            />
          ))}
        </div>
      )}

      {/* Historical Payments (from replaced tenants) */}
      {Object.keys(historicalByTenant).length > 0 && (
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
            Pagos Históricos
          </h3>
          {Object.entries(historicalByTenant).map(([tenantName, tenantPayments]) => (
            <div key={tenantName} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Pagos realizados por {tenantName}
              </h4>
              {tenantPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  isStaffOrAdmin={isStaffOrAdmin}
                  isHistorical
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Manual Payment Dialog */}
      <ManualPaymentDialog
        open={manualPaymentDialog.open}
        onOpenChange={(open) => setManualPaymentDialog((prev) => ({ ...prev, open }))}
        policyId={policyId}
        paymentType={manualPaymentDialog.paymentType}
        expectedAmount={manualPaymentDialog.expectedAmount}
        onSuccess={invalidatePayments}
      />

      {/* Verify Payment Dialog */}
      {verifyDialog.payment && (
        <VerifyPaymentDialog
          open={verifyDialog.open}
          onOpenChange={(open) => setVerifyDialog((prev) => ({ ...prev, open }))}
          payment={verifyDialog.payment}
          onSuccess={invalidatePayments}
        />
      )}

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
        payment={editDialog.payment}
        onSuccess={invalidatePayments}
      />

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={addPaymentDialogOpen}
        onOpenChange={setAddPaymentDialogOpen}
        policyId={policyId}
        onSuccess={invalidatePayments}
      />
    </div>
  );
}
