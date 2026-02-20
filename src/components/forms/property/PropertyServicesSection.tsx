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
  electricityIncludedInRent?: boolean;
  waterIncludedInRent?: boolean;
  gasIncludedInRent?: boolean;
  phoneIncludedInRent?: boolean;
  cableTVIncludedInRent?: boolean;
  internetIncludedInRent?: boolean;
  onChange: (field: string, value: boolean) => void;
  disabled?: boolean;
}

const SERVICES = [
  { hasField: 'hasElectricity', includedField: 'electricityIncludedInRent', label: 'Electricidad' },
  { hasField: 'hasWater', includedField: 'waterIncludedInRent', label: 'Agua' },
  { hasField: 'hasGas', includedField: 'gasIncludedInRent', label: 'Gas' },
  { hasField: 'hasPhone', includedField: 'phoneIncludedInRent', label: 'Teléfono' },
  { hasField: 'hasCableTV', includedField: 'cableTVIncludedInRent', label: 'Cable TV' },
  { hasField: 'hasInternet', includedField: 'internetIncludedInRent', label: 'Internet' },
] as const;

export function PropertyServicesSection({
  onChange,
  disabled = false,
  ...props
}: PropertyServicesSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Servicios Incluidos</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {SERVICES.map(({ hasField, includedField, label }) => {
            const hasService = props[hasField] ?? false;
            const includedInRent = props[includedField] ?? false;

            return (
              <div key={hasField} className="space-y-2">
                <ServiceCheckbox
                  id={hasField}
                  label={label}
                  checked={hasService}
                  onCheckedChange={(checked) => onChange(hasField, checked)}
                  disabled={disabled}
                />
                {hasService && (
                  <ServiceCheckbox
                    id={includedField}
                    label="Incluido en la renta"
                    checked={includedInRent}
                    onCheckedChange={(checked) => onChange(includedField, checked)}
                    disabled={disabled}
                    className="ml-7 text-xs text-muted-foreground"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ServiceCheckbox
        id="utilitiesInLandlordName"
        label="Los servicios están a nombre del arrendador"
        checked={props.utilitiesInLandlordName ?? false}
        onCheckedChange={(checked) => onChange('utilitiesInLandlordName', checked)}
        disabled={disabled}
      />
    </div>
  );
}

function ServiceCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
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
