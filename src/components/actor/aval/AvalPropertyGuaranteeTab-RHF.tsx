'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { Document } from '@/types/documents';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { getAvalTabSchema } from '@/lib/schemas/aval';
import type { AvalType } from "@/prisma/generated/prisma-client/enums";

interface AvalPropertyGuaranteeTabProps {
  avalType: AvalType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
  token: string;
  avalId?: string;
  initialDocuments?: Document[];
}

export default function AvalPropertyGuaranteeTab({
  avalType,
  initialData,
  onSave,
  disabled = false,
  token,
  avalId,
  initialDocuments = [],
}: AvalPropertyGuaranteeTabProps) {
  // Get schema with conditional validation
  const schema = getAvalTabSchema(avalType, 'property');

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      hasPropertyGuarantee: true,
      guaranteeMethod: 'property',
      propertyUnderLegalProceeding: false,
      ...initialData,
    },
  });

  // Watch marital status for conditional spouse fields
  const maritalStatus = form.watch('maritalStatus');
  const showSpouseInfo = maritalStatus === 'married_joint' ||
                         maritalStatus === 'married_separate' ||
                         maritalStatus === 'common_law';

  const { documents, uploadDocument, deleteDocument, downloadDocument, getCategoryOperations } = useDocumentOperations({
    token,
    actorType: 'aval',
    initialDocuments
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Alert - Property Guarantee Required */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Como aval, es necesario proporcionar una propiedad como garantía. Por favor complete toda la información de la propiedad que servirá como garantía.
          </AlertDescription>
        </Alert>

        {/* Property Guarantee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Propiedad en Garantía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Property Address Autocomplete */}
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
                {/* Property Value */}
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

                {/* Property Deed Number */}
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
                  Los documentos de la propiedad son obligatorios. Nuestro equipo verificará la información de la escritura y el pago de impuestos prediales.
                </AlertDescription>
              </Alert>

              {/* Property Deed */}
              <DocumentManagerCard
                category={DocumentCategory.PROPERTY_DEED}
                title="Escritura de la Propiedad"
                description="Escritura pública de la propiedad que se ofrece como garantía"
                documentType="property_deed"
                documents={documents[DocumentCategory.PROPERTY_DEED] || []}
                onUpload={(file) => uploadDocument(file, DocumentCategory.PROPERTY_DEED, 'property_deed')}
                onDelete={deleteDocument}
                onDownload={downloadDocument}
                operations={getCategoryOperations(DocumentCategory.PROPERTY_DEED)}
                required={true}
                allowMultiple={false}
              />

              {/* Property Tax Statement */}
              <DocumentManagerCard
                category={DocumentCategory.PROPERTY_TAX_STATEMENT}
                title="Boleta Predial"
                description="Último recibo de impuesto predial de la propiedad en garantía"
                documentType="property_tax_statement"
                documents={documents[DocumentCategory.PROPERTY_TAX_STATEMENT] || []}
                onUpload={(file) => uploadDocument(file, DocumentCategory.PROPERTY_TAX_STATEMENT, 'property_tax_statement')}
                onDelete={deleteDocument}
                onDownload={downloadDocument}
                operations={getCategoryOperations(DocumentCategory.PROPERTY_TAX_STATEMENT)}
                required={true}
                allowMultiple={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Marital Status and Spouse Information (for Individuals) */}
        {avalType !== 'COMPANY' && (
          <Card>
            <CardHeader>
              <CardTitle>Estado Civil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Marital Status */}
                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Estado Civil</FormLabel>
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
                          <SelectItem value="common_law">Unión Libre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Spouse Information - Conditional based on marital status */}
                {showSpouseInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">Información del Cónyuge</h4>
                      <p className="text-sm text-muted-foreground">
                        Requerido para personas casadas o en unión libre
                      </p>
                    </div>

                    {/* Spouse Name - Required when married */}
                    <FormField
                      control={form.control}
                      name="spouseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Nombre Completo del Cónyuge</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Nombre completo"
                              disabled={disabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Spouse RFC */}
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

                    {/* Spouse CURP */}
                    <FormField
                      control={form.control}
                      name="spouseCurp"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel optional>CURP del Cónyuge</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              placeholder="CURP del cónyuge"
                              maxLength={18}
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
      </form>
    </Form>
  );
}
