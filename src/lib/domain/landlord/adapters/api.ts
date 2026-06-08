/**
 * API adapter for the Landlord domain entity.
 *
 * Declares the tRPC output schema for a landlord — the canonical "what
 * does the wire look like". A drift test (`__tests__/adapters.test.ts`)
 * verifies the field set against the canonical `landlordSchema`.
 *
 * `landlordApiOutput` replaces the hand-curated `LandlordOutputShape` in
 * `src/lib/schemas/actor/output.ts`, which now re-exports it.
 *
 * Authoring note: this schema models PRISMA's emitted shape (required
 * where the column is NOT NULL, nullable where it is). The canonical
 * `landlordSchema` models the FORM input shape. Both agree on the field
 * NAME SET — the drift test enforces that.
 */

import { z } from 'zod';
import {
  ActorVerificationStatus,
  NationalityType,
} from '@/prisma/generated/prisma-client/enums';

export const landlordApiOutput = z.object({
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
  // ----- Landlord-specific fields -----
  isPrimary: z.boolean(),
  isCompany: z.boolean(),
  nationality: z.nativeEnum(NationalityType).nullable(),
  curp: z.string().nullable(),
  companyRfc: z.string().nullable(),
  businessType: z.string().nullable(),
  legalRepFirstName: z.string().nullable(),
  legalRepPaternalLastName: z.string().nullable(),
  legalRepPosition: z.string().nullable(),
  legalRepEmail: z.string().nullable(),
  legalRepPhone: z.string().nullable(),
  address: z.string(),
  addressId: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  clabe: z.string().nullable(),
  accountHolder: z.string().nullable(),
  occupation: z.string().nullable(),
  monthlyIncome: z.number().nullable(),
  requiresCFDI: z.boolean(),
});

export type LandlordApiOutput = z.infer<typeof landlordApiOutput>;

/**
 * Field-name allowlist for the drift test in `__tests__/adapters.test.ts`.
 */
export const landlordApiOutputFields = Object.keys(landlordApiOutput.shape) as readonly string[];
