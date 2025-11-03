'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { PersonActorData } from '@/lib/types/actor';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';

interface PersonInformationProps {
  data: Partial<PersonActorData>;
  onChange: (field: keyof PersonActorData, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  requiredFields?: (keyof PersonActorData)[];
  showEmploymentInfo?: boolean;
  showAdditionalContact?: boolean;
}

export default function PersonInformation({
  data,
  onChange,
  errors = {},
  disabled = false,
  requiredFields = ['firstName', 'paternalLastName', 'maternalLastName', 'email', 'phone'],
  showEmploymentInfo = false,
  showAdditionalContact = false,
}: PersonInformationProps) {
  const isRequired = (field: keyof PersonActorData) => requiredFields.includes(field);

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <PersonNameFields
        firstName={data.firstName || ''}
        middleName={data.middleName || ''}
        paternalLastName={data.paternalLastName || ''}
        maternalLastName={data.maternalLastName || ''}
        onChange={(field, value) => onChange(field as keyof PersonActorData, value)}
        required={requiredFields.includes('firstName')}
        disabled={disabled}
        errors={{
          firstName: errors.firstName,
          middleName: errors.middleName,
          paternalLastName: errors.paternalLastName,
          maternalLastName: errors.maternalLastName,
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div>
          <Label htmlFor="email">
            Email {isRequired('email') && '*'}
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="correo@ejemplo.com"
            className={errors.email ? 'border-red-500' : ''}
            disabled={disabled}
            required={isRequired('email')}
          />
          <FieldError error={errors.email} />
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">
            Teléfono {isRequired('phone') && '*'}
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

        {/* RFC */}
        <div>
          <Label htmlFor="rfc">
            RFC {isRequired('rfc') && '*'}
          </Label>
          <Input
            id="rfc"
            value={data.rfc || ''}
            onChange={(e) => onChange('rfc', e.target.value.toUpperCase())}
            placeholder="RFC con homoclave"
            maxLength={13}
            className={errors.rfc ? 'border-red-500' : ''}
            disabled={disabled}
            required={isRequired('rfc')}
          />
          <FieldError error={errors.rfc} />
        </div>

        {/* CURP */}
        <div>
          <Label htmlFor="curp">
            CURP {isRequired('curp') && '*'}
          </Label>
          <Input
            id="curp"
            value={data.curp || ''}
            onChange={(e) => onChange('curp', e.target.value.toUpperCase())}
            placeholder="18 caracteres"
            maxLength={18}
            className={errors.curp ? 'border-red-500' : ''}
            disabled={disabled}
            required={isRequired('curp')}
          />
          <FieldError error={errors.curp} />
        </div>

        {/* Employment Information */}
        {showEmploymentInfo && (
          <>
            <div>
              <Label htmlFor="occupation">
                Ocupación {isRequired('occupation') && '*'}
              </Label>
              <Input
                id="occupation"
                value={data.occupation || ''}
                onChange={(e) => onChange('occupation', e.target.value)}
                placeholder="Profesión u ocupación"
                className={errors.occupation ? 'border-red-500' : ''}
                disabled={disabled}
                required={isRequired('occupation')}
              />
              <FieldError error={errors.occupation} />
            </div>

            <div>
              <Label htmlFor="employerName">
                Empleador {isRequired('employerName') && '*'}
              </Label>
              <Input
                id="employerName"
                value={data.employerName || ''}
                onChange={(e) => onChange('employerName', e.target.value)}
                placeholder="Nombre del empleador"
                className={errors.employerName ? 'border-red-500' : ''}
                disabled={disabled}
                required={isRequired('employerName')}
              />
              <FieldError error={errors.employerName} />
            </div>

            <div>
              <Label htmlFor="monthlyIncome">
                Ingreso Mensual {isRequired('monthlyIncome') && '*'}
              </Label>
              <Input
                id="monthlyIncome"
                type="number"
                value={data.monthlyIncome || ''}
                onChange={(e) => onChange('monthlyIncome', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                className={errors.monthlyIncome ? 'border-red-500' : ''}
                disabled={disabled}
                required={isRequired('monthlyIncome')}
              />
              <FieldError error={errors.monthlyIncome} />
            </div>
          </>
        )}

        {/* Additional Contact */}
        {showAdditionalContact && (
          <>
            <div>
              <Label htmlFor="workPhone">
                Teléfono de Trabajo
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
              <Label htmlFor="personalEmail">
                Email Personal
              </Label>
              <Input
                id="personalEmail"
                type="email"
                value={data.personalEmail || ''}
                onChange={(e) => onChange('personalEmail', e.target.value)}
                placeholder="correo.personal@ejemplo.com"
                className={errors.personalEmail ? 'border-red-500' : ''}
                disabled={disabled}
              />
              <FieldError error={errors.personalEmail} />
            </div>

            <div>
              <Label htmlFor="workEmail">
                Email de Trabajo
              </Label>
              <Input
                id="workEmail"
                type="email"
                value={data.workEmail || ''}
                onChange={(e) => onChange('workEmail', e.target.value)}
                placeholder="correo.trabajo@ejemplo.com"
                className={errors.workEmail ? 'border-red-500' : ''}
                disabled={disabled}
              />
              <FieldError error={errors.workEmail} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}