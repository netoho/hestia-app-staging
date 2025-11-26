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
import { JointObligorType } from '@prisma/client';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const JOINT_OBLIGOR_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export type JointObligorTypeEnum = typeof JOINT_OBLIGOR_TYPES[number];

export const GUARANTEE_METHODS = ['income', 'property'] as const;
export type GuaranteeMethodEnum = typeof GUARANTEE_METHODS[number];

// Tab names for the Joint Obligor flow
export const JOINT_OBLIGOR_TABS = {
  INDIVIDUAL: ['personal', 'employment', 'guarantee', 'references', 'documents'] as const,
  COMPANY: ['personal', 'guarantee', 'references', 'documents'] as const,
} as const;

export type JointObligorIndividualTab = typeof JOINT_OBLIGOR_TABS.INDIVIDUAL[number];
export type JointObligorCompanyTab = typeof JOINT_OBLIGOR_TABS.COMPANY[number];
export type JointObligorTab = JointObligorIndividualTab | JointObligorCompanyTab;

// ============================================
// TAB SCHEMAS
// ============================================

// Personal Tab Schema (Individual)
const jointObligorPersonalIndividualTabSchema = personWithNationalitySchema
  .merge(extendedContactSchema)
  .extend({
    curp: curpSchema,
    rfc: rfcPersonSchema,

    jointObligorType: z.literal('INDIVIDUAL'),

    // Address (required)
    addressDetails: addressSchema,

    // Relationship to tenant (required for Joint Obligor)
    relationshipToTenant: z.enum([
      'parent',
      'sibling',
      'spouse',
      'friend',
      'business_partner',
      'employer',
      'other',
    ], { message: "Tiene que seleccionar una opción" }),
  });

// Personal Tab Schema (Company)
const jointObligorPersonalCompanyTabSchema = companyWithLegalRepSchema
  .merge(extendedContactSchema)
  .extend({
    jointObligorType: z.literal('COMPANY'),

    // Address (required)
    addressDetails: addressSchema,

    // Relationship to tenant (required for Joint Obligor)
    relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  });

// Employment Tab Schema (Individual only - required for income guarantee)
const jointObligorEmploymentTabSchema = z.object({
  employmentStatus: z.enum([
    'EMPLOYED',
    'SELF_EMPLOYED',
    'BUSINESS_OWNER',
    'RETIRED',
    'OTHER',
    ], { message: "Tiene que seleccionar una opción" }),
  occupation: z.string().min(5, 'La ocupación es requerida'),
  employerName: z.string().optional().nullable(),
  employerAddressDetails: partialAddressSchema.optional(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
  incomeSource: z.string().optional().nullable(),
});

// ============================================
// GUARANTEE TAB SCHEMAS (FLEXIBLE)
// ============================================

// Base guarantee schema with common fields
const guaranteeBaseSchema = z.object({
  guaranteeMethod: z.enum(['income', 'property']),
  hasPropertyGuarantee: z.boolean().optional(),
  hasProperties: z.boolean().optional(),
});

// Income-based guarantee schema
const incomeGuaranteeSchema = guaranteeBaseSchema.extend({
  guaranteeMethod: z.literal('income'),
  hasPropertyGuarantee: z.literal(false).optional(),

  // Bank information (required for income guarantee)
  bankName: z.string().min(1, 'Bank name is required for income guarantee'),
  accountHolder: z.string().min(1, 'Account holder name is required'),

  // Income validation (if not in employment tab)
  monthlyIncome: z.number().positive('Monthly income is required for income guarantee'),

  // Optional property ownership declaration
  hasProperties: z.boolean().optional(),
});

// Property-based guarantee schema
const propertyGuaranteeSchema = guaranteeBaseSchema.extend({
  guaranteeMethod: z.literal('property'),
  hasPropertyGuarantee: z.literal(true).default(true),

  // Property details (required for property guarantee)
  guaranteePropertyDetails: addressSchema,
  propertyValue: z.number().positive('Property value is required'),
  propertyDeedNumber: z.string().min(1, 'Property deed number is required'),
  propertyRegistry: z.string().min(1, 'Property registry folio is required'),

  // Optional property fields
  propertyTaxAccount: z.string().optional().nullable(),
  propertyUnderLegalProceeding: z.boolean().default(false),

  // Marriage information (conditional - required when property is owned by married person)
  maritalStatus: z.enum(['single', 'married_joint', 'married_separate']).optional().nullable(),
  spouseName: z.string().optional().nullable(),
  spouseRfc: z.string().optional().nullable(),
  spouseCurp: z.string().optional().nullable(),
});

// Combined guarantee tab schema using discriminated union
export const jointObligorGuaranteeTabSchema = z.discriminatedUnion('guaranteeMethod', [
  incomeGuaranteeSchema,
  propertyGuaranteeSchema,
]);

// References Tab Schema (Individual - exactly 3 personal references)
const jointObligorReferencesIndividualTabSchema = z.object({
  personalReferences: z.array(personalReferenceSchema)
    .min(3, 'Se requieren exactamente 3 referencias')
    .max(3, 'Se requieren exactamente 3 referencias'),
});

// References Tab Schema (Company - exactly 3 commercial references)
const jointObligorReferencesCompanyTabSchema = z.object({
  commercialReferences: z.array(commercialReferenceSchema)
    .min(3, 'Exactly 3 commercial references are required')
    .max(3, 'Exactly 3 commercial references are required'),
});

// Documents Tab Schema (optional metadata)
const jointObligorDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
});

// ============================================
// COMBINED SCHEMAS BY TYPE & GUARANTEE METHOD
// ============================================

// Base fields for all Joint Obligors
const jointObligorBaseFields = {
  id: z.string().optional(),
  policyId: z.string().optional(),
  actorId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
};

// Complete Individual Joint Obligor with Income Guarantee
export const jointObligorIndividualIncomeCompleteSchema = z.object({
  ...jointObligorBaseFields,
  ...jointObligorPersonalIndividualTabSchema.shape,
  ...jointObligorEmploymentTabSchema.shape,
  ...incomeGuaranteeSchema.shape,
  ...jointObligorReferencesIndividualTabSchema.shape,
  ...jointObligorDocumentsTabSchema.shape,
});

// Complete Individual Joint Obligor with Property Guarantee
export const jointObligorIndividualPropertyCompleteSchema = z.object({
  ...jointObligorBaseFields,
  ...jointObligorPersonalIndividualTabSchema.shape,
  ...jointObligorEmploymentTabSchema.shape,
  ...propertyGuaranteeSchema.shape,
  ...jointObligorReferencesIndividualTabSchema.shape,
  ...jointObligorDocumentsTabSchema.shape,
});

// Complete Company Joint Obligor with Income Guarantee
export const jointObligorCompanyIncomeCompleteSchema = z.object({
  ...jointObligorBaseFields,
  ...jointObligorPersonalCompanyTabSchema.shape,
  ...incomeGuaranteeSchema.shape,
  ...jointObligorReferencesCompanyTabSchema.shape,
  ...jointObligorDocumentsTabSchema.shape,
});

// Complete Company Joint Obligor with Property Guarantee
export const jointObligorCompanyPropertyCompleteSchema = z.object({
  ...jointObligorBaseFields,
  ...jointObligorPersonalCompanyTabSchema.shape,
  ...propertyGuaranteeSchema.shape,
  ...jointObligorReferencesCompanyTabSchema.shape,
  ...jointObligorDocumentsTabSchema.shape,
});

// ============================================
// VALIDATION MODES
// ============================================

// Strict validation (all required fields must be present)
export const jointObligorStrictSchema = z.union([
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
]);

// Partial validation for tab-by-tab saves
export const jointObligorPartialSchema = z.union([
  jointObligorIndividualIncomeCompleteSchema.partial(),
  jointObligorIndividualPropertyCompleteSchema.partial(),
  jointObligorCompanyIncomeCompleteSchema.partial(),
  jointObligorCompanyPropertyCompleteSchema.partial(),
]);

// Admin validation (flexible for staff edits)
export const jointObligorAdminSchema = jointObligorPartialSchema;

// ============================================
// TAB VALIDATION HELPERS
// ============================================

export function getJointObligorTabSchema(
  tab: JointObligorTab,
  jointObligorType: JointObligorTypeEnum,
  guaranteeMethod?: GuaranteeMethodEnum
): z.ZodSchema<any> {
  const isCompany = jointObligorType === 'COMPANY';

  switch (tab) {
    case 'personal':
      return isCompany ? jointObligorPersonalCompanyTabSchema : jointObligorPersonalIndividualTabSchema;

    case 'employment':
      if (isCompany) {
        throw new Error('Employment tab not available for company');
      }
      return jointObligorEmploymentTabSchema;

    case 'guarantee':
      // Return the discriminated union or specific schema based on method
      if (!guaranteeMethod) {
        return jointObligorGuaranteeTabSchema;
      }
      return guaranteeMethod === 'income' ? incomeGuaranteeSchema : propertyGuaranteeSchema;

    case 'references':
      return isCompany ? jointObligorReferencesCompanyTabSchema : jointObligorReferencesIndividualTabSchema;

    case 'documents':
      return jointObligorDocumentsTabSchema;

    default:
      throw new Error(`Unknown tab: ${tab}`);
  }
}

// Validate data for a specific tab
export function validateJointObligorTab(
  tab: JointObligorTab,
  data: any,
  jointObligorType: JointObligorTypeEnum,
  guaranteeMethod?: GuaranteeMethodEnum,
  isPartial: boolean = false
): { success: boolean; errors?: any } {
  try {
    const schema = getJointObligorTabSchema(tab, jointObligorType, guaranteeMethod);
    const validationSchema = isPartial ? schema.partial() : schema;
    const result = validationSchema.safeParse(data);

    if (!result.success) {
      return { success: false, errors: result.error.flatten() };
    }

    return { success: true };
  } catch (error) {
    return { success: false, errors: { _errors: [(error as Error).message] } };
  }
}

// ============================================
// TYPE EXPORTS
// ============================================

export type JointObligorIndividualIncomeComplete = z.infer<typeof jointObligorIndividualIncomeCompleteSchema>;
export type JointObligorIndividualPropertyComplete = z.infer<typeof jointObligorIndividualPropertyCompleteSchema>;
export type JointObligorCompanyIncomeComplete = z.infer<typeof jointObligorCompanyIncomeCompleteSchema>;
export type JointObligorCompanyPropertyComplete = z.infer<typeof jointObligorCompanyPropertyCompleteSchema>;

export type JointObligorComplete =
  | JointObligorIndividualIncomeComplete
  | JointObligorIndividualPropertyComplete
  | JointObligorCompanyIncomeComplete
  | JointObligorCompanyPropertyComplete;

export type JointObligorPartial = Partial<JointObligorComplete>;

// Tab-specific types
export type JointObligorPersonalIndividual = z.infer<typeof jointObligorPersonalIndividualTabSchema>;
export type JointObligorPersonalCompany = z.infer<typeof jointObligorPersonalCompanyTabSchema>;
export type JointObligorEmployment = z.infer<typeof jointObligorEmploymentTabSchema>;
export type JointObligorGuarantee = z.infer<typeof jointObligorGuaranteeTabSchema>;
export type JointObligorReferencesIndividual = z.infer<typeof jointObligorReferencesIndividualTabSchema>;
export type JointObligorReferencesCompany = z.infer<typeof jointObligorReferencesCompanyTabSchema>;
export type JointObligorDocuments = z.infer<typeof jointObligorDocumentsTabSchema>;
