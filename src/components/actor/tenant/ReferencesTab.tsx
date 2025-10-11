'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonalReference, CommercialReference } from '@/hooks/useTenantReferences';

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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo *</Label>
                  <Input
                    value={ref.name}
                    onChange={(e) => onUpdatePersonalReference(index, 'name', e.target.value)}
                    placeholder="Nombre completo"
                    className={errors[`reference${index}`] ? 'border-red-500' : ''}
                    disabled={disabled}
                  />
                </div>

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
              {errors[`reference${index}`] && (
                <p className="text-red-500 text-sm mt-2">{errors[`reference${index}`]}</p>
              )}
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
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre de la Empresa *</Label>
                <Input
                  value={ref.companyName}
                  onChange={(e) => onUpdateCommercialReference(index, 'companyName', e.target.value)}
                  placeholder="Razón social"
                  className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Nombre del Contacto *</Label>
                <Input
                  value={ref.contactName}
                  onChange={(e) => onUpdateCommercialReference(index, 'contactName', e.target.value)}
                  placeholder="Nombre completo"
                  className={errors[`commercialReference${index}`] ? 'border-red-500' : ''}
                  disabled={disabled}
                />
              </div>

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
            {errors[`commercialReference${index}`] && (
              <p className="text-red-500 text-sm mt-2">{errors[`commercialReference${index}`]}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
