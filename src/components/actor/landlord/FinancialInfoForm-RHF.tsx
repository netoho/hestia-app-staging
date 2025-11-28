'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { DocumentCategory } from '@/lib/enums';
import { InlineDocumentManager } from '@/components/documents/InlineDocumentManager';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { getLandlordTabSchema } from '@/lib/schemas/landlord';

// Combined schema for financial form (landlord + policy financial data)
const financialFormSchema = z.object({
  // Banking info (from landlord)
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().max(18).optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  // CFDI
  requiresCFDI: z.boolean().default(false),
  // Policy financial
  securityDeposit: z.number().positive().optional().nullable(),
  maintenanceFee: z.number().min(0).optional().nullable(),
  maintenanceIncludedInRent: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  hasIVA: z.boolean().default(false),
  rentIncreasePercentage: z.number().min(0).max(100).optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  additionalInfo: z.string().max(1000).optional().nullable(),
});

interface FinancialInfoFormRHFProps {
  initialData: {
    landlord?: any;
    policyFinancial?: any;
  };
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
  policy?: any;
  token: string;
  landlordId?: string;
  isAdminEdit?: boolean;
}

export default function FinancialInfoFormRHF({
  initialData,
  onSave,
  disabled = false,
  policy,
  token,
  landlordId,
  isAdminEdit = false,
}: FinancialInfoFormRHFProps) {
  const { landlord, policyFinancial } = initialData;

  // Document operations
  const { documents, deleteDocument, downloadDocument, uploadDocument, getCategoryOperations } = useDocumentOperations({
    token,
    actorType: 'landlord',
    isAdminEdit,
  });

  const form = useForm({
    resolver: zodResolver(financialFormSchema as any),
    mode: 'onChange',
    defaultValues: {
      // Banking
      bankName: landlord?.bankName || '',
      accountNumber: landlord?.accountNumber || '',
      clabe: landlord?.clabe || '',
      accountHolder: landlord?.accountHolder || '',
      // CFDI
      requiresCFDI: landlord?.requiresCFDI ?? false,
      // Policy financial
      securityDeposit: policyFinancial?.securityDeposit || null,
      maintenanceFee: policyFinancial?.maintenanceFee || null,
      maintenanceIncludedInRent: policyFinancial?.maintenanceIncludedInRent ?? false,
      issuesTaxReceipts: policyFinancial?.issuesTaxReceipts ?? false,
      hasIVA: policyFinancial?.hasIVA ?? false,
      rentIncreasePercentage: policyFinancial?.rentIncreasePercentage || null,
      paymentMethod: policyFinancial?.paymentMethod || '',
      additionalInfo: landlord?.additionalInfo || '',
    },
  });

  const requiresCFDI = form.watch('requiresCFDI');
  const showRentIncrease = policy?.contractLength > 12;

  const handleSubmit = async (data: any) => {
    // Flat landlord fields (will go to actor.update)
    const landlordData = {
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      clabe: data.clabe,
      accountHolder: data.accountHolder,
      requiresCFDI: data.requiresCFDI,
      additionalInfo: data.additionalInfo,
    };

    // Policy financial (will go to savePolicyFinancial)
    const policyFinancial = {
      securityDeposit: data.securityDeposit,
      maintenanceFee: data.maintenanceFee,
      maintenanceIncludedInRent: data.maintenanceIncludedInRent,
      issuesTaxReceipts: data.issuesTaxReceipts,
      hasIVA: data.hasIVA,
      rentIncreasePercentage: data.rentIncreasePercentage,
      paymentMethod: data.paymentMethod,
    };

    // Spread landlord fields flat + policyFinancial as nested object
    await onSave({ ...landlordData, policyFinancial });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Banking Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Bancaria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Banco</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Nombre del banco"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Número de Cuenta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Número de cuenta bancaria"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clabe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>CLABE Interbancaria</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                        maxLength={18}
                        placeholder="18 dígitos"
                        className="font-mono"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Titular de la Cuenta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Nombre del titular"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Billing / CFDI */}
        <Card>
          <CardHeader>
            <CardTitle>Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="requiresCFDI"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Requiere CFDI</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {requiresCFDI && (
              <div className="mt-4 space-y-3">
                <Label className="text-sm font-medium">Constancia de Situación Fiscal</Label>
                <InlineDocumentManager
                  documents={documents[DocumentCategory.TAX_STATUS_CERTIFICATE] || []}
                  documentType={DocumentCategory.TAX_STATUS_CERTIFICATE}
                  onUpload={(file) => uploadDocument(
                    file,
                    DocumentCategory.TAX_STATUS_CERTIFICATE,
                    'tax_status_certificate',
                  )}
                  onDelete={deleteDocument}
                  onDownload={downloadDocument}
                  operations={getCategoryOperations(DocumentCategory.TAX_STATUS_CERTIFICATE)}
                  label="Constancia de Situación Fiscal"
                  allowMultiple={true}
                  disabled={disabled}
                />
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Label className="text-base font-medium">Escritura de la Propiedad</Label>
              <InlineDocumentManager
                documents={documents[DocumentCategory.PROPERTY_DEED] || []}
                documentType={DocumentCategory.PROPERTY_DEED}
                onUpload={(file) => uploadDocument(
                  file,
                  DocumentCategory.PROPERTY_DEED,
                  'property_deed',
                )}
                onDelete={deleteDocument}
                onDownload={downloadDocument}
                operations={getCategoryOperations(DocumentCategory.PROPERTY_DEED)}
                label="Escritura de la Propiedad"
                allowMultiple={true}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="securityDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Depósito en Garantía (meses)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        min="0"
                        step="0.5"
                        placeholder="Número de meses"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Cuota de Mantenimiento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        min="0"
                        placeholder="0.00"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="maintenanceIncludedInRent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mantenimiento incluido en la renta</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuesTaxReceipts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Emite comprobantes fiscales</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasIVA"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>La renta incluye IVA</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {showRentIncrease && (
              <FormField
                control={form.control}
                name="rentIncreasePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Porcentaje de Incremento Anual (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0.0"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Método de Pago Preferido</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="deposit">Depósito Bancario</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Información Adicional</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="Información adicional relevante"
                      disabled={disabled}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
