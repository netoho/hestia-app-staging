'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LandlordData, PolicyFinancialDetails } from '@/lib/types/actor';
import { DocumentCategory } from '@/types/policy';
import { InlineDocumentManager } from '@/components/documents/InlineDocumentManager';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';

interface FinancialInfoFormProps {
  landlordData: Partial<LandlordData>;
  policyFinancialData: Partial<PolicyFinancialDetails>;
  onLandlordChange: (field: keyof LandlordData, value: any) => void;
  onPolicyFinancialChange: (field: keyof PolicyFinancialDetails, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  policy?: any;
  token: string;
  landlordId?: string;
  isAdminEdit?: boolean;
}

export default function FinancialInfoForm({
  landlordData,
  policyFinancialData,
  onLandlordChange,
  onPolicyFinancialChange,
  errors = {},
  disabled = false,
  policy,
  token,
  landlordId,
  isAdminEdit=false,
}: FinancialInfoFormProps) {
  const { documents, operations } = useDocumentOperations({
    token,
    actorType: 'landlord',
    isAdminEdit,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Información Bancaria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                value={landlordData.bankName || ''}
                onChange={(e) => onLandlordChange('bankName', e.target.value)}
                placeholder="Nombre del banco"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Número de Cuenta</Label>
              <Input
                id="accountNumber"
                value={landlordData.accountNumber || ''}
                onChange={(e) => onLandlordChange('accountNumber', e.target.value)}
                placeholder="Número de cuenta bancaria"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="clabe">CLABE Interbancaria</Label>
              <Input
                id="clabe"
                value={landlordData.clabe || ''}
                onChange={(e) => onLandlordChange('clabe', e.target.value)}
                maxLength={18}
                placeholder="18 dígitos"
                className={errors.clabe ? 'border-red-500' : ''}
                disabled={disabled}
              />
              {errors.clabe && (
                <p className="text-red-500 text-sm mt-1">{errors.clabe}</p>
              )}
            </div>
            <div>
              <Label htmlFor="accountHolder">Titular de la Cuenta</Label>
              <Input
                id="accountHolder"
                value={landlordData.accountHolder || ''}
                onChange={(e) => onLandlordChange('accountHolder', e.target.value)}
                placeholder="Nombre del titular"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresCFDI"
                checked={landlordData.requiresCFDI || false}
                onCheckedChange={(checked) => onLandlordChange('requiresCFDI', checked)}
                disabled={disabled}
              />
              <Label htmlFor="requiresCFDI" className="cursor-pointer">
                Requiere CFDI
              </Label>
            </div>
          </div>

          {landlordData.requiresCFDI && (
            <div className="mt-4 space-y-3">
              <Label className="text-sm font-medium">Constancia de Situación Fiscal</Label>
              <InlineDocumentManager
                documentType={DocumentCategory.TAX_STATUS_CERTIFICATE}
                label="Constancia de Situación Fiscal"
                allowMultiple={true}
                disabled={disabled}
              />
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Label className="text-base font-medium">Escritura de la Propiedad</Label>
            <InlineDocumentManager
              documentType={DocumentCategory.PROPERTY_DEED}
              label="Escritura de la Propiedad"
              allowMultiple={true}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de Operación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="securityDeposit">Depósito en Garantía (meses)</Label>
              <Input
                id="securityDeposit"
                type="number"
                min="0"
                step="0.5"
                value={policyFinancialData.securityDeposit || ''}
                onChange={(e) => onPolicyFinancialChange('securityDeposit', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Número de meses"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="maintenanceFee">Cuota de Mantenimiento</Label>
              <Input
                id="maintenanceFee"
                type="number"
                min="0"
                value={policyFinancialData.maintenanceFee || ''}
                onChange={(e) => onPolicyFinancialChange('maintenanceFee', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="maintenanceIncludedInRent"
                checked={policyFinancialData.maintenanceIncludedInRent || false}
                onCheckedChange={(checked) => onPolicyFinancialChange('maintenanceIncludedInRent', checked)}
                disabled={disabled}
              />
              <Label htmlFor="maintenanceIncludedInRent" className="cursor-pointer">
                Mantenimiento incluido en la renta
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="issuesTaxReceipts"
                checked={policyFinancialData.issuesTaxReceipts || false}
                onCheckedChange={(checked) => onPolicyFinancialChange('issuesTaxReceipts', checked)}
                disabled={disabled}
              />
              <Label htmlFor="issuesTaxReceipts" className="cursor-pointer">
                Emite comprobantes fiscales
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasIVA"
                checked={policyFinancialData.hasIVA || false}
                onCheckedChange={(checked) => onPolicyFinancialChange('hasIVA', checked)}
                disabled={disabled}
              />
              <Label htmlFor="hasIVA" className="cursor-pointer">
                La renta incluye IVA
              </Label>
            </div>
          </div>

          {policy?.contractLength > 12 && (
            <div>
              <Label htmlFor="rentIncreasePercentage">
                Porcentaje de Incremento Anual (%)
              </Label>
              <Input
                id="rentIncreasePercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={policyFinancialData.rentIncreasePercentage || ''}
                onChange={(e) => onPolicyFinancialChange('rentIncreasePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.0"
                disabled={disabled}
              />
            </div>
          )}

          <div>
            <Label htmlFor="paymentMethod">Método de Pago Preferido</Label>
            <Select
              value={policyFinancialData.paymentMethod || ''}
              onValueChange={(value) => onPolicyFinancialChange('paymentMethod', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="deposit">Depósito Bancario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="additionalInfo">Información Adicional</Label>
            <textarea
              id="additionalInfo"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={landlordData.additionalInfo || ''}
              onChange={(e) => onLandlordChange('additionalInfo', e.target.value)}
              placeholder="Información adicional relevante"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
