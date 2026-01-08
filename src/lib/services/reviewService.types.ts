/**
 * Review Service Types
 *
 * Client-safe type definitions for the review system.
 * These can be imported by client components without pulling in Prisma.
 */

import type { ActorType, SectionType } from '@/lib/constants/actorSectionConfig';

export type { ActorType, SectionType };

// ============================================================================
// Review Note Types
// ============================================================================

export interface ReviewNoteUser {
  name: string | null;
  email: string | null;
}

export interface ReviewNote {
  id: string;
  policyId: string;
  actorType: string | null;
  actorId: string | null;
  documentId: string | null;
  note: string;
  createdBy: string;
  createdAt: Date;
  createdByUser: ReviewNoteUser;
}

// ============================================================================
// Section Field Types (discriminated union for type safety)
// ============================================================================

export interface PersonalInfoPersonFields {
  fullName: string;
  rfc?: string | null;
  curp?: string | null;
  nationality?: string | null;
  passport?: string | null;
  email?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  workPhone?: string | null;
  workEmail?: string | null;
}

export interface PersonalInfoCompanyFields {
  companyName?: string | null;
  companyRfc?: string | null;
  email?: string | null;
  phone?: string | null;
  workEmail?: string | null;
  workPhone?: string | null;
}

export interface AddressFields {
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  municipality?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface WorkInfoFields {
  employmentStatus?: string | null;
  occupation?: string | null;
  employerName?: string | null;
  position?: string | null;
  monthlyIncome?: number | null;
  incomeSource?: string | null;
  yearsAtJob?: number | null;
  hasAdditionalIncome?: boolean | null;
  additionalIncomeSource?: string | null;
  additionalIncomeAmount?: number | null;
  workEmail?: string | null;
  workPhone?: string | null;
  employerAddress?: AddressFields | null;
}

export interface FinancialInfoFields {
  bankName?: string | null;
  accountNumber?: string | null;
  clabe?: string | null;
  accountHolder?: string | null;
}

export interface CompanyInfoFields {
  legalRepName?: string | null;
  legalRepPosition?: string | null;
  legalRepRfc?: string | null;
  legalRepCurp?: string | null;
  legalRepPhone?: string | null;
  legalRepEmail?: string | null;
}

export interface PersonalReferenceDisplay {
  type: 'Personal';
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

export interface CommercialReferenceDisplay {
  type: 'Comercial';
  companyName?: string | null;
  contactName?: string | null;
  phone?: string | null;
}

export interface ReferencesFields {
  personalReferences: PersonalReferenceDisplay[];
  commercialReferences: CommercialReferenceDisplay[];
}

export interface RentalHistoryFields {
  previousLandlordName?: string | null;
  previousLandlordPhone?: string | null;
  previousLandlordEmail?: string | null;
  previousRentAmount?: number | null;
  rentalHistoryYears?: number | null;
  reasonForMoving?: string | null;
  numberOfOccupants?: number | null;
  hasPets?: boolean | null;
  petDescription?: string | null;
  previousRentalAddress?: AddressFields | null;
}

export interface PropertyGuaranteeFields {
  guaranteeMethod?: string | null;
  hasPropertyGuarantee?: boolean | null;
  propertyValue?: number | null;
  propertyDeedNumber?: string | null;
  propertyRegistryFolio?: string | null;
  propertyOwnershipStatus?: string | null;
  propertyType?: string | null;
  propertyAddress?: AddressFields | null;
}

// Union of all possible field types
export type SectionFields =
  | PersonalInfoPersonFields
  | PersonalInfoCompanyFields
  | WorkInfoFields
  | FinancialInfoFields
  | AddressFields
  | CompanyInfoFields
  | ReferencesFields
  | RentalHistoryFields
  | PropertyGuaranteeFields
  | null;

export interface PolicyReviewData {
  policyId: string;
  policyNumber: string;
  status: string;
  propertyAddress: string;
  rentAmount: number;
  actors: ActorReviewInfo[];
  progress: {
    overall: number;
    totalValidations: number;
    completedValidations: number;
    pendingValidations: number;
    rejectedValidations: number;
  };
  notes: ReviewNote[];
  investigationVerdict: string | null;
}

export interface ActorReviewInfo {
  actorType: ActorType;
  actorId: string;
  name: string;
  email?: string;
  isCompany: boolean;
  monthlyIncome?: number;
  sections: SectionValidationInfo[];
  documents: DocumentValidationInfo[];
  progress: {
    overall: number;
    sectionsApproved: number;
    sectionsTotal: number;
    documentsApproved: number;
    documentsTotal: number;
  };
}

export interface SectionValidationInfo {
  section: SectionType;
  displayName: string;
  status: string;
  validatedBy?: string;
  validatorName?: string;
  validatedAt?: Date;
  rejectionReason?: string;
  fields: SectionFields;
}

export interface DocumentValidationInfo {
  documentId: string;
  fileName: string;
  documentType: string;
  category: string;
  createdAt: Date;
  status: string;
  validatedBy?: string;
  validatorName?: string;
  validatedAt?: Date;
  rejectionReason?: string;
  s3Key?: string;
}
