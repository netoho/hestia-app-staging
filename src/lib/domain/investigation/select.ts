/**
 * Prisma include for ActorInvestigation — the richest common shape (documents +
 * policy + property details), as used by getById/submit. The investigation
 * router uses heterogeneous per-procedure includes inline (it has no service);
 * this is the canonical reference + the WithRelations type.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';

export const investigationSelect = {
  documents: true,
  policy: {
    include: {
      propertyDetails: { include: { propertyAddressDetails: true } },
    },
  },
} satisfies Prisma.ActorInvestigationInclude;

export type InvestigationWithRelations = Prisma.ActorInvestigationGetPayload<{
  include: typeof investigationSelect;
}>;
