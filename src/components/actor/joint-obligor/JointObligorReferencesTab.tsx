'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonalReference, CommercialReference } from '@/hooks/useJointObligorReferences';

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
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <Label>Nombre Completo *</Label>
                    <Input
                      value={ref.name}
                      onChange={(e) => onUpdatePersonalReference(index, 'name', e.target.value)}
                      placeholder="Nombre completo"
                      disabled={disabled}
                      className={errors[`personalReference${index}`] ? 'border-red-500' : ''}
                    />
                  </div>

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
                    {errors[`personalReference${index}Phone`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`personalReference${index}Phone`]}</p>
                    )}
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
                    {errors[`personalReference${index}Email`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`personalReference${index}Email`]}</p>
                    )}
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
                  <div>
                    <Label>Ocupación</Label>
                    <Input
                      value={ref.occupation}
                      onChange={(e) => onUpdatePersonalReference(index, 'occupation', e.target.value)}
                      placeholder="Profesión u ocupación"
                      disabled={disabled}
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={ref.address}
                      onChange={(e) => onUpdatePersonalReference(index, 'address', e.target.value)}
                      placeholder="Dirección de contacto"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {errors[`personalReference${index}`] && (
                  <p className="text-red-500 text-sm mt-2">{errors[`personalReference${index}`]}</p>
                )}
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
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div>
                    <Label>Nombre de la Empresa *</Label>
                    <Input
                      value={ref.companyName}
                      onChange={(e) => onUpdateCommercialReference(index, 'companyName', e.target.value)}
                      placeholder="Razón social"
                      disabled={disabled}
                      className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <Label>Nombre del Contacto *</Label>
                    <Input
                      value={ref.contactName}
                      onChange={(e) => onUpdateCommercialReference(index, 'contactName', e.target.value)}
                      placeholder="Nombre completo"
                      disabled={disabled}
                      className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                    />
                  </div>

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
                    {errors[`commercialReference${index}Phone`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`commercialReference${index}Phone`]}</p>
                    )}
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
                    {errors[`commercialReference${index}Email`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`commercialReference${index}Email`]}</p>
                    )}
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

                {errors[`commercialReference${index}`] && (
                  <p className="text-red-500 text-sm mt-2">{errors[`commercialReference${index}`]}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}