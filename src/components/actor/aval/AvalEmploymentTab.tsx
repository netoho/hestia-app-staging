'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { AvalFormData } from '@/hooks/useAvalForm';

interface AvalEmploymentTabProps {
  formData: AvalFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function AvalEmploymentTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}: AvalEmploymentTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Laboral</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employment Status */}
          <div>
            <Label htmlFor="employmentStatus">Situación Laboral</Label>
            <Select
              value={formData.employmentStatus || ''}
              onValueChange={(value) => onFieldChange('employmentStatus', value)}
              disabled={disabled}
            >
              <SelectTrigger id="employmentStatus">
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">Empleado</SelectItem>
                <SelectItem value="self_employed">Trabajador Independiente</SelectItem>
                <SelectItem value="business_owner">Dueño de Negocio</SelectItem>
                <SelectItem value="retired">Jubilado</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Occupation */}
          <div>
            <Label htmlFor="occupation">Ocupación</Label>
            <Input
              id="occupation"
              value={formData.occupation || ''}
              onChange={(e) => onFieldChange('occupation', e.target.value)}
              placeholder="Ej: Ingeniero, Médico, Contador"
              disabled={disabled}
            />
          </div>

          {/* Employer Name */}
          <div>
            <Label htmlFor="employerName">Nombre del Empleador</Label>
            <Input
              id="employerName"
              value={formData.employerName || ''}
              onChange={(e) => onFieldChange('employerName', e.target.value)}
              placeholder="Nombre de la empresa"
              disabled={disabled}
            />
          </div>

          {/* Position */}
          <div>
            <Label htmlFor="position">Puesto</Label>
            <Input
              id="position"
              value={formData.position || ''}
              onChange={(e) => onFieldChange('position', e.target.value)}
              placeholder="Cargo o posición"
              disabled={disabled}
            />
          </div>

          {/* Monthly Income */}
          <div>
            <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN)</Label>
            <Input
              id="monthlyIncome"
              type="number"
              value={formData.monthlyIncome || ''}
              onChange={(e) => onFieldChange('monthlyIncome', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={disabled}
            />
          </div>

          {/* Income Source */}
          <div>
            <Label htmlFor="incomeSource">Fuente de Ingresos</Label>
            <Input
              id="incomeSource"
              value={formData.incomeSource || ''}
              onChange={(e) => onFieldChange('incomeSource', e.target.value)}
              placeholder="Ej: Salario, Honorarios, Renta"
              disabled={disabled}
            />
          </div>

          {/* Employer Address Autocomplete */}
          <div className="md:col-span-2">
            <AddressAutocomplete
              label="Dirección del Empleador"
              value={formData.employerAddressDetails || {}}
              onChange={(addressData) => {
                onFieldChange('employerAddressDetails', addressData);
                onFieldChange('employerAddress',
                  `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                );
              }}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
