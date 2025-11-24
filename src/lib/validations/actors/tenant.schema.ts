/**
 * Tenant validation schemas
 * Single source of truth for all tenant validation
 */

import { z } from 'zod';
import {
  addressSchema,
  partialAddressSchema,
  baseActorSchema,
  partialBaseActorSchema,
  rfcSchema,
  optionalRfcSchema,
  curpSchema,
  optionalCurpSchema,
  emailSchema,
  optionalEmailSchema,
  phoneSchema,
  moneyAmountSchema,
  optionalMoneyAmountSchema,
} from './base.schema';

// ============================================
// Complete Tenant Schemas
// ============================================

/**
 * Base person tenant schema with all fields
 */
export const tenantPersonSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'El nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'El apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'El apellido materno es requerido'),

  // Contact
  email: emailSchema,
  phone: phoneSchema,
  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,

  // Identification
  nationality: z.string().min(1, 'La nacionalidad es requerida'),
  curp: optionalCurpSchema,
  rfc: optionalRfcSchema,
  dateOfBirth: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),

  // Address
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),

  // Employment Information
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().min(1, 'La ocupación es requerida'),
  position: z.string().optional().nullable(),
  employerName: z.string().min(1, 'El nombre del empleador es requerido'),
  employerPhone: phoneSchema,
  monthlyIncome: moneyAmountSchema,
  yearsAtJob: z.number().int().positive().optional(),
  hasAdditionalIncome: z.boolean().default(false),
  additionalIncomeSource: z.string().optional().nullable(),
  additionalIncomeAmount: optionalMoneyAmountSchema,
  incomeSource: z.string().optional().nullable(),
  employerAddress: z.string().optional().nullable(),
  employerAddressDetails: addressSchema.optional().nullable(),

  // Rental History
  previousAddress: z.string().optional().nullable(),
  previousLandlordName: z.string().optional().nullable(),
  previousLandlordPhone: z.string().optional().nullable(),
  previousLandlordEmail: optionalEmailSchema,
  previousRentAmount: optionalMoneyAmountSchema,
  rentalHistoryYears: z.number().int().nonnegative().optional().nullable(),
  previousRentalAddressDetails: addressSchema.optional().nullable(),
  reasonForMoving: z.string().optional().nullable(),
  numberOfOccupants: z.number().int().positive().optional(),
  hasPets: z.boolean().default(false),
  petDescription: z.string().optional().nullable(),

  // Additional Info
  additionalInfo: z.string().optional().nullable(),

  // Metadata
  isCompany: z.literal(false).default(false),
});

/**
 * Company tenant schema
 */
export const tenantCompanySchema = z.object({
  // Company Information
  companyName: z.string().min(1, 'La razón social es requerida'),
  companyRfc: rfcSchema,
  businessType: z.string().optional().nullable(),

  // Legal Representative
  legalRepFirstName: z.string().min(1, 'El nombre del representante es requerido'),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().min(1, 'El apellido paterno del representante es requerido'),
  legalRepMaternalLastName: z.string().min(1, 'El apellido materno del representante es requerido'),
  legalRepPosition: z.string().min(1, 'El cargo del representante es requerido'),
  legalRepPhone: phoneSchema,
  legalRepEmail: emailSchema,
  legalRepRfc: optionalRfcSchema,
  legalRepCurp: optionalCurpSchema,
  legalRepNationality: z.string().optional().nullable(),

  // Contact
  email: emailSchema,
  phone: phoneSchema,

  // Address
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),

  // Financial
  monthlyIncome: moneyAmountSchema,

  // Additional Info
  additionalInfo: z.string().optional().nullable(),

  // Metadata
  isCompany: z.literal(true).default(true),
});

// ============================================
// Tab-Specific Schemas
// ============================================

/**
 * Personal tab schema (Tab 1)
 */
export const tenantPersonalTabSchema = tenantPersonSchema.pick({
  firstName: true,
  middleName: true,
  paternalLastName: true,
  maternalLastName: true,
  email: true,
  phone: true,
  personalEmail: true,
  workEmail: true,
  nationality: true,
  curp: true,
  rfc: true,
  dateOfBirth: true,
  maritalStatus: true,
  address: true,
  addressDetails: true,
});

export const tenantCompanyPersonalTabSchema = tenantCompanySchema.pick({
  companyName: true,
  companyRfc: true,
  businessType: true,
  legalRepFirstName: true,
  legalRepMiddleName: true,
  legalRepPaternalLastName: true,
  legalRepMaternalLastName: true,
  legalRepPosition: true,
  legalRepPhone: true,
  legalRepEmail: true,
  legalRepRfc: true,
  legalRepCurp: true,
  legalRepNationality: true,
  email: true,
  phone: true,
  address: true,
  addressDetails: true,
});

/**
 * Employment tab schema (Tab 2) - Person only
 */
export const tenantEmploymentTabSchema = tenantPersonSchema.pick({
  employmentStatus: true,
  occupation: true,
  position: true,
  employerName: true,
  employerPhone: true,
  monthlyIncome: true,
  yearsAtJob: true,
  hasAdditionalIncome: true,
  additionalIncomeSource: true,
  additionalIncomeAmount: true,
  incomeSource: true,
  employerAddress: true,
  employerAddressDetails: true,
});

/**
 * Rental history tab schema (Tab 3) - Person only
 */
export const tenantRentalTabSchema = tenantPersonSchema.pick({
  previousAddress: true,
  previousLandlordName: true,
  previousLandlordPhone: true,
  previousLandlordEmail: true,
  previousRentAmount: true,
  rentalHistoryYears: true,
  previousRentalAddressDetails: true,
  reasonForMoving: true,
  numberOfOccupants: true,
  hasPets: true,
  petDescription: true,
});

/**
 * References tab schema (Tab 4)
 * Note: References are handled separately via personalReferences/commercialReferences relations
 */
export const tenantReferencesTabSchema = z.object({
  // References are managed via separate tables
  // This is just for validation that they exist
  hasReferences: z.boolean().optional(),
});

/**
 * Documents tab schema (Tab 5)
 * Note: Documents are handled separately via actorDocument relations
 */
export const tenantDocumentsTabSchema = z.object({
  // Documents are managed via separate table
  // This is just for validation that they exist
  hasRequiredDocuments: z.boolean().optional(),
});

// ============================================
// Partial Schemas (for updates)
// ============================================

export const tenantPersonPartialSchema = tenantPersonSchema.partial();
export const tenantCompanyPartialSchema = tenantCompanySchema.partial();

export const tenantPersonalTabPartialSchema = tenantPersonalTabSchema.partial();
export const tenantCompanyPersonalTabPartialSchema = tenantCompanyPersonalTabSchema.partial();
export const tenantEmploymentTabPartialSchema = tenantEmploymentTabSchema.partial();
export const tenantRentalTabPartialSchema = tenantRentalTabSchema.partial();

// ============================================
// Helper Functions
// ============================================

/**
 * Get the appropriate tab schema for tenant based on tab name and company status
 */
export function getTenantTabSchema(tab: string, isCompany: boolean, isPartial: boolean = true) {
  let schema: z.ZodSchema;

  switch (tab) {
    case 'personal':
      schema = isCompany ? tenantCompanyPersonalTabSchema : tenantPersonalTabSchema;
      break;
    case 'employment':
      // Companies don't have employment tab
      schema = isCompany ? z.object({}) : tenantEmploymentTabSchema;
      break;
    case 'rental':
      // Companies might not have rental history
      schema = isCompany ? z.object({}) : tenantRentalTabSchema;
      break;
    case 'references':
      schema = tenantReferencesTabSchema;
      break;
    case 'documents':
      schema = tenantDocumentsTabSchema;
      break;
    default:
      throw new Error(`Unknown tenant tab: ${tab}`);
  }

  return isPartial ? schema.partial() : schema;
}

/**
 * Get the full tenant schema based on company status
 */
export function getTenantFullSchema(isCompany: boolean) {
  return isCompany ? tenantCompanySchema : tenantPersonSchema;
}

/**
 * Validate tenant completeness (for submission)
 */
export function validateTenantCompleteness(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isCompany = data.isCompany || data.tenantType === 'COMPANY';

  if (!isCompany) {
    // Person validation
    if (!data.firstName) errors.push('Nombre requerido');
    if (!data.paternalLastName) errors.push('Apellido paterno requerido');
    if (!data.maternalLastName) errors.push('Apellido materno requerido');
    if (!data.occupation) errors.push('Ocupación requerida');
    if (!data.employerName) errors.push('Nombre del empleador requerido');
    if (!data.monthlyIncome) errors.push('Ingreso mensual requerido');
  } else {
    // Company validation
    if (!data.companyName) errors.push('Razón social requerida');
    if (!data.companyRfc) errors.push('RFC de empresa requerido');
    if (!data.legalRepFirstName) errors.push('Nombre del representante requerido');
    if (!data.legalRepPaternalLastName) errors.push('Apellido paterno del representante requerido');
    if (!data.legalRepMaternalLastName) errors.push('Apellido materno del representante requerido');
  }

  // Common required fields
  if (!data.email) errors.push('Email requerido');
  if (!data.phone) errors.push('Teléfono requerido');
  if (!data.address) errors.push('Dirección requerida');

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Type Exports
// ============================================

export type TenantPersonData = z.infer<typeof tenantPersonSchema>;
export type TenantCompanyData = z.infer<typeof tenantCompanySchema>;
export type TenantData = TenantPersonData | TenantCompanyData;

export type TenantTab = 'personal' | 'employment' | 'rental' | 'references' | 'documents';