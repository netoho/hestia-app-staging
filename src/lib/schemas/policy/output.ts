/**
 * Output schemas for policy.* tRPC procedures.
 *
 * These schemas describe the **router-returned shape** (post-Result unwrap)
 * and act as the contract between server and frontend. Removing or renaming
 * a field in a service must be reflected here, otherwise the integration test
 * for that procedure fails (and so should the frontend type-check, since the
 * frontend imports these schemas directly).
 *
 * Convention: required fields are required. Extra fields returned by the
 * service are silently stripped by Zod's default object mode — additions are
 * forward-compatible, deletions break tests. Nested-actor and nested-document
 * shapes start shallow and can be widened as more procedures lock down their
 * contracts.
 */

import { z } from 'zod';
import {
  PolicyStatus,
  PolicyCancellationReason,
  GuarantorType,
  TenantType,
  JointObligorType,
  AvalType,
  PropertyType,
  NationalityType,
  ActorVerificationStatus,
  EmploymentStatus,
} from '@/prisma/generated/prisma-client/enums';

// ===========================================================================
// Shared building blocks
// ===========================================================================

const UserRefShape = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
});

const PropertyAddressShape = z.object({
  id: z.string(),
  street: z.string().nullable(),
  exteriorNumber: z.string().nullable(),
  interiorNumber: z.string().nullable(),
  neighborhood: z.string().nullable(),
  postalCode: z.string().nullable(),
  municipality: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  placeId: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  formattedAddress: z.string().nullable(),
});

const PolicyDocumentSummaryShape = z.object({
  id: z.string(),
  category: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  createdAt: z.date(),
});

const PolicyActivitySummaryShape = z.object({
  id: z.string(),
  action: z.string(),
  description: z.string().nullable(),
  details: z.unknown().nullable(),
  performedById: z.string().nullable(),
  performedByType: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.date(),
});

// Common fields every actor exposes to consumers.
const ActorContactShape = z.object({
  id: z.string(),
  policyId: z.string(),
  email: z.string(),
  phone: z.string(),
  firstName: z.string().nullable(),
  middleName: z.string().nullable(),
  paternalLastName: z.string().nullable(),
  maternalLastName: z.string().nullable(),
  companyName: z.string().nullable(),
  accessToken: z.string().nullable(),
  tokenExpiry: z.date().nullable(),
  informationComplete: z.boolean(),
  verificationStatus: z.nativeEnum(ActorVerificationStatus),
});

const LandlordShape = ActorContactShape.extend({
  isPrimary: z.boolean(),
  isCompany: z.boolean(),
  nationality: z.nativeEnum(NationalityType).nullable(),
  rfc: z.string().nullable(),
});

const TenantShape = ActorContactShape.extend({
  tenantType: z.nativeEnum(TenantType),
  nationality: z.nativeEnum(NationalityType).nullable(),
  rfc: z.string().nullable(),
});

const JointObligorShape = ActorContactShape.extend({
  jointObligorType: z.nativeEnum(JointObligorType).nullable(),
  nationality: z.nativeEnum(NationalityType).nullable(),
  rfc: z.string().nullable(),
});

const AvalShape = ActorContactShape.extend({
  avalType: z.nativeEnum(AvalType),
  nationality: z.nativeEnum(NationalityType).nullable(),
  rfc: z.string().nullable(),
});

const PropertyDetailsShape = z.object({
  id: z.string(),
  policyId: z.string(),
  propertyType: z.nativeEnum(PropertyType).nullable(),
  propertyDescription: z.string().nullable(),
  propertyAddressDetails: PropertyAddressShape.nullable(),
});

// Top-level Policy fields (no relations).
const PolicyTopLevelShape = z.object({
  id: z.string(),
  policyNumber: z.string(),
  internalCode: z.string().nullable(),
  rentAmount: z.number(),
  contractLength: z.number(),
  guarantorType: z.nativeEnum(GuarantorType),
  packageId: z.string().nullable(),
  totalPrice: z.number(),
  tenantPercentage: z.number(),
  landlordPercentage: z.number(),
  status: z.nativeEnum(PolicyStatus),
  createdById: z.string(),
  managedById: z.string().nullable(),
  submittedAt: z.date().nullable(),
  approvedAt: z.date().nullable(),
  activatedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  reviewNotes: z.string().nullable(),
  cancelledAt: z.date().nullable(),
  cancellationReason: z.nativeEnum(PolicyCancellationReason).nullable(),
  cancellationComment: z.string().nullable(),
  cancelledById: z.string().nullable(),
  renewedToId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ===========================================================================
// policy.checkNumber
// ===========================================================================
export const PolicyCheckNumberOutput = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
});
export type PolicyCheckNumberOutput = z.infer<typeof PolicyCheckNumberOutput>;

// ===========================================================================
// policy.cancelPolicy
// The router throws TRPCError on failure, so client-success path is always success=true.
// ===========================================================================
export const PolicyCancelOutput = z.object({
  success: z.literal(true),
});
export type PolicyCancelOutput = z.infer<typeof PolicyCancelOutput>;

// ===========================================================================
// policy.create
// ===========================================================================
const PolicyCreatedLandlord = z.object({
  id: z.string(),
  policyId: z.string(),
  isPrimary: z.boolean(),
  isCompany: z.boolean(),
  email: z.string(),
  phone: z.string(),
});

const PolicyCreatedTenant = z.object({
  id: z.string(),
  policyId: z.string(),
  email: z.string(),
  phone: z.string(),
});

export const PolicyCreatedShape = PolicyTopLevelShape.extend({
  landlords: z.array(PolicyCreatedLandlord),
  tenant: PolicyCreatedTenant.nullable(),
});

export const PolicyCreateOutput = z.object({
  success: z.literal(true),
  policy: PolicyCreatedShape,
});
export type PolicyCreateOutput = z.infer<typeof PolicyCreateOutput>;

// ===========================================================================
// policy.list
// Paginated listing with the same nested-actor surface getById uses (without
// the deep references/documents/employer-address sub-relations).
// ===========================================================================
const PolicyListItemShape = PolicyTopLevelShape.extend({
  createdBy: UserRefShape,
  managedBy: UserRefShape.nullable(),
  landlords: z.array(LandlordShape),
  tenant: TenantShape.nullable(),
  jointObligors: z.array(JointObligorShape),
  avals: z.array(AvalShape),
  propertyDetails: PropertyDetailsShape.nullable(),
  documents: z.array(PolicyDocumentSummaryShape),
  activities: z.array(PolicyActivitySummaryShape),
});

export const PolicyListOutput = z.object({
  policies: z.array(PolicyListItemShape),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type PolicyListOutput = z.infer<typeof PolicyListOutput>;

// ===========================================================================
// policy.getById
// Adds allActorsComplete and optional progress; deeper actor relations like
// references, documents, employer/previous addresses are tolerated as
// passthrough until they get their own router coverage.
// ===========================================================================
const PolicyGetByIdLandlord = LandlordShape.extend({
  documents: z.array(z.object({ id: z.string() }).passthrough()),
  addressDetails: PropertyAddressShape.nullable(),
});

const PolicyGetByIdTenant = TenantShape.extend({
  personalReferences: z.array(z.object({ id: z.string() }).passthrough()),
  commercialReferences: z.array(z.object({ id: z.string() }).passthrough()),
  documents: z.array(z.object({ id: z.string() }).passthrough()),
  addressDetails: PropertyAddressShape.nullable(),
  employerAddressDetails: PropertyAddressShape.nullable(),
  previousRentalAddressDetails: PropertyAddressShape.nullable(),
  employmentStatus: z.nativeEnum(EmploymentStatus).nullable(),
});

const PolicyGetByIdJointObligor = JointObligorShape.extend({
  personalReferences: z.array(z.object({ id: z.string() }).passthrough()),
  commercialReferences: z.array(z.object({ id: z.string() }).passthrough()),
  documents: z.array(z.object({ id: z.string() }).passthrough()),
  addressDetails: PropertyAddressShape.nullable(),
  employerAddressDetails: PropertyAddressShape.nullable(),
  guaranteePropertyDetails: PropertyAddressShape.nullable(),
});

const PolicyGetByIdAval = AvalShape.extend({
  personalReferences: z.array(z.object({ id: z.string() }).passthrough()),
  commercialReferences: z.array(z.object({ id: z.string() }).passthrough()),
  documents: z.array(z.object({ id: z.string() }).passthrough()),
  addressDetails: PropertyAddressShape.nullable(),
  employerAddressDetails: PropertyAddressShape.nullable(),
  guaranteePropertyDetails: PropertyAddressShape.nullable(),
});

const PolicyGetByIdProgressShape = z
  .object({
    overall: z.number(),
  })
  .passthrough();

const PolicyGetByIdShape = PolicyTopLevelShape.extend({
  createdBy: UserRefShape,
  managedBy: UserRefShape.nullable(),
  landlords: z.array(PolicyGetByIdLandlord),
  tenant: PolicyGetByIdTenant.nullable(),
  jointObligors: z.array(PolicyGetByIdJointObligor),
  avals: z.array(PolicyGetByIdAval),
  propertyDetails: PropertyDetailsShape.nullable(),
  tenantHistory: z.array(z.object({ id: z.string() }).passthrough()),
  jointObligorHistory: z.array(z.object({ id: z.string() }).passthrough()),
  avalHistory: z.array(z.object({ id: z.string() }).passthrough()),
  allActorsComplete: z.boolean(),
  progress: PolicyGetByIdProgressShape.optional(),
});

export const PolicyGetByIdOutput = PolicyGetByIdShape;
export type PolicyGetByIdOutput = z.infer<typeof PolicyGetByIdOutput>;

// ===========================================================================
// policy.updateStatus
// Returns the transition result. Router throws on !success, so success-path
// shape is `{ success: true, policy: { id, status } }`.
// ===========================================================================
export const PolicyUpdateStatusOutput = z.object({
  success: z.literal(true),
  policy: z
    .object({
      id: z.string(),
      status: z.nativeEnum(PolicyStatus),
    })
    .optional(),
});
export type PolicyUpdateStatusOutput = z.infer<typeof PolicyUpdateStatusOutput>;

// ===========================================================================
// policy.getShareLinks
// ===========================================================================
const ShareLinkShape = z.object({
  actorId: z.string(),
  actorType: z.string(),
  actorName: z.string(),
  email: z.string(),
  phone: z.string(),
  url: z.string(),
  tokenExpiry: z.date().nullable(),
  informationComplete: z.boolean(),
});

export const PolicyShareLinksOutput = z.object({
  policyNumber: z.string(),
  shareLinks: z.array(ShareLinkShape),
});
export type PolicyShareLinksOutput = z.infer<typeof PolicyShareLinksOutput>;

// ===========================================================================
// policy.sendInvitations
// ===========================================================================
const InvitationResultShape = z.object({
  actorType: z.string(),
  email: z.string(),
  sent: z.boolean(),
  token: z.string(),
  url: z.string(),
  expiresAt: z.date(),
});

export const PolicySendInvitationsOutput = z.object({
  success: z.literal(true),
  invitations: z.array(InvitationResultShape),
});
export type PolicySendInvitationsOutput = z.infer<typeof PolicySendInvitationsOutput>;

// ===========================================================================
// policy.replaceTenant
// ===========================================================================
export const PolicyReplaceTenantOutput = z.object({
  success: z.literal(true),
});
export type PolicyReplaceTenantOutput = z.infer<typeof PolicyReplaceTenantOutput>;

// ===========================================================================
// policy.changeGuarantorType
// ===========================================================================
export const PolicyChangeGuarantorTypeOutput = z.object({
  success: z.literal(true),
});
export type PolicyChangeGuarantorTypeOutput = z.infer<typeof PolicyChangeGuarantorTypeOutput>;

// ===========================================================================
// policy.renew
// ===========================================================================
export const PolicyRenewOutput = z.object({
  newPolicyId: z.string(),
  newPolicyNumber: z.string(),
  documentsCopied: z.number(),
  documentsFailed: z.number(),
});
export type PolicyRenewOutput = z.infer<typeof PolicyRenewOutput>;

// ===========================================================================
// policy.assignManager
// ===========================================================================
export const PolicyAssignManagerOutput = z.object({
  success: z.literal(true),
});
export type PolicyAssignManagerOutput = z.infer<typeof PolicyAssignManagerOutput>;
