'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PropertyFeaturesSectionProps {
  isFurnished?: boolean;
  petsAllowed?: boolean;
  hasInventory?: boolean;
  hasRules?: boolean;
  rulesType?: 'condominios' | 'colonos';
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function PropertyFeaturesSection({
  isFurnished = false,
  petsAllowed = false,
  hasInventory = false,
  hasRules = false,
  rulesType,
  onChange,
  disabled = false,
  errors = {},
}: PropertyFeaturesSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Características Adicionales</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <FeatureCheckbox
            id="isFurnished"
            label="Amueblado"
            checked={isFurnished}
            onCheckedChange={(checked) => onChange('isFurnished', checked)}
            disabled={disabled}
          />
          <FeatureCheckbox
            id="petsAllowed"
            label="Se permiten mascotas"
            checked={petsAllowed}
            onCheckedChange={(checked) => onChange('petsAllowed', checked)}
            disabled={disabled}
          />
          <FeatureCheckbox
            id="hasInventory"
            label="Tiene inventario"
            checked={hasInventory}
            onCheckedChange={(checked) => onChange('hasInventory', checked)}
            disabled={disabled}
          />
          <FeatureCheckbox
            id="hasRules"
            label="Tiene reglamento"
            checked={hasRules}
            onCheckedChange={(checked) => {
              onChange('hasRules', checked);
              // Clear rulesType if unchecking hasRules
              if (!checked) {
                onChange('rulesType', undefined);
              }
            }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Show rules type selector when hasRules is true */}
      {hasRules && (
        <div>
          <Label htmlFor="rulesType">Tipo de Reglamento</Label>
          <Select
            value={rulesType}
            onValueChange={(value) => onChange('rulesType', value)}
            disabled={disabled}
          >
            <SelectTrigger
              id="rulesType"
              className={errors.rulesType ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Selecciona el tipo de reglamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="condominios">Condominios</SelectItem>
              <SelectItem value="colonos">Colonos</SelectItem>
            </SelectContent>
          </Select>
          {errors.rulesType && (
            <p className="text-sm text-red-500 mt-1">{errors.rulesType}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for feature checkboxes
function FeatureCheckbox({
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