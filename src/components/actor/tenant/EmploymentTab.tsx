'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { TenantFormData } from '@/hooks/useTenantForm';

interface EmploymentTabProps {
  formData: TenantFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function EmploymentTab({
  formData,
  onFieldChange,
  errors,
  disabled = false,
}: EmploymentTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Laboral</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employmentStatus">Situación Laboral</Label>
            <Select
              value={formData.employmentStatus || ''}
              onValueChange={(value) => onFieldChange('employmentStatus', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">Empleado</SelectItem>
                <SelectItem value="self_employed">Trabajador Independiente</SelectItem>
                <SelectItem value="business_owner">Dueño de Negocio</SelectItem>
                <SelectItem value="retired">Jubilado</SelectItem>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            {errors.employmentStatus && (
              <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>
            )}
          </div>

          <div>
            <Label htmlFor="occupation">Ocupación</Label>
            <Input
              id="occupation"
              value={formData.occupation || ''}
              onChange={(e) => onFieldChange('occupation', e.target.value)}
              placeholder="Ej: Ingeniero, Médico, Contador"
              className={errors.occupation ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.occupation && (
              <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
            )}
          </div>

          <div>
            <Label htmlFor="employerName">Nombre del Empleador</Label>
            <Input
              id="employerName"
              value={formData.employerName || ''}
              onChange={(e) => onFieldChange('employerName', e.target.value)}
              placeholder="Nombre de la empresa"
              className={errors.employerName ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.employerName && (
              <p className="text-red-500 text-sm mt-1">{errors.employerName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="position">Puesto</Label>
            <Input
              id="position"
              value={formData.position || ''}
              onChange={(e) => onFieldChange('position', e.target.value)}
              placeholder="Cargo o posición"
              className={errors.position ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.position && (
              <p className="text-red-500 text-sm mt-1">{errors.position}</p>
            )}
          </div>

          <div>
            <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN)</Label>
            <Input
              id="monthlyIncome"
              type="number"
              value={formData.monthlyIncome || ''}
              onChange={(e) => onFieldChange('monthlyIncome', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              className={errors.monthlyIncome ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.monthlyIncome && (
              <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>
            )}
          </div>

          <div>
            <Label htmlFor="incomeSource">Fuente de Ingresos</Label>
            <Input
              id="incomeSource"
              value={formData.incomeSource || ''}
              onChange={(e) => onFieldChange('incomeSource', e.target.value)}
              placeholder="Ej: Salario, Honorarios, Renta"
              className={errors.incomeSource ? 'border-red-500' : ''}
              disabled={disabled}
            />
            {errors.incomeSource && (
              <p className="text-red-500 text-sm mt-1">{errors.incomeSource}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <AddressAutocomplete
              label="Dirección del Empleador"
              value={formData.employerAddressDetails || {}}
              onChange={(addressData) => {
                onFieldChange('employerAddressDetails', addressData);
                onFieldChange(
                  'employerAddress',
                  `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                );
              }}
              disabled={disabled}
            />
            {errors.employerAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.employerAddress}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
