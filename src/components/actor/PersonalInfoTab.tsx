'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PersonalInfoTabProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    nationality: 'MEXICAN' | 'FOREIGN';
    curp?: string;
    passport?: string;
    address?: string;
  };
  errors: Record<string, string>;
  updateFormData: (field: string, value: any) => void;
}

export default function PersonalInfoTab({ formData, errors, updateFormData }: PersonalInfoTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
                placeholder="Nombre(s) y Apellidos"
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="10 dígitos"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nationality">Nacionalidad *</Label>
              <Select
                value={formData.nationality}
                onValueChange={(value) => updateFormData('nationality', value)}
              >
                <SelectTrigger className={errors.nationality ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione nacionalidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEXICAN">Mexicana</SelectItem>
                  <SelectItem value="FOREIGN">Extranjera</SelectItem>
                </SelectContent>
              </Select>
              {errors.nationality && (
                <p className="text-red-500 text-sm mt-1">{errors.nationality}</p>
              )}
            </div>

            {formData.nationality === 'MEXICAN' ? (
              <div>
                <Label htmlFor="curp">CURP *</Label>
                <Input
                  id="curp"
                  value={formData.curp || ''}
                  onChange={(e) => updateFormData('curp', e.target.value.toUpperCase())}
                  placeholder="18 caracteres"
                  maxLength={18}
                  className={errors.curp ? 'border-red-500' : ''}
                />
                {errors.curp && (
                  <p className="text-red-500 text-sm mt-1">{errors.curp}</p>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="passport">Número de Pasaporte *</Label>
                <Input
                  id="passport"
                  value={formData.passport || ''}
                  onChange={(e) => updateFormData('passport', e.target.value.toUpperCase())}
                  placeholder="Número de pasaporte"
                  className={errors.passport ? 'border-red-500' : ''}
                />
                {errors.passport && (
                  <p className="text-red-500 text-sm mt-1">{errors.passport}</p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="Calle, Número, Colonia, Ciudad, Estado"
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}