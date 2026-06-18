/**
 * Output schemas for actor.* tRPC procedures.
 *
 * The actor router serves the customer-facing self-service portal — the
 * blast radius of a contract drift here is high (tenant fills out their
 * info on a token-authenticated link). These schemas lock the most-used
 * actor fields per type and tolerate deeper nested includes via
 * `passthrough()`, keeping the file focused without losing the regression-
 * detection guarantee on the columns the frontend renders.
 */

import { z } from 'zod';
import {
  TenantType,
  JointObligorType,
  AvalType,
  NationalityType,
  ActorVerificationStatus,
  EmploymentStatus,
} from '@/prisma/generated/prisma-client/enums';

// ---------------------------------------------------------------------------
// Shared actor fields — present on every actor model (Tenant/Landlord/JO/Aval)
// ---------------------------------------------------------------------------
const ActorBaseShape = z.object({
  id: z.string(),
  policyId: z.string(),
  email: z.string(),
  phone: z.string(),
  firstName: z.string().nullable(),
  middleName: z.string().nullable(),
  paternalLastName: z.string().nullable(),
  maternalLastName: z.string().nullable(),
  companyName: z.string().nullable(),
  rfc: z.string().nullable(),
  accessToken: z.string().nullable(),
  tokenExpiry: z.date().nullable(),
  informationComplete: z.boolean(),
  completedAt: z.date().nullable(),
  verificationStatus: z.nativeEnum(ActorVerificationStatus),
  verifiedAt: z.date().nullable(),
  verifiedBy: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  rejectedAt: z.date().nullable(),
  additionalInfo: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Per-actor-type shapes
// ---------------------------------------------------------------------------

// Tenant is migrated to the hexagonal domain layer (S1). The canonical
// API output now lives in `@/lib/domain/tenant/adapters/api`; this
// file just re-exports it under the legacy name so existing callers
// (router-imports, frontend type-imports) keep working.
export { tenantApiOutput as TenantOutputShape } from '@/lib/domain/tenant/adapters/api';

// Landlord is migrated to the hexagonal domain layer (S2). The canonical
// API output now lives in `@/lib/domain/landlord/adapters/api`; aliased
// here under the legacy name (used locally below + by external callers).
import { landlordApiOutput } from '@/lib/domain/landlord/adapters/api';
export const LandlordOutputShape = landlordApiOutput;

// JointObligor is migrated to the hexagonal domain layer (S4b). The canonical
// API output now lives in `@/lib/domain/joint-obligor/adapters/api`; aliased
// here under the legacy name so existing callers keep working.
import { jointObligorApiOutput } from '@/lib/domain/joint-obligor/adapters/api';
export const JointObligorOutputShape = jointObligorApiOutput;

// Aval is migrated to the hexagonal domain layer (S3). The canonical API
// output now lives in `@/lib/domain/aval/adapters/api`; aliased here under
// the legacy name so existing callers keep working.
import { avalApiOutput } from '@/lib/domain/aval/adapters/api';
export const AvalOutputShape = avalApiOutput;

/**
 * Polymorphic actor — accepted by procedures that take `type` in input and
 * return whatever actor model matches. We keep extras passthrough'd so the
 * frontend can read the per-type fields it knows about.
 */
const PolymorphicActorOutput = z
  .object({
    id: z.string(),
    policyId: z.string(),
    email: z.string(),
    phone: z.string(),
    informationComplete: z.boolean(),
    verificationStatus: z.nativeEnum(ActorVerificationStatus),
    accessToken: z.string().nullable(),
    tokenExpiry: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .passthrough();

// ===========================================================================
// actor.getByToken — { data, policy, authType, canEdit }
// ===========================================================================
export const ActorByTokenOutput = z.object({
  data: PolymorphicActorOutput,
  policy: z.unknown().nullable(),
  authType: z.literal('actor'),
  canEdit: z.boolean(),
});
export type ActorByTokenOutput = z.infer<typeof ActorByTokenOutput>;

// ===========================================================================
// actor.getManyByToken — landlord-only batch
// ===========================================================================
export const ActorGetManyByTokenOutput = z.object({
  data: z.array(LandlordOutputShape.passthrough()),
  policy: z.unknown().nullable(),
  authType: z.literal('actor'),
  canEdit: z.boolean(),
});
export type ActorGetManyByTokenOutput = z.infer<typeof ActorGetManyByTokenOutput>;

// ===========================================================================
// actor.updateSelf / actor.updateByAdmin / actor.update — polymorphic actor
// (the dual-auth `update` may also include { submitted, submissionError }).
// ===========================================================================
export const ActorUpdateOutput = PolymorphicActorOutput;
export type ActorUpdateOutput = z.infer<typeof ActorUpdateOutput>;

export const ActorUpdateDualAuthOutput = PolymorphicActorOutput
  .and(
    z.object({
      submitted: z.boolean().optional(),
      submissionError: z.string().optional(),
    }).passthrough(),
  );
export type ActorUpdateDualAuthOutput = z.infer<typeof ActorUpdateDualAuthOutput>;

// ===========================================================================
// actor.getById / actor.markComplete / actor.submitActor — polymorphic
// ===========================================================================
export const ActorPolymorphicOutput = PolymorphicActorOutput;
export type ActorPolymorphicOutput = z.infer<typeof ActorPolymorphicOutput>;

// ===========================================================================
// actor.adminSubmitActor — adds { submitted: true }
// ===========================================================================
export const ActorAdminSubmitOutput = PolymorphicActorOutput.and(
  z.object({ submitted: z.literal(true) }),
);
export type ActorAdminSubmitOutput = z.infer<typeof ActorAdminSubmitOutput>;

// ===========================================================================
// actor.listByPolicy — array of { type, actor }
// ===========================================================================
export const ActorListByPolicyOutput = z.array(
  z.object({
    type: z.enum(['tenant', 'landlord', 'jointObligor', 'aval']),
    actor: PolymorphicActorOutput,
  }),
);
export type ActorListByPolicyOutput = z.infer<typeof ActorListByPolicyOutput>;

// ===========================================================================
// actor.createBatch — landlord, tenant, jointObligors, avals
// ===========================================================================
export const ActorCreateBatchOutput = z.object({
  landlord: PolymorphicActorOutput.nullable(),
  tenant: PolymorphicActorOutput.nullable(),
  jointObligors: z.array(PolymorphicActorOutput),
  avals: z.array(PolymorphicActorOutput),
});
export type ActorCreateBatchOutput = z.infer<typeof ActorCreateBatchOutput>;

// ===========================================================================
// landlord.saveMultipleLandlords — returns landlords array + policyData patch
// ===========================================================================
export const ActorSaveMultipleLandlordsOutput = z.object({
  landlords: z.array(PolymorphicActorOutput),
  policyData: z.unknown(),
});
export type ActorSaveMultipleLandlordsOutput = z.infer<typeof ActorSaveMultipleLandlordsOutput>;

// ===========================================================================
// landlord.savePropertyDetails — returns the upserted PropertyDetails row
// ===========================================================================
export const ActorSavePropertyDetailsOutput = z
  .object({
    id: z.string(),
    policyId: z.string(),
  })
  .passthrough();
export type ActorSavePropertyDetailsOutput = z.infer<typeof ActorSavePropertyDetailsOutput>;

// ===========================================================================
// landlord.savePolicyFinancial — returns the updated Policy row
// ===========================================================================
export const ActorSavePolicyFinancialOutput = z
  .object({
    id: z.string(),
    policyNumber: z.string(),
  })
  .passthrough();
export type ActorSavePolicyFinancialOutput = z.infer<typeof ActorSavePolicyFinancialOutput>;

// ===========================================================================
// landlord.validateLandlord — { valid: true, data } | { valid: false, errors }
// ===========================================================================
export const ActorValidateLandlordOutput = z.union([
  z.object({
    valid: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    valid: z.literal(false),
    errors: z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ),
  }),
]);
export type ActorValidateLandlordOutput = z.infer<typeof ActorValidateLandlordOutput>;

// ===========================================================================
// landlord.getLandlordsByPolicy — Landlord[]
// ===========================================================================
export const ActorGetLandlordsByPolicyOutput = z.array(LandlordOutputShape.passthrough());
export type ActorGetLandlordsByPolicyOutput = z.infer<typeof ActorGetLandlordsByPolicyOutput>;

// ===========================================================================
// landlord.deleteCoOwner — { success: true }
// ===========================================================================
export const ActorDeleteCoOwnerOutput = z.object({
  success: z.literal(true),
});
export type ActorDeleteCoOwnerOutput = z.infer<typeof ActorDeleteCoOwnerOutput>;
