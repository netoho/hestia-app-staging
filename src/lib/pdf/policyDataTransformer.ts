/**
 * Transform policy data from Prisma to PDF-friendly format
 */

import { formatCurrency } from '@/lib/utils/currency';
import { formatFullName } from '@/lib/utils/names';
import { t } from '@/lib/i18n';
import type {
  PDFPolicyData,
  PDFAddress,
  PDFLandlord,
  PDFTenant,
  PDFJointObligor,
  PDFAval,
  PDFProperty,
  PDFInvestigation,
  PDFPayment,
  PDFDocument,
  PDFPersonalReference,
} from './types';

type PolicyWithRelations = NonNullable<Awaited<ReturnType<typeof import('@/lib/services/policyService').getPolicyForPDF>>>;

/**
 * Safe value formatter with fallback
 */
function safe<T>(value: T | null | undefined, formatter: (v: T) => string, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  try {
    return formatter(value);
  } catch {
    return fallback;
  }
}

/**
 * Format date in Spanish locale
 */
function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Transform PropertyAddress to PDFAddress
 */
function transformAddress(addr: {
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  municipality?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
} | null | undefined): PDFAddress | null {
  if (!addr) return null;

  const parts = [
    addr.street,
    addr.exteriorNumber ? `#${addr.exteriorNumber}` : null,
    addr.interiorNumber ? `Int. ${addr.interiorNumber}` : null,
  ].filter(Boolean);

  const line1 = parts.join(' ');
  const line2 = [addr.neighborhood, addr.postalCode ? `C.P. ${addr.postalCode}` : null].filter(Boolean).join(', ');
  const line3 = [addr.municipality, addr.city, addr.state].filter(Boolean).join(', ');

  const formatted = addr.formattedAddress || [line1, line2, line3].filter(Boolean).join(', ');

  return {
    street: addr.street || '',
    exteriorNumber: addr.exteriorNumber || '',
    interiorNumber: addr.interiorNumber || null,
    neighborhood: addr.neighborhood || '',
    postalCode: addr.postalCode || '',
    municipality: addr.municipality || '',
    city: addr.city || '',
    state: addr.state || '',
    country: addr.country || 'México',
    formatted,
  };
}

/**
 * Transform personal references
 */
function transformPersonalReferences(refs: Array<{
  firstName?: string | null;
  middleName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  phone?: string | null;
  cellPhone?: string | null;
  relationship?: string | null;
}> | null | undefined): PDFPersonalReference[] {
  if (!refs || refs.length === 0) return [];
  return refs.map(ref => ({
    name: formatFullName(ref.firstName || '', ref.paternalLastName || '', ref.maternalLastName || '', ref.middleName || ''),
    phone: ref.cellPhone || ref.phone || '-',
    relationship: ref.relationship || null,
  }));
}

/**
 * Transform actor documents
 */
function transformDocuments(docs: Array<{
  category?: string | null;
  originalName?: string | null;
  fileSize?: number | null;
  createdAt?: Date | null;
}> | null | undefined): PDFDocument[] {
  if (!docs || docs.length === 0) return [];
  return docs.map(doc => ({
    category: doc.category || 'OTHER',
    categoryLabel: getDocumentCategoryLabel(doc.category || 'OTHER'),
    fileName: doc.originalName || 'documento',
    fileSize: formatFileSize(doc.fileSize),
    uploadedAt: formatDate(doc.createdAt) || '-',
  }));
}

/**
 * Get document category label in Spanish
 */
function getDocumentCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    IDENTIFICATION: 'Identificación',
    INCOME_PROOF: 'Comprobante de Ingresos',
    ADDRESS_PROOF: 'Comprobante de Domicilio',
    BANK_STATEMENT: 'Estado de Cuenta',
    PROPERTY_DEED: 'Escritura',
    TAX_RETURN: 'Declaración Fiscal',
    EMPLOYMENT_LETTER: 'Carta de Empleo',
    PROPERTY_TAX_STATEMENT: 'Predial',
    MARRIAGE_CERTIFICATE: 'Acta de Matrimonio',
    COMPANY_CONSTITUTION: 'Acta Constitutiva',
    LEGAL_POWERS: 'Poder Legal',
    TAX_STATUS_CERTIFICATE: 'Constancia de Situación Fiscal',
    CREDIT_REPORT: 'Reporte de Crédito',
    PROPERTY_REGISTRY: 'Registro de Propiedad',
    PROPERTY_APPRAISAL: 'Avalúo',
    PASSPORT: 'Pasaporte',
    IMMIGRATION_DOCUMENT: 'Documento Migratorio',
    UTILITY_BILL: 'Recibo de Servicios',
    PAYROLL_RECEIPT: 'Recibo de Nómina',
    OTHER: 'Otro',
  };
  return labels[category] || category;
}

/**
 * Transform landlord data
 */
function transformLandlord(landlord: PolicyWithRelations['landlords'][0]): PDFLandlord {
  const isCompany = !!landlord.companyName;
  const name = isCompany
    ? landlord.companyName || ''
    : formatFullName(
        landlord.firstName || '',
        landlord.paternalLastName || '',
        landlord.maternalLastName || '',
        landlord.middleName || ''
      );

  return {
    isPrimary: landlord.isPrimary,
    isCompany,
    name,
    companyName: landlord.companyName || null,
    rfc: landlord.rfc || landlord.companyRfc || null,
    curp: landlord.curp || null,
    email: landlord.email || null,
    phone: landlord.phone || null,
    address: transformAddress(landlord.addressDetails),
    bankName: landlord.bankName || null,
    accountNumber: landlord.accountNumber ? `****${landlord.accountNumber.slice(-4)}` : null,
    clabe: landlord.clabe ? `****${landlord.clabe.slice(-4)}` : null,
    accountHolder: landlord.accountHolder || null,
    occupation: landlord.occupation || null,
    monthlyIncome: landlord.monthlyIncome ? formatCurrency(landlord.monthlyIncome) : null,
    documents: transformDocuments(landlord.documents),
  };
}

/**
 * Transform tenant data
 */
function transformTenant(tenant: PolicyWithRelations['tenant']): PDFTenant | null {
  if (!tenant) return null;

  const isCompany = tenant.tenantType === 'COMPANY';
  const name = isCompany
    ? tenant.companyName || ''
    : formatFullName(
        tenant.firstName || '',
        tenant.paternalLastName || '',
        tenant.maternalLastName || '',
        tenant.middleName || ''
      );

  return {
    isCompany,
    name,
    companyName: tenant.companyName || null,
    rfc: tenant.rfc || tenant.companyRfc || null,
    curp: tenant.curp || null,
    passport: tenant.passport || null,
    nationality: tenant.nationality === 'FOREIGN' ? 'Extranjero' : 'Mexicano',
    email: tenant.email || null,
    phone: tenant.phone || null,
    address: transformAddress(tenant.addressDetails),
    employmentStatus: tenant.employmentStatus ? (t.employmentStatus[tenant.employmentStatus] || tenant.employmentStatus) : null,
    occupation: tenant.occupation || null,
    employerName: tenant.employerName || null,
    position: tenant.position || null,
    monthlyIncome: tenant.monthlyIncome ? formatCurrency(tenant.monthlyIncome) : null,
    employerAddress: transformAddress(tenant.employerAddressDetails),
    previousLandlordName: tenant.previousLandlordName || null,
    previousLandlordPhone: tenant.previousLandlordPhone || null,
    previousRentAmount: tenant.previousRentAmount ? formatCurrency(tenant.previousRentAmount) : null,
    previousRentalAddress: transformAddress(tenant.previousRentalAddressDetails),
    numberOfOccupants: tenant.numberOfOccupants || null,
    hasPets: tenant.hasPets || false,
    petDescription: tenant.petDescription || null,
    personalReferences: transformPersonalReferences(tenant.personalReferences),
    documents: transformDocuments(tenant.documents),
  };
}

/**
 * Transform joint obligor data
 */
function transformJointObligor(jo: PolicyWithRelations['jointObligors'][0]): PDFJointObligor {
  const isCompany = jo.jointObligorType === 'COMPANY';
  const name = isCompany
    ? jo.companyName || ''
    : formatFullName(
        jo.firstName || '',
        jo.paternalLastName || '',
        jo.maternalLastName || '',
        jo.middleName || ''
      );

  return {
    isCompany,
    name,
    companyName: jo.companyName || null,
    rfc: jo.rfc || jo.companyRfc || null,
    curp: jo.curp || null,
    email: jo.email || null,
    phone: jo.phone || null,
    address: transformAddress(jo.addressDetails),
    relationshipToTenant: jo.relationshipToTenant || null,
    employmentStatus: jo.employmentStatus ? (t.employmentStatus[jo.employmentStatus] || jo.employmentStatus) : null,
    occupation: jo.occupation || null,
    employerName: jo.employerName || null,
    position: jo.position || null,
    monthlyIncome: jo.monthlyIncome ? formatCurrency(jo.monthlyIncome) : null,
    employerAddress: transformAddress(jo.employerAddressDetails),
    guaranteeMethod: jo.guaranteeMethod || null,
    hasPropertyGuarantee: jo.hasPropertyGuarantee || false,
    propertyAddress: transformAddress(jo.guaranteePropertyDetails),
    propertyValue: jo.propertyValue ? formatCurrency(jo.propertyValue) : null,
    propertyDeedNumber: jo.propertyDeedNumber || null,
    maritalStatus: jo.maritalStatus || null,
    spouseName: jo.spouseName || null,
    personalReferences: transformPersonalReferences(jo.personalReferences),
    documents: transformDocuments(jo.documents),
  };
}

/**
 * Transform aval data
 */
function transformAval(aval: PolicyWithRelations['avals'][0]): PDFAval {
  const isCompany = aval.avalType === 'COMPANY';
  const name = isCompany
    ? aval.companyName || ''
    : formatFullName(
        aval.firstName || '',
        aval.paternalLastName || '',
        aval.maternalLastName || '',
        aval.middleName || ''
      );

  return {
    isCompany,
    name,
    companyName: aval.companyName || null,
    rfc: aval.rfc || aval.companyRfc || null,
    curp: aval.curp || null,
    email: aval.email || null,
    phone: aval.phone || null,
    address: transformAddress(aval.addressDetails),
    relationshipToTenant: aval.relationshipToTenant || null,
    employmentStatus: aval.employmentStatus ? (t.employmentStatus[aval.employmentStatus] || aval.employmentStatus) : null,
    occupation: aval.occupation || null,
    monthlyIncome: aval.monthlyIncome ? formatCurrency(aval.monthlyIncome) : null,
    hasPropertyGuarantee: aval.hasPropertyGuarantee || false,
    propertyAddress: transformAddress(aval.guaranteePropertyDetails),
    propertyValue: aval.propertyValue ? formatCurrency(aval.propertyValue) : null,
    propertyDeedNumber: aval.propertyDeedNumber || null,
    maritalStatus: aval.maritalStatus || null,
    spouseName: aval.spouseName || null,
    personalReferences: transformPersonalReferences(aval.personalReferences),
    documents: transformDocuments(aval.documents),
  };
}

/**
 * Transform property details
 */
function transformProperty(prop: PolicyWithRelations['propertyDetails']): PDFProperty | null {
  if (!prop) return null;

  return {
    type: prop.propertyType || 'OTHER',
    typeLabel: prop.propertyType ? (t.propertyType[prop.propertyType] || prop.propertyType) : 'Otro',
    address: transformAddress(prop.propertyAddressDetails),
    description: prop.propertyDescription || null,
    parkingSpaces: prop.parkingSpaces || 0,
    isFurnished: prop.isFurnished || false,
    hasPhone: prop.hasPhone || false,
    hasElectricity: prop.hasElectricity || false,
    hasWater: prop.hasWater || false,
    hasGas: prop.hasGas || false,
    hasCableTV: prop.hasCableTV || false,
    hasInternet: prop.hasInternet || false,
    petsAllowed: prop.petsAllowed || false,
    deliveryDate: formatDate(prop.propertyDeliveryDate),
    contractSigningDate: formatDate(prop.contractSigningDate),
  };
}

/**
 * Transform investigation data
 */
function transformInvestigation(inv: PolicyWithRelations['investigation']): PDFInvestigation | null {
  if (!inv) return null;

  return {
    verdict: inv.verdict || null,
    verdictLabel: inv.verdict ? (t.investigationVerdict[inv.verdict] || inv.verdict) : null,
    riskLevel: inv.riskLevel || null,
    riskLevelLabel: inv.riskLevel ? (t.riskLevel[inv.riskLevel] || inv.riskLevel) : null,
    score: inv.score || null,
    notes: inv.notes || null,
  };
}

/**
 * Transform payment data
 */
function transformPayments(payments: PolicyWithRelations['payments']): PDFPayment[] {
  if (!payments || payments.length === 0) return [];

  return payments.map(p => ({
    amount: p.amount ? formatCurrency(p.amount) : '-',
    status: p.status || 'PENDING',
    statusLabel: p.status ? (t.paymentStatusFull[p.status] || p.status) : 'Pendiente',
    method: p.method || null,
    type: p.type || null,
    paidBy: p.paidBy || null,
    date: formatDate(p.paidAt || p.createdAt) || '-',
  }));
}

/**
 * Main transformer function
 */
export function transformPolicyForPDF(policy: PolicyWithRelations): PDFPolicyData {
  const now = new Date();

  return {
    // Header
    policyNumber: policy.policyNumber,
    internalCode: policy.internalCode || null,
    status: policy.status,
    statusLabel: t.policyStatusFull[policy.status] || policy.status,
    generatedAt: now.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),

    // Core info
    rentAmount: policy.rentAmount ? formatCurrency(policy.rentAmount) : '-',
    contractLength: policy.contractLength || 12,
    contractLengthLabel: `${policy.contractLength || 12} ${(policy.contractLength || 12) === 1 ? 'mes' : 'meses'}`,
    guarantorType: policy.guarantorType || 'NONE',
    guarantorTypeLabel: policy.guarantorType ? (t.guarantorType[policy.guarantorType] || policy.guarantorType) : 'Sin Garantía',
    totalPrice: policy.totalPrice ? formatCurrency(policy.totalPrice) : '-',
    tenantPercentage: policy.tenantPercentage ?? 100,
    landlordPercentage: policy.landlordPercentage ?? 0,

    // Dates
    createdAt: formatDate(policy.createdAt) || '-',
    submittedAt: formatDate(policy.submittedAt),
    approvedAt: formatDate(policy.approvedAt),
    activatedAt: formatDate(policy.activatedAt),
    expiresAt: formatDate(policy.expiresAt),

    // Landlord financial
    hasIVA: policy.hasIVA || false,
    issuesTaxReceipts: policy.issuesTaxReceipts || false,
    securityDeposit: policy.securityDeposit ? `${policy.securityDeposit} ${policy.securityDeposit === 1 ? 'mes' : 'meses'}` : null,
    maintenanceFee: policy.maintenanceFee ? formatCurrency(policy.maintenanceFee) : null,
    maintenanceIncludedInRent: policy.maintenanceIncludedInRent || false,
    rentIncreasePercentage: policy.rentIncreasePercentage ? `${policy.rentIncreasePercentage}%` : null,
    paymentMethod: policy.paymentMethod || null,

    // Created/Managed by
    createdBy: policy.createdBy?.name || policy.createdBy?.email || null,
    managedBy: policy.managedBy?.name || policy.managedBy?.email || null,

    // Related data
    property: transformProperty(policy.propertyDetails),
    landlords: policy.landlords?.map(transformLandlord) || [],
    tenant: transformTenant(policy.tenant),
    jointObligors: policy.jointObligors?.map(transformJointObligor) || [],
    avals: policy.avals?.map(transformAval) || [],
    investigation: transformInvestigation(policy.investigation),
    payments: transformPayments(policy.payments),
    documents: transformDocuments(policy.documents),
  };
}
