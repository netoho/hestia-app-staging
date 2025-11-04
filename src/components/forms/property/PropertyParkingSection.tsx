'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PropertyParkingSectionProps {
  parkingSpaces?: number | null;
  parkingNumbers?: string;
  onParkingSpacesChange: (value: number | null) => void;
  onParkingNumbersChange: (value: string) => void;
  disabled?: boolean;
  errors?: {
    parkingSpaces?: string;
    parkingNumbers?: string;
  };
}

export function PropertyParkingSection({
  parkingSpaces,
  parkingNumbers,
  onParkingSpacesChange,
  onParkingNumbersChange,
  disabled = false,
  errors = {},
}: PropertyParkingSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="parkingSpaces">Espacios de Estacionamiento</Label>
        <Input
          id="parkingSpaces"
          type="number"
          min="0"
          value={parkingSpaces ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            onParkingSpacesChange(value ? parseInt(value) : null);
          }}
          disabled={disabled}
          className={errors.parkingSpaces ? 'border-red-500' : ''}
        />
        {errors.parkingSpaces && (
          <p className="text-sm text-red-500 mt-1">{errors.parkingSpaces}</p>
        )}
      </div>
      <div>
        <Label htmlFor="parkingNumbers">
          Número(s) con que se identifique el cajón (separados por comas)
        </Label>
        <Input
          id="parkingNumbers"
          value={parkingNumbers || ''}
          onChange={(e) => onParkingNumbersChange(e.target.value)}
          placeholder="Ej: A-12, B-5"
          disabled={disabled}
          className={errors.parkingNumbers ? 'border-red-500' : ''}
        />
        {errors.parkingNumbers && (
          <p className="text-sm text-red-500 mt-1">{errors.parkingNumbers}</p>
        )}
      </div>
    </div>
  );
}