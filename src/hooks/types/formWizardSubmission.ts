import type { Landlord, Tenant, Aval, JointObligor } from "@/prisma/generated/prisma-client/enums";

/**
 * Supported actor types in the form wizard
 */
export type ActorType = 'tenant' | 'landlord' | 'aval' | 'joint-obligor';

/**
 * Map of what each actor type's getFormData() callback returns
 */
export interface FormDataMap {
  tenant: Partial<Tenant>;
  landlord: {
    landlords: Partial<Landlord>[];
    propertyData?: Record<string, unknown>;
    policyFinancialData?: Record<string, unknown>;
  };
  aval: Partial<Aval>;
  'joint-obligor': Partial<JointObligor>;
}

/**
 * Reference types for actors
 */
export interface PersonalReference {
  fullName: string;
  phone: string;
  email?: string;
  relationship?: string;
}

export interface CommercialReference {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  relationship?: string;
}

/**
 * References structure returned by getReferences callback
 */
export interface ReferencesData {
  personal?: PersonalReference[];
  commercial?: CommercialReference[];
}

/**
 * Additional data that can be passed to save operations
 */
export interface AdditionalData {
  [key: string]: unknown;
}

/**
 * The submission payload structure sent to tRPC
 */
export interface SubmissionPayload {
  // Landlord-specific fields
  landlords?: Partial<Landlord>[];
  propertyData?: Record<string, unknown>;
  policyFinancialData?: Record<string, unknown>;

  // Reference fields
  references?: PersonalReference[];
  commercialReferences?: CommercialReference[];

  // Common fields
  informationComplete?: boolean;
  partial?: boolean;

  // Allow additional fields from the form
  [key: string]: unknown;
}

/**
 * Validation result from validateTab callback
 */
export type ValidationResult = boolean | { valid: boolean; errors?: Record<string, string> };
