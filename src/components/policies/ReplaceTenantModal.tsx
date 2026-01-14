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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, UserMinus } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { TenantType } from '@/prisma/generated/prisma-client/enums';

interface ReplaceTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  policyNumber: string;
  currentTenantEmail: string;
  hasGuarantors: boolean;
  onSuccess: () => void;
}

export default function ReplaceTenantModal({
  isOpen,
  onClose,
  policyId,
  policyNumber,
  currentTenantEmail,
  hasGuarantors,
  onSuccess,
}: ReplaceTenantModalProps) {
  const [replacementReason, setReplacementReason] = useState('');
  const [tenantType, setTenantType] = useState<TenantType>('INDIVIDUAL');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [replaceGuarantors, setReplaceGuarantors] = useState(false);
  const { toast } = useToast();

  const replaceMutation = trpc.policy.replaceTenant.useMutation({
    onSuccess: () => {
      toast({
        title: 'Inquilino Reemplazado',
        description: `El inquilino de la póliza ${policyNumber} ha sido reemplazado exitosamente`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reemplazar el inquilino',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setReplacementReason('');
    setTenantType('INDIVIDUAL');
    setEmail('');
    setPhone('');
    setFirstName('');
    setCompanyName('');
    setReplaceGuarantors(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) return;
    replaceMutation.mutate({
      policyId,
      replacementReason: replacementReason.trim(),
      newTenant: {
        tenantType,
        email: email.trim(),
        phone: phone.trim(),
        firstName: tenantType === 'INDIVIDUAL' ? firstName.trim() || undefined : undefined,
        companyName: tenantType === 'COMPANY' ? companyName.trim() || undefined : undefined,
      },
      replaceGuarantors,
    });
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValid =
    replacementReason.trim().length > 0 &&
    isValidEmail &&
    phone.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Reemplazar Inquilino
          </DialogTitle>
          <DialogDescription>
            Reemplazar inquilino en la póliza {policyNumber}. El inquilino actual ({currentTenantEmail}) será archivado.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Esta acción archivará los datos del inquilino actual y sus documentos. La póliza volverá al estado de recopilación de información.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            Se enviará un correo al nuevo inquilino con su enlace de acceso.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Replacement Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del reemplazo *</Label>
            <Textarea
              id="reason"
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value)}
              placeholder="Explique por qué se reemplaza al inquilino..."
              rows={2}
            />
          </div>

          <hr className="my-4" />

          {/* New Tenant Data */}
          <p className="text-sm font-medium text-muted-foreground">Datos del nuevo inquilino</p>

          <div className="space-y-2">
            <Label htmlFor="tenantType">Tipo de inquilino *</Label>
            <Select
              value={tenantType}
              onValueChange={(value) => setTenantType(value as TenantType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Persona Física</SelectItem>
                <SelectItem value="COMPANY">Persona Moral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55 1234 5678"
            />
          </div>

          {tenantType === 'INDIVIDUAL' ? (
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre (opcional)</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre del inquilino"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="companyName">Razón social (opcional)</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de la empresa"
              />
            </div>
          )}

          {/* Replace Guarantors */}
          {hasGuarantors && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="replaceGuarantors"
                checked={replaceGuarantors}
                onCheckedChange={(checked) => setReplaceGuarantors(checked === true)}
              />
              <Label htmlFor="replaceGuarantors" className="text-sm font-normal cursor-pointer">
                También reemplazar obligados solidarios y/o avales
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={replaceMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || replaceMutation.isPending}
          >
            {replaceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reemplazar Inquilino
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
