'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PersonNameFieldsProps {
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  onChange: (field: string, value: string) => void;
  required?: boolean;
  disabled?: boolean;
  errors?: {
    firstName?: string;
    middleName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
  };
}

export function PersonNameFields({
  firstName = '',
  middleName = '',
  paternalLastName = '',
  maternalLastName = '',
  onChange,
  required = true,
  disabled = false,
  errors = {},
}: PersonNameFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" required={required}>
            Nombre
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            disabled={disabled}
            placeholder="Nombre(s)"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="middleName" optional>
            Segundo Nombre
          </Label>
          <Input
            id="middleName"
            value={middleName}
            onChange={(e) => onChange('middleName', e.target.value)}
            disabled={disabled}
            placeholder="Segundo nombre"
            className={errors.middleName ? 'border-red-500' : ''}
          />
          {errors.middleName && (
            <p className="text-sm text-red-500 mt-1">{errors.middleName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paternalLastName" required={required}>
            Apellido Paterno
          </Label>
          <Input
            id="paternalLastName"
            value={paternalLastName}
            onChange={(e) => onChange('paternalLastName', e.target.value)}
            disabled={disabled}
            placeholder="Apellido del padre"
            className={errors.paternalLastName ? 'border-red-500' : ''}
          />
          {errors.paternalLastName && (
            <p className="text-sm text-red-500 mt-1">{errors.paternalLastName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="maternalLastName" required={required}>
            Apellido Materno
          </Label>
          <Input
            id="maternalLastName"
            value={maternalLastName}
            onChange={(e) => onChange('maternalLastName', e.target.value)}
            disabled={disabled}
            placeholder="Apellido de la madre"
            className={errors.maternalLastName ? 'border-red-500' : ''}
          />
          {errors.maternalLastName && (
            <p className="text-sm text-red-500 mt-1">{errors.maternalLastName}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility function to format full name
export function formatFullName(
  firstName: string,
  paternalLastName: string,
  maternalLastName: string,
  middleName?: string
): string {
  const parts = [
    firstName,
    middleName,
    paternalLastName,
    maternalLastName
  ].filter(Boolean);

  return parts.join(' ').trim();
}

// Utility function to get initials
export function getInitials(
  firstName: string,
  paternalLastName: string
): string {
  const firstInitial = firstName ? firstName[0] : '';
  const lastInitial = paternalLastName ? paternalLastName[0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}