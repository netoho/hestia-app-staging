'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { PropertyDetails } from '@/lib/types/actor';

interface PropertyDetailsFormProps {
  data: Partial<PropertyDetails>;
  onChange: (field: keyof PropertyDetails, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export default function PropertyDetailsForm({
  data,
  onChange,
  errors = {},
  disabled = false,
}: PropertyDetailsFormProps) {
  // Format ISO date string to YYYY-MM-DD for date input
  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ubicación de la Propiedad</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressAutocomplete
            label="Dirección del Inmueble *"
            value={data.propertyAddressDetails || {}}
            onChange={(addressData) => onChange('propertyAddressDetails', addressData)}
            required
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características de la Propiedad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parkingSpaces">Espacios de Estacionamiento</Label>
              <Input
                id="parkingSpaces"
                type="number"
                min="0"
                value={data.parkingSpaces || ''}
                onChange={(e) => onChange('parkingSpaces', e.target.value ? parseInt(e.target.value) : null)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="parkingNumbers">Números de Cajones (separados por comas)</Label>
              <Input
                id="parkingNumbers"
                value={data.parkingNumbers || ''}
                onChange={(e) => onChange('parkingNumbers', e.target.value)}
                placeholder="Ej: A-12, B-5"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Servicios Incluidos</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ServiceCheckbox
                id="hasElectricity"
                label="Luz"
                checked={data.hasElectricity || false}
                onCheckedChange={(checked) => onChange('hasElectricity', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasWater"
                label="Agua"
                checked={data.hasWater || false}
                onCheckedChange={(checked) => onChange('hasWater', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasGas"
                label="Gas"
                checked={data.hasGas || false}
                onCheckedChange={(checked) => onChange('hasGas', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasInternet"
                label="Internet"
                checked={data.hasInternet || false}
                onCheckedChange={(checked) => onChange('hasInternet', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasCableTV"
                label="Cable TV"
                checked={data.hasCableTV || false}
                onCheckedChange={(checked) => onChange('hasCableTV', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasPhone"
                label="Teléfono"
                checked={data.hasPhone || false}
                onCheckedChange={(checked) => onChange('hasPhone', checked)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Características Adicionales</Label>
            <div className="grid grid-cols-2 gap-4">
              <ServiceCheckbox
                id="isFurnished"
                label="Amueblado"
                checked={data.isFurnished || false}
                onCheckedChange={(checked) => onChange('isFurnished', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="petsAllowed"
                label="Se permiten mascotas"
                checked={data.petsAllowed || false}
                onCheckedChange={(checked) => onChange('petsAllowed', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasInventory"
                label="Tiene inventario"
                checked={data.hasInventory || false}
                onCheckedChange={(checked) => onChange('hasInventory', checked)}
                disabled={disabled}
              />
              <ServiceCheckbox
                id="hasRules"
                label="Tiene reglamento"
                checked={data.hasRules || false}
                onCheckedChange={(checked) => onChange('hasRules', checked)}
                disabled={disabled}
              />
            </div>
          </div>

          <ServiceCheckbox
            id="utilitiesInLandlordName"
            label="Los servicios están a nombre del arrendador"
            checked={data.utilitiesInLandlordName || false}
            onCheckedChange={(checked) => onChange('utilitiesInLandlordName', checked)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fechas Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyDeliveryDate">Fecha de Entrega del Inmueble</Label>
              <Input
                id="propertyDeliveryDate"
                type="date"
                value={formatDateForInput(data.propertyDeliveryDate)}
                onChange={(e) => onChange('propertyDeliveryDate', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="contractSigningDate">Fecha de Firma del Contrato</Label>
              <Input
                id="contractSigningDate"
                type="date"
                value={formatDateForInput(data.contractSigningDate)}
                onChange={(e) => onChange('contractSigningDate', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contractSigningLocation">Lugar de Firma del Contrato</Label>
            <Input
              id="contractSigningLocation"
              value={data.contractSigningLocation || ''}
              onChange={(e) => onChange('contractSigningLocation', e.target.value)}
              placeholder="Ciudad donde se firmará el contrato"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </>
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