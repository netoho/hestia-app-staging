/**
 * Shared type definitions for all actor entities
 * Used across Landlord, Tenant, Aval, and Obligor entities
 */

import { NationalityType } from '@prisma/client';

// Address details type
export interface AddressDetails {
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  postalCode: string;
  municipality: string;
  city: string;
  state: string;
  country: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

// Base actor interface shared by all actor types
export interface BaseActorData {
  id?: string;
  isCompany: boolean;
  email: string;
  phone: string;
  workPhone?: string;
  address?: string;
  addressId?: string;
  addressDetails?: AddressDetails;

  // Common optional fields
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  accountHolder?: string;

  // Status fields
  informationComplete?: boolean;
  completedAt?: Date | string;

  // Additional info
  additionalInfo?: string;
}

// Person-specific actor data
export interface PersonActorData extends BaseActorData {
  isCompany: false;
  firstName: string;
  middleName?: string;
  paternalLastName: string;
  maternalLastName: string;
  rfc?: string;
  curp?: string;
  nationality?: NationalityType;
  passport?: string;

  // Employment information
  occupation?: string;
  employerName?: string;
  monthlyIncome?: number;

  // Additional contact
  personalEmail?: string;
  workEmail?: string;
}

// Company-specific actor data
export interface CompanyActorData extends BaseActorData {
  isCompany: true;
  companyName: string;
  companyRfc: string;

  // Legal representative information
  legalRepFirstName: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName: string;
  legalRepMaternalLastName: string;
  legalRepPosition: string;
  legalRepRfc?: string;
  legalRepPhone: string;
  legalRepEmail: string;

  // Additional contact
  workEmail?: string;
}

// Union type for any actor data
export type ActorData = PersonActorData | CompanyActorData;

// Actor entity types
export type ActorType = 'landlord' | 'tenant' | 'aval' | 'obligor';

// Helper type guards
export function isPersonActor(actor: ActorData): actor is PersonActorData {
  return !actor.isCompany;
}

export function isCompanyActor(actor: ActorData): actor is CompanyActorData {
  return actor.isCompany;
}

// Landlord-specific extensions
// Landlord-specific extensions
export interface BaseLandlordData extends BaseActorData {
  policyId: string;
  isPrimary?: boolean;

  // Property management specific
  propertyDeedNumber?: string;
  propertyRegistryFolio?: string;
  requiresCFDI?: boolean;
  cfdiData?: string;

  // Documents
  documents?: ActorDocument[];
}

export interface PersonLandlordData extends BaseLandlordData, PersonActorData {
  isCompany: false;
}

export interface CompanyLandlordData extends BaseLandlordData, CompanyActorData {
  isCompany: true;
}

export type LandlordData = PersonLandlordData | CompanyLandlordData;

// Financial details (now part of Policy, not PropertyDetails)
export interface PolicyFinancialDetails {
  hasIVA?: boolean;
  issuesTaxReceipts?: boolean;
  securityDeposit?: number;
  maintenanceFee?: number;
  maintenanceIncludedInRent?: boolean;
  rentIncreasePercentage?: number;
  paymentMethod?: string;
}

// Property details (specific to landlord)
export interface PropertyDetails {
  // Location
  propertyAddressDetails?: AddressDetails;

  // Parking
  parkingSpaces?: number;
  parkingNumbers?: string;

  // Property characteristics
  isFurnished?: boolean;
  hasPhone?: boolean;
  hasElectricity?: boolean;
  hasWater?: boolean;
  hasGas?: boolean;
  hasCableTV?: boolean;
  hasInternet?: boolean;
  otherServices?: string;
  utilitiesInLandlordName?: boolean;

  // Rules and inventory
  hasInventory?: boolean;
  hasRules?: boolean;
  rulesType?: 'condominios' | 'colonos';
  petsAllowed?: boolean;

  // Important dates
  propertyDeliveryDate?: string;
  contractSigningDate?: string;
  contractSigningLocation?: string;
}

// Form data types for submissions
export type LandlordFormData = LandlordData;

export interface LandlordSubmissionData {
  landlords: LandlordFormData[];
  propertyDetails?: PropertyDetails;
  partial?: boolean;
}

// Response types
export interface ActorResponse {
  success: boolean;
  message?: string;
  actor?: Partial<ActorData>;
  error?: string;
  details?: any[];
}

export interface LandlordResponse extends ActorResponse {
  landlord?: Partial<LandlordData>;
}

// Document type for file uploads
export interface ActorDocument {
  id: string;
  category: string; // Matches Prisma 'category'
  fileName: string;
  filePath: string; // Matches Prisma 'filePath'
  createdAt: Date | string;
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}
