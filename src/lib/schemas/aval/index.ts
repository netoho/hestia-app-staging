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
  companyBaseSchema,
  legalRepresentativeSchema,
  companyWithLegalRepSchema,
} from '../shared/company.schema';
import {
  personalReferenceSchema,
  commercialReferenceSchema,
} from '../shared/references.schema';
import { optional } from '../helpers';
import { AvalType } from "@/prisma/generated/prisma-client/enums";

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const AVAL_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export type AvalTypeEnum = typeof AVAL_TYPES[number];

// Tab names for the Aval flow
export const AVAL_TABS = {
  INDIVIDUAL: ['personal', 'employment', 'property', 'references', 'documents'] as const,
  COMPANY: ['personal', 'property', 'references', 'documents'] as const,
} as const;

export type AvalIndividualTab = typeof AVAL_TABS.INDIVIDUAL[number];
export type AvalCompanyTab = typeof AVAL_TABS.COMPANY[number];
export type AvalTab = AvalIndividualTab | AvalCompanyTab;

// ============================================
// TAB SCHEMAS
// ============================================

// Personal Tab Schema (Individual)
const avalPersonalIndividualTabSchema = personWithNationalitySchema
  .merge(extendedContactSchema)
  .extend({
    avalType: z.literal('INDIVIDUAL'),

    // Address (required)
    addressDetails: addressSchema,

    // Relationship to tenant (required for Aval)
    relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  });

// Personal Tab Schema (Company)
const avalPersonalCompanyTabSchema = companyWithLegalRepSchema
  .merge(extendedContactSchema)
  .extend({
    avalType: z.literal('COMPANY'),

    // Address (required)
    addressDetails: addressSchema,

    // Relationship to tenant (required for Aval)
    relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  });

// Employment Tab Schema (Individual only - ALL OPTIONAL)
const avalEmploymentTabSchema = z.object({
  // All employment fields are optional for Aval since guarantee is property-based
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employerName: z.string().optional().nullable(),
  employerAddressDetails: partialAddressSchema.optional(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
  incomeSource: z.string().optional().nullable(),
});

// Property Tab Base Schema (without refine for merging)
const avalPropertyTabBaseSchema = z.object({
  // Property guarantee is MANDATORY for Aval
  hasPropertyGuarantee: z.literal(true).default(true),
  guaranteeMethod: z.literal('property').default('property'),

  // Property details (required)
  guaranteePropertyDetails: addressSchema,
  propertyValue: z.number().positive('Property value is required'),
  propertyDeedNumber: z.string().min(1, 'Property deed number is required'),
  propertyRegistry: z.string().min(1, 'Property registry folio is required'),

  // Optional property fields
  propertyTaxAccount: z.string().optional().nullable(),
  propertyUnderLegalProceeding: z.boolean().default(false),

  // Marriage information (conditional - required when property is owned by married person)
  maritalStatus: z.enum(['single', 'married_joint', 'married_separate', 'divorced', 'widowed', 'common_law']).optional().nullable(),
  spouseName: z.string().optional().nullable(),
  spouseRfc: z.string().optional().nullable(),
  spouseCurp: z.string().optional().nullable(),
});

// Property Tab Schema with validation (for use when not merging)
const avalPropertyTabSchema = avalPropertyTabBaseSchema.refine(
  (data) => {
    // If married (joint or separate property), spouse info is required
    if (data.maritalStatus === 'married_joint' || data.maritalStatus === 'married_separate') {
      return !!data.spouseName;
    }
    return true;
  },
  {
    message: 'Spouse name is required when married',
    path: ['spouseName']
  }
);

// References Tab Schema (Individual - exactly 3 personal references)
const avalReferencesIndividualTabSchema = z.object({
  personalReferences: z.array(personalReferenceSchema)
    .min(3, 'Exactly 3 references are required')
    .max(3, 'Exactly 3 references are required'),
});

// References Tab Schema (Company - exactly 3 commercial references)
const avalReferencesCompanyTabSchema = z.object({
  commercialReferences: z.array(commercialReferenceSchema)
    .min(3, 'Exactly 3 commercial references are required')
    .max(3, 'Exactly 3 commercial references are required'),
});

// Documents Tab Schema (optional metadata)
const avalDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
});

// ============================================
// COMBINED SCHEMAS BY TYPE
// ============================================

// Complete Individual Aval Schema - built as single object to avoid merge issues
export const avalIndividualCompleteSchema = z.object({
  // From personal tab
  ...avalPersonalIndividualTabSchema.shape,
  // From employment tab
  ...avalEmploymentTabSchema.shape,
  // From property tab (use base schema to avoid refine issues)
  ...avalPropertyTabBaseSchema.shape,
  // From references tab
  ...avalReferencesIndividualTabSchema.shape,
  // From documents tab
  ...avalDocumentsTabSchema.shape,
});

// Complete Company Aval Schema - built as single object to avoid merge issues
export const avalCompanyCompleteSchema = z.object({
  // From personal tab
  ...avalPersonalCompanyTabSchema.shape,
  // From property tab (use base schema to avoid refine issues)
  ...avalPropertyTabBaseSchema.shape,
  // From references tab
  ...avalReferencesCompanyTabSchema.shape,
  // From documents tab
  ...avalDocumentsTabSchema.shape,
});

// ============================================
// MASTER AVAL SCHEMA (discriminated union)
// ============================================

export const avalMasterSchema = z.discriminatedUnion('avalType', [
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
]);

// ============================================
// VALIDATION MODES
// ============================================

// Strict validation - all required fields must be present
export const avalStrictSchema = avalMasterSchema;

// Partial validation - for tab-by-tab saves
export const avalPartialSchema = z.discriminatedUnion('avalType', [
  z.object({
    // From personal tab (required)
    ...avalPersonalIndividualTabSchema.shape,
    // From other tabs (optional)
    ...avalEmploymentTabSchema.partial().shape,
    ...avalPropertyTabBaseSchema.partial().shape,
    ...avalReferencesIndividualTabSchema.partial().shape,
    ...avalDocumentsTabSchema.partial().shape,
  }),
  z.object({
    // From personal tab (required)
    ...avalPersonalCompanyTabSchema.shape,
    // From other tabs (optional)
    ...avalPropertyTabBaseSchema.partial().shape,
    ...avalReferencesCompanyTabSchema.partial().shape,
    ...avalDocumentsTabSchema.partial().shape,
  }),
]);

// Admin validation - flexible for staff updates
export const avalAdminSchema = z.discriminatedUnion('avalType', [
  z.object({
    avalType: z.literal('INDIVIDUAL'),
    // Minimal required fields for admin
    firstName: z.string().min(1),
    paternalLastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }).passthrough(),
  z.object({
    avalType: z.literal('COMPANY'),
    // Minimal required fields for admin
    companyName: z.string().min(1),
    companyRfc: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }).passthrough(),
]);

// ============================================
// TAB VALIDATION SCHEMAS
// ============================================

export const AVAL_TAB_SCHEMAS = {
  INDIVIDUAL: {
    personal: avalPersonalIndividualTabSchema,
    employment: avalEmploymentTabSchema,
    property: avalPropertyTabSchema,
    references: avalReferencesIndividualTabSchema,
    documents: avalDocumentsTabSchema,
  },
  COMPANY: {
    personal: avalPersonalCompanyTabSchema,
    property: avalPropertyTabSchema,
    references: avalReferencesCompanyTabSchema,
    documents: avalDocumentsTabSchema,
  },
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

export type AvalFormData = z.infer<typeof avalMasterSchema>;
export type AvalIndividualData = z.infer<typeof avalIndividualCompleteSchema>;
export type AvalCompanyData = z.infer<typeof avalCompanyCompleteSchema>;

// Tab data types
export type AvalPersonalIndividualTabData = z.infer<typeof avalPersonalIndividualTabSchema>;
export type AvalPersonalCompanyTabData = z.infer<typeof avalPersonalCompanyTabSchema>;
export type AvalEmploymentTabData = z.infer<typeof avalEmploymentTabSchema>;
export type AvalPropertyTabData = z.infer<typeof avalPropertyTabSchema>;
export type AvalReferencesIndividualTabData = z.infer<typeof avalReferencesIndividualTabSchema>;
export type AvalReferencesCompanyTabData = z.infer<typeof avalReferencesCompanyTabSchema>;
export type AvalDocumentsTabData = z.infer<typeof avalDocumentsTabSchema>;

// Union types for tab data
export type AvalPersonalTabData = AvalPersonalIndividualTabData | AvalPersonalCompanyTabData;
export type AvalReferencesTabData = AvalReferencesIndividualTabData | AvalReferencesCompanyTabData;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the appropriate Aval schema based on validation mode
 */
export function getAvalSchema(mode: 'strict' | 'partial' | 'admin' = 'strict') {
  switch (mode) {
    case 'strict':
      return avalStrictSchema;
    case 'partial':
      return avalPartialSchema;
    case 'admin':
      return avalAdminSchema;
    default:
      return avalStrictSchema;
  }
}

/**
 * Get the schema for a specific tab
 */
export function getAvalTabSchema(
  avalType: AvalTypeEnum,
  tab: AvalTab
): z.ZodSchema<any> {
  const schemas = AVAL_TAB_SCHEMAS[avalType];
  return (schemas as any)[tab];
}

/**
 * Validate Aval data with a specific mode
 */
export function validateAvalData(
  data: unknown,
  mode: 'strict' | 'partial' | 'admin' = 'strict'
) {
  const schema = getAvalSchema(mode);
  return schema.safeParse(data);
}

/**
 * Get available tabs for an Aval type
 */
export function getAvalTabs(avalType: AvalTypeEnum): readonly string[] {
  return AVAL_TABS[avalType];
}

/**
 * Check if a tab is valid for an Aval type
 */
export function isValidAvalTab(avalType: AvalTypeEnum, tab: string): boolean {
  const tabs = getAvalTabs(avalType);
  return tabs.includes(tab as any);
}

// ============================================
// TAB FIELDS CONSTANT
// ============================================

// This will be properly defined in avalTabFields.ts, but export a placeholder here
export const AVAL_TAB_FIELDS = {
  INDIVIDUAL: {
    personal: [
      'avalType', 'firstName', 'middleName', 'paternalLastName', 'maternalLastName',
      'nationality', 'curp', 'rfc', 'passport', 'email', 'phone', 'workPhone',
      'personalEmail', 'workEmail', 'addressDetails', 'relationshipToTenant'
    ],
    employment: [
      'employmentStatus', 'occupation', 'employerName', 'employerAddressDetails',
      'position', 'monthlyIncome', 'incomeSource'
    ],
    property: [
      'hasPropertyGuarantee', 'guaranteeMethod', 'guaranteePropertyDetails',
      'propertyValue', 'propertyDeedNumber', 'propertyRegistry', 'propertyTaxAccount',
      'propertyUnderLegalProceeding', 'maritalStatus', 'spouseName', 'spouseRfc', 'spouseCurp'
    ],
    references: ['personalReferences'],
    documents: ['additionalInfo'],
  },
  COMPANY: {
    personal: [
      'avalType', 'companyName', 'companyRfc', 'legalRepFirstName', 'legalRepMiddleName',
      'legalRepPaternalLastName', 'legalRepMaternalLastName', 'legalRepPosition',
      'legalRepRfc', 'legalRepPhone', 'legalRepEmail', 'email', 'phone',
      'workPhone', 'personalEmail', 'workEmail', 'addressDetails', 'relationshipToTenant'
    ],
    property: [
      'hasPropertyGuarantee', 'guaranteeMethod', 'guaranteePropertyDetails',
      'propertyValue', 'propertyDeedNumber', 'propertyRegistry', 'propertyTaxAccount',
      'propertyUnderLegalProceeding', 'maritalStatus', 'spouseName', 'spouseRfc', 'spouseCurp'
    ],
    references: ['commercialReferences'],
    documents: ['additionalInfo'],
  },
} as const;
