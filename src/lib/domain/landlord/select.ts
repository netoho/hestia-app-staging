/**
 * Centralized Prisma include for the Landlord entity.
 *
 * Single source of truth for "what gets loaded with a landlord".
 * `LandlordService.getIncludes()` and every ad-hoc landlord query import
 * `landlordSelect` from here, so adding/removing a relation is a one-line
 * change that flows everywhere via `LandlordWithRelations`.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';

export const landlordSelect = {
  addressDetails: true,
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
} satisfies Prisma.LandlordInclude;

/**
 * Typed Prisma row with all relations loaded by `landlordSelect`. Use
 * anywhere a service returns the "full" landlord.
 */
export type LandlordWithRelations = Prisma.LandlordGetPayload<{
  include: typeof landlordSelect;
}>;
