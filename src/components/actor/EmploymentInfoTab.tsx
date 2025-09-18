'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmploymentInfoTabProps {
  formData: {
    employmentStatus: string;
    occupation: string;
    companyName: string;
    position: string;
    monthlyIncome: number;
    incomeSource: string;
  };
  errors: Record<string, string>;
  updateFormData: (field: string, value: any) => void;
  actorType: 'tenant' | 'joint-obligor' | 'aval';
}

export default function EmploymentInfoTab({ formData, errors, updateFormData, actorType }: EmploymentInfoTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employmentStatus">Situación Laboral *</Label>
              <Select
                value={formData.employmentStatus}
                onValueChange={(value) => updateFormData('employmentStatus', value)}
              >
                <SelectTrigger className={errors.employmentStatus ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione situación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Empleado</SelectItem>
                  <SelectItem value="self-employed">Trabajador Independiente</SelectItem>
                  <SelectItem value="business-owner">Empresario</SelectItem>
                  <SelectItem value="retired">Jubilado</SelectItem>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="unemployed">Desempleado</SelectItem>
                </SelectContent>
              </Select>
              {errors.employmentStatus && (
                <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>
              )}
            </div>

            <div>
              <Label htmlFor="occupation">Ocupación/Profesión *</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => updateFormData('occupation', e.target.value)}
                placeholder="Ej: Ingeniero, Médico, Comerciante"
                className={errors.occupation ? 'border-red-500' : ''}
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>

            {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'self-employed') && (
              <>
                <div>
                  <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    placeholder="Nombre de la empresa"
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="position">Puesto/Cargo *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => updateFormData('position', e.target.value)}
                    placeholder="Puesto que desempeña"
                    className={errors.position ? 'border-red-500' : ''}
                  />
                  {errors.position && (
                    <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="monthlyIncome">Ingreso Mensual (MXN) *</Label>
              <Input
                id="monthlyIncome"
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => updateFormData('monthlyIncome', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                className={errors.monthlyIncome ? 'border-red-500' : ''}
              />
              {errors.monthlyIncome && (
                <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>
              )}
            </div>

            <div>
              <Label htmlFor="incomeSource">Fuente de Ingresos *</Label>
              <Select
                value={formData.incomeSource}
                onValueChange={(value) => updateFormData('incomeSource', value)}
              >
                <SelectTrigger className={errors.incomeSource ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salario</SelectItem>
                  <SelectItem value="business">Negocio Propio</SelectItem>
                  <SelectItem value="freelance">Trabajo Independiente</SelectItem>
                  <SelectItem value="investments">Inversiones</SelectItem>
                  <SelectItem value="pension">Pensión</SelectItem>
                  <SelectItem value="rental">Rentas</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.incomeSource && (
                <p className="text-red-500 text-sm mt-1">{errors.incomeSource}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}