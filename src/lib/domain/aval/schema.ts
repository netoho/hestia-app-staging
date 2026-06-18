/**
 * Canonical Aval domain schema.
 *
 * Single source of truth for the aval entity. The Prisma include
 * (`./select.ts`), the tRPC output schema (`./adapters/api.ts`), the RHF
 * defaults + tab-field lists (`./adapters/form.ts`), and the DB payload
 * builder (`./adapters/db.ts`) all DERIVE from this file.
 *
 * Aval validates the **conditional-required refinement** pattern: the
 * property tab carries a `.refine()` requiring spouse info when married.
 * The refine lives on the *tab* schema (`avalPropertyTabSchema`) and fires
 * during tab validation; the complete/master schemas use the *base*
 * property schema (`avalPropertyTabBaseSchema`) because Zod refinements
 * don't survive object-shape spreads. Both are exported so adapters can
 * pick the right one (tab-level vs aggregate).
 *
 * Pattern recipe → `src/lib/domain/README.md`.
 */

import { z } from 'zod';
import {
  personWithNationalitySchema,
} from '@/lib/schemas/shared/person.schema';
import { extendedContactSchema } from '@/lib/schemas/shared/contact.schema';
import { addressSchema, partialAddressSchema } from '@/lib/schemas/shared/address.schema';
import { companyWithLegalRepSchema } from '@/lib/schemas/shared/company.schema';
import {
  personalReferenceSchema,
  commercialReferenceSchema,
} from '@/lib/schemas/shared/references.schema';

// ---------------------------------------------------------------------------
// Enums + tab names
// ---------------------------------------------------------------------------

export const AVAL_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export type AvalTypeEnum = (typeof AVAL_TYPES)[number];

export const AVAL_TABS = {
  INDIVIDUAL: ['personal', 'employment', 'property', 'references', 'documents'] as const,
  COMPANY: ['personal', 'property', 'references', 'documents'] as const,
} as const;

export type AvalIndividualTab = (typeof AVAL_TABS.INDIVIDUAL)[number];
export type AvalCompanyTab = (typeof AVAL_TABS.COMPANY)[number];
export type AvalTab = AvalIndividualTab | AvalCompanyTab;

// ---------------------------------------------------------------------------
// Tab schemas
// ---------------------------------------------------------------------------

const avalPersonalIndividualTabSchema = personWithNationalitySchema
  .merge(extendedContactSchema)
  .extend({
    avalType: z.literal('INDIVIDUAL'),
    addressDetails: addressSchema,
    relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  });

const avalPersonalCompanyTabSchema = companyWithLegalRepSchema
  .merge(extendedContactSchema)
  .extend({
    avalType: z.literal('COMPANY'),
    addressDetails: addressSchema,
    relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  });

// Individual only — all optional (aval's guarantee is property-based).
const avalEmploymentTabSchema = z.object({
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employerName: z.string().optional().nullable(),
  employerAddressDetails: partialAddressSchema.optional(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
  incomeSource: z.string().optional().nullable(),
});

// Property guarantee is MANDATORY for aval. Base (no refine) so the
// aggregate schemas can spread its shape.
const avalPropertyTabBaseSchema = z.object({
  hasPropertyGuarantee: z.literal(true).default(true),
  guaranteeMethod: z.literal('PROPERTY').default('PROPERTY'),
  guaranteePropertyDetails: addressSchema,
  propertyValue: z.number().positive('Property value is required'),
  propertyDeedNumber: z.string().min(1, 'Property deed number is required'),
  propertyRegistry: z.string().min(1, 'Property registry folio is required'),
  propertyTaxAccount: z.string().optional().nullable(),
  propertyUnderLegalProceeding: z.boolean().default(false),
  // Marriage information — conditionally required (see refine below).
  maritalStatus: z
    .enum(['single', 'married_joint', 'married_separate', 'divorced', 'widowed', 'common_law'])
    .optional()
    .nullable(),
  spouseName: z.string().optional().nullable(),
  spouseRfc: z.string().optional().nullable(),
  spouseCurp: z.string().optional().nullable(),
});

// Tab-level schema WITH the conditional-required refinement. Used for
// tab-by-tab validation; the aggregate schemas use the base above.
const avalPropertyTabSchema = avalPropertyTabBaseSchema.refine(
  (data) => {
    if (data.maritalStatus === 'married_joint' || data.maritalStatus === 'married_separate') {
      return !!data.spouseName;
    }
    return true;
  },
  { message: 'Spouse name is required when married', path: ['spouseName'] },
);

const avalReferencesIndividualTabSchema = z.object({
  personalReferences: z
    .array(personalReferenceSchema)
    .min(3, 'Exactly 3 references are required')
    .max(3, 'Exactly 3 references are required'),
});

const avalReferencesCompanyTabSchema = z.object({
  commercialReferences: z
    .array(commercialReferenceSchema)
    .min(3, 'Exactly 3 commercial references are required')
    .max(3, 'Exactly 3 commercial references are required'),
});

const avalDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
});

export {
  avalPersonalIndividualTabSchema,
  avalPersonalCompanyTabSchema,
  avalEmploymentTabSchema,
  avalPropertyTabBaseSchema,
  avalPropertyTabSchema,
  avalReferencesIndividualTabSchema,
  avalReferencesCompanyTabSchema,
  avalDocumentsTabSchema,
};

// ---------------------------------------------------------------------------
// Complete schemas (built via shape-spread to avoid refine/merge issues)
// ---------------------------------------------------------------------------

export const avalIndividualCompleteSchema = z.object({
  ...avalPersonalIndividualTabSchema.shape,
  ...avalEmploymentTabSchema.shape,
  ...avalPropertyTabBaseSchema.shape,
  ...avalReferencesIndividualTabSchema.shape,
  ...avalDocumentsTabSchema.shape,
});

export const avalCompanyCompleteSchema = z.object({
  ...avalPersonalCompanyTabSchema.shape,
  ...avalPropertyTabBaseSchema.shape,
  ...avalReferencesCompanyTabSchema.shape,
  ...avalDocumentsTabSchema.shape,
});

/** Master canonical schema — discriminated union over `avalType`. */
export const avalMasterSchema = z.discriminatedUnion('avalType', [
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
]);

// ---------------------------------------------------------------------------
// Validation modes
// ---------------------------------------------------------------------------

export const avalStrictSchema = avalMasterSchema;

export const avalPartialSchema = z.discriminatedUnion('avalType', [
  z.object({
    ...avalPersonalIndividualTabSchema.shape,
    ...avalEmploymentTabSchema.partial().shape,
    ...avalPropertyTabBaseSchema.partial().shape,
    ...avalReferencesIndividualTabSchema.partial().shape,
    ...avalDocumentsTabSchema.partial().shape,
  }),
  z.object({
    ...avalPersonalCompanyTabSchema.shape,
    ...avalPropertyTabBaseSchema.partial().shape,
    ...avalReferencesCompanyTabSchema.partial().shape,
    ...avalDocumentsTabSchema.partial().shape,
  }),
]);

export const avalAdminSchema = z.discriminatedUnion('avalType', [
  z
    .object({
      avalType: z.literal('INDIVIDUAL'),
      firstName: z.string().min(1),
      paternalLastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
    })
    .passthrough(),
  z
    .object({
      avalType: z.literal('COMPANY'),
      companyName: z.string().min(1),
      companyRfc: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
    })
    .passthrough(),
]);

// ---------------------------------------------------------------------------
// Tab schema registry + helpers
// ---------------------------------------------------------------------------

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

export function getAvalSchema(mode: 'strict' | 'partial' | 'admin' = 'strict'): z.ZodTypeAny {
  switch (mode) {
    case 'partial':
      return avalPartialSchema;
    case 'admin':
      return avalAdminSchema;
    case 'strict':
    default:
      return avalStrictSchema;
  }
}

export function getAvalTabSchema(avalType: AvalTypeEnum, tab: AvalTab): z.ZodTypeAny {
  const schemas: Record<string, z.ZodTypeAny> = AVAL_TAB_SCHEMAS[avalType];
  return schemas[tab];
}

export function validateAvalData(data: unknown, mode: 'strict' | 'partial' | 'admin' = 'strict') {
  return getAvalSchema(mode).safeParse(data);
}

export function getAvalTabs(avalType: AvalTypeEnum): readonly string[] {
  return AVAL_TABS[avalType];
}

export function isValidAvalTab(avalType: AvalTypeEnum, tab: string): boolean {
  return getAvalTabs(avalType).includes(tab);
}

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type AvalFormData = z.infer<typeof avalMasterSchema>;
export type AvalIndividualData = z.infer<typeof avalIndividualCompleteSchema>;
export type AvalCompanyData = z.infer<typeof avalCompanyCompleteSchema>;

export type AvalPersonalIndividualTabData = z.infer<typeof avalPersonalIndividualTabSchema>;
export type AvalPersonalCompanyTabData = z.infer<typeof avalPersonalCompanyTabSchema>;
export type AvalEmploymentTabData = z.infer<typeof avalEmploymentTabSchema>;
export type AvalPropertyTabData = z.infer<typeof avalPropertyTabSchema>;
export type AvalReferencesIndividualTabData = z.infer<typeof avalReferencesIndividualTabSchema>;
export type AvalReferencesCompanyTabData = z.infer<typeof avalReferencesCompanyTabSchema>;
export type AvalDocumentsTabData = z.infer<typeof avalDocumentsTabSchema>;

export type AvalPersonalTabData = AvalPersonalIndividualTabData | AvalPersonalCompanyTabData;
export type AvalReferencesTabData = AvalReferencesIndividualTabData | AvalReferencesCompanyTabData;
