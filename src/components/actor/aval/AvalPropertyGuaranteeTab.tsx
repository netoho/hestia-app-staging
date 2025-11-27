'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { AvalFormData } from '@/hooks/useAvalForm';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/lib/enums';
import { Document } from '@/types/documents';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';

interface AvalPropertyGuaranteeTabProps {
  formData: AvalFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
  token: string;
  avalId?: string;
  initialDocuments?: Document[];
}

export default function AvalPropertyGuaranteeTab({
  formData,
  onFieldChange,
  errors,
  disabled,
  token,
  avalId,
  initialDocuments = [],
}: AvalPropertyGuaranteeTabProps) {
  const { documents, uploadDocument, deleteDocument, downloadDocument, getCategoryOperations } = useDocumentOperations({
    token,
    actorType: 'aval',
    initialDocuments
  });

  return (
    <div className="space-y-4">
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
            <div>
              <AddressAutocomplete
                label="Dirección de la Propiedad *"
                value={formData.guaranteePropertyDetails || {}}
                onChange={(addressData) => {
                  onFieldChange('guaranteePropertyDetails', addressData);
                  onFieldChange('propertyAddress',
                    `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                  );
                }}
                required
                disabled={disabled}
              />
              {errors.propertyAddress && (
                <p className="text-sm text-red-500 mt-1">{errors.propertyAddress}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Value */}
              <div>
                <Label htmlFor="propertyValue">Valor de la Propiedad (MXN) *</Label>
                <Input
                  id="propertyValue"
                  type="number"
                  value={formData.propertyValue || ''}
                  onChange={(e) => onFieldChange('propertyValue', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  disabled={disabled}
                />
                {errors.propertyValue && (
                  <p className="text-sm text-red-500 mt-1">{errors.propertyValue}</p>
                )}
              </div>
            </div>

            {/* Property Under Legal Proceeding */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="propertyUnderLegalProceeding"
                checked={formData.propertyUnderLegalProceeding || false}
                onCheckedChange={(checked) => onFieldChange('propertyUnderLegalProceeding', checked)}
                disabled={disabled}
              />
              <Label htmlFor="propertyUnderLegalProceeding" className="font-normal cursor-pointer">
                La propiedad está bajo algún proceso legal
              </Label>
            </div>
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
      {formData.avalType !== 'COMPANY' && (
        <Card>
          <CardHeader>
            <CardTitle>Estado Civil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Marital Status */}
              <div>
                <Label htmlFor="maritalStatus">Estado Civil *</Label>
                <Select
                  value={formData.maritalStatus || ''}
                  onValueChange={(value) => onFieldChange('maritalStatus', value)}
                  disabled={disabled}
                >
                  <SelectTrigger id="maritalStatus">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Soltero(a)</SelectItem>
                    <SelectItem value="married_joint">Casado(a) - Sociedad Conyugal</SelectItem>
                    <SelectItem value="married_separate">Casado(a) - Separación de Bienes</SelectItem>
                    <SelectItem value="divorced">Divorciado(a)</SelectItem>
                    <SelectItem value="widowed">Viudo(a)</SelectItem>
                    <SelectItem value="common_law">Unión Libre</SelectItem>
                  </SelectContent>
                </Select>
                {errors.maritalStatus && (
                  <p className="text-sm text-red-500 mt-1">{errors.maritalStatus}</p>
                )}
              </div>

              {/* Spouse Information - Only if Married */}
              {(formData.maritalStatus === 'married_joint' ||
                formData.maritalStatus === 'married_separate' ||
                formData.maritalStatus === 'common_law') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="md:col-span-2">
                    <h4 className="font-medium mb-2">Información del Cónyuge</h4>
                  </div>

                  {/* Spouse Name */}
                  <div>
                    <Label htmlFor="spouseName">Nombre Completo del Cónyuge</Label>
                    <Input
                      id="spouseName"
                      value={formData.spouseName || ''}
                      onChange={(e) => onFieldChange('spouseName', e.target.value)}
                      placeholder="Nombre completo"
                      disabled={disabled}
                    />
                  </div>

                  {/* Spouse RFC */}
                  <div>
                    <Label htmlFor="spouseRfc">RFC del Cónyuge</Label>
                    <Input
                      id="spouseRfc"
                      value={formData.spouseRfc || ''}
                      onChange={(e) => onFieldChange('spouseRfc', e.target.value.toUpperCase())}
                      placeholder="RFC con homoclave"
                      maxLength={13}
                      disabled={disabled}
                    />
                  </div>

                  {/* Spouse CURP */}
                  <div className="md:col-span-2">
                    <Label htmlFor="spouseCurp">CURP del Cónyuge</Label>
                    <Input
                      id="spouseCurp"
                      value={formData.spouseCurp || ''}
                      onChange={(e) => onFieldChange('spouseCurp', e.target.value.toUpperCase())}
                      placeholder="CURP del cónyuge"
                      maxLength={18}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
