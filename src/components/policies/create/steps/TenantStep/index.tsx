'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';
import { TenantType } from '@/lib/enums';
import { TenantFormData } from '../../types';

interface TenantStepProps {
  data: TenantFormData;
  onUpdate: (data: Partial<TenantFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function TenantStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: TenantStepProps) {
  const handleNameChange = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  const isValid = () => {
    if (data.tenantType === TenantType.COMPANY) {
      return !!(data.companyName && data.email);
    } else {
      return !!(
        data.firstName &&
        data.paternalLastName &&
        data.maternalLastName &&
        data.email
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Inquilino</CardTitle>
        <CardDescription>Ingrese los datos del inquilino</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant Type Selector */}
        <div>
          <Label htmlFor="tenantType" required>
            Tipo de Inquilino
          </Label>
          <Select
            value={data.tenantType}
            onValueChange={(value) => onUpdate({ tenantType: value as TenantType })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TenantType.INDIVIDUAL}>Persona Física</SelectItem>
              <SelectItem value={TenantType.COMPANY}>Persona Moral (Empresa)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Fields */}
        {data.tenantType === TenantType.COMPANY && (
          <div>
            <Label htmlFor="companyName" required>
              Razón Social
            </Label>
            <Input
              id="companyName"
              value={data.companyName || ''}
              onChange={(e) => onUpdate({ companyName: e.target.value })}
              placeholder="Nombre de la empresa"
            />
          </div>
        )}

        {/* Individual/Representative Name Fields */}
        {data.tenantType === TenantType.INDIVIDUAL && (
          <PersonNameFields
            firstName={data.firstName}
            middleName={data.middleName}
            paternalLastName={data.paternalLastName}
            maternalLastName={data.maternalLastName}
            onChange={handleNameChange}
            required={true}
          />
        )}

        {/* Company Representative Fields (Optional) */}
        {data.tenantType === TenantType.COMPANY && (
          <div className="border-l-2 border-blue-200 pl-4 space-y-4">
            <h4 className="font-medium text-sm text-gray-700">
              Representante Legal (Opcional)
            </h4>
            <PersonNameFields
              firstName={data.firstName}
              middleName={data.middleName}
              paternalLastName={data.paternalLastName}
              maternalLastName={data.maternalLastName}
              onChange={handleNameChange}
              required={false}
            />
          </div>
        )}

        {/* Contact Information */}
        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Teléfono Celular de Contacto</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="10 dígitos"
            />
          </div>

          <div>
            <Label htmlFor="rfc" optional={data.tenantType === TenantType.INDIVIDUAL}>
              {data.tenantType === TenantType.COMPANY ? 'RFC' : 'RFC/CURP'}
            </Label>
            <Input
              id="rfc"
              value={data.rfc || ''}
              onChange={(e) => onUpdate({ rfc: e.target.value.toUpperCase() })}
              placeholder={data.tenantType === TenantType.COMPANY ? 'RFC de la empresa' : 'RFC o CURP'}
              maxLength={data.tenantType === TenantType.COMPANY ? 12 : 18}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>
            Anterior
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid()}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
