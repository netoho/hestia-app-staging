'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldError } from '@/components/ui/field-error';
import { PersonalReference, CommercialReference } from '@/hooks/useJointObligorReferences';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';

interface JointObligorReferencesTabProps {
  isCompany: boolean;
  personalReferences: PersonalReference[];
  commercialReferences: CommercialReference[];
  onUpdatePersonalReference: (index: number, field: string, value: string) => void;
  onUpdateCommercialReference: (index: number, field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function JointObligorReferencesTab({
  isCompany,
  personalReferences,
  commercialReferences,
  onUpdatePersonalReference,
  onUpdateCommercialReference,
  errors,
  disabled,
}: JointObligorReferencesTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          {isCompany
            ? 'Por favor proporcione 3 referencias comerciales.'
            : 'Por favor proporcione 3 referencias personales (no familiares directos).'}
        </AlertDescription>
      </Alert>

      {/* Personal References for Individuals */}
      {!isCompany && (
        <>
          {personalReferences.map((ref, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Referencia Personal {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PersonNameFields
                  firstName={ref.firstName}
                  middleName={ref.middleName}
                  paternalLastName={ref.paternalLastName}
                  maternalLastName={ref.maternalLastName}
                  onChange={(field, value) => onUpdatePersonalReference(index, field, value)}
                  disabled={disabled}
                  errors={errors[`personalReference${index}`] ? {
                    firstName: errors[`personalReference${index}`],
                    paternalLastName: errors[`personalReference${index}`],
                    maternalLastName: errors[`personalReference${index}`],
                  } : {}}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Phone */}
                  <div>
                    <Label>Teléfono *</Label>
                    <Input
                      value={ref.phone}
                      onChange={(e) => onUpdatePersonalReference(index, 'phone', e.target.value)}
                      placeholder="10 dígitos"
                      disabled={disabled}
                      className={errors[`personalReference${index}Phone`] ? 'border-red-500' : ''}
                    />
                    <FieldError error={errors[`personalReference${index}Phone`]} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={ref.email}
                      onChange={(e) => onUpdatePersonalReference(index, 'email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                      disabled={disabled}
                      className={errors[`personalReference${index}Email`] ? 'border-red-500' : ''}
                    />
                    <FieldError error={errors[`personalReference${index}Email`]} />
                  </div>

                  {/* Relationship */}
                  <div>
                    <Label>Relación *</Label>
                    <Input
                      value={ref.relationship}
                      onChange={(e) => onUpdatePersonalReference(index, 'relationship', e.target.value)}
                      placeholder="Ej: Amigo, Compañero de trabajo"
                      disabled={disabled}
                      className={errors[`personalReference${index}`] ? 'border-red-500' : ''}
                    />
                  </div>

                  {/* Occupation */}
                  <div className="md:col-span-2">
                    <Label>Ocupación</Label>
                    <Input
                      value={ref.occupation}
                      onChange={(e) => onUpdatePersonalReference(index, 'occupation', e.target.value)}
                      placeholder="Profesión u ocupación"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <FieldError error={errors[`personalReference${index}`]} />
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Commercial References for Companies */}
      {isCompany && (
        <>
          {commercialReferences.map((ref, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Referencia Comercial {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nombre de la Empresa *</Label>
                    <Input
                      value={ref.companyName}
                      onChange={(e) => onUpdateCommercialReference(index, 'companyName', e.target.value)}
                      placeholder="Razón social"
                      disabled={disabled}
                      className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Nombre del Contacto *</Label>
                  <PersonNameFields
                    firstName={ref.contactFirstName}
                    middleName={ref.contactMiddleName}
                    paternalLastName={ref.contactPaternalLastName}
                    maternalLastName={ref.contactMaternalLastName}
                    onChange={(field, value) => {
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

                  {/* Phone */}
                  <div>
                    <Label>Teléfono *</Label>
                    <Input
                      value={ref.phone}
                      onChange={(e) => onUpdateCommercialReference(index, 'phone', e.target.value)}
                      placeholder="10 dígitos"
                      disabled={disabled}
                      className={errors[`commercialReference${index}Phone`] ? 'border-red-500' : ''}
                    />
                    <FieldError error={errors[`commercialReference${index}Phone`]} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={ref.email}
                      onChange={(e) => onUpdateCommercialReference(index, 'email', e.target.value)}
                      placeholder="contacto@empresa.com"
                      disabled={disabled}
                      className={errors[`commercialReference${index}Email`] ? 'border-red-500' : ''}
                    />
                    <FieldError error={errors[`commercialReference${index}Email`]} />
                  </div>

                  {/* Relationship */}
                  <div>
                    <Label>Tipo de Relación</Label>
                    <Select
                      value={ref.relationship}
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

                  {/* Years of Relationship */}
                  <div>
                    <Label>Años de Relación</Label>
                    <Input
                      type="number"
                      value={ref.yearsOfRelationship}
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
        </>
      )}
    </div>
  );
}