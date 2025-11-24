'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Building2 } from 'lucide-react';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import PersonInformation from '@/components/actor/shared/PersonInformation';
import CompanyInformation from '@/components/actor/shared/CompanyInformation';
import { AvalFormData } from '@/hooks/useAvalForm';

interface AvalPersonalInfoTabProps {
  formData: AvalFormData;
  onFieldChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function AvalPersonalInfoTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}: AvalPersonalInfoTabProps) {
  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Aval</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.avalType === 'COMPANY' ? 'company' : 'individual'}
            onValueChange={(value) => onFieldChange('avalType', value === 'company' ? 'COMPANY' : 'INDIVIDUAL')}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="aval-individual" />
              <Label htmlFor="aval-individual" className="flex items-center cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Persona Física
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company" id="aval-company" />
              <Label htmlFor="aval-company" className="flex items-center cursor-pointer">
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
          <CardTitle>Información {formData.avalType === 'COMPANY' ? 'de la Empresa' : 'Personal'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.avalType === 'COMPANY' ? (
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

          {/* Relationship to Tenant (Optional) */}
          {!formData.isCompany && (
            <div>
              <Label htmlFor="relationshipToTenant">Relación con el Inquilino (Opcional)</Label>
              <Input
                id="relationshipToTenant"
                value={formData.relationshipToTenant || ''}
                onChange={(e) => onFieldChange('relationshipToTenant', e.target.value)}
                placeholder="Ej: Familiar, Amigo, Socio"
                disabled={disabled}
              />
            </div>
          )}

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
