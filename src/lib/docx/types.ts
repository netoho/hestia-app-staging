/**
 * Types for the contract cover page (.docx) generator
 */

export interface CoverActorData {
  label: string; // "Arrendador.", "Arrendatario.", "Obligado Solidario y Fiador."
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
  // Company constitution
  constitutionDeed: string;
  constitutionDate: string;
  constitutionNotary: string;
  constitutionNotaryNumber: string;
  registryCity: string;
  registryFolio: string;
  registryDate: string;
  // Legal representative
  legalRepName: string;
  legalRepPosition: string;
  legalRepIdentificationType: string;
  legalRepIdentificationNumber: string;
  legalRepAddress: string;
  legalRepPhone: string;
  legalRepRfc: string;
  legalRepCurp: string;
  legalRepEmail: string;
  legalRepWorkEmail: string;
  // Power of attorney
  powerDeed: string;
  powerDate: string;
  powerNotary: string;
  powerNotaryNumber: string;
}

export interface CoverBoundaryEntry {
  direction: string;
  value: string;
}

export interface CoverGuarantorProperty {
  deedNumber: string;
  deedDate: string;
  notaryNumber: string;
  notaryName: string;
  city: string;
  registryFolio: string;
  registryDate: string;
  registryCity: string;
  useType: string;
  useHabitacional: boolean;
  useComercial: boolean;
  useIndustrial: boolean;
  address: string;
  direction: string;
  landArea: string;
  constructionArea: string;
  boundaries: CoverBoundaryEntry[];
}

export interface CoverContractTerms {
  propertyAddress: string;
  parkingSpaces: string;
  propertyUse: string;
  rentDisplay: string; // Combined: "$50,000.00 (CINCUENTA MIL PESOS 00/100 M.N.), mensuales."
  securityDeposit: string;
  contractLength: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  maintenanceFee: string;
  paymentMethodDescription: string; // Bold block for "Método de pago" section
}

export interface CoverPageData {
  policyNumber: string;
  landlords: CoverActorData[];
  tenants: CoverActorData[];
  jointObligors: CoverActorData[];
  avals: CoverActorData[];
  guarantorProperties: CoverGuarantorProperty[];
  contractTerms: CoverContractTerms;
}
