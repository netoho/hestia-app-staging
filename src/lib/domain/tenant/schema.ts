/**
 * Canonical Tenant domain schema.
 *
 * This is the single source of truth for the tenant entity. Every other
 * shape that touches "tenant" — the Prisma include, the tRPC output
 * schema, the form defaults, the tab-field constants — DERIVES from
 * this file (see `./select.ts` and `./adapters/{db,api,form}.ts`).
 *
 * Refinements (conditional-required, format checks) live here too. They
 * survive `.pick` / `.omit` because Zod chains them at the property
 * level. Adapters that don't care about a refinement may `.pick` AWAY
 * the refined field.
 *
 * Pattern recipe for porting the next entity → `src/lib/domain/README.md`.
 */

import { z } from 'zod';
import {
  personWithNationalitySchema,
  curpSchema,
  rfcPersonSchema,
} from '@/lib/schemas/shared/person.schema';
import { extendedContactSchema } from '@/lib/schemas/shared/contact.schema';
import { partialAddressSchema } from '@/lib/schemas/shared/address.schema';
import {
  personalReferenceSchema,
  commercialReferenceSchema,
} from '@/lib/schemas/shared/references.schema';
import { companyWithLegalRepSchema } from '@/lib/schemas/shared/company.schema';

// ---------------------------------------------------------------------------
// Enums (mirrors Prisma)
// ---------------------------------------------------------------------------

export const tenantTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);

export const employmentStatusSchema = z.enum([
  'EMPLOYED',
  'SELF_EMPLOYED',
  'BUSINESS_OWNER',
  'RETIRED',
  'STUDENT',
  'UNEMPLOYED',
  'OTHER',
]);

export const paymentMethodSchema = z.enum([
  'MENSUAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
  'OTHER',
]);

// ---------------------------------------------------------------------------
// Tab-level schemas
// ---------------------------------------------------------------------------

export const tenantPersonalTabIndividualSchema = personWithNationalitySchema.extend({
  curp: curpSchema,
  rfc: rfcPersonSchema,
  passport: z.string().optional().nullable(),
  ...extendedContactSchema.shape,
  addressDetails: partialAddressSchema.optional(),
});

export const tenantPersonalTabCompanySchema = companyWithLegalRepSchema.extend({
  ...extendedContactSchema.shape,
  addressDetails: partialAddressSchema.optional(),
});

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
  additionalIncomeAmount: z.number().optional().nullable(),
});

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

export const tenantPersonalReferencesArraySchema = z
  .array(personalReferenceSchema)
  .min(3, 'Se requieren al menos 3 referencias personales')
  .max(5, 'Máximo 5 referencias personales permitidas');

export const tenantCommercialReferencesArraySchema = z
  .array(commercialReferenceSchema)
  .min(3, 'Se requieren al menos 3 referencias comerciales')
  .max(5, 'Máximo 5 referencias comerciales permitidas');

export const tenantReferencesTabIndividualSchema = z.object({
  personalReferences: tenantPersonalReferencesArraySchema,
});

export const tenantReferencesTabCompanySchema = z.object({
  commercialReferences: tenantCommercialReferencesArraySchema,
});

export const tenantDocumentsTabSchema = z.object({
  additionalInfo: z.string().max(1000).optional().nullable(),
  paymentMethod: paymentMethodSchema.optional().nullable(),
  requiresCFDI: z.boolean().default(false),
  cfdiData: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Complete schemas (one per tenant type)
// ---------------------------------------------------------------------------

export const tenantIndividualCompleteSchema = tenantPersonalTabIndividualSchema
  .merge(tenantEmploymentTabSchema)
  .merge(tenantRentalHistoryTabSchema)
  .merge(tenantDocumentsTabSchema)
  .extend({
    tenantType: z.literal('INDIVIDUAL'),
    personalReferences: tenantPersonalReferencesArraySchema.optional(),
  });

export const tenantCompanyCompleteSchema = tenantPersonalTabCompanySchema
  .merge(tenantDocumentsTabSchema)
  .extend({
    tenantType: z.literal('COMPANY'),
    commercialReferences: tenantCommercialReferencesArraySchema.optional(),
  });

/**
 * Master canonical schema — discriminated union over `tenantType`.
 *
 * Adapters consume this for parse + derive: db (toDb), api (.pick), form
 * (defaults + tab fields). Never recreate this shape anywhere else.
 */
export const tenantSchema = z.discriminatedUnion('tenantType', [
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
]);

// ---------------------------------------------------------------------------
// Validation modes + helpers (preserved from src/lib/schemas/tenant for
// backwards compatibility during the migration; adapters should prefer
// the canonical schemas above directly).
// ---------------------------------------------------------------------------

export type ValidationMode = 'strict' | 'partial' | 'admin';

export function getTenantSchema(
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  mode: ValidationMode = 'strict',
  tabName?: string,
): z.ZodTypeAny {
  if (tabName) {
    const tabSchema = getTenantTabSchema(tenantType, tabName);
    if (mode === 'partial') return (tabSchema as z.AnyZodObject).partial();
    if (mode === 'admin') return (tabSchema as z.AnyZodObject).partial().passthrough();
    return tabSchema;
  }

  const schema =
    tenantType === 'COMPANY' ? tenantCompanyCompleteSchema : tenantIndividualCompleteSchema;

  if (mode === 'partial') return schema.partial();
  if (mode === 'admin') return schema.partial().passthrough();
  return schema;
}

export function getTenantTabSchema(
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string,
): z.AnyZodObject {
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
  }

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

export function validateTenantData(
  data: unknown,
  options: {
    tenantType: 'INDIVIDUAL' | 'COMPANY';
    mode?: ValidationMode;
    tabName?: string;
  },
) {
  const schema = getTenantSchema(options.tenantType, options.mode, options.tabName);
  return schema.safeParse(data);
}

// ---------------------------------------------------------------------------
// Type exports (z.infer)
// ---------------------------------------------------------------------------

export type TenantType = z.infer<typeof tenantTypeSchema>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export type TenantPersonalIndividual = z.infer<typeof tenantPersonalTabIndividualSchema>;
export type TenantPersonalCompany = z.infer<typeof tenantPersonalTabCompanySchema>;
export type TenantEmployment = z.infer<typeof tenantEmploymentTabSchema>;
export type TenantRentalHistory = z.infer<typeof tenantRentalHistoryTabSchema>;
export type TenantReferencesIndividual = z.infer<typeof tenantReferencesTabIndividualSchema>;
export type TenantReferencesCompany = z.infer<typeof tenantReferencesTabCompanySchema>;
export type TenantDocuments = z.infer<typeof tenantDocumentsTabSchema>;

export type TenantIndividualComplete = z.infer<typeof tenantIndividualCompleteSchema>;
export type TenantCompanyComplete = z.infer<typeof tenantCompanyCompleteSchema>;
export type TenantComplete = z.infer<typeof tenantSchema>;

// ---------------------------------------------------------------------------
// Validation messages (preserved for callers that consume them today)
// ---------------------------------------------------------------------------

export const TENANT_VALIDATION_MESSAGES = {
  required: {
    firstName: 'Nombre requerido',
    paternalLastName: 'Apellido paterno requerido',
    email: 'Email requerido',
    phone: 'Teléfono requerido',
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
