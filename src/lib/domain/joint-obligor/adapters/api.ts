/**
 * API adapter for the Joint Obligor domain entity. Declares the tRPC output
 * schema (drift-tested against the canonical schema in
 * `__tests__/adapters.test.ts`). Mirrors the polymorphic actor output shape.
 */

import { z } from 'zod';
import {
  ActorVerificationStatus,
  JointObligorType,
  NationalityType,
  GuaranteeMethod,
} from '@/prisma/generated/prisma-client/enums';

export const jointObligorApiOutput = z.object({
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
  // ----- Joint-obligor-specific fields -----
  jointObligorType: z.nativeEnum(JointObligorType).nullable(),
  nationality: z.nativeEnum(NationalityType).nullable(),
  curp: z.string().nullable(),
  passport: z.string().nullable(),
  relationshipToTenant: z.string().nullable(),
  companyRfc: z.string().nullable(),
  guaranteeMethod: z.nativeEnum(GuaranteeMethod).nullable(),
  hasPropertyGuarantee: z.boolean(),
  propertyValue: z.number().nullable(),
  monthlyIncome: z.number().nullable(),
});

export type JointObligorApiOutput = z.infer<typeof jointObligorApiOutput>;

export const jointObligorApiOutputFields = Object.keys(jointObligorApiOutput.shape) as readonly string[];
