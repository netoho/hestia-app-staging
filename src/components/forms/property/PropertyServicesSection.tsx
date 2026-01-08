'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PropertyServicesSectionProps {
  hasElectricity?: boolean;
  hasWater?: boolean;
  hasGas?: boolean;
  hasPhone?: boolean;
  hasCableTV?: boolean;
  hasInternet?: boolean;
  utilitiesInLandlordName?: boolean;
  onChange: (field: string, value: boolean) => void;
  disabled?: boolean;
}

export function PropertyServicesSection({
  hasElectricity = false,
  hasWater = false,
  hasGas = false,
  hasPhone = false,
  hasCableTV = false,
  hasInternet = false,
  utilitiesInLandlordName = false,
  onChange,
  disabled = false,
}: PropertyServicesSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Servicios Incluidos</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          <ServiceCheckbox
            id="hasElectricity"
            label="Electricidad"
            checked={hasElectricity}
            onCheckedChange={(checked) => onChange('hasElectricity', checked)}
            disabled={disabled}
          />
          <ServiceCheckbox
            id="hasWater"
            label="Agua"
            checked={hasWater}
            onCheckedChange={(checked) => onChange('hasWater', checked)}
            disabled={disabled}
          />
          <ServiceCheckbox
            id="hasGas"
            label="Gas"
            checked={hasGas}
            onCheckedChange={(checked) => onChange('hasGas', checked)}
            disabled={disabled}
          />
          <ServiceCheckbox
            id="hasPhone"
            label="Teléfono"
            checked={hasPhone}
            onCheckedChange={(checked) => onChange('hasPhone', checked)}
            disabled={disabled}
          />
          <ServiceCheckbox
            id="hasCableTV"
            label="Cable TV"
            checked={hasCableTV}
            onCheckedChange={(checked) => onChange('hasCableTV', checked)}
            disabled={disabled}
          />
          <ServiceCheckbox
            id="hasInternet"
            label="Internet"
            checked={hasInternet}
            onCheckedChange={(checked) => onChange('hasInternet', checked)}
            disabled={disabled}
          />
        </div>
      </div>

      <ServiceCheckbox
        id="utilitiesInLandlordName"
        label="Los servicios están a nombre del arrendador"
        checked={utilitiesInLandlordName}
        onCheckedChange={(checked) => onChange('utilitiesInLandlordName', checked)}
        disabled={disabled}
      />
    </div>
  );
}

// Helper component for service checkboxes
function ServiceCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
    </div>
  );
}