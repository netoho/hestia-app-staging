'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { CompanyActorData } from '@/lib/types/actor';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';

interface CompanyInformationProps {
  data: Partial<CompanyActorData>;
  onChange: (field: keyof CompanyActorData, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  requiredFields?: (keyof CompanyActorData)[];
  showAdditionalContact?: boolean;
}

export default function CompanyInformation({
  data,
  onChange,
  errors = {},
  disabled = false,
  requiredFields = [
    'companyName',
    'companyRfc',
    'legalRepFirstName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepPosition',
    'legalRepPhone',
    'legalRepEmail',
    'email',
    'phone',
  ],
  showAdditionalContact = false,
}: CompanyInformationProps) {
  const isRequired = (field: keyof CompanyActorData) => requiredFields.includes(field);

  return (
    <div className="space-y-4">
      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Información de la Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="companyName">
              Razón Social {isRequired('companyName') && '*'}
            </Label>
            <Input
              id="companyName"
              value={data.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="Nombre de la empresa"
              className={errors.companyName ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('companyName')}
            />
            <FieldError error={errors.companyName} />
          </div>

          <div>
            <Label htmlFor="companyRfc">
              RFC de la Empresa {isRequired('companyRfc') && '*'}
            </Label>
            <Input
              id="companyRfc"
              value={data.companyRfc || ''}
              onChange={(e) => onChange('companyRfc', e.target.value.toUpperCase())}
              placeholder="RFC con homoclave"
              maxLength={13}
              className={errors.companyRfc ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('companyRfc')}
            />
            <FieldError error={errors.companyRfc} />
          </div>

          <div>
            <Label htmlFor="email">
              Email de la Empresa {isRequired('email') && '*'}
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="contacto@empresa.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('email')}
            />
            <FieldError error={errors.email} />
          </div>

          <div>
            <Label htmlFor="phone">
              Teléfono de la Empresa {isRequired('phone') && '*'}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={data.phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="10 dígitos"
              className={errors.phone ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('phone')}
            />
            <FieldError error={errors.phone} />
          </div>

          {showAdditionalContact && (
            <>
              <div>
                <Label htmlFor="workPhone">
                  Teléfono Alternativo
                </Label>
                <Input
                  id="workPhone"
                  type="tel"
                  value={data.workPhone || ''}
                  onChange={(e) => onChange('workPhone', e.target.value)}
                  placeholder="10 dígitos"
                  className={errors.workPhone ? 'border-red-500' : ''}
                  disabled={disabled}
                />
                <FieldError error={errors.workPhone} />
              </div>

              <div>
                <Label htmlFor="workEmail">
                  Email Alternativo
                </Label>
                <Input
                  id="workEmail"
                  type="email"
                  value={data.workEmail || ''}
                  onChange={(e) => onChange('workEmail', e.target.value)}
                  placeholder="alternativo@empresa.com"
                  className={errors.workEmail ? 'border-red-500' : ''}
                  disabled={disabled}
                />
                <FieldError error={errors.workEmail} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legal Representative Information */}
      <div className="space-y-4 mt-6">
        <h3 className="text-sm font-medium text-gray-700">Información del Representante Legal</h3>

        {/* Legal Rep Name Fields */}
        <div className="md:col-span-2">
          <PersonNameFields
            firstName={data.legalRepFirstName || ''}
            middleName={data.legalRepMiddleName || ''}
            paternalLastName={data.legalRepPaternalLastName || ''}
            maternalLastName={data.legalRepMaternalLastName || ''}
            onChange={(field, value) => {
              // Map field names with legalRep prefix
              const mappedField = field === 'firstName' ? 'legalRepFirstName' :
                                  field === 'middleName' ? 'legalRepMiddleName' :
                                  field === 'paternalLastName' ? 'legalRepPaternalLastName' :
                                  'legalRepMaternalLastName';
              onChange(mappedField as keyof CompanyActorData, value);
            }}
            required={isRequired('legalRepFirstName')}
            disabled={disabled}
            errors={{
              firstName: errors.legalRepFirstName,
              middleName: errors.legalRepMiddleName,
              paternalLastName: errors.legalRepPaternalLastName,
              maternalLastName: errors.legalRepMaternalLastName,
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <Label htmlFor="legalRepPosition">
              Cargo del Representante {isRequired('legalRepPosition') && '*'}
            </Label>
            <Input
              id="legalRepPosition"
              value={data.legalRepPosition || ''}
              onChange={(e) => onChange('legalRepPosition', e.target.value)}
              placeholder="Ej: Administrador Único, Apoderado Legal"
              className={errors.legalRepPosition ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('legalRepPosition')}
            />
            <FieldError error={errors.legalRepPosition} />
          </div>

          <div>
            <Label htmlFor="legalRepRfc">
              RFC del Representante
            </Label>
            <Input
              id="legalRepRfc"
              value={data.legalRepRfc || ''}
              onChange={(e) => onChange('legalRepRfc', e.target.value.toUpperCase())}
              placeholder="RFC con homoclave"
              maxLength={13}
              className={errors.legalRepRfc ? 'border-red-500' : ''}
              disabled={disabled}
            />
            <FieldError error={errors.legalRepRfc} />
          </div>

          <div>
            <Label htmlFor="legalRepPhone">
              Teléfono del Representante {isRequired('legalRepPhone') && '*'}
            </Label>
            <Input
              id="legalRepPhone"
              type="tel"
              value={data.legalRepPhone || ''}
              onChange={(e) => onChange('legalRepPhone', e.target.value)}
              placeholder="10 dígitos"
              className={errors.legalRepPhone ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('legalRepPhone')}
            />
            <FieldError error={errors.legalRepPhone} />
          </div>

          <div>
            <Label htmlFor="legalRepEmail">
              Email del Representante {isRequired('legalRepEmail') && '*'}
            </Label>
            <Input
              id="legalRepEmail"
              type="email"
              value={data.legalRepEmail || ''}
              onChange={(e) => onChange('legalRepEmail', e.target.value)}
              placeholder="representante@ejemplo.com"
              className={errors.legalRepEmail ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('legalRepEmail')}
            />
            <FieldError error={errors.legalRepEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}
