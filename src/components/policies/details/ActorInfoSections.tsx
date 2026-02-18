'use client';

import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullName } from '@/lib/utils/names';
import { formatAddress, type AddressFields } from '@/lib/utils/formatting';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export function InfoField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

/** Always renders — shows "-" in muted style when value is absent */
function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const isEmpty = value === null || value === undefined || value === '' || value === '-';
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={isEmpty ? 'text-gray-400' : `font-medium ${mono ? 'font-mono' : ''}`}>
        {isEmpty ? '-' : value}
      </p>
    </div>
  );
}

export function AddressDisplay({ label, address }: { label: string; address: AddressFields | null | undefined }) {
  return <Field label={label} value={formatAddress(address)} />;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-gray-100">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 group">
        <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">{title}</h4>
        <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pb-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ReferenceCard({ name, phone, relationship, email, occupation }: {
  name: string; phone: string; relationship?: string | null; email?: string | null; occupation?: string | null;
}) {
  return (
    <Card className="p-3">
      <p className="font-medium text-base">{name}</p>
      {relationship && <p className="text-sm text-gray-600">{relationship}</p>}
      {occupation && <p className="text-sm text-gray-600">{occupation}</p>}
      <p className="text-sm text-gray-600">{phone}</p>
      {email && <p className="text-sm text-gray-600 truncate">{email}</p>}
    </Card>
  );
}

function CommercialReferenceCard({ data }: { data: any }) {
  const contactName = formatFullName(
    data.contactFirstName || '',
    data.contactPaternalLastName || '',
    data.contactMaternalLastName || '',
    data.contactMiddleName || '',
  );
  return (
    <Card className="p-3">
      <p className="font-medium text-base">{data.companyName}</p>
      <p className="text-sm text-gray-600">Contacto: {contactName}</p>
      <p className="text-sm text-gray-600">{data.relationship}</p>
      <p className="text-sm text-gray-600">{data.phone}</p>
      {data.email && <p className="text-sm text-gray-600 truncate">{data.email}</p>}
      {data.yearsOfRelationship != null && (
        <p className="text-sm text-gray-600">{data.yearsOfRelationship} {data.yearsOfRelationship === 1 ? 'año' : 'años'} de relación</p>
      )}
    </Card>
  );
}

function translateNationality(val: string | null | undefined) {
  if (!val) return '-';
  return t.nationality[val] || val;
}

function translateEmploymentStatus(val: string | null | undefined) {
  if (!val) return '-';
  return t.employmentStatus[val] || val;
}

function translateMaritalStatus(val: string | null | undefined) {
  if (!val) return '-';
  return t.maritalStatus[val] || val;
}

function translateGuaranteeMethod(val: string | null | undefined) {
  if (!val) return '-';
  return t.guaranteeMethod[val] || val;
}

// ---------------------------------------------------------------------------
// Reusable sections
// ---------------------------------------------------------------------------

function PersonalSection({ actor, isCompany }: { actor: any; isCompany: boolean }) {
  if (isCompany) {
    const legalRepName = actor.legalRepFirstName
      ? formatFullName(actor.legalRepFirstName, actor.legalRepPaternalLastName || '', actor.legalRepMaternalLastName || '', actor.legalRepMiddleName || '')
      : null;
    return (
      <Section title="Información de la Empresa">
        <Field label="Empresa" value={actor.companyName} />
        <Field label="RFC Empresa" value={actor.companyRfc} mono />
        {actor.businessType && <Field label="Giro" value={actor.businessType} />}
        {legalRepName && <Field label="Representante Legal" value={legalRepName} />}
        {actor.legalRepPosition && <Field label="Cargo del Rep. Legal" value={actor.legalRepPosition} />}
        {actor.legalRepRfc && <Field label="RFC Rep. Legal" value={actor.legalRepRfc} mono />}
        {actor.legalRepCurp && <Field label="CURP Rep. Legal" value={actor.legalRepCurp} mono />}
        {actor.legalRepPhone && <Field label="Tel. Rep. Legal" value={actor.legalRepPhone} />}
        {actor.legalRepEmail && <Field label="Email Rep. Legal" value={actor.legalRepEmail} />}
        <Field label="Email" value={actor.email} />
        <Field label="Teléfono" value={actor.phone} />
        {actor.workPhone && <Field label="Tel. Trabajo" value={actor.workPhone} />}
        <AddressDisplay label="Dirección" address={actor.addressDetails} />
      </Section>
    );
  }

  return (
    <Section title="Información Personal">
      <Field label="Nombre" value={
        actor.firstName
          ? formatFullName(actor.firstName, actor.paternalLastName || '', actor.maternalLastName || '', actor.middleName || '')
          : actor.companyName || '-'
      } />
      <Field label="RFC" value={actor.rfc || actor.companyRfc} mono />
      <InfoField label="CURP" value={actor.curp} mono />
      <InfoField label="Pasaporte" value={actor.passport} />
      <InfoField label="Nacionalidad" value={translateNationality(actor.nationality)} />
      <Field label="Email" value={actor.email} />
      <Field label="Teléfono" value={actor.phone} />
      {actor.workPhone && <Field label="Tel. Trabajo" value={actor.workPhone} />}
      {actor.relationshipToTenant && <Field label="Relación con Inquilino" value={actor.relationshipToTenant} />}
      <AddressDisplay label="Dirección" address={actor.addressDetails} />
    </Section>
  );
}

function EmploymentSection({ actor }: { actor: any }) {
  return (
    <Section title="Información Laboral">
      <Field label="Situación Laboral" value={translateEmploymentStatus(actor.employmentStatus)} />
      <InfoField label="Ocupación" value={actor.occupation} />
      <InfoField label="Empresa" value={actor.employerName} />
      <InfoField label="Puesto" value={actor.position} />
      <Field label="Ingreso Mensual" value={actor.monthlyIncome ? formatCurrency(actor.monthlyIncome) : '-'} />
      <InfoField label="Fuente de Ingreso" value={actor.incomeSource} />
      {actor.yearsAtJob != null && <InfoField label="Antigüedad (años)" value={actor.yearsAtJob} />}
      {actor.employerAddressDetails && <AddressDisplay label="Dirección del Empleador" address={actor.employerAddressDetails} />}
      {actor.hasAdditionalIncome && (
        <>
          <InfoField label="Ingreso Adicional" value={actor.additionalIncomeAmount ? formatCurrency(actor.additionalIncomeAmount) : 'Sí'} />
          <InfoField label="Fuente Adicional" value={actor.additionalIncomeSource} />
        </>
      )}
    </Section>
  );
}

function RentalHistorySection({ actor }: { actor: any }) {
  return (
    <Section title="Historial de Renta">
      <InfoField label="Arrendador Anterior" value={actor.previousLandlordName} />
      <InfoField label="Tel. Arrendador Anterior" value={actor.previousLandlordPhone} />
      <InfoField label="Email Arrendador Anterior" value={actor.previousLandlordEmail} />
      <InfoField label="Renta Anterior" value={actor.previousRentAmount ? formatCurrency(actor.previousRentAmount) : null} />
      {actor.previousRentalAddressDetails && (
        <AddressDisplay label="Dirección Anterior" address={actor.previousRentalAddressDetails} />
      )}
      <InfoField label="Años Rentando" value={actor.rentalHistoryYears} />
      <InfoField label="Razón de Mudanza" value={actor.reasonForMoving} />
      <Field label="Ocupantes" value={actor.numberOfOccupants ?? '-'} />
      <Field label="Mascotas" value={actor.hasPets ? 'Sí' : 'No'} />
      <InfoField label="Descripción Mascotas" value={actor.petDescription} />
    </Section>
  );
}

function BankingSection({ actor }: { actor: any }) {
  return (
    <Section title="Información Bancaria">
      <Field label="Banco" value={actor.bankName} />
      <InfoField label="Titular de Cuenta" value={actor.accountHolder} />
      <InfoField label="Número de Cuenta" value={actor.accountNumber} mono />
      <InfoField label="CLABE" value={actor.clabe} mono />
    </Section>
  );
}

function PropertyDeedSection({ actor }: { actor: any }) {
  return (
    <Section title="Propiedad">
      <InfoField label="Número de Escritura" value={actor.propertyDeedNumber} />
      <InfoField label="Folio del Registro" value={actor.propertyRegistryFolio} />
    </Section>
  );
}

function PropertyGuaranteeSection({ actor }: { actor: any }) {
  return (
    <Section title="Propiedad en Garantía">
      <AddressDisplay label="Dirección de la Propiedad" address={actor.guaranteePropertyDetails} />
      <InfoField label="Valor de la Propiedad" value={actor.propertyValue ? formatCurrency(actor.propertyValue) : null} />
      <InfoField label="Número de Escritura" value={actor.propertyDeedNumber} />
      <InfoField label="Registro Público" value={actor.propertyRegistry} />
      <InfoField label="Cuenta Predial" value={actor.propertyTaxAccount} />
      {actor.propertyUnderLegalProceeding && <Field label="Procedimiento Legal" value="Sí" />}
      <Field label="Estado Civil" value={translateMaritalStatus(actor.maritalStatus)} />
      <InfoField label="Nombre del Cónyuge" value={actor.spouseName} />
      <InfoField label="RFC del Cónyuge" value={actor.spouseRfc} mono />
      <InfoField label="CURP del Cónyuge" value={actor.spouseCurp} mono />
    </Section>
  );
}

function GuaranteeSection({ actor }: { actor: any }) {
  return (
    <Section title="Garantía">
      <Field label="Método de Garantía" value={translateGuaranteeMethod(actor.guaranteeMethod)} />
      {actor.guaranteeMethod === 'income' && (
        <>
          <InfoField label="Banco" value={actor.bankName} />
          <InfoField label="Titular de Cuenta" value={actor.accountHolder} />
        </>
      )}
      {(actor.guaranteeMethod === 'property' || actor.hasPropertyGuarantee) && (
        <>
          <AddressDisplay label="Dirección de la Propiedad" address={actor.guaranteePropertyDetails} />
          <InfoField label="Valor de la Propiedad" value={actor.propertyValue ? formatCurrency(actor.propertyValue) : null} />
          <InfoField label="Número de Escritura" value={actor.propertyDeedNumber} />
          <InfoField label="Registro Público" value={actor.propertyRegistry} />
          <InfoField label="Cuenta Predial" value={actor.propertyTaxAccount} />
          {actor.propertyUnderLegalProceeding && <Field label="Procedimiento Legal" value="Sí" />}
        </>
      )}
      <Field label="Estado Civil" value={translateMaritalStatus(actor.maritalStatus)} />
      <InfoField label="Nombre del Cónyuge" value={actor.spouseName} />
      <InfoField label="RFC del Cónyuge" value={actor.spouseRfc} mono />
      <InfoField label="CURP del Cónyuge" value={actor.spouseCurp} mono />
    </Section>
  );
}

function ReferencesSection({ actor }: { actor: any }) {
  const personalRefs = actor.personalReferences || [];
  const commercialRefs = actor.commercialReferences || [];
  const hasRefs = personalRefs.length > 0 || commercialRefs.length > 0;

  return (
    <Section title="Referencias">
      {!hasRefs && (
        <p className="col-span-full text-sm text-gray-400">Sin referencias</p>
      )}
      {personalRefs.length > 0 && (
        <div className="col-span-full">
          {commercialRefs.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Personales</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personalRefs.map((ref: any, i: number) => (
              <ReferenceCard
                key={ref.id || i}
                name={formatFullName(ref.firstName || '', ref.paternalLastName || '', ref.maternalLastName || '', ref.middleName || '')}
                phone={ref.cellPhone || ref.phone}
                relationship={ref.relationship}
                email={ref.email}
                occupation={ref.occupation}
              />
            ))}
          </div>
        </div>
      )}
      {commercialRefs.length > 0 && (
        <div className="col-span-full mt-2">
          {personalRefs.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Comerciales</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commercialRefs.map((ref: any, i: number) => (
              <CommercialReferenceCard key={ref.id || i} data={ref} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Main per-actor-type section renderers
// ---------------------------------------------------------------------------

export function TenantSections({ actor }: { actor: any }) {
  const isCompany = actor.tenantType === 'COMPANY';

  return (
    <div className="space-y-2">
      <PersonalSection actor={actor} isCompany={isCompany} />
      {!isCompany && <EmploymentSection actor={actor} />}
      {!isCompany && <RentalHistorySection actor={actor} />}
      <ReferencesSection actor={actor} />
    </div>
  );
}

export function LandlordSections({ actor }: { actor: any }) {
  const isCompany = !!actor.isCompany;

  return (
    <div className="space-y-2">
      <PersonalSection actor={actor} isCompany={isCompany} />
      {!isCompany && <EmploymentSection actor={actor} />}
      <BankingSection actor={actor} />
      <PropertyDeedSection actor={actor} />
    </div>
  );
}

export function JointObligorSections({ actor }: { actor: any }) {
  const isCompany = actor.jointObligorType === 'COMPANY';

  return (
    <div className="space-y-2">
      <PersonalSection actor={actor} isCompany={isCompany} />
      {!isCompany && <EmploymentSection actor={actor} />}
      <GuaranteeSection actor={actor} />
      <ReferencesSection actor={actor} />
    </div>
  );
}

export function AvalSections({ actor }: { actor: any }) {
  const isCompany = actor.avalType === 'COMPANY';

  return (
    <div className="space-y-2">
      <PersonalSection actor={actor} isCompany={isCompany} />
      {!isCompany && <EmploymentSection actor={actor} />}
      <PropertyGuaranteeSection actor={actor} />
      <ReferencesSection actor={actor} />
    </div>
  );
}
