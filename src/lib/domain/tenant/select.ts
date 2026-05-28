/**
 * Centralized Prisma include for the Tenant entity.
 *
 * This is the single source of truth for "what gets loaded with a
 * tenant". `TenantService.getIncludes()`, every ad-hoc query that loads
 * a tenant with relations, and every service-level transaction that
 * needs the full picture imports `tenantSelect` from here.
 *
 * Adding a new relation? Add it once in this file; every consumer picks
 * it up. Removing one? Same — the type signature flows everywhere via
 * `Prisma.TenantGetPayload<{ include: typeof tenantSelect }>`.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';

export const tenantSelect = {
  addressDetails: true,
  employerAddressDetails: true,
  previousRentalAddressDetails: true,
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
  documents: {
    where: { uploadStatus: DocumentUploadStatus.COMPLETE },
  },
} satisfies Prisma.TenantInclude;

/**
 * Typed Prisma row with all relations loaded by `tenantSelect`. Use
 * this anywhere a service returns the "full" tenant.
 */
export type TenantWithRelations = Prisma.TenantGetPayload<{
  include: typeof tenantSelect;
}>;
