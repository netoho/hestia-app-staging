'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompanyActorData } from '@/lib/types/actor';

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
    'legalRepName',
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
            {errors.companyName && (
              <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
            )}
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
            {errors.companyRfc && (
              <p className="text-red-500 text-sm mt-1">{errors.companyRfc}</p>
            )}
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
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
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
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
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
                {errors.workPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.workPhone}</p>
                )}
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
                {errors.workEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.workEmail}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legal Representative Information */}
      <div className="space-y-4 mt-6">
        <h3 className="text-sm font-medium text-gray-700">Información del Representante Legal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="legalRepName">
              Nombre del Representante Legal {isRequired('legalRepName') && '*'}
            </Label>
            <Input
              id="legalRepName"
              value={data.legalRepName || ''}
              onChange={(e) => onChange('legalRepName', e.target.value)}
              placeholder="Nombre completo del representante"
              className={errors.legalRepName ? 'border-red-500' : ''}
              disabled={disabled}
              required={isRequired('legalRepName')}
            />
            {errors.legalRepName && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepName}</p>
            )}
          </div>

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
            {errors.legalRepPosition && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepPosition}</p>
            )}
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
            {errors.legalRepRfc && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepRfc}</p>
            )}
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
            {errors.legalRepPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepPhone}</p>
            )}
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
            {errors.legalRepEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepEmail}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}