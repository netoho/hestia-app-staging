/**
 * Focused Prisma fetch for the contract cover-letter (.docx) generator.
 *
 * Loads only the scalars and relations the cover letter actually renders:
 * actors (landlords/tenant/jointObligors/avals) with their postal address and
 * guarantee-property address, plus the policy's contract terms and the
 * property's address. No documents / payments / activities / investigations /
 * references / employer addresses — the carátula doesn't use them.
 */

import prisma from '@/lib/prisma';

const ACTOR_SCALARS = {
  id: true,
  firstName: true,
  middleName: true,
  paternalLastName: true,
  maternalLastName: true,
  companyName: true,
  companyRfc: true,
  rfc: true,
  curp: true,
  email: true,
  phone: true,
  legalRepFirstName: true,
  legalRepMiddleName: true,
  legalRepPaternalLastName: true,
  legalRepMaternalLastName: true,
  legalRepPosition: true,
  legalRepRfc: true,
  legalRepPhone: true,
  legalRepEmail: true,
} as const;

const GUARANTOR_SCALARS = {
  hasPropertyGuarantee: true,
  propertyDeedNumber: true,
  propertyRegistry: true,
  maritalStatus: true,
  spouseName: true,
  spouseRfc: true,
  spouseCurp: true,
} as const;

export async function getPolicyForCover(id: string) {
  return prisma.policy.findUnique({
    where: { id },
    select: {
      id: true,
      policyNumber: true,
      activatedAt: true,
      expiresAt: true,
      rentAmount: true,
      securityDeposit: true,
      contractLength: true,
      maintenanceFee: true,
      maintenanceIncludedInRent: true,
      paymentMethod: true,
      landlords: {
        select: {
          ...ACTOR_SCALARS,
          isPrimary: true,
          isCompany: true,
          nationality: true,
          bankName: true,
          accountNumber: true,
          clabe: true,
          accountHolder: true,
          addressDetails: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' },
        ],
      },
      tenant: {
        select: {
          ...ACTOR_SCALARS,
          tenantType: true,
          nationality: true,
          addressDetails: true,
        },
      },
      jointObligors: {
        select: {
          ...ACTOR_SCALARS,
          ...GUARANTOR_SCALARS,
          jointObligorType: true,
          nationality: true,
          addressDetails: true,
          guaranteePropertyDetails: true,
        },
      },
      avals: {
        select: {
          ...ACTOR_SCALARS,
          ...GUARANTOR_SCALARS,
          avalType: true,
          nationality: true,
          addressDetails: true,
          guaranteePropertyDetails: true,
        },
      },
      propertyDetails: {
        select: {
          propertyType: true,
          parkingSpaces: true,
          propertyDeliveryDate: true,
          propertyAddressDetails: true,
        },
      },
    },
  });
}

export type PolicyForCover = NonNullable<Awaited<ReturnType<typeof getPolicyForCover>>>;
export type CoverLandlord = PolicyForCover['landlords'][number];
export type CoverTenant = NonNullable<PolicyForCover['tenant']>;
export type CoverJointObligor = PolicyForCover['jointObligors'][number];
export type CoverAval = PolicyForCover['avals'][number];
export type CoverPropertyDetails = NonNullable<PolicyForCover['propertyDetails']>;
