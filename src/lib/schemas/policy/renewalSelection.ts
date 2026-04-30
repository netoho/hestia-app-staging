import { z } from 'zod';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';

/**
 * Checkbox selections a staff/admin makes on the renewal clone selector.
 * Mirrors the section taxonomy in /docs/renewal (see plan). A boolean set
 * to true means "carry over this sub-group from the old policy"; false
 * means "leave blank on the new policy, admin/actor fills fresh".
 *
 * Source-of-truth actor ids (sourceLandlordId, sourceJointObligorIds, etc.)
 * are included so the server can fetch the exact rows to clone without
 * re-querying the whole policy.
 */

const PropertySelection = z.object({
  address: z.boolean().default(true),
  typeAndDescription: z.boolean().default(true),
  features: z.boolean().default(true),
  services: z.boolean().default(true),
});

const PolicyTermsSelection = z.object({
  guarantorType: z.nativeEnum(GuarantorType),
  financial: z.boolean().default(true),
  contract: z.boolean().default(true),
  packageAndPricing: z.boolean().default(true),
});

const LandlordSelection = z.object({
  include: z.boolean().default(true),
  basicInfo: z.boolean().default(true),
  contact: z.boolean().default(true),
  address: z.boolean().default(true),
  banking: z.boolean().default(true),
  propertyDeed: z.boolean().default(true),
  cfdi: z.boolean().default(true),
  documents: z.boolean().default(true),
});

const TenantSelection = z.object({
  include: z.boolean().default(true),
  basicInfo: z.boolean().default(true),
  contact: z.boolean().default(true),
  address: z.boolean().default(true),
  employment: z.boolean().default(true),
  rentalHistory: z.boolean().default(true),
  references: z.boolean().default(true),
  paymentPreferences: z.boolean().default(true),
  documents: z.boolean().default(true),
});

const JointObligorInstanceSelection = z.object({
  sourceId: z.string(),
  include: z.boolean().default(true),
  basicInfo: z.boolean().default(true),
  contact: z.boolean().default(true),
  address: z.boolean().default(true),
  employment: z.boolean().default(true),
  guarantee: z.boolean().default(true),
  marital: z.boolean().default(true),
  references: z.boolean().default(true),
  documents: z.boolean().default(true),
});

const AvalInstanceSelection = z.object({
  sourceId: z.string(),
  include: z.boolean().default(true),
  basicInfo: z.boolean().default(true),
  contact: z.boolean().default(true),
  address: z.boolean().default(true),
  employment: z.boolean().default(true),
  guaranteeProperty: z.boolean().default(true),
  marital: z.boolean().default(true),
  references: z.boolean().default(true),
  documents: z.boolean().default(true),
});

export const PolicyRenewalSelectionSchema = z.object({
  property: PropertySelection,
  policyTerms: PolicyTermsSelection,
  landlord: LandlordSelection,
  tenant: TenantSelection,
  jointObligors: z.array(JointObligorInstanceSelection),
  avals: z.array(AvalInstanceSelection),
});

export type PolicyRenewalSelection = z.infer<typeof PolicyRenewalSelectionSchema>;
export type PropertyRenewalSelection = z.infer<typeof PropertySelection>;
export type PolicyTermsRenewalSelection = z.infer<typeof PolicyTermsSelection>;
export type LandlordRenewalSelection = z.infer<typeof LandlordSelection>;
export type TenantRenewalSelection = z.infer<typeof TenantSelection>;
export type JointObligorRenewalSelection = z.infer<typeof JointObligorInstanceSelection>;
export type AvalRenewalSelection = z.infer<typeof AvalInstanceSelection>;

export const PolicyRenewInputSchema = z.object({
  sourcePolicyId: z.string().min(1),
  selection: PolicyRenewalSelectionSchema,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type PolicyRenewInput = z.infer<typeof PolicyRenewInputSchema>;
