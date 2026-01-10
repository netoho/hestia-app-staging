'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { PaymentType, PayerType } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  paymentType: PaymentType;
  expectedAmount: number;
  onSuccess: () => void;
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.INVESTIGATION_FEE]: 'Cuota de Investigación',
  [PaymentType.TENANT_PORTION]: 'Porción del Inquilino',
  [PaymentType.LANDLORD_PORTION]: 'Porción del Arrendador',
  [PaymentType.POLICY_PREMIUM]: 'Prima de Póliza',
  [PaymentType.PARTIAL_PAYMENT]: 'Pago Parcial',
  [PaymentType.INCIDENT_PAYMENT]: 'Pago por Incidencia',
  [PaymentType.REFUND]: 'Reembolso',
};

const PAYER_TYPE_OPTIONS: { value: PayerType; label: string }[] = [
  { value: PayerType.TENANT, label: 'Inquilino' },
  { value: PayerType.LANDLORD, label: 'Arrendador' },
  { value: PayerType.JOINT_OBLIGOR, label: 'Obligado Solidario' },
  { value: PayerType.AVAL, label: 'Aval' },
  { value: PayerType.COMPANY, label: 'Empresa' },
];

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
}

export function ManualPaymentDialog({
  open,
  onOpenChange,
  policyId,
  paymentType,
  expectedAmount,
  onSuccess,
}: ManualPaymentDialogProps) {
  const [paidBy, setPaidBy] = useState<PayerType>(
    paymentType === PaymentType.LANDLORD_PORTION ? PayerType.LANDLORD : PayerType.TENANT
  );
  const [amount, setAmount] = useState<string>(expectedAmount.toString());
  const [reference, setReference] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recordManualPayment = trpc.payment.recordManualPayment.useMutation();
  const updatePaymentReceipt = trpc.payment.updatePaymentReceipt.useMutation();

  const isSubmitting = recordManualPayment.isPending || isUploading;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    if (!selectedFile) {
      return;
    }

    try {
      // 1. Create the manual payment record
      const payment = await recordManualPayment.mutateAsync({
        policyId,
        type: paymentType,
        amount: parsedAmount,
        paidBy,
        reference: reference || undefined,
      });

      // 2. Upload the receipt file
      if (selectedFile) {
        setIsUploading(true);

        // Get presigned URL and upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('paymentId', payment.id);

        const uploadResponse = await fetch(`/api/payments/${payment.id}/receipt`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { s3Key, fileName } = await uploadResponse.json();
          // Update payment with receipt info
          await updatePaymentReceipt.mutateAsync({
            paymentId: payment.id,
            receiptS3Key: s3Key,
            receiptFileName: fileName,
          });
        }
      }

      // Reset form
      setPaidBy(paymentType === PaymentType.LANDLORD_PORTION ? PayerType.LANDLORD : PayerType.TENANT);
      setAmount(expectedAmount.toString());
      setReference('');
      setSelectedFile(null);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording manual payment:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const typeLabel = PAYMENT_TYPE_LABELS[paymentType] || paymentType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago Manual</DialogTitle>
          <DialogDescription>
            Registre un pago realizado fuera de Stripe. El pago quedará pendiente de verificación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment type info */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de Pago</span>
              <span className="font-medium">{typeLabel}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Monto Esperado</span>
              <span className="font-medium">{formatCurrency(expectedAmount)}</span>
            </div>
          </div>

          {/* Payer select */}
          <div className="space-y-2">
            <Label htmlFor="paidBy">Pagado Por</Label>
            <Select value={paidBy} onValueChange={(value) => setPaidBy(value as PayerType)}>
              <SelectTrigger id="paidBy">
                <SelectValue placeholder="Seleccionar pagador" />
              </SelectTrigger>
              <SelectContent>
                {PAYER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (MXN)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          {/* Reference input */}
          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (opcional)</Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Número de transferencia, folio, etc."
            />
          </div>

          {/* Receipt upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">Comprobante de Pago *</Label>
            {selectedFile ? (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="receipt"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Suba una imagen o PDF del comprobante de pago.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
