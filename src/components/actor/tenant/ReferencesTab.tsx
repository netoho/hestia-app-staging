'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldError } from '@/components/ui/field-error';
import { PersonalReference, CommercialReference } from '@/hooks/useActorReferences';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';

interface ReferencesTabProps {
  tenantType: 'INDIVIDUAL' | 'COMPANY';
  personalReferences: PersonalReference[];
  commercialReferences: CommercialReference[];
  onUpdatePersonalReference: (index: number, field: string, value: any) => void;
  onUpdateCommercialReference: (index: number, field: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function ReferencesTab({
  tenantType,
  personalReferences,
  commercialReferences,
  onUpdatePersonalReference,
  onUpdateCommercialReference,
  errors,
  disabled = false,
}: ReferencesTabProps) {
  if (tenantType === 'INDIVIDUAL') {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Por favor proporcione 3 referencias personales (no familiares directos, tampoco puede usar las del obligado/aval).
          </AlertDescription>
        </Alert>

        {personalReferences.map((ref, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">Referencia Personal {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PersonNameFields
                firstName={ref.firstName}
                middleName={ref.middleName}
                paternalLastName={ref.paternalLastName}
                maternalLastName={ref.maternalLastName}
                onChange={(field, value) => onUpdatePersonalReference(index, field, value)}
                disabled={disabled}
                errors={errors[`reference${index}`] ? {
                  firstName: errors[`reference${index}`],
                  paternalLastName: errors[`reference${index}`],
                  maternalLastName: errors[`reference${index}`],
                } : {}}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Relación *</Label>
                  <Input
                    value={ref.relationship}
                    onChange={(e) => onUpdatePersonalReference(index, 'relationship', e.target.value)}
                    placeholder="Ej: Amigo, Compañero de trabajo"
                    className={errors[`reference${index}`] ? 'border-red-500' : ''}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label>Teléfono *</Label>
                  <Input
                    value={ref.phone}
                    onChange={(e) => onUpdatePersonalReference(index, 'phone', e.target.value)}
                    placeholder="10 dígitos"
                    className={errors[`reference${index}`] ? 'border-red-500' : ''}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={ref.email || ''}
                    onChange={(e) => onUpdatePersonalReference(index, 'email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label>Ocupación</Label>
                  <Input
                    value={ref.occupation || ''}
                    onChange={(e) => onUpdatePersonalReference(index, 'occupation', e.target.value)}
                    placeholder="Profesión u ocupación"
                    disabled={disabled}
                  />
                </div>
              </div>
              <FieldError error={errors[`reference${index}`]} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Company references
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Por favor proporcione 3 referencias comerciales.
        </AlertDescription>
      </Alert>

      {commercialReferences.map((ref, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">Referencia Comercial {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nombre de la Empresa *</Label>
                <Input
                  value={ref.companyName}
                  onChange={(e) => onUpdateCommercialReference(index, 'companyName', e.target.value)}
                  placeholder="Razón social"
                  className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Datos de contacto *</Label>
              <PersonNameFields
                firstName={ref.contactFirstName}
                middleName={ref.contactMiddleName}
                paternalLastName={ref.contactPaternalLastName}
                maternalLastName={ref.contactMaternalLastName}
                onChange={(field, value) => {
                  // Map the field names to include 'contact' prefix
                  const mappedField = field.replace('firstName', 'contactFirstName')
                    .replace('middleName', 'contactMiddleName')
                    .replace('paternalLastName', 'contactPaternalLastName')
                    .replace('maternalLastName', 'contactMaternalLastName');
                  onUpdateCommercialReference(index, mappedField, value);
                }}
                disabled={disabled}
                errors={errors[`commercialReference${index}`] ? {
                  firstName: errors[`commercialReference${index}`],
                  paternalLastName: errors[`commercialReference${index}`],
                  maternalLastName: errors[`commercialReference${index}`],
                } : {}}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Teléfono *</Label>
                <Input
                  value={ref.phone}
                  onChange={(e) => onUpdateCommercialReference(index, 'phone', e.target.value)}
                  placeholder="10 dígitos"
                  className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={ref.email || ''}
                  onChange={(e) => onUpdateCommercialReference(index, 'email', e.target.value)}
                  placeholder="contacto@empresa.com"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Relación Comercial</Label>
                <Select
                  value={ref.relationship || ''}
                  onValueChange={(value) => onUpdateCommercialReference(index, 'relationship', value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Proveedor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="partner">Socio Comercial</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Años de Relación</Label>
                <Input
                  type="number"
                  value={ref.yearsOfRelationship || ''}
                  onChange={(e) => onUpdateCommercialReference(index, 'yearsOfRelationship', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  disabled={disabled}
                />
              </div>
            </div>
            <FieldError error={errors[`commercialReference${index}`]} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
