/**
 * Centralized Prisma includes for the Policy aggregate (S5a Phase B, #133).
 *
 * Single source of truth for "what loads with a policy". Composition rule:
 * the aggregate include composes the per-entity selects — it never invents
 * its own view of an actor's relations.
 *
 * Two tiers:
 *  - `policySelect`      — the FULL aggregate (policy detail page,
 *                          getPolicyById): actors with documents, addresses
 *                          and references, histories, property, activities,
 *                          payment statuses.
 *  - `policySelectList`  — the list/table tier (getPolicies): actors flat,
 *                          property address only, document metadata.
 *
 * `getPolicyForCover` keeps its bespoke narrow select (cover-letter fields
 * only) and migrates in Phase C.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';

const userRefSelect = {
  select: { id: true, email: true, name: true },
} as const;

const completeDocuments = {
  where: { uploadStatus: DocumentUploadStatus.COMPLETE },
} as const;

const historySelect = {
  id: true,
  firstName: true,
  middleName: true,
  paternalLastName: true,
  maternalLastName: true,
  companyName: true,
  email: true,
  phone: true,
  replacedAt: true,
  replacementReason: true,
  verificationStatus: true,
} as const;

export const policySelect = {
  createdBy: userRefSelect,
  managedBy: userRefSelect,
  landlords: {
    include: {
      documents: completeDocuments,
      addressDetails: true,
    },
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  tenants: {
    include: {
      personalReferences: true,
      commercialReferences: true,
      documents: completeDocuments,
      addressDetails: true,
      employerAddressDetails: true,
      previousRentalAddressDetails: true,
    },
    // Display-only ordering (S5b #169): no primary tenant exists — never
    // attach semantics to array position.
    orderBy: { createdAt: 'asc' as const },
  },
  jointObligors: {
    include: {
      personalReferences: true,
      commercialReferences: true,
      documents: completeDocuments,
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
    },
  },
  avals: {
    include: {
      personalReferences: true,
      commercialReferences: true,
      documents: completeDocuments,
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
    },
  },
  tenantHistory: {
    select: { ...historySelect, tenantType: true },
    orderBy: { replacedAt: 'desc' as const },
  },
  jointObligorHistory: {
    select: { ...historySelect, jointObligorType: true },
    orderBy: { replacedAt: 'desc' as const },
  },
  avalHistory: {
    select: { ...historySelect, avalType: true },
    orderBy: { replacedAt: 'desc' as const },
  },
  propertyDetails: {
    include: {
      propertyAddressDetails: true,
      contractSigningAddressDetails: true,
    },
  },
  documents: {
    select: {
      id: true,
      category: true,
      originalName: true,
      fileSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      description: true,
      details: true,
      performedById: true,
      performedByType: true,
      ipAddress: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  payments: {
    select: { id: true, status: true },
  },
} satisfies Prisma.PolicyInclude;

export type PolicyWithRelations = Prisma.PolicyGetPayload<{
  include: typeof policySelect;
}>;

/** List/table tier — what getPolicies loads per row. */
export const policySelectList = {
  createdBy: userRefSelect,
  managedBy: userRefSelect,
  landlords: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  tenants: { orderBy: { createdAt: 'asc' as const } },
  jointObligors: true,
  avals: true,
  propertyDetails: {
    include: { propertyAddressDetails: true },
  },
  documents: {
    select: {
      id: true,
      category: true,
      originalName: true,
      fileSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      description: true,
      details: true,
      performedById: true,
      performedByType: true,
      ipAddress: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
    take: 10, // list tier caps the activity trail
  },
} satisfies Prisma.PolicyInclude;

export type PolicyListRow = Prisma.PolicyGetPayload<{
  include: typeof policySelectList;
}>;
