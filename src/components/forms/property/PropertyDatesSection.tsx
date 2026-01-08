'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { AddressDetails } from '@/lib/types/actor';

interface PropertyDatesSectionProps {
  propertyDeliveryDate?: string | null;
  contractSigningDate?: string | null;
  contractSigningAddressDetails?: AddressDetails | null;
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function PropertyDatesSection({
  propertyDeliveryDate,
  contractSigningDate,
  contractSigningAddressDetails,
  onChange,
  disabled = false,
  errors = {},
}: PropertyDatesSectionProps) {
  // Format ISO date string to YYYY-MM-DD for date input
  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="propertyDeliveryDate">Fecha de Entrega del Inmueble</Label>
          <Input
            id="propertyDeliveryDate"
            type="date"
            value={formatDateForInput(propertyDeliveryDate)}
            onChange={(e) => onChange('propertyDeliveryDate', e.target.value)}
            disabled={disabled}
            className={errors.propertyDeliveryDate ? 'border-red-500' : ''}
          />
          {errors.propertyDeliveryDate && (
            <p className="text-sm text-red-500 mt-1">{errors.propertyDeliveryDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="contractSigningDate">Fecha de Firma del Contrato</Label>
          <Input
            id="contractSigningDate"
            type="date"
            value={formatDateForInput(contractSigningDate)}
            onChange={(e) => onChange('contractSigningDate', e.target.value)}
            disabled={disabled}
            className={errors.contractSigningDate ? 'border-red-500' : ''}
          />
          {errors.contractSigningDate && (
            <p className="text-sm text-red-500 mt-1">{errors.contractSigningDate}</p>
          )}
        </div>
      </div>

      <div>
        <AddressAutocomplete
          label="Lugar de Firma del Contrato"
          value={contractSigningAddressDetails || {}}
          onChange={(address) => onChange('contractSigningAddressDetails', address)}
          required={false}
          disabled={disabled}
          error={errors.contractSigningAddressDetails}
        />
      </div>
    </div>
  );
}