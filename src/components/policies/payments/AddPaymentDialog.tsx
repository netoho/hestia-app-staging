'use client';

import { useState } from 'react';
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
import { Loader2, AlertTriangle } from 'lucide-react';
import { PayerType } from '@/prisma/generated/prisma-client/enums';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils/currency';
import { PAYER_TYPE_LABELS } from '@/lib/constants/paymentConfig';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  onSuccess: () => void;
}

const PAYER_TYPE_OPTIONS: { value: PayerType; label: string }[] = [
  { value: PayerType.TENANT, label: 'Inquilino' },
  { value: PayerType.LANDLORD, label: 'Arrendador' },
  { value: PayerType.JOINT_OBLIGOR, label: 'Obligado Solidario' },
  { value: PayerType.AVAL, label: 'Aval' },
  { value: PayerType.COMPANY, label: 'Empresa' },
];

export function AddPaymentDialog({
  open,
  onOpenChange,
  policyId,
  onSuccess,
}: AddPaymentDialogProps) {
  const [paidBy, setPaidBy] = useState<PayerType>(PayerType.TENANT);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const createPayment = trpc.payment.createNew.useMutation({
    onSuccess: () => {
      toast({
        title: 'Pago creado',
        description: 'Se ha generado un nuevo link de pago',
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el pago',
        variant: 'destructive',
      });
      setShowConfirmation(false);
    },
  });

  const handleClose = () => {
    setPaidBy(PayerType.TENANT);
    setAmount('');
    setDescription('');
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
        description: 'El subtotal excede el límite máximo ($862,069 MXN para que el total no supere $1,000,000)',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    createPayment.mutate({
      policyId,
      amount: parseFloat(amount),
      paidBy,
      description: description || undefined,
    });
  };

  const subtotal = parseFloat(amount) || 0;
  const iva = Math.round(subtotal * TAX_CONFIG.IVA_RATE * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;
  const payerLabel = PAYER_TYPE_LABELS[paidBy] || paidBy;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Confirmar Nuevo Pago' : 'Agregar Pago'}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? 'Se creará un nuevo link de pago con Stripe.'
              : 'Cree un nuevo pago con link de Stripe para esta póliza.'}
          </DialogDescription>
        </DialogHeader>

        {showConfirmation ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-orange-800">
                    ¿Confirma la creación del pago?
                  </p>
                  <ul className="text-orange-700 space-y-1">
                    <li>• Se generará un link de pago con Stripe</li>
                    <li>• El link expirará en 24 horas</li>
                    <li>• El pago quedará en estado pendiente hasta ser completado</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagador</span>
                <span className="font-medium">{payerLabel}</span>
              </div>
              {description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descripción</span>
                  <span className="font-medium">{description}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between font-medium text-primary">
                  <span>Total a cobrar</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={createPayment.isPending}
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Pago'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paidBy">¿Quién va a pagar?</Label>
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

            <div className="space-y-2">
              <Label htmlFor="amount">Subtotal (sin IVA)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max="862069"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se agregará 16% de IVA al monto ingresado
              </p>
              {subtotal > 0 && (
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA (16%)</span>
                    <span>{formatCurrency(iva)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total a cobrar</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Pago adicional, Ajuste, etc."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!amount || subtotal <= 0}>
                Continuar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
