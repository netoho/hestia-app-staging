'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PersonalReference, CommercialReference } from '@/hooks/useAvalReferences';

interface AvalReferencesTabProps {
  personalReferences: PersonalReference[];
  commercialReferences: CommercialReference[];
  onPersonalReferenceChange: (index: number, field: string, value: string) => void;
  onCommercialReferenceChange: (index: number, field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
  isCompany: boolean;
}

export default function AvalReferencesTab({
  personalReferences,
  commercialReferences,
  onPersonalReferenceChange,
  onCommercialReferenceChange,
  errors,
  disabled,
  isCompany,
}: AvalReferencesTabProps) {
  return (
    <div className="space-y-6">
      {/* Personal References - Only for Individuals */}
      {!isCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Referencias Personales</CardTitle>
            <p className="text-sm text-muted-foreground">
              Proporcione 3 referencias personales que no sean familiares
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {personalReferences.map((ref, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Referencia Personal {index + 1}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <Label htmlFor={`personal-name-${index}`}>Nombre Completo *</Label>
                      <Input
                        id={`personal-name-${index}`}
                        value={ref.name}
                        onChange={(e) => onPersonalReferenceChange(index, 'name', e.target.value)}
                        placeholder="Nombre completo"
                        disabled={disabled}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor={`personal-phone-${index}`}>Teléfono *</Label>
                      <Input
                        id={`personal-phone-${index}`}
                        value={ref.phone}
                        onChange={(e) => onPersonalReferenceChange(index, 'phone', e.target.value)}
                        placeholder="10 dígitos"
                        maxLength={10}
                        disabled={disabled}
                      />
                      {errors[`personalReference${index}Phone`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`personalReference${index}Phone`]}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor={`personal-email-${index}`}>Email</Label>
                      <Input
                        id={`personal-email-${index}`}
                        type="email"
                        value={ref.email || ''}
                        onChange={(e) => onPersonalReferenceChange(index, 'email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        disabled={disabled}
                      />
                      {errors[`personalReference${index}Email`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`personalReference${index}Email`]}
                        </p>
                      )}
                    </div>

                    {/* Relationship */}
                    <div>
                      <Label htmlFor={`personal-relationship-${index}`}>Relación *</Label>
                      <Input
                        id={`personal-relationship-${index}`}
                        value={ref.relationship}
                        onChange={(e) => onPersonalReferenceChange(index, 'relationship', e.target.value)}
                        placeholder="Ej: Amigo, Colega"
                        disabled={disabled}
                      />
                    </div>

                    {/* Occupation */}
                    <div>
                      <Label htmlFor={`personal-occupation-${index}`}>Ocupación</Label>
                      <Input
                        id={`personal-occupation-${index}`}
                        value={ref.occupation || ''}
                        onChange={(e) => onPersonalReferenceChange(index, 'occupation', e.target.value)}
                        placeholder="Ocupación"
                        disabled={disabled}
                      />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <Label htmlFor={`personal-address-${index}`}>Dirección</Label>
                      <Input
                        id={`personal-address-${index}`}
                        value={ref.address || ''}
                        onChange={(e) => onPersonalReferenceChange(index, 'address', e.target.value)}
                        placeholder="Dirección completa"
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  {errors[`personalReference${index}`] && (
                    <p className="text-sm text-red-500">
                      {errors[`personalReference${index}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commercial References - For Both Individuals and Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Referencias Comerciales</CardTitle>
          <p className="text-sm text-muted-foreground">
            Proporcione 3 referencias comerciales (proveedores, clientes, instituciones financieras)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {commercialReferences.map((ref, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <h4 className="font-medium">Referencia Comercial {index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div>
                    <Label htmlFor={`commercial-company-${index}`}>Nombre de la Empresa *</Label>
                    <Input
                      id={`commercial-company-${index}`}
                      value={ref.companyName}
                      onChange={(e) => onCommercialReferenceChange(index, 'companyName', e.target.value)}
                      placeholder="Nombre de la empresa"
                      disabled={disabled}
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <Label htmlFor={`commercial-contact-${index}`}>Nombre del Contacto *</Label>
                    <Input
                      id={`commercial-contact-${index}`}
                      value={ref.contactName}
                      onChange={(e) => onCommercialReferenceChange(index, 'contactName', e.target.value)}
                      placeholder="Persona de contacto"
                      disabled={disabled}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor={`commercial-phone-${index}`}>Teléfono *</Label>
                    <Input
                      id={`commercial-phone-${index}`}
                      value={ref.phone}
                      onChange={(e) => onCommercialReferenceChange(index, 'phone', e.target.value)}
                      placeholder="10 dígitos"
                      maxLength={10}
                      disabled={disabled}
                    />
                    {errors[`commercialReference${index}Phone`] && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors[`commercialReference${index}Phone`]}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor={`commercial-email-${index}`}>Email</Label>
                    <Input
                      id={`commercial-email-${index}`}
                      type="email"
                      value={ref.email || ''}
                      onChange={(e) => onCommercialReferenceChange(index, 'email', e.target.value)}
                      placeholder="correo@empresa.com"
                      disabled={disabled}
                    />
                    {errors[`commercialReference${index}Email`] && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors[`commercialReference${index}Email`]}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <Label htmlFor={`commercial-relationship-${index}`}>Tipo de Relación *</Label>
                    <Input
                      id={`commercial-relationship-${index}`}
                      value={ref.relationship}
                      onChange={(e) => onCommercialReferenceChange(index, 'relationship', e.target.value)}
                      placeholder="Ej: Proveedor, Cliente, Banco"
                      disabled={disabled}
                    />
                  </div>

                  {/* Years of Relationship */}
                  <div>
                    <Label htmlFor={`commercial-years-${index}`}>Años de Relación</Label>
                    <Input
                      id={`commercial-years-${index}`}
                      type="number"
                      value={ref.yearsOfRelationship || ''}
                      onChange={(e) => onCommercialReferenceChange(index, 'yearsOfRelationship', parseInt(e.target.value) || 0)}
                      placeholder="Años"
                      min="0"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {errors[`commercialReference${index}`] && (
                  <p className="text-sm text-red-500">
                    {errors[`commercialReference${index}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
