/**
 * Centralized Prisma include for the Aval entity — single source of truth
 * for "what gets loaded with an aval". `AvalService.getIncludes()` returns
 * this; the type flows everywhere via `AvalWithRelations`.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';

export const avalSelect = {
  addressDetails: true,
  employerAddressDetails: true,
  guaranteePropertyDetails: true,
  personalReferences: true,
  commercialReferences: true,
  policy: {
    include: {
      propertyDetails: {
        include: {
          propertyAddressDetails: true,
          contractSigningAddressDetails: true,
        },
      },
    },
  },
} satisfies Prisma.AvalInclude;

export type AvalWithRelations = Prisma.AvalGetPayload<{
  include: typeof avalSelect;
}>;
