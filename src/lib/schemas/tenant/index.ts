/**
 * Master Tenant Schema
 * Single source of truth for all tenant validation and types
 *
 * This file defines:
 * - All tenant fields with validation rules
 * - Tab-specific schemas for partial validation
 * - Validation modes (strict, partial, admin)
 * - TypeScript type generation
 */

import { z } from 'zod';
import {
  personWithNationalitySchema,
  curpSchema,
  rfcPersonSchema,
  rfcCompanySchema,
} from '../shared/person.schema';
import {
  extendedContactSchema,
} from '../shared/contact.schema';
import {
  addressSchema,
  partialAddressSchema,
} from '../shared/address.schema';
import {
  personalReferenceSchema,
  commercialReferenceSchema,
} from '../shared/references.schema';
import {
  companyWithLegalRepSchema,
} from '../shared/company.schema';

import { emptyStringsToNull } from '@/lib/utils/dataTransform';

/**
 * Tenant Type enum - matches Prisma schema
 */
export const tenantTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);

/**
 * Employment Status enum
 */
export const employmentStatusSchema = z.enum([
  'EMPLOYED',
  'SELF_EMPLOYED',
  'BUSINESS_OWNER',
  'RETIRED',
  'STUDENT',
  'UNEMPLOYED',
  'OTHER',
]);

/**
 * Payment Method enum
 */
export const paymentMethodSchema = z.enum([
  'MENSUAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
  'OTHER',
]);

/**
 * ====================
 * TAB SCHEMAS
 * ====================
 */

/**
 * PERSONAL TAB - Individual Tenant
 */
export const tenantPersonalTabIndividualSchema = personWithNationalitySchema.extend({
  curp: curpSchema,
  rfc: rfcPersonSchema,
  passport: z.string().optional().nullable(),
  ...extendedContactSchema.shape, // Spread contact fields
  // currentAddress: z.string().min(1, 'Dirección actual requerida'),
  addressDetails: partialAddressSchema.optional(),
});

/**
 * PERSONAL TAB - Company Tenant
 */
export const tenantPersonalTabCompanySchema = companyWithLegalRepSchema.extend({
  ...extendedContactSchema.shape, // Company contact fields
  // currentAddress: z.string().min(1, 'Dirección de la empresa requerida'),
  addressDetails: partialAddressSchema.optional(),
});

/**
 * EMPLOYMENT TAB - Individual only
 */
export const tenantEmploymentTabSchema = z.object({
  employmentStatus: employmentStatusSchema,
  occupation: z.string().min(1, 'Ocupación requerida'),
  employerName: z.string().min(1, 'Nombre del empleador requerido'),
  employerAddressDetails: partialAddressSchema.optional(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive('Ingreso mensual debe ser mayor a 0'),
  incomeSource: z.string().optional().nullable(),
  yearsAtJob: z.number().min(0).optional().nullable(),
  hasAdditionalIncome: z.boolean().default(false),
  additionalIncomeSource: z.string().optional().nullable(),
  additionalIncomeAmount: z.number().positive().optional().nullable(),
});

/**
 * RENTAL HISTORY TAB - Optional fields
 */
export const tenantRentalHistoryTabSchema = z.object({
  previousLandlordName: z.string().optional().nullable(),
  previousLandlordPhone: z.string().optional().nullable(),
  previousLandlordEmail: z.string().email().optional().nullable().or(z.literal('')),
  previousRentAmount: z.number().positive().optional().nullable(),
  previousRentalAddressDetails: partialAddressSchema.optional().nullable(),
  rentalHistoryYears: z.number().min(0).optional().nullable(),
  reasonForMoving: z.string().optional().nullable(),
  numberOfOccupants: z.number().positive().optional().nullable(),
  hasPets: z.boolean().default(false),
  petDescription: z.string().optional().nullable(),
});

/**
 * Tenant-specific reference arrays (1-5 references, dynamic)
 */
export const tenantPersonalReferencesArraySchema = z
  .array(personalReferenceSchema)
  .min(1, 'Al menos una referencia personal es requerida')
  .max(5, 'Máximo 5 referencias personales permitidas');

export const tenantCommercialReferencesArraySchema = z
  .array(commercialReferenceSchema)
  .min(1, 'Al menos una referencia comercial es requerida')
  .max(5, 'Máximo 5 referencias comerciales permitidas');

/**
 * REFERENCES TAB - Conditional based on tenant type
 */
export const tenantReferencesTabIndividualSchema = z.object({
  personalReferences: tenantPersonalReferencesArraySchema,
});

export const tenantReferencesTabCompanySchema = z.object({
  commercialReferences: tenantCommercialReferencesArraySchema,
});

/**
 * DOCUMENTS TAB - Additional info only (documents handled separately)
 */
export const tenantDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
  paymentMethod: paymentMethodSchema.optional().nullable(),
  requiresCFDI: z.boolean().default(false),
  cfdiData: z.string().optional().nullable(), // JSON string with fiscal data
});

/**
 * ====================
 * COMPLETE SCHEMAS
 * ====================
 */

/**
 * Complete Individual Tenant Schema
 * Merges all tabs for individual tenants
 */
export const tenantIndividualCompleteSchema = tenantPersonalTabIndividualSchema
  .merge(tenantEmploymentTabSchema)
  .merge(tenantRentalHistoryTabSchema)
  .merge(tenantDocumentsTabSchema)
  .extend({
    tenantType: z.literal('INDIVIDUAL'),
    personalReferences: tenantPersonalReferencesArraySchema.optional(),
  });

/**
 * Complete Company Tenant Schema
 * Merges relevant tabs for company tenants
 */
export const tenantCompanyCompleteSchema = tenantPersonalTabCompanySchema
  .merge(tenantDocumentsTabSchema)
  .extend({
    tenantType: z.literal('COMPANY'),
    commercialReferences: tenantCommercialReferencesArraySchema.optional(),
  });

/**
 * ====================
 * VALIDATION MODES
 * ====================
 */

export type ValidationMode = 'strict' | 'partial' | 'admin';

/**
 * Get schema based on validation mode and tenant type
 */
export function getTenantSchema(
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  mode: ValidationMode = 'strict',
  tabName?: string
): z.ZodSchema {
  // If tab is specified, get only that tab's schema
  if (tabName) {
    const tabSchema = getTenantTabSchema(tenantType, tabName);
    switch (mode) {
      case 'partial':
        return (tabSchema as any).partial();
      case 'admin':
        return (tabSchema as any).partial().passthrough();
      default:
        return tabSchema;
    }
  }

  // Get base schema
  const schema = tenantType === 'COMPANY'
    ? tenantCompanyCompleteSchema
    : tenantIndividualCompleteSchema;

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
export function getTenantTabSchema(
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): z.ZodSchema {
  if (tenantType === 'COMPANY') {
    switch (tabName) {
      case 'personal':
        return tenantPersonalTabCompanySchema;
      case 'references':
        return tenantReferencesTabCompanySchema;
      case 'documents':
        return tenantDocumentsTabSchema;
      default:
        throw new Error(`Invalid tab name for company tenant: ${tabName}`);
    }
  } else {
    switch (tabName) {
      case 'personal':
        return tenantPersonalTabIndividualSchema;
      case 'employment':
        return tenantEmploymentTabSchema;
      case 'rental':
        return tenantRentalHistoryTabSchema;
      case 'references':
        return tenantReferencesTabIndividualSchema;
      case 'documents':
        return tenantDocumentsTabSchema;
      default:
        throw new Error(`Invalid tab name for individual tenant: ${tabName}`);
    }
  }
}

/**
 * ====================
 * VALIDATION FUNCTIONS
 * ====================
 */

/**
 * Validate tenant data with proper mode and tab support
 */
export function validateTenantData(
  data: unknown,
  options: {
    tenantType: 'INDIVIDUAL' | 'COMPANY';
    mode?: ValidationMode;
    tabName?: string;
  }
) {
  const schema = getTenantSchema(options.tenantType, options.mode, options.tabName);
  // return schema.safeParse(emptyStringsToNull(data));
  return schema.safeParse(data);
}

/**
 * ====================
 * TYPE EXPORTS
 * ====================
 */

// Generate TypeScript types from schemas
export type TenantType = z.infer<typeof tenantTypeSchema>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Tab types
export type TenantPersonalIndividual = z.infer<typeof tenantPersonalTabIndividualSchema>;
export type TenantPersonalCompany = z.infer<typeof tenantPersonalTabCompanySchema>;
export type TenantEmployment = z.infer<typeof tenantEmploymentTabSchema>;
export type TenantRentalHistory = z.infer<typeof tenantRentalHistoryTabSchema>;
export type TenantReferencesIndividual = z.infer<typeof tenantReferencesTabIndividualSchema>;
export type TenantReferencesCompany = z.infer<typeof tenantReferencesTabCompanySchema>;
export type TenantDocuments = z.infer<typeof tenantDocumentsTabSchema>;

// Complete types
export type TenantIndividualComplete = z.infer<typeof tenantIndividualCompleteSchema>;
export type TenantCompanyComplete = z.infer<typeof tenantCompanyCompleteSchema>;
export type TenantComplete = TenantIndividualComplete | TenantCompanyComplete;

/**
 * ====================
 * VALIDATION MESSAGES
 * ====================
 */

export const TENANT_VALIDATION_MESSAGES = {
  required: {
    firstName: 'Nombre requerido',
    paternalLastName: 'Apellido paterno requerido',
    email: 'Email requerido',
    phone: 'Teléfono requerido',
    // currentAddress: 'Dirección actual requerida',
    occupation: 'Ocupación requerida',
    employerName: 'Nombre del empleador requerido',
    monthlyIncome: 'Ingreso mensual requerido',
    companyName: 'Razón social requerida',
    companyRfc: 'RFC de la empresa requerido',
    legalRepPosition: 'Cargo del representante requerido',
  },
  invalid: {
    email: 'Formato de email inválido',
    phone: 'Formato de teléfono inválido',
    rfc: 'Formato de RFC inválido',
    curp: 'Formato de CURP inválido',
    monthlyIncome: 'El ingreso debe ser mayor a 0',
  },
};

/**
 * ====================
 * FIELD LISTS BY TAB
 * ====================
 */

export const TENANT_TAB_FIELDS = {
  INDIVIDUAL: {
    personal: [
      'firstName', 'middleName', 'paternalLastName', 'maternalLastName',
      'nationality', 'curp', 'rfc', 'passport',
      'email', 'phone', 'personalEmail', 'workEmail', 'workPhone',
      // 'currentAddress',
      'addressDetails',
    ],
    employment: [
      'employmentStatus', 'occupation', 'employerName', 'employerAddress',
      'employerAddressDetails', 'position', 'monthlyIncome', 'incomeSource',
      'yearsAtJob', 'hasAdditionalIncome', 'additionalIncomeSource',
      'additionalIncomeAmount',
    ],
    rental: [
      'previousLandlordName', 'previousLandlordPhone', 'previousLandlordEmail',
      'previousRentAmount', 'previousRentalAddress', 'previousRentalAddressDetails',
      'rentalHistoryYears', 'reasonForMoving', 'numberOfOccupants',
      'hasPets', 'petDescription',
    ],
    references: ['personalReferences'],
    documents: ['additionalInfo', 'paymentMethod', 'requiresCFDI', 'cfdiData'],
  },
  COMPANY: {
    personal: [
      'companyName', 'companyRfc',
      'legalRepFirstName', 'legalRepMiddleName', 'legalRepPaternalLastName', 'legalRepMaternalLastName', // Legal rep
      'legalRepId', 'legalRepPosition', 'legalRepRfc', 'legalRepPhone', 'legalRepEmail',
      'email', 'phone', 'personalEmail', 'workEmail', 'workPhone',
      // 'currentAddress',
      'addressDetails',
    ],
    references: ['commercialReferences'],
    documents: ['additionalInfo', 'paymentMethod', 'requiresCFDI', 'cfdiData'],
  },
};
