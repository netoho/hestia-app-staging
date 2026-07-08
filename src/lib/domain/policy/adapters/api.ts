/**
 * Policy api adapter (S5a Phase C, #133) — the WIRE shape of a policy's own
 * columns, consumed by `src/lib/schemas/policy/output.ts` for every
 * `.output()`-locked policy procedure.
 *
 * Hand-authored for the Prisma-emitted shape (same pattern as the landlord
 * api adapter): Prisma always emits every column, so wire keys are REQUIRED
 * (`.nullable()`, not `.optional()`), dates are `z.date()` instances, and
 * `id/createdAt/updatedAt` exist only here. The drift test pins this
 * BIDIRECTIONALLY to `policyCoreSchema`: a canonical field that misses the
 * wire is the #174 strip class (admin renders false/empty data the portals
 * saved — the parity walker's biggest find); a wire field missing from the
 * canonical is contract fiction.
 */

import { z } from 'zod';
import {
  GuarantorType,
  PolicyStatus,
  PolicyCancellationReason,
} from '@/prisma/generated/prisma-client/enums';

export const policyApiCoreShape = z.object({
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
  tenantPaymentMethod: z.string().nullable(),
  tenantRequiresCFDI: z.boolean(),
  tenantCFDIData: z.string().nullable(),
  hasIVA: z.boolean(),
  issuesTaxReceipts: z.boolean(),
  securityDeposit: z.number().nullable(),
  maintenanceFee: z.number().nullable(),
  maintenanceIncludedInRent: z.boolean(),
  rentIncreasePercentage: z.number().nullable(),
  paymentMethod: z.string().nullable(),
  contractStartDate: z.date().nullable(),
  contractEndDate: z.date().nullable(),
  status: z.nativeEnum(PolicyStatus),
  createdById: z.string(),
  managedById: z.string().nullable(),
  submittedAt: z.date().nullable(),
  approvedAt: z.date().nullable(),
  activatedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  reviewNotes: z.string().nullable(),
  cancelledAt: z.date().nullable(),
  cancellationReason: z.nativeEnum(PolicyCancellationReason).nullable(),
  cancellationComment: z.string().nullable(),
  cancelledById: z.string().nullable(),
  renewedToId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const policyApiCoreFields = Object.keys(policyApiCoreShape.shape);

/** Prisma-emitted columns that deliberately live outside the canonical
 *  schema (row identity + timestamps). */
export const POLICY_PRISMA_EMITTED_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;
