/**
 * Transform PDFPolicyData into CoverPageData for the .docx cover page
 */

import type { PDFPolicyData, PDFLandlord, PDFTenant, PDFJointObligor, PDFAval } from '@/lib/pdf/types';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty, CoverContractTerms } from './types';
import { amountToSpanishLegal } from './numberToSpanishWords';
import { dateToSpanishLong } from './dateToSpanishLong';
import {
  BLANK,
  NA,
  DEFAULT_NATIONALITY,
  DEFAULT_COMPANY_NATIONALITY,
} from './coverPageDefaults';

type RawDates = {
  activatedAt: Date | string | null;
  expiresAt: Date | string | null;
  propertyDeliveryDate: Date | string | null;
};

type AnyPdfActor = PDFLandlord | PDFTenant | PDFJointObligor | PDFAval;
type PropertyGuarantorActor = PDFJointObligor | PDFAval;

function addr(a: { formatted: string } | null | undefined): string {
  return a?.formatted || BLANK;
}

function val(v: string | null | undefined): string {
  return v || BLANK;
}

function formatActorLabel(base: string, index: number, total: number): string {
  return total > 1 ? `${base} ${index + 1}.` : `${base}.`;
}

function resolveNationality(a: AnyPdfActor): string {
  if (a.isCompany) return DEFAULT_COMPANY_NATIONALITY;
  const nat = 'nationality' in a ? a.nationality : undefined;
  if (!nat) return DEFAULT_NATIONALITY;
  return nat === 'Mexicano' ? DEFAULT_NATIONALITY : nat;
}

function transformActor(a: AnyPdfActor, label: string): CoverActorData {
  return {
    label,
    isCompany: a.isCompany,
    name: a.name || BLANK,
    nationality: resolveNationality(a),
    address: addr(a.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(a.rfc),
    curp: val(a.curp),
    email: val(a.email),
    phone: val(a.phone),
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: val(a.legalRepName),
    legalRepPosition: val(a.legalRepPosition),
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: val(a.legalRepPhone),
    legalRepRfc: val(a.legalRepRfc),
    legalRepCurp: BLANK,
    legalRepEmail: val(a.legalRepEmail),
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

function extractGuarantorProperty(actor: PropertyGuarantorActor): CoverGuarantorProperty | null {
  if (!actor.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(actor.propertyDeedNumber),
    deedDate: BLANK,
    notaryNumber: BLANK,
    notaryName: BLANK,
    city: BLANK,
    registryFolio: val(actor.propertyRegistry),
    registryDate: BLANK,
    registryCity: BLANK,
    useHabitacional: false,
    useComercial: false,
    useIndustrial: false,
    address: addr(actor.propertyAddress),
    landArea: BLANK,
    constructionArea: BLANK,
    boundaries: [],
  };
}

function buildRentDisplay(data: PDFPolicyData): string {
  if (!data.rentAmount || data.rentAmount === '-') return BLANK;

  const numericStr = data.rentAmount.replace(/[^0-9.]/g, '');
  const num = parseFloat(numericStr);
  if (isNaN(num)) return data.rentAmount;

  const words = amountToSpanishLegal(num);
  return `${data.rentAmount} (${words}), mensuales.`;
}

function buildPaymentMethodDescription(data: PDFPolicyData): string {
  const primaryLandlord = data.landlords.find(l => l.isPrimary) || data.landlords[0];
  const method = data.paymentMethod;

  if (!method) return BLANK;

  if (method.toLowerCase().includes('transfer') || primaryLandlord?.bankName) {
    const parts = ['TRANSFERENCIA ELECTRÓNICA DE FONDOS.'];
    if (primaryLandlord?.accountHolder) parts.push(`Titular: ${primaryLandlord.accountHolder}.`);
    if (primaryLandlord?.bankName) parts.push(`Banco: ${primaryLandlord.bankName}.`);
    if (primaryLandlord?.accountNumber) parts.push(`Cuenta: ${primaryLandlord.accountNumber}.`);
    if (primaryLandlord?.clabe) parts.push(`CLABE: ${primaryLandlord.clabe}.`);
    return parts.join('\n');
  }

  return `PAGO EN EFECTIVO EN EL INMUEBLE ARRENDADO.`;
}

function buildContractTerms(data: PDFPolicyData, rawDates: RawDates): CoverContractTerms {
  const maintenanceIsNA = !data.maintenanceFee || data.maintenanceIncludedInRent;
  const parkingIsNA = !data.property?.parkingSpaces;

  return {
    propertyAddress: data.property?.address?.formatted || BLANK,
    parkingSpaces: parkingIsNA ? NA : String(data.property!.parkingSpaces),
    propertyUse: data.property?.typeLabel ? `${data.property.typeLabel}.` : BLANK,
    rentDisplay: buildRentDisplay(data),
    securityDeposit: val(data.securityDeposit),
    contractLength: data.contractLengthLabel ? `${data.contractLengthLabel}.` : BLANK,
    startDate: dateToSpanishLong(rawDates.activatedAt),
    endDate: dateToSpanishLong(rawDates.expiresAt),
    deliveryDate: dateToSpanishLong(rawDates.propertyDeliveryDate),
    maintenanceFee: maintenanceIsNA ? NA : val(data.maintenanceFee),
    paymentMethodDescription: buildPaymentMethodDescription(data),
  };
}

function toIsoString(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.toISOString();
}

export function buildCoverPageData(data: PDFPolicyData, rawDates: RawDates): CoverPageData {
  const landlords = data.landlords.map((l, i) =>
    transformActor(l, formatActorLabel('Arrendador', i, data.landlords.length)),
  );
  const tenants = data.tenant ? [transformActor(data.tenant, 'Arrendatario.')] : [];
  const jointObligors = data.jointObligors.map((jo, i) =>
    transformActor(jo, formatActorLabel('Obligado Solidario y Fiador', i, data.jointObligors.length)),
  );
  const avals = data.avals.map((a, i) =>
    transformActor(a, formatActorLabel('Aval', i, data.avals.length)),
  );

  const guarantorProperties: CoverGuarantorProperty[] = [
    ...data.jointObligors.map(extractGuarantorProperty).filter(Boolean) as CoverGuarantorProperty[],
    ...data.avals.map(extractGuarantorProperty).filter(Boolean) as CoverGuarantorProperty[],
  ];

  return {
    policyNumber: data.policyNumber,
    contractStartDateRaw: toIsoString(rawDates.activatedAt),
    landlords,
    tenants,
    jointObligors,
    avals,
    guarantorProperties,
    contractTerms: buildContractTerms(data, rawDates),
  };
}
