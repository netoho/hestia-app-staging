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

interface AvalPropertyGuaranteeTabProps {
  formData: AvalFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function AvalPropertyGuaranteeTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}: AvalPropertyGuaranteeTabProps) {
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

              {/* Property Deed Number */}
              <div>
                <Label htmlFor="propertyDeedNumber">Número de Escritura *</Label>
                <Input
                  id="propertyDeedNumber"
                  value={formData.propertyDeedNumber || ''}
                  onChange={(e) => onFieldChange('propertyDeedNumber', e.target.value)}
                  placeholder="Número de escritura pública"
                  required
                  disabled={disabled}
                />
                {errors.propertyDeedNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.propertyDeedNumber}</p>
                )}
              </div>

              {/* Property Registry */}
              <div>
                <Label htmlFor="propertyRegistry">Folio Real / Registro Público</Label>
                <Input
                  id="propertyRegistry"
                  value={formData.propertyRegistry || ''}
                  onChange={(e) => onFieldChange('propertyRegistry', e.target.value)}
                  placeholder="Folio o número de registro"
                  disabled={disabled}
                />
              </div>

              {/* Property Tax Account */}
              <div>
                <Label htmlFor="propertyTaxAccount">Cuenta Predial</Label>
                <Input
                  id="propertyTaxAccount"
                  value={formData.propertyTaxAccount || ''}
                  onChange={(e) => onFieldChange('propertyTaxAccount', e.target.value)}
                  placeholder="Número de cuenta predial"
                  disabled={disabled}
                />
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

      {/* Marital Status and Spouse Information (for Individuals) */}
      {!formData.isCompany && (
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
