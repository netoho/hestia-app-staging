/**
 * Canonical Policy domain schema (S5a, #133).
 *
 * Policy is the AGGREGATE: it composes every actor plus property, payments
 * and lifecycle state. Three deliberate design decisions, each argued on the
 * issue:
 *
 * 1. **`tenants` is an ARRAY from day one** (2026-07-07 grill ruling for
 *    S5b #169): the DB keeps its 1:1 `Tenant.policyId @unique` until S5b's
 *    migration — the db adapter wraps the single row (`row ? [row] : []`).
 *    Consumers become collection-aware in THIS slice so the ~89
 *    `policy.tenant` references are rewritten once, not twice. No primary
 *    tenant exists, ever — no array-position semantics.
 *
 * 2. **Actors compose as lifecycle REFS, not full canonical schemas.** The
 *    per-actor canonical schemas describe COMPLETED actors (required names,
 *    format-refined ids); real rows mid-collection are legitimately blank
 *    and would fail them. What the policy layer actually gates on is
 *    presence + `informationComplete` + verification — Prisma lifecycle
 *    columns that deliberately live OUTSIDE the actor form schemas (same
 *    layering as the api drift allowlists). Full-field validation stays at
 *    the actor slices' own boundaries.
 *
 * 3. **The state machine stays in the service** (pattern E,
 *    `policyWorkflowService.ALLOWED_TRANSITIONS`); this schema is the data
 *    contract per state. Renewal / guarantor-type-change PRECONDITIONS are
 *    formalized here as narrow, parseable guard schemas the services consume.
 *
 * Recipe: src/lib/domain/README.md · Docs: docs/POLICY_STATUS.md
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums (schema-side mirrors of the Prisma enums — the DB is authoritative)
// ---------------------------------------------------------------------------

export const policyStatusSchema = z.enum([
  'COLLECTING_INFO',
  'PENDING_APPROVAL',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
]);
export type PolicyStatusValue = z.infer<typeof policyStatusSchema>;

export const guarantorTypeSchema = z.enum(['NONE', 'JOINT_OBLIGOR', 'AVAL', 'BOTH']);
export type GuarantorTypeValue = z.infer<typeof guarantorTypeSchema>;

export const policyCancellationReasonSchema = z.enum([
  'CLIENT_REQUEST',
  'NON_PAYMENT',
  'FRAUD',
  'DOCUMENTATION_ISSUES',
  'PROPERTY_ISSUES',
  'OTHER',
]);

// ---------------------------------------------------------------------------
// Actor lifecycle refs — what the aggregate knows about its actors
// ---------------------------------------------------------------------------

const actorVerificationSchema = z
  .enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  .optional()
  .nullable();

/** Presence + lifecycle — the fields policy gates actually read. */
const actorRefBase = {
  id: z.string(),
  informationComplete: z.boolean().nullable().default(false),
  verificationStatus: actorVerificationSchema,
  email: z.string().nullable().optional(),
};

export const tenantPolicyRefSchema = z.object({
  ...actorRefBase,
  tenantType: z.enum(['INDIVIDUAL', 'COMPANY']).nullable().optional(),
});

export const landlordPolicyRefSchema = z.object({
  ...actorRefBase,
  isCompany: z.boolean().nullable().optional(),
  /** Legacy flag — a badge, never a behavioral input (#189). */
  isPrimary: z.boolean().nullable().optional(),
});

export const jointObligorPolicyRefSchema = z.object({
  ...actorRefBase,
  jointObligorType: z.enum(['INDIVIDUAL', 'COMPANY']).nullable().optional(),
});

export const avalPolicyRefSchema = z.object({
  ...actorRefBase,
  avalType: z.enum(['INDIVIDUAL', 'COMPANY']).nullable().optional(),
});

/**
 * The actor collections. `tenants` is plural by ruling (see header); every
 * collection is iterated in full — never index 0, never `isPrimary`.
 */
export const policyActorsSchema = z.object({
  tenants: z.array(tenantPolicyRefSchema),
  landlords: z.array(landlordPolicyRefSchema).min(1, 'Al menos un arrendador es requerido'),
  jointObligors: z.array(jointObligorPolicyRefSchema),
  avals: z.array(avalPolicyRefSchema),
});

// ---------------------------------------------------------------------------
// Core scalar schema — mirrors the Policy model's own columns
// ---------------------------------------------------------------------------

export const policyCoreSchema = z.object({
  policyNumber: z.string().min(1),
  internalCode: z.string().nullable().optional(),

  rentAmount: z.number().positive('La renta debe ser mayor a 0'),
  contractLength: z.number().int().positive(),

  guarantorType: guarantorTypeSchema,

  packageId: z.string().nullable().optional(),
  totalPrice: z.number().nonnegative(),
  tenantPercentage: z.number().min(0).max(100).default(100),
  landlordPercentage: z.number().min(0).max(100).default(0),

  // Tenant-side payment/fiscal preferences — POLICY-level by ruling
  // (2026-07-07): one payment → one invoice → one RFC. They do NOT move
  // per-tenant with S5b.
  tenantPaymentMethod: z.string().nullable().optional(),
  tenantRequiresCFDI: z.boolean().default(false),
  tenantCFDIData: z.string().nullable().optional(),

  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  securityDeposit: z.number().nullable().optional(),
  maintenanceFee: z.number().nullable().optional(),
  maintenanceIncludedInRent: z.boolean().default(false),
  rentIncreasePercentage: z.number().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),

  createdById: z.string(),
  managedById: z.string().nullable().optional(),

  submittedAt: z.coerce.date().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  activatedAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  contractStartDate: z.coerce.date().nullable().optional(),
  contractEndDate: z.coerce.date().nullable().optional(),

  reviewNotes: z.string().nullable().optional(),

  cancelledAt: z.coerce.date().nullable().optional(),
  cancellationReason: policyCancellationReasonSchema.nullable().optional(),
  cancellationComment: z.string().nullable().optional(),
  cancelledById: z.string().nullable().optional(),

  renewedToId: z.string().nullable().optional(),
});

/** Percentage split must cover the whole obligation. */
const percentagesSumTo100 = (p: { tenantPercentage: number; landlordPercentage: number }) =>
  Math.abs(p.tenantPercentage + p.landlordPercentage - 100) < 0.001;

/**
 * Declared guarantors must exist once the policy leaves collection.
 * (During COLLECTING_INFO a guarantor-type change may transiently empty a
 * collection — guarantorTypeChange.ts reverts status accordingly.)
 */
const guarantorsMatchType = (p: {
  guarantorType: GuarantorTypeValue;
  jointObligors: unknown[];
  avals: unknown[];
}) => {
  if (p.guarantorType === 'JOINT_OBLIGOR' || p.guarantorType === 'BOTH') {
    if (p.jointObligors.length === 0) return false;
  }
  if (p.guarantorType === 'AVAL' || p.guarantorType === 'BOTH') {
    if (p.avals.length === 0) return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Lifecycle variants — discriminated union over `status`
// ---------------------------------------------------------------------------

const collectingInfoVariant = policyCoreSchema.merge(policyActorsSchema).extend({
  status: z.literal('COLLECTING_INFO'),
});

/** Post-collection: every tenant present AND complete-or-forced (grill: the
 * advance gate is ALL tenants, mirroring the multi-landlord fan-out). */
const allTenantsComplete = (p: { tenants: Array<{ informationComplete: boolean | null }> }) =>
  p.tenants.length >= 1 && p.tenants.every((t) => !!t.informationComplete);

const pendingApprovalVariant = policyCoreSchema.merge(policyActorsSchema).extend({
  status: z.literal('PENDING_APPROVAL'),
});

const activeVariant = policyCoreSchema.merge(policyActorsSchema).extend({
  status: z.literal('ACTIVE'),
  activatedAt: z.coerce.date({ message: 'Una protección ACTIVA requiere activatedAt' }),
  expiresAt: z.coerce.date({ message: 'Una protección ACTIVA requiere expiresAt' }),
});

const expiredVariant = policyCoreSchema.merge(policyActorsSchema).extend({
  status: z.literal('EXPIRED'),
  activatedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});

const cancelledVariant = policyCoreSchema.merge(policyActorsSchema).extend({
  status: z.literal('CANCELLED'),
  cancelledAt: z.coerce.date({ message: 'Una protección CANCELADA requiere cancelledAt' }),
  cancellationReason: policyCancellationReasonSchema,
  // cancellationComment is UX-mandatory today but nullable for legacy rows.
});

/**
 * Master canonical schema — discriminated union over `status`. Adapters
 * consume this for parse + derive; never recreate the shape.
 */
export const policySchema = z
  .discriminatedUnion('status', [
    collectingInfoVariant,
    pendingApprovalVariant,
    activeVariant,
    expiredVariant,
    cancelledVariant,
  ])
  .refine(percentagesSumTo100, {
    message: 'tenantPercentage + landlordPercentage debe sumar 100',
    path: ['tenantPercentage'],
  })
  .refine(
    (p) => (p.status === 'COLLECTING_INFO' || p.status === 'CANCELLED' ? true : guarantorsMatchType(p)),
    {
      message: 'Los garantes declarados por guarantorType deben existir',
      path: ['guarantorType'],
    },
  )
  .refine(
    (p) =>
      p.status === 'PENDING_APPROVAL' || p.status === 'ACTIVE' || p.status === 'EXPIRED'
        ? allTenantsComplete(p)
        : true,
    {
      message: 'Todos los inquilinos deben estar completos para avanzar',
      path: ['tenants'],
    },
  );

export type Policy = z.infer<typeof policySchema>;

// ---------------------------------------------------------------------------
// Operation preconditions — formalized guards the services parse against
// ---------------------------------------------------------------------------

/**
 * Renewal (renewal.ts): source must be ACTIVE or EXPIRED with at least one
 * landlord. `renewedToId` may be set — overwriting an existing renewal is
 * allowed by product decision.
 */
export const policyRenewalPreconditionsSchema = z
  .object({
    status: policyStatusSchema,
    landlords: z.array(z.object({ id: z.string() })).min(1, 'La protección no tiene arrendadores'),
  })
  .refine((p) => p.status === 'ACTIVE' || p.status === 'EXPIRED', {
    message: 'Solo protecciones ACTIVAS o EXPIRADAS pueden renovarse',
    path: ['status'],
  });

/** Guarantor-type change (guarantorTypeChange.ts CHANGEABLE_STATUSES). */
export const guarantorTypeChangePreconditionsSchema = z
  .object({ status: policyStatusSchema })
  .refine((p) => p.status === 'COLLECTING_INFO' || p.status === 'PENDING_APPROVAL', {
    message: 'El tipo de garante solo puede cambiarse antes de la activación',
    path: ['status'],
  });

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type PolicyCore = z.infer<typeof policyCoreSchema>;
export type PolicyActors = z.infer<typeof policyActorsSchema>;
export type TenantPolicyRef = z.infer<typeof tenantPolicyRefSchema>;
export type LandlordPolicyRef = z.infer<typeof landlordPolicyRefSchema>;
