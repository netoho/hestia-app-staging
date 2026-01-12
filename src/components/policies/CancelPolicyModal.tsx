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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { PolicyCancellationReason } from '@/prisma/generated/prisma-client/enums';

const CANCELLATION_REASONS: Record<PolicyCancellationReason, string> = {
  CLIENT_REQUEST: 'Solicitud del Cliente',
  NON_PAYMENT: 'Falta de Pago',
  FRAUD: 'Fraude',
  DOCUMENTATION_ISSUES: 'Problemas de Documentación',
  LANDLORD_REQUEST: 'Solicitud del Arrendador',
  TENANT_REQUEST: 'Solicitud del Inquilino',
  OTHER: 'Otro',
};

interface CancelPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  policyNumber: string;
  onSuccess: () => void;
}

export default function CancelPolicyModal({
  isOpen,
  onClose,
  policyId,
  policyNumber,
  onSuccess,
}: CancelPolicyModalProps) {
  const [reason, setReason] = useState<PolicyCancellationReason | ''>('');
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const cancelMutation = trpc.policy.cancelPolicy.useMutation({
    onSuccess: () => {
      toast({
        title: 'Protección Cancelada',
        description: `La protección ${policyNumber} ha sido cancelada exitosamente`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cancelar la protección',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setReason('');
    setComment('');
    onClose();
  };

  const handleSubmit = () => {
    if (!reason || !comment.trim()) return;
    cancelMutation.mutate({
      policyId,
      reason,
      comment: comment.trim(),
    });
  };

  const isValid = reason && comment.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar Protección</DialogTitle>
          <DialogDescription>
            Esta acción cancelara permanentemente la protección {policyNumber}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Esta acción no se puede deshacer. Los administradores seran notificados.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Razón de Cancelación *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as PolicyCancellationReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una razón" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CANCELLATION_REASONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comentario *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explique los detalles de la cancelación..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              El comentario es obligatorio para todas las cancelaciones.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={cancelMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isValid || cancelMutation.isPending}
          >
            {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
