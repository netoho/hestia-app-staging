'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';
import { LandlordFormData } from '../../types';

interface LandlordStepProps {
  data: LandlordFormData;
  onUpdate: (data: Partial<LandlordFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function LandlordStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: LandlordStepProps) {
  const handleNameChange = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  const handleLegalRepNameChange = (field: string, value: string) => {
    // Map the PersonNameFields output to legal rep fields
    const fieldMapping: Record<string, string> = {
      firstName: 'legalRepFirstName',
      middleName: 'legalRepMiddleName',
      paternalLastName: 'legalRepPaternalLastName',
      maternalLastName: 'legalRepMaternalLastName',
    };

    const mappedField = fieldMapping[field] || field;
    onUpdate({ [mappedField]: value });
  };

  const isValid = () => {
    if (data.isCompany) {
      return !!(
        data.companyName &&
        data.companyRfc &&
        data.email &&
        data.legalRepName
      );
    } else {
      return !!(
        data.firstName &&
        data.paternalLastName &&
        data.maternalLastName &&
        data.email
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Arrendador</CardTitle>
        <CardDescription>Ingrese los datos del propietario</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Toggle */}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="isCompany"
            checked={data.isCompany}
            onCheckedChange={(checked) => onUpdate({ isCompany: checked as boolean })}
          />
          <Label htmlFor="isCompany">El arrendador es una empresa</Label>
        </div>

        {data.isCompany ? (
          <>
            {/* Company Fields */}
            <div>
              <Label htmlFor="companyName">
                Razón Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={data.companyName || ''}
                onChange={(e) => onUpdate({ companyName: e.target.value })}
                placeholder="Nombre de la empresa"
              />
            </div>

            <div>
              <Label htmlFor="companyRfc">
                RFC de la Empresa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyRfc"
                value={data.companyRfc || ''}
                onChange={(e) => onUpdate({ companyRfc: e.target.value.toUpperCase() })}
                placeholder="AAA123456XXX"
                maxLength={12}
              />
            </div>

            {/* Legal Representative Section */}
            <div className="border-l-2 border-blue-200 pl-4 space-y-4">
              <h4 className="font-medium text-sm text-gray-700">Representante Legal</h4>

              <div>
                <Label htmlFor="legalRepName">
                  Nombre del Representante <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="legalRepName"
                  value={data.legalRepName || ''}
                  onChange={(e) => onUpdate({ legalRepName: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <PersonNameFields
                firstName={data.legalRepFirstName || ''}
                middleName={data.legalRepMiddleName || ''}
                paternalLastName={data.legalRepPaternalLastName || ''}
                maternalLastName={data.legalRepMaternalLastName || ''}
                onChange={handleLegalRepNameChange}
                required={false}
              />

              <div>
                <Label htmlFor="legalRepPosition">Cargo</Label>
                <Input
                  id="legalRepPosition"
                  value={data.legalRepPosition || ''}
                  onChange={(e) => onUpdate({ legalRepPosition: e.target.value })}
                  placeholder="Ej: Director General"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="legalRepRfc">RFC del Representante</Label>
                  <Input
                    id="legalRepRfc"
                    value={data.legalRepRfc || ''}
                    onChange={(e) => onUpdate({ legalRepRfc: e.target.value.toUpperCase() })}
                    placeholder="AAAA123456XXX"
                    maxLength={13}
                  />
                </div>

                <div>
                  <Label htmlFor="legalRepPhone">Teléfono del Representante</Label>
                  <Input
                    id="legalRepPhone"
                    value={data.legalRepPhone || ''}
                    onChange={(e) => onUpdate({ legalRepPhone: e.target.value })}
                    placeholder="10 dígitos"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="legalRepEmail">Email del Representante</Label>
                <Input
                  id="legalRepEmail"
                  type="email"
                  value={data.legalRepEmail || ''}
                  onChange={(e) => onUpdate({ legalRepEmail: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Individual Person Fields */}
            <PersonNameFields
              firstName={data.firstName || ''}
              middleName={data.middleName || ''}
              paternalLastName={data.paternalLastName || ''}
              maternalLastName={data.maternalLastName || ''}
              onChange={handleNameChange}
              required={true}
            />
          </>
        )}

        {/* Common Fields (both company and individual) */}
        <div>
          <Label htmlFor="email">
            Email de Contacto <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Teléfono Celular de Contacto</Label>
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="10 dígitos"
            />
          </div>

          <div>
            <Label htmlFor="rfc">RFC {!data.isCompany && '(Opcional)'}</Label>
            <Input
              id="rfc"
              value={data.rfc || ''}
              onChange={(e) => onUpdate({ rfc: e.target.value.toUpperCase() })}
              placeholder="AAAA123456XXX"
              maxLength={13}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>
            Anterior
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid()}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
