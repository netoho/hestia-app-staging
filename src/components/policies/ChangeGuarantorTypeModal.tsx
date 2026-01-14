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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Shield, Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';

interface NewGuarantorData {
  email: string;
  phone: string;
  firstName: string;
}

interface ChangeGuarantorTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  policyNumber: string;
  currentGuarantorType: GuarantorType;
  hasExistingGuarantors: boolean;
  onSuccess: () => void;
}

const GUARANTOR_TYPE_LABELS: Record<GuarantorType, string> = {
  NONE: 'Sin Garantía',
  JOINT_OBLIGOR: 'Obligado Solidario',
  AVAL: 'Aval',
  BOTH: 'Ambos',
};

const createEmptyGuarantor = (): NewGuarantorData => ({
  email: '',
  phone: '',
  firstName: '',
});

export default function ChangeGuarantorTypeModal({
  isOpen,
  onClose,
  policyId,
  policyNumber,
  currentGuarantorType,
  hasExistingGuarantors,
  onSuccess,
}: ChangeGuarantorTypeModalProps) {
  const [reason, setReason] = useState('');
  const [newGuarantorType, setNewGuarantorType] = useState<GuarantorType>(currentGuarantorType);
  const [jointObligors, setJointObligors] = useState<NewGuarantorData[]>([createEmptyGuarantor()]);
  const [avals, setAvals] = useState<NewGuarantorData[]>([createEmptyGuarantor()]);
  const { toast } = useToast();

  const changeMutation = trpc.policy.changeGuarantorType.useMutation({
    onSuccess: () => {
      toast({
        title: 'Tipo de Garantía Cambiado',
        description: `El tipo de garantía de la póliza ${policyNumber} ha sido actualizado exitosamente`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar el tipo de garantía',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setReason('');
    setNewGuarantorType(currentGuarantorType);
    setJointObligors([createEmptyGuarantor()]);
    setAvals([createEmptyGuarantor()]);
    onClose();
  };

  const needsJointObligors = newGuarantorType === 'JOINT_OBLIGOR' || newGuarantorType === 'BOTH';
  const needsAvals = newGuarantorType === 'AVAL' || newGuarantorType === 'BOTH';

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateGuarantors = (guarantors: NewGuarantorData[]) => {
    return guarantors.every(g => isValidEmail(g.email) && g.phone.trim().length > 0);
  };

  const isValid =
    reason.trim().length > 0 &&
    newGuarantorType !== currentGuarantorType &&
    (!needsJointObligors || validateGuarantors(jointObligors)) &&
    (!needsAvals || validateGuarantors(avals));

  const handleSubmit = () => {
    if (!isValid) return;

    const newJointObligors = needsJointObligors
      ? jointObligors.map(jo => ({
          email: jo.email.trim(),
          phone: jo.phone.trim(),
          firstName: jo.firstName.trim() || undefined,
        }))
      : undefined;

    const newAvals = needsAvals
      ? avals.map(a => ({
          email: a.email.trim(),
          phone: a.phone.trim(),
          firstName: a.firstName.trim() || undefined,
        }))
      : undefined;

    changeMutation.mutate({
      policyId,
      reason: reason.trim(),
      newGuarantorType,
      newJointObligors,
      newAvals,
    });
  };

  const updateJointObligor = (index: number, field: keyof NewGuarantorData, value: string) => {
    setJointObligors(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addJointObligor = () => {
    setJointObligors(prev => [...prev, createEmptyGuarantor()]);
  };

  const removeJointObligor = (index: number) => {
    if (jointObligors.length > 1) {
      setJointObligors(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateAval = (index: number, field: keyof NewGuarantorData, value: string) => {
    setAvals(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addAval = () => {
    setAvals(prev => [...prev, createEmptyGuarantor()]);
  };

  const removeAval = (index: number) => {
    if (avals.length > 1) {
      setAvals(prev => prev.filter((_, i) => i !== index));
    }
  };

  const renderGuarantorForm = (
    title: string,
    guarantors: NewGuarantorData[],
    onUpdate: (index: number, field: keyof NewGuarantorData, value: string) => void,
    onAdd: () => void,
    onRemove: (index: number) => void,
    idPrefix: string
  ) => (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {guarantors.map((g, index) => (
        <div key={index} className="space-y-3 p-3 border rounded-md bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              {title.replace('s', '')} {index + 1}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRemove(index)}
              disabled={guarantors.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor={`${idPrefix}-email-${index}`}>Correo electrónico *</Label>
              <Input
                id={`${idPrefix}-email-${index}`}
                type="email"
                value={g.email}
                onChange={(e) => onUpdate(index, 'email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-phone-${index}`}>Teléfono *</Label>
              <Input
                id={`${idPrefix}-phone-${index}`}
                type="tel"
                value={g.phone}
                onChange={(e) => onUpdate(index, 'phone', e.target.value)}
                placeholder="55 1234 5678"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-name-${index}`}>Nombre (opcional)</Label>
              <Input
                id={`${idPrefix}-name-${index}`}
                value={g.firstName}
                onChange={(e) => onUpdate(index, 'firstName', e.target.value)}
                placeholder="Nombre"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cambiar Tipo de Garantía
          </DialogTitle>
          <DialogDescription>
            Cambiar el tipo de garantía en la póliza {policyNumber}.
            Tipo actual: <strong>{GUARANTOR_TYPE_LABELS[currentGuarantorType]}</strong>
          </DialogDescription>
        </DialogHeader>

        {hasExistingGuarantors && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Esta acción archivará todos los datos de los garantes actuales y sus documentos. Esta información quedará registrada en el historial.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            Se enviará un correo a los nuevos garantes con su enlace de acceso para completar su información.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del cambio *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por qué se cambia el tipo de garantía..."
              rows={2}
            />
          </div>

          {/* New Guarantor Type */}
          <div className="space-y-2">
            <Label htmlFor="newType">Nuevo tipo de garantía *</Label>
            <Select
              value={newGuarantorType}
              onValueChange={(value) => setNewGuarantorType(value as GuarantorType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin Garantía</SelectItem>
                <SelectItem value="JOINT_OBLIGOR">Obligado Solidario</SelectItem>
                <SelectItem value="AVAL">Aval</SelectItem>
                <SelectItem value="BOTH">Ambos</SelectItem>
              </SelectContent>
            </Select>
            {newGuarantorType === currentGuarantorType && (
              <p className="text-sm text-muted-foreground">
                Seleccione un tipo diferente al actual
              </p>
            )}
          </div>

          {/* Joint Obligors Form */}
          {needsJointObligors && renderGuarantorForm(
            'Obligados Solidarios',
            jointObligors,
            updateJointObligor,
            addJointObligor,
            removeJointObligor,
            'jo'
          )}

          {/* Avals Form */}
          {needsAvals && renderGuarantorForm(
            'Avales',
            avals,
            updateAval,
            addAval,
            removeAval,
            'aval'
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={changeMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || changeMutation.isPending}
          >
            {changeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cambiar Tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
