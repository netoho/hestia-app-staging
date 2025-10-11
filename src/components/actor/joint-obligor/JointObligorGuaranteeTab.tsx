'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Home, Info } from 'lucide-react';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { JointObligorFormData } from '@/hooks/useJointObligorForm';

interface JointObligorGuaranteeTabProps {
  formData: JointObligorFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function JointObligorGuaranteeTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}: JointObligorGuaranteeTabProps) {
  return (
    <div className="space-y-4">
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

            <RadioGroup
              value={formData.guaranteeMethod || 'income'}
              onValueChange={(value) => onFieldChange('guaranteeMethod', value)}
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
            {errors.guaranteeMethod && (
              <p className="text-sm text-red-500">{errors.guaranteeMethod}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Income-Based Guarantee Information */}
      {formData.guaranteeMethod === 'income' && (
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
                {/* Bank Name */}
                <div>
                  <Label htmlFor="bankName">Banco Principal</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName || ''}
                    onChange={(e) => onFieldChange('bankName', e.target.value)}
                    placeholder="Nombre del banco"
                    disabled={disabled}
                  />
                </div>

                {/* Account Holder */}
                <div>
                  <Label htmlFor="accountHolder">Titular de la Cuenta</Label>
                  <Input
                    id="accountHolder"
                    value={formData.accountHolder || ''}
                    onChange={(e) => onFieldChange('accountHolder', e.target.value)}
                    placeholder="Nombre del titular"
                    disabled={disabled}
                  />
                </div>

                {/* Has Properties (Optional) */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasProperties"
                      checked={formData.hasProperties || false}
                      onCheckedChange={(checked) => onFieldChange('hasProperties', checked)}
                      disabled={disabled}
                    />
                    <Label htmlFor="hasProperties" className="font-normal cursor-pointer">
                      ¿Cuenta con propiedades inmuebles? (Opcional - fortalece su solicitud)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Show monthly income reminder */}
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Recordatorio:</strong> Su ingreso mensual de ${formData.monthlyIncome?.toLocaleString('es-MX') || '0'} MXN será validado con documentación.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property-Based Guarantee Information */}
      {formData.guaranteeMethod === 'property' && (
        <>
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

          {/* Marital Status and Spouse Information (for Individuals with Property) */}
          {!formData.isCompany && (
            <Card>
              <CardHeader>
                <CardTitle>Estado Civil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Marital Status */}
                  <div>
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
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
        </>
      )}
    </div>
  );
}