'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { TenantFormData } from '@/hooks/useTenantForm';

interface RentalHistoryTabProps {
  formData: TenantFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function RentalHistoryTab({
  formData,
  onFieldChange,
  errors,
  disabled = false,
}: RentalHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Renta</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            Si es su primera vez rentando, puede dejar estos campos vacíos.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="previousLandlordName">Nombre del Arrendador Anterior</Label>
            <Input
              id="previousLandlordName"
              value={formData.previousLandlordName || ''}
              onChange={(e) => onFieldChange('previousLandlordName', e.target.value)}
              placeholder="Nombre completo"
              className={errors.previousLandlordName ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.previousLandlordName && (
              <p className="text-red-500 text-sm mt-1">{errors.previousLandlordName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="previousLandlordPhone">Teléfono del Arrendador Anterior</Label>
            <Input
              id="previousLandlordPhone"
              value={formData.previousLandlordPhone || ''}
              onChange={(e) => onFieldChange('previousLandlordPhone', e.target.value)}
              placeholder="10 dígitos"
              className={errors.previousLandlordPhone ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.previousLandlordPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.previousLandlordPhone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="previousLandlordEmail">Email del Arrendador Anterior</Label>
            <Input
              id="previousLandlordEmail"
              type="email"
              value={formData.previousLandlordEmail || ''}
              onChange={(e) => onFieldChange('previousLandlordEmail', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={errors.previousLandlordEmail ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.previousLandlordEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.previousLandlordEmail}</p>
            )}
          </div>

          <div>
            <Label htmlFor="previousRentAmount">Renta Mensual Anterior (MXN)</Label>
            <Input
              id="previousRentAmount"
              type="number"
              value={formData.previousRentAmount || ''}
              onChange={(e) => onFieldChange('previousRentAmount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              className={errors.previousRentAmount ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.previousRentAmount && (
              <p className="text-red-500 text-sm mt-1">{errors.previousRentAmount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="rentalHistoryYears">Años de Historial de Renta</Label>
            <Input
              id="rentalHistoryYears"
              type="number"
              value={formData.rentalHistoryYears || ''}
              onChange={(e) => onFieldChange('rentalHistoryYears', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className={errors.rentalHistoryYears ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.rentalHistoryYears && (
              <p className="text-red-500 text-sm mt-1">{errors.rentalHistoryYears}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <AddressAutocomplete
              label="Dirección de Renta Anterior"
              value={formData.previousRentalAddressDetails || {}}
              onChange={(addressData) => {
                onFieldChange('previousRentalAddressDetails', addressData);
                onFieldChange(
                  'previousRentalAddress',
                  `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                );
              }}
              disabled={disabled}
            />
            {errors.previousRentalAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.previousRentalAddress}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
