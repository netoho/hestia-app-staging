'use client';

import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { AddressDetails } from '@/lib/types/actor';

interface PropertyAddressSectionProps {
  value?: AddressDetails | null;
  onChange: (value: AddressDetails) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function PropertyAddressSection({
  value,
  onChange,
  label = "Dirección del Inmueble",
  required = false,
  disabled = false,
  error,
}: PropertyAddressSectionProps) {
  return (
    <AddressAutocomplete
      label={label}
      value={value || {}}
      onChange={onChange}
      required={required}
      disabled={disabled}
      error={error}
    />
  );
}