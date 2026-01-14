/**
 * Master Landlord Schema
 * Single source of truth for all landlord validation and types
 *
 * This file defines:
 * - All landlord fields with validation rules
 * - Tab-specific schemas for partial validation
 * - Validation modes (strict, partial, admin)
 * - Multi-landlord validation
 * - TypeScript type generation
 */

import { z } from 'zod';
import {
  personNameSchema,
  personWithNationalitySchema,
  curpSchema,
  rfcPersonSchema,
  rfcCompanySchema,
} from '../shared/person.schema';
import {
  extendedContactSchema,
  emailSchema,
  phoneSchema,
} from '../shared/contact.schema';
import {
  addressSchema,
  partialAddressSchema,
} from '../shared/address.schema';
import {
  companyBaseSchema,
  legalRepresentativeSchema,
} from '../shared/company.schema';
import {
  bankingSchema,
  partialBankingSchema,
  strictBankingSchema,
} from '../shared/banking.schema';
import {
  propertyDeedSchema,
} from '../shared/property.schema';
import { emptyStringsToNull } from '@/lib/utils/dataTransform';

/**
 * ====================
 * TAB SCHEMAS
 * ====================
 */

/**
 * OWNER INFO TAB - Individual Landlord
 */
export const landlordOwnerInfoIndividualSchema = personNameSchema.extend({
  curp: curpSchema,
  rfc: rfcPersonSchema,
  ...extendedContactSchema.shape,
  // address: z.string().min(1, 'Dirección requerida'),
  addressDetails: partialAddressSchema.optional(),
  isPrimary: z.boolean().default(false),
});

/**
 * OWNER INFO TAB - Company Landlord
 */
export const landlordOwnerInfoCompanySchema = z.object({
  // Company info
  companyName: z.string().min(1, 'Razón social requerida'),
  companyRfc: rfcCompanySchema,

  // Legal representative - prefix fields with legalRep
  legalRepFirstName: z.string().min(1, 'Nombre del representante requerido'),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().min(1, 'Apellido paterno del representante requerido'),
  legalRepMaternalLastName: z.string().optional().nullable(),
  legalRepPosition: z.string().min(1, 'Cargo del representante requerido'),
  legalRepRfc: rfcPersonSchema,
  // legalRepCurp removed - field does not exist in Prisma Landlord model
  legalRepPhone: phoneSchema,
  legalRepEmail: emailSchema,

  // Company contact
  ...extendedContactSchema.shape,
  address: z.string().min(1, 'Dirección requerida'),
  addressDetails: partialAddressSchema.optional(),
  isPrimary: z.boolean().default(false),
});

/**
 * BANK INFO TAB - For primary landlord only
 */
export const landlordBankInfoTabSchema = bankingSchema;

/**
 * PROPERTY INFO TAB
 */
export const landlordPropertyInfoTabSchema = propertyDeedSchema.extend({
  propertyValue: z.number().positive().optional().nullable(),
});

/**
 * FINANCIAL INFO TAB - Additional financial details
 */
export const landlordFinancialInfoTabSchema = z.object({
  requiresCFDI: z.boolean().default(false),
  cfdiData: z.string().optional().nullable(), // JSON string with fiscal data
  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  monthlyIncome: z.number().positive().optional().nullable(),
  hasAdditionalIncome: z.boolean().default(false),
  additionalIncomeSource: z.string().optional().nullable(),
  additionalIncomeAmount: z.number().positive().optional().nullable(),
});

/**
 * DOCUMENTS TAB - Additional info only (documents handled separately)
 */
export const landlordDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
  hasRequiredDocuments: z.boolean().optional(),
});

/**
 * ====================
 * COMPLETE SCHEMAS
 * ====================
 */

/**
 * Complete Individual Landlord Schema
 */
export const landlordIndividualCompleteSchema = landlordOwnerInfoIndividualSchema
  .merge(landlordBankInfoTabSchema)
  .merge(landlordPropertyInfoTabSchema)
  .merge(landlordFinancialInfoTabSchema)
  .merge(landlordDocumentsTabSchema)
  .extend({
    isCompany: z.literal(false),
  });

/**
 * Complete Company Landlord Schema
 */
export const landlordCompanyCompleteSchema = landlordOwnerInfoCompanySchema
  .merge(landlordBankInfoTabSchema)
  .merge(landlordPropertyInfoTabSchema)
  .merge(landlordFinancialInfoTabSchema)
  .merge(landlordDocumentsTabSchema)
  .extend({
    isCompany: z.literal(true),
  });

/**
 * ====================
 * VALIDATION MODES
 * ====================
 */

export type ValidationMode = 'strict' | 'partial' | 'admin';

/**
 * Get schema based on validation mode and landlord type
 */
export function getLandlordSchema(
  isCompany: boolean,
  mode: ValidationMode = 'strict',
  tabName?: string
) {
  // Get base schema
  let schema = isCompany
    ? landlordCompanyCompleteSchema
    : landlordIndividualCompleteSchema;

  // If tab is specified, get only that tab's schema
  if (tabName) {
    schema = getLandlordTabSchema(isCompany, tabName);
  }

  // Apply validation mode
  switch (mode) {
    case 'strict':
      return schema; // All required fields must be present
    case 'partial':
      return schema.partial(); // All fields optional, but validated if present
    case 'admin':
      // Admin mode - very permissive, only validate types
      return schema.partial().passthrough();
    default:
      return schema;
  }
}

/**
 * Get schema for a specific tab
 */
export function getLandlordTabSchema(
  isCompany: boolean,
  tabName: string
): z.ZodSchema {
  switch (tabName) {
    case 'owner-info':
      return isCompany
        ? landlordOwnerInfoCompanySchema
        : landlordOwnerInfoIndividualSchema;
    case 'property-info':
      return landlordPropertyInfoTabSchema;
    case 'financial-info':
      return landlordFinancialInfoTabSchema;
    case 'documents':
      return landlordDocumentsTabSchema;
    default:
      throw new Error(`Invalid tab name for landlord: ${tabName}`);
  }
}

/**
 * ====================
 * MULTI-LANDLORD VALIDATION
 * ====================
 */

/**
 * Discriminated union for landlord type
 */
export const landlordSchema = z.discriminatedUnion('isCompany', [
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
]);

/**
 * Multi-landlord submission schema
 */
export const multiLandlordSchema = z.object({
  landlords: z.array(landlordSchema).min(1, 'Al menos un arrendador es requerido'),
  propertyDetails: z.any().optional(), // Property details handled by PropertyDetailsService
});

/**
 * Validate that only one landlord is marked as primary
 */
export function validatePrimaryLandlord(landlords: any[]): {
  valid: boolean;
  error?: string;
} {
  const primaryCount = landlords.filter(l => l.isPrimary).length;

  if (primaryCount === 0) {
    return {
      valid: false,
      error: 'Debe designar un arrendador principal',
    };
  }

  if (primaryCount > 1) {
    return {
      valid: false,
      error: 'Solo puede haber un arrendador principal',
    };
  }

  return { valid: true };
}

/**
 * ====================
 * VALIDATION FUNCTIONS
 * ====================
 */

/**
 * Validate landlord data with proper mode and tab support
 */
export function validateLandlordData(
  data: unknown,
  options: {
    isCompany: boolean;
    mode?: ValidationMode;
    tabName?: string;
  }
) {
  const schema = getLandlordSchema(options.isCompany, options.mode, options.tabName);
  return schema.safeParse(emptyStringsToNull(data));
}

/**
 * Validate multi-landlord submission
 */
export function validateMultiLandlordSubmission(data: unknown) {
  // First validate the schema
  const schemaResult = multiLandlordSchema.safeParse(emptyStringsToNull(data));

  if (!schemaResult.success) {
    return schemaResult;
  }

  // Then validate business rules
  const primaryValidation = validatePrimaryLandlord(schemaResult.data.landlords);

  if (!primaryValidation.valid) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'custom',
          message: primaryValidation.error,
          path: ['landlords'],
        }],
      },
    };
  }

  return schemaResult;
}

/**
 * Check if landlord data is complete for submission
 */
export function isLandlordComplete(
  data: any,
  isCompany: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate against strict schema
  const validation = validateLandlordData(data, {
    isCompany,
    mode: 'strict',
  });

  if (!validation.success) {
    validation.error.issues.forEach(issue => {
      errors.push(issue.message);
    });
  }

  // Additional business rule checks
  if (data.isPrimary && !data.bankName) {
    errors.push('Información bancaria requerida para arrendador principal');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ====================
 * TYPE EXPORTS
 * ====================
 */

// Tab types
export type LandlordOwnerInfoIndividual = z.infer<typeof landlordOwnerInfoIndividualSchema>;
export type LandlordOwnerInfoCompany = z.infer<typeof landlordOwnerInfoCompanySchema>;
export type LandlordBankInfo = z.infer<typeof landlordBankInfoTabSchema>;
export type LandlordPropertyInfo = z.infer<typeof landlordPropertyInfoTabSchema>;
export type LandlordFinancialInfo = z.infer<typeof landlordFinancialInfoTabSchema>;
export type LandlordDocuments = z.infer<typeof landlordDocumentsTabSchema>;

// Complete types
export type LandlordIndividual = z.infer<typeof landlordIndividualCompleteSchema>;
export type LandlordCompany = z.infer<typeof landlordCompanyCompleteSchema>;
export type Landlord = z.infer<typeof landlordSchema>;
export type MultiLandlordSubmission = z.infer<typeof multiLandlordSchema>;

// Tab names type
export type LandlordTabName = 'owner-info' | 'property-info' | 'financial-info' | 'documents';
