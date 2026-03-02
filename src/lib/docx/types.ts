/**
 * Types for the contract cover page (.docx) generator
 */

export interface CoverActorData {
  label: string; // "ARRENDADOR", "ARRENDATARIO", etc.
  isCompany: boolean;
  name: string;
  nationality: string;
  address: string;
  identificationType: string;
  identificationNumber: string;
  rfc: string;
  curp: string;
  email: string;
  phone: string;
  // Company-specific
  companyConstitution: string;
  notary: string;
  publicRegistry: string;
  legalRepName: string;
  legalRepId: string;
}

export interface CoverGuarantorProperty {
  deedNumber: string;
  notary: string;
  publicRegistry: string;
  useType: string;
  address: string;
  landArea: string;
  constructionArea: string;
  boundaries: string;
}

export interface CoverContractTerms {
  propertyAddress: string;
  parkingSpaces: string;
  propertyUse: string;
  rentAmount: number | null;
  rentFormatted: string;
  rentInWords: string;
  securityDeposit: string;
  contractLength: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  maintenanceFee: string;
  paymentMethod: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  clabe: string;
}

export interface CoverPageData {
  landlords: CoverActorData[];
  tenants: CoverActorData[];
  jointObligors: CoverActorData[];
  avals: CoverActorData[];
  guarantorProperties: CoverGuarantorProperty[];
  contractTerms: CoverContractTerms;
  /** All actor names for signature block */
  signatureParties: { label: string; name: string }[];
}
