'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PropertyInfoTabProps {
  formData: {
    propertyAddress?: string;
    propertyValue?: number;
    propertyDeedNumber?: string;
    propertyRegistry?: string;
  };
  errors: Record<string, string>;
  updateFormData: (field: string, value: any) => void;
}

export default function PropertyInfoTab({ formData, errors, updateFormData }: PropertyInfoTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Como aval, debe proporcionar información sobre la propiedad que ofrece como garantía.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="propertyAddress">Dirección de la Propiedad en Garantía *</Label>
              <Input
                id="propertyAddress"
                value={formData.propertyAddress || ''}
                onChange={(e) => updateFormData('propertyAddress', e.target.value)}
                placeholder="Calle, Número, Colonia, Ciudad, Estado"
                className={errors.propertyAddress ? 'border-red-500' : ''}
              />
              {errors.propertyAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyAddress}</p>
              )}
            </div>

            <div>
              <Label htmlFor="propertyValue">Valor Estimado de la Propiedad (MXN) *</Label>
              <Input
                id="propertyValue"
                type="number"
                value={formData.propertyValue || 0}
                onChange={(e) => updateFormData('propertyValue', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                className={errors.propertyValue ? 'border-red-500' : ''}
              />
              {errors.propertyValue && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyValue}</p>
              )}
            </div>

            <div>
              <Label htmlFor="propertyDeedNumber">Número de Escritura</Label>
              <Input
                id="propertyDeedNumber"
                value={formData.propertyDeedNumber || ''}
                onChange={(e) => updateFormData('propertyDeedNumber', e.target.value)}
                placeholder="Número de escritura pública"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="propertyRegistry">Registro Público de la Propiedad</Label>
              <Input
                id="propertyRegistry"
                value={formData.propertyRegistry || ''}
                onChange={(e) => updateFormData('propertyRegistry', e.target.value)}
                placeholder="Datos del registro público"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}