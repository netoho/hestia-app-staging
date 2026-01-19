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
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { PAYMENT_TYPE_LABELS } from '@/lib/constants/paymentConfig';

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  paymentType: PaymentType;
  expectedAmount: number;
  onSuccess: () => void;
}

const PAYER_TYPE_OPTIONS: { value: PayerType; label: string }[] = [
  { value: PayerType.TENANT, label: 'Inquilino' },
  { value: PayerType.LANDLORD, label: 'Arrendador' },
  { value: PayerType.JOINT_OBLIGOR, label: 'Obligado Solidario' },
  { value: PayerType.AVAL, label: 'Aval' },
  { value: PayerType.COMPANY, label: 'Empresa' },
];

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

  const { toast } = useToast();
  const recordManualPayment = trpc.payment.recordManualPayment.useMutation();
  const updatePaymentReceipt = trpc.payment.updatePaymentReceipt.useMutation();
  const cancelPayment = trpc.payment.cancelPayment.useMutation();

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
      toast({
        title: 'Error',
        description: 'Por favor ingrese un monto válido mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (parsedAmount > 1000000) {
      toast({
        title: 'Error',
        description: 'El monto excede el límite máximo permitido',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un comprobante de pago',
        variant: 'destructive',
      });
      return;
    }

    let payment: { id: string } | null = null;

    try {
      // 1. Create the manual payment record
      payment = await recordManualPayment.mutateAsync({
        policyId,
        type: paymentType,
        amount: parsedAmount,
        paidBy,
        reference: reference || undefined,
      });

      // 2. Upload the receipt file
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('paymentId', payment.id);

      const uploadResponse = await fetch(`/api/payments/${payment.id}/receipt`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el comprobante');
      }

      const { s3Key, fileName } = await uploadResponse.json();

      // 3. Update payment with receipt info
      await updatePaymentReceipt.mutateAsync({
        paymentId: payment.id,
        receiptS3Key: s3Key,
        receiptFileName: fileName,
      });

      // Reset form
      setPaidBy(paymentType === PaymentType.LANDLORD_PORTION ? PayerType.LANDLORD : PayerType.TENANT);
      setAmount(expectedAmount.toString());
      setReference('');
      setSelectedFile(null);

      toast({
        title: 'Pago registrado',
        description: 'El pago manual ha sido registrado y está pendiente de verificación',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording manual payment:', error);

      // If payment was created but upload failed, cancel the payment to avoid orphaned records
      if (payment?.id) {
        try {
          await cancelPayment.mutateAsync({
            paymentId: payment.id,
            reason: 'Error al subir comprobante - pago cancelado automáticamente',
          });
        } catch (cancelError) {
          console.error('Error cancelling orphaned payment:', cancelError);
        }
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al registrar el pago manual',
        variant: 'destructive',
      });
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
