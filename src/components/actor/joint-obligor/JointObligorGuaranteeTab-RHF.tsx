'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Home, Info, Shield } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/lib/enums';
import { Document } from '@/types/documents';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { jointObligorGuaranteeTabSchema } from '@/lib/schemas/joint-obligor';
import type { JointObligorType } from '@prisma/client';

interface JointObligorGuaranteeTabProps {
  jointObligorType: JointObligorType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
  token: string;
  jointObligorId?: string;
  initialDocuments?: Document[];
}

export default function JointObligorGuaranteeTab({
  jointObligorType,
  initialData,
  onSave,
  disabled = false,
  token,
  jointObligorId,
  initialDocuments = [],
}: JointObligorGuaranteeTabProps) {
  // Use discriminated union schema - automatically validates based on guaranteeMethod
  const form = useForm({
    resolver: zodResolver(jointObligorGuaranteeTabSchema),
    mode: 'onChange',
    defaultValues: {
      guaranteeMethod: 'income', // Default to income
      hasPropertyGuarantee: false,
      propertyUnderLegalProceeding: false,
      ...initialData,
    },
  });

  // Watch guarantee method for conditional rendering
  const guaranteeMethod = form.watch('guaranteeMethod');
  const isIncomeGuarantee = guaranteeMethod === 'income';
  const isPropertyGuarantee = guaranteeMethod === 'property';

  // Watch marital status for spouse fields (property guarantee)
  const maritalStatus = form.watch('maritalStatus');
  const showSpouseInfo = maritalStatus === 'married_joint' ||
                         maritalStatus === 'married_separate';

  const { documents, uploadDocument, downloadDocument, deleteDocument, getCategoryOperations } = useDocumentOperations({
    token,
    actorType: 'joint-obligor',
    initialDocuments
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Guarantee Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Método de Garantía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Como obligado solidario, puede garantizar mediante sus ingresos mensuales o mediante una propiedad inmueble.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="guaranteeMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset relevant fields when switching
                          if (value === 'income') {
                            form.setValue('hasPropertyGuarantee', false);
                          } else {
                            form.setValue('hasPropertyGuarantee', true);
                          }
                        }}
                        disabled={disabled}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="income" id="income-guarantee" />
                          <Label htmlFor="income-guarantee" className="flex items-center cursor-pointer">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Garantía por Ingresos
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="property" id="property-guarantee" />
                          <Label htmlFor="property-guarantee" className="flex items-center cursor-pointer">
                            <Home className="h-4 w-4 mr-2" />
                            Garantía con Propiedad
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Income-Based Guarantee Information */}
        {isIncomeGuarantee && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Información Financiera</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Su garantía se basará en sus ingresos mensuales comprobables. Asegúrese de que sus ingresos sean suficientes para respaldar el arrendamiento.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bank Name - Required for income guarantee */}
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Banco Principal</FormLabel>
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

                    {/* Account Holder - Required for income guarantee */}
                    <FormField
                      control={form.control}
                      name="accountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Titular de la Cuenta</FormLabel>
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

                    {/* Monthly Income - Required for income guarantee */}
                    <FormField
                      control={form.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Ingreso Mensual (MXN)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              disabled={disabled}
                            />
                          </FormControl>
                          <FormDescription>
                            Ingreso mensual comprobable que servirá como garantía
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Has Properties (Optional checkbox) */}
                  <FormField
                    control={form.control}
                    name="hasProperties"
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
                          <FormLabel className="font-normal cursor-pointer">
                            ¿Cuenta con propiedades inmuebles? (Opcional - fortalece su solicitud)
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Monthly Income Display */}
                  {form.watch('monthlyIncome') > 0 && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>Recordatorio:</strong> Su ingreso mensual de ${form.watch('monthlyIncome')?.toLocaleString('es-MX') || '0'} MXN será validado con documentación.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Income Proof Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Comprobante de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Debe cargar comprobantes de sus ingresos para validar su capacidad de pago.
                    </AlertDescription>
                  </Alert>

                  <DocumentManagerCard
                    category={DocumentCategory.INCOME_PROOF}
                    title="Comprobante de Ingresos"
                    description="Recibos de nómina, estados de cuenta bancarios, o declaración de impuestos"
                    token={token}
                    actorType="joint-obligor"
                    required={true}
                    allowMultiple={true}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Property-Based Guarantee Information */}
        {isPropertyGuarantee && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Información de la Propiedad en Garantía</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Property Address - Required for property guarantee */}
                  <FormField
                    control={form.control}
                    name="guaranteePropertyDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Dirección de la Propiedad</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            label=""
                            value={field.value || {}}
                            onChange={(addressData) => {
                              field.onChange(addressData);
                              form.setValue('propertyAddress',
                                `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                              );
                            }}
                            required
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Property Value - Required */}
                    <FormField
                      control={form.control}
                      name="propertyValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Valor de la Propiedad (MXN)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              disabled={disabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Property Deed Number - Required */}
                    <FormField
                      control={form.control}
                      name="propertyDeedNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Número de Escritura</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="propertyRegistry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Folio del Registro Público</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} disabled={disabled} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyTaxAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Cuenta Predial</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} disabled={disabled} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Property Under Legal Proceeding */}
                  <FormField
                    control={form.control}
                    name="propertyUnderLegalProceeding"
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
                          <FormLabel className="font-normal cursor-pointer">
                            La propiedad está bajo algún proceso legal
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Property Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos de la Propiedad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Los documentos de la propiedad son obligatorios para validar la garantía.
                    </AlertDescription>
                  </Alert>

                  <DocumentManagerCard
                    category={DocumentCategory.PROPERTY_DEED}
                    title="Escritura de la Propiedad"
                    description="Escritura pública de la propiedad que se ofrece como garantía"
                    token={token}
                    actorType="joint-obligor"
                    required={true}
                    allowMultiple={false}
                  />

                  <DocumentManagerCard
                    category={DocumentCategory.PROPERTY_TAX_STATEMENT}
                    title="Boleta Predial"
                    description="Último recibo de impuesto predial"
                    token={token}
                    actorType="joint-obligor"
                    required={true}
                    allowMultiple={false}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Marital Status (for property guarantee - individuals) */}
            {jointObligorType !== 'COMPANY' && (
              <Card>
                <CardHeader>
                  <CardTitle>Estado Civil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>Estado Civil</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={disabled}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Soltero(a)</SelectItem>
                              <SelectItem value="married_joint">Casado(a) - Sociedad Conyugal</SelectItem>
                              <SelectItem value="married_separate">Casado(a) - Separación de Bienes</SelectItem>
                              <SelectItem value="divorced">Divorciado(a)</SelectItem>
                              <SelectItem value="widowed">Viudo(a)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Spouse Information - Conditional */}
                    {showSpouseInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="md:col-span-2">
                          <h4 className="font-medium mb-2">Información del Cónyuge</h4>
                        </div>

                        <FormField
                          control={form.control}
                          name="spouseName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel optional>Nombre Completo del Cónyuge</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ''} placeholder="Nombre completo" disabled={disabled} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="spouseRfc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel optional>RFC del Cónyuge</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  placeholder="RFC con homoclave"
                                  maxLength={13}
                                  disabled={disabled}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </form>
    </Form>
  );
}
