'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, AlertTriangle } from 'lucide-react';
import { PaymentType } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { PAYMENT_TYPE_LABELS } from '@/lib/constants/paymentConfig';
import type { PaymentWithStatus } from '@/lib/services/paymentService';

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithStatus | null;
  onSuccess: () => void;
}

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: EditPaymentDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const editAmount = trpc.payment.editAmount.useMutation({
    onSuccess: () => {
      toast({
        title: 'Monto actualizado',
        description: 'El monto del pago ha sido actualizado y se ha generado un nuevo link de pago',
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el monto',
        variant: 'destructive',
      });
      setShowConfirmation(false);
    },
  });

  // Reset state when dialog opens/closes or payment changes
  useEffect(() => {
    if (open && payment) {
      // Initialize with current subtotal (stored amount includes IVA)
      const currentSubtotal = Math.round((payment.amount / 1.16) * 100) / 100;
      setAmount(currentSubtotal.toString());
      setShowConfirmation(false);
    }
  }, [open, payment]);

  const handleClose = () => {
    setAmount('');
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedSubtotal = parseFloat(amount);
    if (isNaN(parsedSubtotal) || parsedSubtotal <= 0) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese un monto válido mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    // Max subtotal ~862,069 so total with IVA stays under 1M
    if (parsedSubtotal > 862069) {
      toast({
        title: 'Error',
        description: 'El subtotal excede el límite máximo ($862,069 MXN)',
        variant: 'destructive',
      });
      return;
    }

    if (Math.abs(parsedSubtotal - currentSubtotal) < 0.01) {
      toast({
        title: 'Sin cambios',
        description: 'El nuevo subtotal es igual al actual',
        variant: 'default',
      });
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (!payment) return;

    editAmount.mutate({
      paymentId: payment.id,
      newAmount: parseFloat(amount),
    });
  };

  if (!payment) return null;

  const typeLabel = PAYMENT_TYPE_LABELS[payment.type as PaymentType] || payment.type;

  // Current values (stored amount includes IVA)
  const currentSubtotal = Math.round((payment.amount / 1.16) * 100) / 100;
  const currentIva = Math.round((payment.amount - currentSubtotal) * 100) / 100;
  const currentTotal = payment.amount;

  // New values from input
  const newSubtotal = parseFloat(amount) || 0;
  const newIva = Math.round(newSubtotal * 0.16 * 100) / 100;
  const newTotal = Math.round((newSubtotal + newIva) * 100) / 100;

  const subtotalChanged = newSubtotal !== currentSubtotal && newSubtotal > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Confirmar Cambio de Monto' : 'Editar Monto de Pago'}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? 'Esta acción invalidará el link de pago actual y generará uno nuevo.'
              : 'Modifique el monto del pago. Se generará un nuevo link de pago.'}
          </DialogDescription>
        </DialogHeader>

        {showConfirmation ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-orange-800">
                    ¿Está seguro de cambiar el monto?
                  </p>
                  <ul className="text-orange-700 space-y-1">
                    <li>• El link de pago actual dejará de funcionar</li>
                    <li>• Se generará un nuevo link con el monto actualizado</li>
                    <li>• Si alguien está en proceso de pago, deberá usar el nuevo link</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de Pago</span>
                <span className="font-medium">{typeLabel}</span>
              </div>

              {/* Old breakdown */}
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Monto Anterior:</p>
                <div className="flex justify-between text-muted-foreground line-through">
                  <span>Subtotal</span>
                  <span>{formatCurrency(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground line-through">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(currentIva)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground line-through">
                  <span>Total</span>
                  <span>{formatCurrency(currentTotal)}</span>
                </div>
              </div>

              {/* New breakdown */}
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-medium text-primary">Nuevo Monto:</p>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(newSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(newIva)}</span>
                </div>
                <div className="flex justify-between font-medium text-primary">
                  <span>Total a cobrar</span>
                  <span>{formatCurrency(newTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={editAmount.isPending}
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={editAmount.isPending}
              >
                {editAmount.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Confirmar Cambio'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current breakdown */}
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de Pago</span>
                <span className="font-medium">{typeLabel}</span>
              </div>
              <div className="border-t mt-2 pt-2 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Monto Actual:</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(currentIva)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(currentTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAmount">Nuevo Subtotal (sin IVA)</Label>
              <Input
                id="newAmount"
                type="number"
                min="1"
                max="862069"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Se agregará 16% de IVA al monto ingresado
              </p>
              {newSubtotal > 0 && (
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(newSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA (16%)</span>
                    <span>{formatCurrency(newIva)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total a cobrar</span>
                    <span>{formatCurrency(newTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!subtotalChanged}>
                Continuar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
