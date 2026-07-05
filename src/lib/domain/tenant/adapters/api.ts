/**
 * API adapter for the Tenant domain entity.
 *
 * Derives the tRPC output schema from a single declaration in this
 * file. The intent: every field the API exposes is declared here, and
 * the schema is the canonical "what does the wire look like" for a
 * tenant. A drift test (`__tests__/api.test.ts`) verifies the field
 * set against the canonical `tenantSchema` to catch divergence.
 *
 * `tenantApiOutput` replaces the hand-curated `TenantOutputShape` in
 * `src/lib/schemas/actor/output.ts`, which now re-exports it.
 *
 * Authoring note: this schema models PRISMA's emitted shape (required
 * where the column is NOT NULL, nullable where it is). The canonical
 * `tenantSchema` models the FORM input shape (most fields
 * `.optional().nullable()` for partial-save tolerance). Both files
 * agree on the field NAME SET — the drift test enforces that.
 */

import { z } from 'zod';
import {
  ActorVerificationStatus,
  TenantType,
  NationalityType,
  EmploymentStatus,
} from '@/prisma/generated/prisma-client/enums';

export const tenantApiOutput = z.object({
  // ----- Shared actor base fields (present on every actor) -----
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
  // ----- Tenant-specific fields -----
  tenantType: z.nativeEnum(TenantType),
  nationality: z.nativeEnum(NationalityType).nullable(),
  curp: z.string().nullable(),
  passport: z.string().nullable(),
  companyRfc: z.string().nullable(),
  legalRepFirstName: z.string().nullable(),
  legalRepPaternalLastName: z.string().nullable(),
  legalRepEmail: z.string().nullable(),
  legalRepPhone: z.string().nullable(),
  workPhone: z.string().nullable(),
  personalEmail: z.string().nullable(),
  workEmail: z.string().nullable(),
  currentAddress: z.string().nullable(),
  addressId: z.string().nullable(),
  employmentStatus: z.nativeEnum(EmploymentStatus).nullable(),
  occupation: z.string().nullable(),
  employerName: z.string().nullable(),
  monthlyIncome: z.number().nullable(),
  paymentMethod: z.string().nullable(),
  requiresCFDI: z.boolean(),
});

export type TenantApiOutput = z.infer<typeof tenantApiOutput>;

/**
 * Field-name allowlist for the drift test in `__tests__/api.test.ts`.
 * Kept in sync with the `z.object({...})` keys above; the test asserts
 * each entry maps to a known field on the canonical schema.
 */
export const tenantApiOutputFields = Object.keys(tenantApiOutput.shape) as readonly string[];
