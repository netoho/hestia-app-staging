'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Building2, User } from 'lucide-react';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { FieldError } from '@/components/ui/field-error';
import PersonInformation from '@/components/actor/shared/PersonInformation';
import CompanyInformation from '@/components/actor/shared/CompanyInformation';
import { TenantFormData } from '@/hooks/useTenantForm';
import { PersonActorData, CompanyActorData } from '@/lib/types/actor';

interface PersonalInfoTabProps {
  formData: TenantFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function PersonalInfoTab({
  formData,
  onFieldChange,
  errors,
  disabled = false,
}: PersonalInfoTabProps) {
  const isCompany = formData.tenantType === 'COMPANY';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Inquilino</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={isCompany ? 'company' : 'individual'}
            onValueChange={(value) => {
              onFieldChange('tenantType', value === 'company' ? 'COMPANY' : 'INDIVIDUAL');
            }}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="tenant-individual" />
              <Label htmlFor="tenant-individual" className="flex items-center cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Persona Física
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company" id="tenant-company" />
              <Label htmlFor="tenant-company" className="flex items-center cursor-pointer">
                <Building2 className="h-4 w-4 mr-2" />
                Persona Moral (Empresa)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información {isCompany ? 'de la Empresa' : 'Personal'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCompany ? (
            <CompanyInformation
              data={formData as Partial<CompanyActorData>}
              onChange={(field, value) => onFieldChange(field as string, value)}
              errors={errors}
              disabled={disabled}
              showAdditionalContact
            />
          ) : (
            <>
              <PersonInformation
                data={formData as Partial<PersonActorData>}
                onChange={(field, value) => onFieldChange(field as string, value)}
                errors={errors}
                disabled={disabled}
                showAdditionalContact
              />

              {/* Nationality field specific to tenant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Nacionalidad *</Label>
                  <RadioGroup
                    value={formData.nationality || 'MEXICAN'}
                    onValueChange={(value) => onFieldChange('nationality', value)}
                    disabled={disabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="MEXICAN" id="mexican" />
                      <Label htmlFor="mexican">Mexicana</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FOREIGN" id="foreign" />
                      <Label htmlFor="foreign">Extranjera</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.nationality === 'FOREIGN' && (
                  <div>
                    <Label htmlFor="passport">Pasaporte *</Label>
                    <Input
                      id="passport"
                      value={formData.passport || ''}
                      onChange={(e) => onFieldChange('passport', e.target.value)}
                      placeholder="Número de pasaporte"
                      className={errors.passport ? 'border-red-500' : ''}
                      disabled={disabled}
                    />
                    <FieldError error={errors.passport} />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-4">
            <AddressAutocomplete
              label="Dirección Actual *"
              value={formData.addressDetails || {}}
              onChange={(addressData) => {
                onFieldChange('addressDetails', addressData);
                onFieldChange(
                  'currentAddress',
                  `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                );
              }}
              required
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
