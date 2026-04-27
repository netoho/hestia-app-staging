/**
 * Output schemas for policy.* tRPC procedures.
 *
 * These schemas describe the **router-returned shape** (post-Result unwrap)
 * and act as the contract between server and frontend. Removing or renaming
 * a field in a service must be reflected here, otherwise the integration test
 * for that procedure fails (and so should the frontend type-check, since the
 * frontend imports these schemas directly).
 *
 * Convention: required fields are required. Extra fields returned by the
 * service are silently stripped by Zod's default object mode — additions are
 * forward-compatible, deletions break tests.
 */

import { z } from 'zod';
import {
  PolicyStatus,
  PolicyCancellationReason,
  GuarantorType,
} from '@/prisma/generated/prisma-client/enums';

// --------------------------------------------------------------------------
// policy.checkNumber
// --------------------------------------------------------------------------
export const PolicyCheckNumberOutput = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
});
export type PolicyCheckNumberOutput = z.infer<typeof PolicyCheckNumberOutput>;

// --------------------------------------------------------------------------
// policy.cancelPolicy
//
// The router throws TRPCError on any service-level failure, so the only
// success-path shape returned to the client is `{ success: true }`.
// --------------------------------------------------------------------------
export const PolicyCancelOutput = z.object({
  success: z.literal(true),
});
export type PolicyCancelOutput = z.infer<typeof PolicyCancelOutput>;

// --------------------------------------------------------------------------
// policy.create
//
// Service returns a Policy with `landlords: Landlord[]` and `tenant: Tenant | null`
// included. Router wraps it as `{ success, policy }`. We declare a shallow
// schema that locks the most-used fields; nested actor/property contracts get
// their own schemas as those routers gain coverage.
// --------------------------------------------------------------------------
const PolicyCreatedLandlord = z.object({
  id: z.string(),
  policyId: z.string(),
  isPrimary: z.boolean(),
  isCompany: z.boolean(),
  email: z.string(),
  phone: z.string(),
});

const PolicyCreatedTenant = z.object({
  id: z.string(),
  policyId: z.string(),
  email: z.string(),
  phone: z.string(),
});

export const PolicyCreatedShape = z.object({
  id: z.string(),
  policyNumber: z.string(),
  internalCode: z.string().nullable(),
  rentAmount: z.number(),
  contractLength: z.number(),
  guarantorType: z.nativeEnum(GuarantorType),
  packageId: z.string().nullable(),
  totalPrice: z.number(),
  tenantPercentage: z.number(),
  landlordPercentage: z.number(),
  status: z.nativeEnum(PolicyStatus),
  createdById: z.string(),
  managedById: z.string().nullable(),
  cancelledAt: z.date().nullable(),
  cancellationReason: z.nativeEnum(PolicyCancellationReason).nullable(),
  cancellationComment: z.string().nullable(),
  cancelledById: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  landlords: z.array(PolicyCreatedLandlord),
  tenant: PolicyCreatedTenant.nullable(),
});

export const PolicyCreateOutput = z.object({
  success: z.literal(true),
  policy: PolicyCreatedShape,
});
export type PolicyCreateOutput = z.infer<typeof PolicyCreateOutput>;
