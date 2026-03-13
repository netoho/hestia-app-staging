/**
 * Transform PDFPolicyData into CoverPageData for the .docx cover page
 */

import type { PDFPolicyData, PDFLandlord, PDFTenant, PDFJointObligor, PDFAval } from '@/lib/pdf/types';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty, CoverContractTerms } from './types';
import { amountToSpanishLegal } from './numberToSpanishWords';

const BLANK = '________________';

function addr(a: { formatted: string } | null | undefined): string {
  return a?.formatted || BLANK;
}

function val(v: string | null | undefined): string {
  return v || BLANK;
}

function transformLandlord(l: PDFLandlord, index: number, total: number): CoverActorData {
  const label = total > 1 ? `Arrendador ${index + 1}.` : 'Arrendador.';
  return {
    label,
    isCompany: l.isCompany,
    name: l.name || BLANK,
    nationality: 'Mexicana.',
    address: addr(l.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(l.rfc),
    curp: val(l.curp),
    email: val(l.email),
    phone: val(l.phone),
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: val(l.legalRepName),
    legalRepPosition: val(l.legalRepPosition),
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: val(l.legalRepPhone),
    legalRepRfc: val(l.legalRepRfc),
    legalRepCurp: BLANK,
    legalRepEmail: val(l.legalRepEmail),
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

function transformTenant(t: PDFTenant): CoverActorData {
  return {
    label: 'Arrendatario.',
    isCompany: t.isCompany,
    name: t.name || BLANK,
    nationality: t.isCompany ? 'Sociedad de nacionalidad mexicana.' : (t.nationality === 'Mexicano' ? 'Mexicana.' : val(t.nationality)),
    address: addr(t.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(t.rfc),
    curp: val(t.curp),
    email: val(t.email),
    phone: val(t.phone),
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: val(t.legalRepName),
    legalRepPosition: val(t.legalRepPosition),
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: val(t.legalRepPhone),
    legalRepRfc: val(t.legalRepRfc),
    legalRepCurp: BLANK,
    legalRepEmail: val(t.legalRepEmail),
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

function transformJointObligor(jo: PDFJointObligor, index: number, total: number): CoverActorData {
  const label = total > 1 ? `Obligado Solidario y Fiador ${index + 1}.` : 'Obligado Solidario y Fiador.';
  return {
    label,
    isCompany: jo.isCompany,
    name: jo.name || BLANK,
    nationality: 'Mexicana.',
    address: addr(jo.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(jo.rfc),
    curp: val(jo.curp),
    email: val(jo.email),
    phone: val(jo.phone),
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: val(jo.legalRepName),
    legalRepPosition: val(jo.legalRepPosition),
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: val(jo.legalRepPhone),
    legalRepRfc: val(jo.legalRepRfc),
    legalRepCurp: BLANK,
    legalRepEmail: val(jo.legalRepEmail),
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

function transformAval(a: PDFAval, index: number, total: number): CoverActorData {
  const label = total > 1 ? `Aval ${index + 1}.` : 'Aval.';
  return {
    label,
    isCompany: a.isCompany,
    name: a.name || BLANK,
    nationality: 'Mexicana.',
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

function extractGuarantorProperty(jo: PDFJointObligor): CoverGuarantorProperty | null {
  if (!jo.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(jo.propertyDeedNumber),
    deedDate: BLANK,
    notaryNumber: BLANK,
    notaryName: BLANK,
    city: BLANK,
    registryFolio: val(jo.propertyRegistry),
    registryDate: BLANK,
    registryCity: BLANK,
    useType: BLANK,
    useHabitacional: false,
    useComercial: false,
    useIndustrial: false,
    address: addr(jo.propertyAddress),
    direction: BLANK,
    landArea: BLANK,
    constructionArea: BLANK,
    boundaries: [],
  };
}

function extractAvalProperty(a: PDFAval): CoverGuarantorProperty | null {
  if (!a.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(a.propertyDeedNumber),
    deedDate: BLANK,
    notaryNumber: BLANK,
    notaryName: BLANK,
    city: BLANK,
    registryFolio: val(a.propertyRegistry),
    registryDate: BLANK,
    registryCity: BLANK,
    useType: BLANK,
    useHabitacional: false,
    useComercial: false,
    useIndustrial: false,
    address: addr(a.propertyAddress),
    direction: BLANK,
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

  // Check if it's a bank transfer
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

function buildContractTerms(data: PDFPolicyData): CoverContractTerms {
  return {
    propertyAddress: data.property?.address?.formatted || BLANK,
    parkingSpaces: data.property?.parkingSpaces
      ? String(data.property.parkingSpaces)
      : 'N/A',
    propertyUse: data.property?.typeLabel
      ? `${data.property.typeLabel}.`
      : BLANK,
    rentDisplay: buildRentDisplay(data),
    securityDeposit: val(data.securityDeposit),
    contractLength: data.contractLengthLabel
      ? `${data.contractLengthLabel}.`
      : BLANK,
    startDate: val(data.activatedAt),
    endDate: val(data.expiresAt),
    deliveryDate: data.property?.deliveryDate || BLANK,
    maintenanceFee: val(data.maintenanceFee),
    paymentMethodDescription: buildPaymentMethodDescription(data),
  };
}

export function buildCoverPageData(data: PDFPolicyData): CoverPageData {
  const landlords = data.landlords.map((l, i) => transformLandlord(l, i, data.landlords.length));
  const tenants = data.tenant ? [transformTenant(data.tenant)] : [];
  const jointObligors = data.jointObligors.map((jo, i) => transformJointObligor(jo, i, data.jointObligors.length));
  const avals = data.avals.map((a, i) => transformAval(a, i, data.avals.length));

  const guarantorProperties: CoverGuarantorProperty[] = [
    ...data.jointObligors.map(extractGuarantorProperty).filter(Boolean) as CoverGuarantorProperty[],
    ...data.avals.map(extractAvalProperty).filter(Boolean) as CoverGuarantorProperty[],
  ];

  return {
    policyNumber: data.policyNumber,
    landlords,
    tenants,
    jointObligors,
    avals,
    guarantorProperties,
    contractTerms: buildContractTerms(data),
  };
}
