/**
 * Transform PDFPolicyData into CoverPageData for the .docx cover page
 */

import type { PDFPolicyData, PDFLandlord, PDFTenant, PDFJointObligor, PDFAval } from '@/lib/pdf/types';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty, CoverContractTerms } from './types';

const BLANK = '________________';

function addr(a: { formatted: string } | null | undefined): string {
  return a?.formatted || BLANK;
}

function val(v: string | null | undefined): string {
  return v || BLANK;
}

function transformLandlord(l: PDFLandlord, index: number, total: number): CoverActorData {
  const label = total > 1 ? `ARRENDADOR ${index + 1}` : 'ARRENDADOR';
  return {
    label,
    isCompany: l.isCompany,
    name: l.name || BLANK,
    nationality: 'Mexicana', // Not in schema, default
    address: addr(l.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(l.rfc),
    curp: val(l.curp),
    email: val(l.email),
    phone: val(l.phone),
    companyConstitution: BLANK,
    notary: BLANK,
    publicRegistry: BLANK,
    legalRepName: val(l.legalRepName),
    legalRepId: BLANK,
  };
}

function transformTenant(t: PDFTenant): CoverActorData {
  return {
    label: 'ARRENDATARIO',
    isCompany: t.isCompany,
    name: t.name || BLANK,
    nationality: t.nationality || BLANK,
    address: addr(t.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(t.rfc),
    curp: val(t.curp),
    email: val(t.email),
    phone: val(t.phone),
    companyConstitution: BLANK,
    notary: BLANK,
    publicRegistry: BLANK,
    legalRepName: val(t.legalRepName),
    legalRepId: BLANK,
  };
}

function transformJointObligor(jo: PDFJointObligor, index: number, total: number): CoverActorData {
  const label = total > 1 ? `OBLIGADO SOLIDARIO ${index + 1}` : 'OBLIGADO SOLIDARIO';
  return {
    label,
    isCompany: jo.isCompany,
    name: jo.name || BLANK,
    nationality: BLANK,
    address: addr(jo.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(jo.rfc),
    curp: val(jo.curp),
    email: val(jo.email),
    phone: val(jo.phone),
    companyConstitution: BLANK,
    notary: BLANK,
    publicRegistry: BLANK,
    legalRepName: val(jo.legalRepName),
    legalRepId: BLANK,
  };
}

function transformAval(a: PDFAval, index: number, total: number): CoverActorData {
  const label = total > 1 ? `AVAL ${index + 1}` : 'AVAL';
  return {
    label,
    isCompany: a.isCompany,
    name: a.name || BLANK,
    nationality: BLANK,
    address: addr(a.address),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: val(a.rfc),
    curp: val(a.curp),
    email: val(a.email),
    phone: val(a.phone),
    companyConstitution: BLANK,
    notary: BLANK,
    publicRegistry: BLANK,
    legalRepName: val(a.legalRepName),
    legalRepId: BLANK,
  };
}

function extractGuarantorProperty(jo: PDFJointObligor): CoverGuarantorProperty | null {
  if (!jo.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(jo.propertyDeedNumber),
    notary: BLANK,
    publicRegistry: val(jo.propertyRegistry),
    useType: BLANK,
    address: addr(jo.propertyAddress),
    landArea: BLANK,
    constructionArea: BLANK,
    boundaries: BLANK,
  };
}

function extractAvalProperty(a: PDFAval): CoverGuarantorProperty | null {
  if (!a.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(a.propertyDeedNumber),
    notary: BLANK,
    publicRegistry: val(a.propertyRegistry),
    useType: BLANK,
    address: addr(a.propertyAddress),
    landArea: BLANK,
    constructionArea: BLANK,
    boundaries: BLANK,
  };
}

function buildContractTerms(data: PDFPolicyData): CoverContractTerms {
  // Find primary landlord for bank details
  const primaryLandlord = data.landlords.find(l => l.isPrimary) || data.landlords[0];

  const rentNum = data.rentAmount && data.rentAmount !== '-'
    ? parseFloat(data.rentAmount.replace(/[^0-9.]/g, ''))
    : null;

  return {
    propertyAddress: data.property?.address?.formatted || BLANK,
    parkingSpaces: data.property?.parkingSpaces
      ? String(data.property.parkingSpaces)
      : BLANK,
    propertyUse: data.property?.typeLabel || BLANK,
    rentAmount: rentNum,
    rentFormatted: data.rentAmount !== '-' ? data.rentAmount : BLANK,
    rentInWords: '', // Filled by the service with amountToSpanishLegal
    securityDeposit: val(data.securityDeposit),
    contractLength: data.contractLengthLabel || BLANK,
    startDate: val(data.activatedAt),
    endDate: val(data.expiresAt),
    deliveryDate: data.property?.deliveryDate || BLANK,
    maintenanceFee: val(data.maintenanceFee),
    paymentMethod: val(data.paymentMethod),
    bankName: val(primaryLandlord?.bankName),
    accountHolder: val(primaryLandlord?.accountHolder),
    accountNumber: val(primaryLandlord?.accountNumber),
    clabe: val(primaryLandlord?.clabe),
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

  const contractTerms = buildContractTerms(data);

  // Signature parties
  const signatureParties = [
    ...landlords.map(l => ({ label: l.label, name: l.name })),
    ...tenants.map(t => ({ label: t.label, name: t.name })),
    ...jointObligors.map(jo => ({ label: jo.label, name: jo.name })),
    ...avals.map(a => ({ label: a.label, name: a.name })),
  ];

  return {
    landlords,
    tenants,
    jointObligors,
    avals,
    guarantorProperties,
    contractTerms,
    signatureParties,
  };
}
