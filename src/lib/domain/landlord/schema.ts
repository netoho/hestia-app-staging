/**
 * Canonical Landlord domain schema.
 *
 * Single source of truth for the landlord entity. The Prisma include
 * (`./select.ts`), the tRPC output schema (`./adapters/api.ts`), the RHF
 * defaults + tab-field lists (`./adapters/form.ts`), and the DB payload
 * builder (`./adapters/db.ts`) all DERIVE from this file.
 *
 * Landlord is the **multi-record** entity — one policy can have several
 * landlords (primary + co-owners). The discriminated union over
 * `isCompany` is the per-record shape; `multiLandlordSchema` wraps the
 * array. Business rules that aren't expressible as Zod refinements
 * (exactly-one-primary, completeness) live in the helper functions below,
 * preserved verbatim from `src/lib/schemas/landlord` for backwards compat.
 *
 * Pattern recipe → `src/lib/domain/README.md`.
 */

import { z } from 'zod';
import {
  personWithNationalitySchema,
  curpSchema,
  rfcPersonSchema,
  rfcCompanySchema,
} from '@/lib/schemas/shared/person.schema';
import {
  extendedContactSchema,
  emailSchema,
  phoneSchema,
} from '@/lib/schemas/shared/contact.schema';
import { partialAddressSchema } from '@/lib/schemas/shared/address.schema';
import { bankingSchema } from '@/lib/schemas/shared/banking.schema';
import { propertyDeedSchema } from '@/lib/schemas/shared/property.schema';
import { emptyStringsToNull } from '@/lib/utils/dataTransform';

// ---------------------------------------------------------------------------
// Tab-level schemas
// ---------------------------------------------------------------------------

/** OWNER INFO TAB — Individual landlord */
export const landlordOwnerInfoIndividualSchema = personWithNationalitySchema.extend({
  curp: curpSchema,
  rfc: rfcPersonSchema,
  ...extendedContactSchema.shape,
  addressDetails: partialAddressSchema.optional(),
  isPrimary: z.boolean().default(false),
});

/** OWNER INFO TAB — Company landlord */
export const landlordOwnerInfoCompanySchema = z.object({
  // Company info
  companyName: z.string().min(1, 'Razón social requerida'),
  businessType: z.string().optional().nullable(),
  companyRfc: rfcCompanySchema,

  // Legal representative — fields prefixed with legalRep
  legalRepFirstName: z.string().min(1, 'Nombre del representante requerido'),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().min(1, 'Apellido paterno del representante requerido'),
  legalRepMaternalLastName: z.string().optional().nullable(),
  legalRepPosition: z.string().min(1, 'Cargo del representante requerido'),
  legalRepRfc: rfcPersonSchema,
  legalRepCurp: curpSchema,
  legalRepPhone: phoneSchema,
  legalRepEmail: emailSchema,

  // Company contact
  ...extendedContactSchema.shape,
  // Legacy free-text `address` was REQUIRED here yet no surface rendered a
  // control for it — strict completeness demanded an unfillable field
  // (walker finding, ruled dropped 2026-07-07 on #189). The DB column
  // survives as a Prisma-emitted field (see the api drift allowlist).
  addressDetails: partialAddressSchema.optional(),
  isPrimary: z.boolean().default(false),
});

/** BANK INFO TAB */
export const landlordBankInfoTabSchema = bankingSchema;

/** PROPERTY INFO TAB */
export const landlordPropertyInfoTabSchema = propertyDeedSchema.extend({
  propertyValue: z.number().positive().optional().nullable(),
});

/**
 * FINANCIAL INFO TAB — exactly the three fiscal toggles the form renders.
 * cfdiData, monthlyIncome, hasAdditionalIncome, additionalIncomeSource and
 * additionalIncomeAmount were schema-only surplus (no tab ever rendered
 * them — landlords aren't underwritten; ruled trimmed 2026-07-07 on #189).
 * The DB columns survive as Prisma-emitted fields (api drift allowlist).
 */
export const landlordFinancialInfoTabSchema = z.object({
  requiresCFDI: z.boolean().default(false),
  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
});

/** DOCUMENTS TAB — additional info only (documents handled separately) */
export const landlordDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
  hasRequiredDocuments: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Complete schemas (one per landlord type)
// ---------------------------------------------------------------------------

export const landlordIndividualCompleteSchema = landlordOwnerInfoIndividualSchema
  .merge(landlordBankInfoTabSchema)
  .merge(landlordPropertyInfoTabSchema)
  .merge(landlordFinancialInfoTabSchema)
  .merge(landlordDocumentsTabSchema)
  .extend({
    isCompany: z.literal(false),
  });

export const landlordCompanyCompleteSchema = landlordOwnerInfoCompanySchema
  .merge(landlordBankInfoTabSchema)
  .merge(landlordPropertyInfoTabSchema)
  .merge(landlordFinancialInfoTabSchema)
  .merge(landlordDocumentsTabSchema)
  .extend({
    isCompany: z.literal(true),
  });

/**
 * Master canonical schema — discriminated union over `isCompany`.
 * Adapters consume this for parse + derive. Never recreate this shape.
 */
export const landlordSchema = z.discriminatedUnion('isCompany', [
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
]);

/** Multi-landlord submission — the array variant for co-ownership. */
export const multiLandlordSchema = z.object({
  landlords: z.array(landlordSchema).min(1, 'Al menos un arrendador es requerido'),
  propertyDetails: z.any().optional(), // Property details handled by PropertyDetailsService
});

// ---------------------------------------------------------------------------
// Validation modes + helpers (preserved from src/lib/schemas/landlord for
// backwards compatibility during the migration; adapters should prefer the
// canonical schemas above directly).
// ---------------------------------------------------------------------------

export type ValidationMode = 'strict' | 'partial' | 'admin';

export function getLandlordSchema(
  isCompany: boolean,
  mode: ValidationMode = 'strict',
  tabName?: string,
): z.ZodTypeAny {
  if (tabName) {
    const tabSchema = getLandlordTabSchema(isCompany, tabName) as z.AnyZodObject;
    if (mode === 'partial') return tabSchema.partial();
    if (mode === 'admin') return tabSchema.partial().passthrough();
    return tabSchema;
  }

  const schema = isCompany ? landlordCompanyCompleteSchema : landlordIndividualCompleteSchema;

  if (mode === 'partial') return schema.partial();
  if (mode === 'admin') return schema.partial().passthrough();
  return schema;
}

export function getLandlordTabSchema(isCompany: boolean, tabName: string): z.ZodSchema {
  switch (tabName) {
    case 'owner-info':
      return isCompany ? landlordOwnerInfoCompanySchema : landlordOwnerInfoIndividualSchema;
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

/** Exactly one landlord must be primary. */
export function validatePrimaryLandlord(landlords: Array<{ isPrimary?: boolean }>): {
  valid: boolean;
  error?: string;
} {
  const primaryCount = landlords.filter((l) => l.isPrimary).length;

  if (primaryCount === 0) {
    return { valid: false, error: 'Debe designar un arrendador principal' };
  }
  if (primaryCount > 1) {
    return { valid: false, error: 'Solo puede haber un arrendador principal' };
  }
  return { valid: true };
}

export function validateLandlordData(
  data: unknown,
  options: {
    isCompany: boolean;
    mode?: ValidationMode;
    tabName?: string;
  },
) {
  const schema = getLandlordSchema(options.isCompany, options.mode, options.tabName);
  return schema.safeParse(emptyStringsToNull(data));
}

export function validateMultiLandlordSubmission(data: unknown) {
  const schemaResult = multiLandlordSchema.safeParse(emptyStringsToNull(data));
  if (!schemaResult.success) {
    return schemaResult;
  }

  const primaryValidation = validatePrimaryLandlord(schemaResult.data.landlords);
  if (!primaryValidation.valid) {
    return {
      success: false,
      error: {
        issues: [
          {
            code: 'custom',
            message: primaryValidation.error,
            path: ['landlords'],
          },
        ],
      },
    };
  }

  return schemaResult;
}

export function isLandlordComplete(
  data: unknown,
  isCompany: boolean,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validation = validateLandlordData(data, { isCompany, mode: 'strict' });
  if (!validation.success) {
    validation.error.issues.forEach((issue) => errors.push(issue.message));
  }

  // Banking information is optional for every landlord (primary and co-owners).

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Type exports (z.infer)
// ---------------------------------------------------------------------------

export type LandlordOwnerInfoIndividual = z.infer<typeof landlordOwnerInfoIndividualSchema>;
export type LandlordOwnerInfoCompany = z.infer<typeof landlordOwnerInfoCompanySchema>;
export type LandlordBankInfo = z.infer<typeof landlordBankInfoTabSchema>;
export type LandlordPropertyInfo = z.infer<typeof landlordPropertyInfoTabSchema>;
export type LandlordFinancialInfo = z.infer<typeof landlordFinancialInfoTabSchema>;
export type LandlordDocuments = z.infer<typeof landlordDocumentsTabSchema>;

export type LandlordIndividual = z.infer<typeof landlordIndividualCompleteSchema>;
export type LandlordCompany = z.infer<typeof landlordCompanyCompleteSchema>;
export type Landlord = z.infer<typeof landlordSchema>;
export type MultiLandlordSubmission = z.infer<typeof multiLandlordSchema>;

export type LandlordTabName = 'owner-info' | 'property-info' | 'financial-info' | 'documents';
