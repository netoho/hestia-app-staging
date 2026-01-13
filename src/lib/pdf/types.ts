/**
 * PDF-specific types for policy document generation
 */

export interface PDFAddress {
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string;
  postalCode: string;
  municipality: string;
  city: string;
  state: string;
  country: string;
  formatted: string;
}

export interface PDFPersonalReference {
  name: string;
  phone: string;
  relationship: string | null;
}

export interface PDFCommercialReference {
  companyName: string;
  contactName: string;
  phone: string;
  relationship: string | null;
}

export interface PDFDocument {
  category: string;
  categoryLabel: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
}

export interface PDFLandlord {
  isPrimary: boolean;
  isCompany: boolean;
  name: string;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  email: string | null;
  phone: string | null;
  address: PDFAddress | null;
  bankName: string | null;
  accountNumber: string | null;
  clabe: string | null;
  accountHolder: string | null;
  occupation: string | null;
  monthlyIncome: string | null;
  documents: PDFDocument[];
}

export interface PDFTenant {
  isCompany: boolean;
  name: string;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  passport: string | null;
  nationality: string;
  email: string | null;
  phone: string | null;
  address: PDFAddress | null;
  employmentStatus: string | null;
  occupation: string | null;
  employerName: string | null;
  position: string | null;
  monthlyIncome: string | null;
  employerAddress: PDFAddress | null;
  previousLandlordName: string | null;
  previousLandlordPhone: string | null;
  previousRentAmount: string | null;
  previousRentalAddress: PDFAddress | null;
  numberOfOccupants: number | null;
  hasPets: boolean;
  petDescription: string | null;
  personalReferences: PDFPersonalReference[];
  documents: PDFDocument[];
}

export interface PDFJointObligor {
  isCompany: boolean;
  name: string;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  email: string | null;
  phone: string | null;
  address: PDFAddress | null;
  relationshipToTenant: string | null;
  employmentStatus: string | null;
  occupation: string | null;
  employerName: string | null;
  position: string | null;
  monthlyIncome: string | null;
  employerAddress: PDFAddress | null;
  guaranteeMethod: string | null;
  hasPropertyGuarantee: boolean;
  propertyAddress: PDFAddress | null;
  propertyValue: string | null;
  propertyDeedNumber: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  personalReferences: PDFPersonalReference[];
  documents: PDFDocument[];
}

export interface PDFAval {
  isCompany: boolean;
  name: string;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  email: string | null;
  phone: string | null;
  address: PDFAddress | null;
  relationshipToTenant: string | null;
  employmentStatus: string | null;
  occupation: string | null;
  monthlyIncome: string | null;
  hasPropertyGuarantee: boolean;
  propertyAddress: PDFAddress | null;
  propertyValue: string | null;
  propertyDeedNumber: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  personalReferences: PDFPersonalReference[];
  documents: PDFDocument[];
}

export interface PDFProperty {
  type: string;
  typeLabel: string;
  address: PDFAddress | null;
  description: string | null;
  parkingSpaces: number;
  isFurnished: boolean;
  hasPhone: boolean;
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasCableTV: boolean;
  hasInternet: boolean;
  petsAllowed: boolean;
  deliveryDate: string | null;
  contractSigningDate: string | null;
}

export interface PDFInvestigation {
  verdict: string | null;
  verdictLabel: string | null;
  riskLevel: string | null;
  riskLevelLabel: string | null;
  score: number | null;
  notes: string | null;
}

export interface PDFPayment {
  amount: string;
  status: string;
  statusLabel: string;
  method: string | null;
  type: string | null;
  paidBy: string | null;
  date: string;
}

export interface PDFPolicyData {
  // Header
  policyNumber: string;
  internalCode: string | null;
  status: string;
  statusLabel: string;
  generatedAt: string;

  // Core info
  rentAmount: string;
  contractLength: number;
  contractLengthLabel: string;
  guarantorType: string;
  guarantorTypeLabel: string;
  totalPrice: string;
  tenantPercentage: number;
  landlordPercentage: number;

  // Dates
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;

  // Landlord financial
  hasIVA: boolean;
  issuesTaxReceipts: boolean;
  securityDeposit: string | null;
  maintenanceFee: string | null;
  maintenanceIncludedInRent: boolean;
  rentIncreasePercentage: string | null;
  paymentMethod: string | null;

  // Created/Managed by
  createdBy: string | null;
  managedBy: string | null;

  // Related data
  property: PDFProperty | null;
  landlords: PDFLandlord[];
  tenant: PDFTenant | null;
  jointObligors: PDFJointObligor[];
  avals: PDFAval[];
  investigation: PDFInvestigation | null;
  payments: PDFPayment[];
  documents: PDFDocument[];
}
