/**
 * Centralized Prisma include for the Joint Obligor entity — single source of
 * truth for "what gets loaded with a joint obligor". `JointObligorService`
 * returns this from `getIncludes()`; the type flows everywhere via
 * `JointObligorWithRelations`.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';

export const jointObligorSelect = {
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
} satisfies Prisma.JointObligorInclude;

export type JointObligorWithRelations = Prisma.JointObligorGetPayload<{
  include: typeof jointObligorSelect;
}>;
