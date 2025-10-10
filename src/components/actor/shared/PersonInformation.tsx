'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonActorData } from '@/lib/types/actor';

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
  requiredFields = ['fullName', 'email', 'phone'],
  showEmploymentInfo = false,
  showAdditionalContact = false,
}: PersonInformationProps) {
  const isRequired = (field: keyof PersonActorData) => requiredFields.includes(field);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="md:col-span-2">
          <Label htmlFor="fullName">
            Nombre Completo {isRequired('fullName') && '*'}
          </Label>
          <Input
            id="fullName"
            value={data.fullName || ''}
            onChange={(e) => onChange('fullName', e.target.value)}
            placeholder="Nombre(s) y Apellidos"
            className={errors.fullName ? 'border-red-500' : ''}
            disabled={disabled}
            required={isRequired('fullName')}
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

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
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
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
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
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
          {errors.rfc && (
            <p className="text-red-500 text-sm mt-1">{errors.rfc}</p>
          )}
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
          {errors.curp && (
            <p className="text-red-500 text-sm mt-1">{errors.curp}</p>
          )}
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
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
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
              {errors.employerName && (
                <p className="text-red-500 text-sm mt-1">{errors.employerName}</p>
              )}
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
              {errors.monthlyIncome && (
                <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>
              )}
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
              {errors.workPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.workPhone}</p>
              )}
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
              {errors.personalEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.personalEmail}</p>
              )}
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
              {errors.workEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.workEmail}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}