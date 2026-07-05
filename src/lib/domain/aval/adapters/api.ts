/**
 * API adapter for the Aval domain entity. Declares the tRPC output schema
 * (drift-tested against the canonical schema in `__tests__/adapters.test.ts`).
 * `avalApiOutput` replaces the hand-curated `AvalOutputShape` in
 * `src/lib/schemas/actor/output.ts`, which now re-exports it.
 */

import { z } from 'zod';
import { ActorVerificationStatus, AvalType, NationalityType } from '@/prisma/generated/prisma-client/enums';

export const avalApiOutput = z.object({
  // ----- Shared actor base fields -----
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
  // ----- Aval-specific fields -----
  avalType: z.nativeEnum(AvalType),
  nationality: z.nativeEnum(NationalityType).nullable(),
  curp: z.string().nullable(),
  passport: z.string().nullable(),
  relationshipToTenant: z.string().nullable(),
  companyRfc: z.string().nullable(),
  guaranteeMethod: z.string().nullable(),
  hasPropertyGuarantee: z.boolean(),
  propertyValue: z.number().nullable(),
  monthlyIncome: z.number().nullable(),
});

export type AvalApiOutput = z.infer<typeof avalApiOutput>;

export const avalApiOutputFields = Object.keys(avalApiOutput.shape) as readonly string[];
