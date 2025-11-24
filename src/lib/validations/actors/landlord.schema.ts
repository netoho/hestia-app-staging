/**
 * Landlord validation schemas
 * Single source of truth for all landlord validation
 */

import { z } from 'zod';
import {
  addressSchema,
  partialAddressSchema,
  rfcSchema,
  optionalRfcSchema,
  curpSchema,
  optionalCurpSchema,
  emailSchema,
  optionalEmailSchema,
  phoneSchema,
  moneyAmountSchema,
  optionalMoneyAmountSchema,
  percentageSchema,
  optionalPercentageSchema,
} from './base.schema';

// ============================================
// Complete Landlord Schemas
// ============================================

/**
 * Base person landlord schema with all fields
 */
export const landlordPersonSchema = z.object({
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

  // Bank Information (only for primary landlord)
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable(),
  accountHolder: z.string().optional().nullable(),

  // Property Information
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistryFolio: z.string().optional().nullable(),
  propertyValue: optionalMoneyAmountSchema,
  ownershipPercentage: percentageSchema.default(100),

  // Financial Information (only for primary landlord)
  monthlyIncome: optionalMoneyAmountSchema,
  hasAdditionalIncome: z.boolean().default(false),
  additionalIncomeSource: z.string().optional().nullable(),
  additionalIncomeAmount: optionalMoneyAmountSchema,

  // Additional Info
  additionalInfo: z.string().optional().nullable(),

  // Metadata
  isCompany: z.literal(false).default(false),
  isPrimary: z.boolean().default(false),
});

/**
 * Company landlord schema
 */
export const landlordCompanySchema = z.object({
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
  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,

  // Address
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),

  // Bank Information (only for primary landlord)
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable(),
  accountHolder: z.string().optional().nullable(),

  // Property Information
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistryFolio: z.string().optional().nullable(),
  propertyValue: optionalMoneyAmountSchema,
  ownershipPercentage: percentageSchema.default(100),

  // Financial Information (only for primary landlord)
  monthlyIncome: optionalMoneyAmountSchema,

  // Additional Info
  additionalInfo: z.string().optional().nullable(),

  // Metadata
  isCompany: z.literal(true).default(true),
  isPrimary: z.boolean().default(false),
});

// ============================================
// Tab-Specific Schemas
// ============================================

/**
 * Owner info tab schema (Tab 1)
 */
export const landlordOwnerInfoTabSchema = landlordPersonSchema.pick({
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
  ownershipPercentage: true,
  isPrimary: true,
});

export const landlordCompanyOwnerInfoTabSchema = landlordCompanySchema.pick({
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
  personalEmail: true,
  workEmail: true,
  address: true,
  addressDetails: true,
  ownershipPercentage: true,
  isPrimary: true,
});

/**
 * Bank info tab schema (Tab 2) - Only for primary landlord
 */
export const landlordBankInfoTabSchema = landlordPersonSchema.pick({
  bankName: true,
  accountNumber: true,
  clabe: true,
  accountHolder: true,
});

/**
 * Property info tab schema (Tab 3)
 */
export const landlordPropertyInfoTabSchema = landlordPersonSchema.pick({
  propertyDeedNumber: true,
  propertyRegistryFolio: true,
  propertyValue: true,
});

/**
 * Financial info tab schema (Tab 4) - Only for primary landlord
 */
export const landlordFinancialInfoTabSchema = landlordPersonSchema.pick({
  monthlyIncome: true,
  hasAdditionalIncome: true,
  additionalIncomeSource: true,
  additionalIncomeAmount: true,
});

/**
 * Documents tab schema (Tab 5)
 */
export const landlordDocumentsTabSchema = z.object({
  // Documents are managed via separate table
  hasRequiredDocuments: z.boolean().optional(),
});

// ============================================
// Multi-Landlord Schema (for co-owners)
// ============================================

export const multiLandlordSchema = z.object({
  landlords: z.array(z.union([landlordPersonSchema, landlordCompanySchema])),
  propertyData: z.object({
    propertyDeedNumber: z.string().optional(),
    propertyRegistryFolio: z.string().optional(),
    propertyValue: optionalMoneyAmountSchema,
  }).optional(),
  policyFinancialData: z.object({
    monthlyRent: moneyAmountSchema,
    depositAmount: optionalMoneyAmountSchema,
  }).optional(),
});

// ============================================
// Partial Schemas (for updates)
// ============================================

export const landlordPersonPartialSchema = landlordPersonSchema.partial();
export const landlordCompanyPartialSchema = landlordCompanySchema.partial();

export const landlordOwnerInfoTabPartialSchema = landlordOwnerInfoTabSchema.partial();
export const landlordCompanyOwnerInfoTabPartialSchema = landlordCompanyOwnerInfoTabSchema.partial();
export const landlordBankInfoTabPartialSchema = landlordBankInfoTabSchema.partial();
export const landlordPropertyInfoTabPartialSchema = landlordPropertyInfoTabSchema.partial();
export const landlordFinancialInfoTabPartialSchema = landlordFinancialInfoTabSchema.partial();

// ============================================
// Helper Functions
// ============================================

/**
 * Get the appropriate tab schema for landlord based on tab name
 */
export function getLandlordTabSchema(tab: string, isCompany: boolean, isPartial: boolean = true) {
  let schema: z.ZodSchema;

  switch (tab) {
    case 'owner-info':
      schema = isCompany ? landlordCompanyOwnerInfoTabSchema : landlordOwnerInfoTabSchema;
      break;
    case 'bank-info':
      schema = landlordBankInfoTabSchema;
      break;
    case 'property-info':
      schema = landlordPropertyInfoTabSchema;
      break;
    case 'financial-info':
      schema = landlordFinancialInfoTabSchema;
      break;
    case 'documents':
      schema = landlordDocumentsTabSchema;
      break;
    default:
      throw new Error(`Unknown landlord tab: ${tab}`);
  }

  return isPartial ? schema.partial() : schema;
}

/**
 * Get the full landlord schema based on company status
 */
export function getLandlordFullSchema(isCompany: boolean) {
  return isCompany ? landlordCompanySchema : landlordPersonSchema;
}

/**
 * Validate landlord completeness (for submission)
 */
export function validateLandlordCompleteness(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isCompany = data.isCompany;

  if (!isCompany) {
    // Person validation
    if (!data.firstName) errors.push('Nombre requerido');
    if (!data.paternalLastName) errors.push('Apellido paterno requerido');
    if (!data.maternalLastName) errors.push('Apellido materno requerido');
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

  // Primary landlord specific
  if (data.isPrimary) {
    if (!data.bankName) errors.push('Nombre del banco requerido');
    if (!data.accountNumber) errors.push('Número de cuenta requerido');
    if (!data.clabe) errors.push('CLABE requerida');
    if (!data.accountHolder) errors.push('Titular de cuenta requerido');
  }

  // Property info
  if (!data.propertyDeedNumber) errors.push('Número de escritura requerido');
  if (!data.propertyRegistryFolio) errors.push('Folio de registro requerido');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that ownership percentages add up to 100%
 */
export function validateOwnershipPercentages(landlords: any[]): { valid: boolean; error?: string } {
  const total = landlords.reduce((sum, landlord) => sum + (landlord.ownershipPercentage || 0), 0);

  if (Math.abs(total - 100) > 0.01) {
    return {
      valid: false,
      error: `Los porcentajes de propiedad deben sumar 100% (actual: ${total}%)`,
    };
  }

  return { valid: true };
}

// ============================================
// Type Exports
// ============================================

export type LandlordPersonData = z.infer<typeof landlordPersonSchema>;
export type LandlordCompanyData = z.infer<typeof landlordCompanySchema>;
export type LandlordData = LandlordPersonData | LandlordCompanyData;
export type MultiLandlordData = z.infer<typeof multiLandlordSchema>;

export type LandlordTab = 'owner-info' | 'bank-info' | 'property-info' | 'financial-info' | 'documents';