'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Building2 } from 'lucide-react';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import PersonInformation from '@/components/actor/shared/PersonInformation';
import CompanyInformation from '@/components/actor/shared/CompanyInformation';
import { JointObligorFormData } from '@/hooks/useJointObligorForm';

interface JointObligorPersonalInfoTabProps {
  formData: JointObligorFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function JointObligorPersonalInfoTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}: JointObligorPersonalInfoTabProps) {
  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Obligado Solidario</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.isCompany ? 'company' : 'individual'}
            onValueChange={(value) => onFieldChange('isCompany', value === 'company')}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="obligor-individual" />
              <Label htmlFor="obligor-individual" className="flex items-center cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Persona Física
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company" id="obligor-company" />
              <Label htmlFor="obligor-company" className="flex items-center cursor-pointer">
                <Building2 className="h-4 w-4 mr-2" />
                Persona Moral (Empresa)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información {formData.isCompany ? 'de la Empresa' : 'Personal'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.isCompany ? (
            <CompanyInformation
              data={formData}
              onChange={onFieldChange}
              errors={errors}
              disabled={disabled}
              showAdditionalContact
            />
          ) : (
            <PersonInformation
              data={formData}
              onChange={onFieldChange}
              errors={errors}
              disabled={disabled}
              showEmploymentInfo={false}
              showAdditionalContact
            />
          )}

          {/* Relationship to Tenant (REQUIRED for Joint Obligor) */}
          <div>
            <Label htmlFor="relationshipToTenant">
              Relación con el Inquilino *
            </Label>
            <Input
              id="relationshipToTenant"
              value={formData.relationshipToTenant || ''}
              onChange={(e) => onFieldChange('relationshipToTenant', e.target.value)}
              placeholder="Ej: Familiar, Amigo, Socio de negocio"
              disabled={disabled}
              className={errors.relationshipToTenant ? 'border-red-500' : ''}
              required
            />
            {errors.relationshipToTenant && (
              <p className="text-red-500 text-sm mt-1">{errors.relationshipToTenant}</p>
            )}
          </div>

          {/* Address Autocomplete */}
          <div className="mt-4">
            <AddressAutocomplete
              label="Dirección *"
              value={formData.addressDetails || {}}
              onChange={(addressData) => {
                onFieldChange('addressDetails', addressData);
                onFieldChange('address',
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