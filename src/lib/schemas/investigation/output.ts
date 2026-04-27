/**
 * Output schemas for investigation.* tRPC procedures.
 *
 * The investigation router (largest router file in the codebase) covers
 * the staff investigation pipeline plus the public approval flow. The
 * core ActorInvestigation row is locked column-for-column; nested actor
 * and policy includes are kept shallow to avoid duplicating shapes that
 * already live in policy/output.ts and actor/output.ts.
 */

import { z } from 'zod';
import {
  InvestigatedActorType,
  ActorInvestigationStatus,
  InvestigationArchiveReason,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';

const ApproverTypeSchema = z.enum(['BROKER', 'LANDLORD']);

export const ActorInvestigationShape = z.object({
  id: z.string(),
  policyId: z.string(),
  actorType: z.nativeEnum(InvestigatedActorType),
  actorId: z.string(),
  findings: z.string().nullable(),
  submittedBy: z.string(),
  submittedAt: z.date().nullable(),
  status: z.nativeEnum(ActorInvestigationStatus),
  approvedBy: z.string().nullable(),
  approvedByType: ApproverTypeSchema.nullable(),
  approvedAt: z.date().nullable(),
  approvalNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  archivedAt: z.date().nullable(),
  archivedBy: z.string().nullable(),
  archiveReason: z.nativeEnum(InvestigationArchiveReason).nullable(),
  archiveComment: z.string().nullable(),
  brokerToken: z.string().nullable(),
  landlordToken: z.string().nullable(),
  tokenExpiry: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ActorInvestigationDocumentShape = z.object({
  id: z.string(),
  investigationId: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  s3Key: z.string(),
  s3Bucket: z.string(),
  uploadStatus: z.nativeEnum(DocumentUploadStatus),
  createdAt: z.date(),
});

const ActorSummaryShape = z
  .object({
    id: z.string(),
  })
  .passthrough()
  .nullable();

// ===========================================================================
// investigation.create
// ===========================================================================
export const InvestigationCreateOutput = z.object({
  success: z.literal(true),
  investigation: ActorInvestigationShape,
});
export type InvestigationCreateOutput = z.infer<typeof InvestigationCreateOutput>;

// ===========================================================================
// investigation.getById — investigation + nested documents/policy/actor
// ===========================================================================
export const InvestigationGetByIdOutput = ActorInvestigationShape.extend({
  documents: z.array(ActorInvestigationDocumentShape),
  policy: z
    .object({
      id: z.string(),
      policyNumber: z.string(),
    })
    .passthrough(),
  actor: ActorSummaryShape,
});
export type InvestigationGetByIdOutput = z.infer<typeof InvestigationGetByIdOutput>;

// ===========================================================================
// investigation.getApprovalUrls
// ===========================================================================
export const InvestigationGetApprovalUrlsOutput = z.object({
  broker: z.string(),
  landlord: z.string(),
  brokerName: z.string(),
  landlordName: z.string(),
  landlordPhone: z.string().nullable(),
  tokenExpiry: z.date().nullable(),
});
export type InvestigationGetApprovalUrlsOutput = z.infer<typeof InvestigationGetApprovalUrlsOutput>;

// ===========================================================================
// investigation.getByActor
// ===========================================================================
export const InvestigationGetByActorOutput = z.array(
  ActorInvestigationShape.extend({
    documents: z.array(ActorInvestigationDocumentShape),
  }),
);
export type InvestigationGetByActorOutput = z.infer<typeof InvestigationGetByActorOutput>;

// ===========================================================================
// investigation.getByPolicy — array with resolved actorName + documentsCount
// ===========================================================================
export const InvestigationGetByPolicyOutput = z.array(
  ActorInvestigationShape.extend({
    documents: z.array(ActorInvestigationDocumentShape),
    actorName: z.string(),
    documentsCount: z.number(),
  }),
);
export type InvestigationGetByPolicyOutput = z.infer<typeof InvestigationGetByPolicyOutput>;

// ===========================================================================
// investigation.update
// ===========================================================================
export const InvestigationUpdateOutput = z.object({
  success: z.literal(true),
  investigation: ActorInvestigationShape,
});
export type InvestigationUpdateOutput = z.infer<typeof InvestigationUpdateOutput>;

// ===========================================================================
// investigation.archive
// ===========================================================================
export const InvestigationArchiveOutput = z.object({
  success: z.literal(true),
});
export type InvestigationArchiveOutput = z.infer<typeof InvestigationArchiveOutput>;

// ===========================================================================
// investigation.getDocumentUploadUrl
// ===========================================================================
export const InvestigationGetDocumentUploadUrlOutput = z.object({
  success: z.literal(true),
  uploadUrl: z.string(),
  documentId: z.string(),
  s3Key: z.string(),
  expiresIn: z.number(),
});
export type InvestigationGetDocumentUploadUrlOutput = z.infer<
  typeof InvestigationGetDocumentUploadUrlOutput
>;

// ===========================================================================
// investigation.removeDocument
// ===========================================================================
export const InvestigationRemoveDocumentOutput = z.object({
  success: z.literal(true),
});
export type InvestigationRemoveDocumentOutput = z.infer<typeof InvestigationRemoveDocumentOutput>;

// ===========================================================================
// investigation.getDocumentDownloadUrl / getDocumentDownloadUrlByToken
// ===========================================================================
export const InvestigationGetDocumentDownloadUrlOutput = z.object({
  success: z.literal(true),
  downloadUrl: z.string(),
  fileName: z.string(),
  expiresIn: z.number(),
});
export type InvestigationGetDocumentDownloadUrlOutput = z.infer<
  typeof InvestigationGetDocumentDownloadUrlOutput
>;

// ===========================================================================
// investigation.submit
// ===========================================================================
export const InvestigationSubmitOutput = z.object({
  success: z.literal(true),
  investigation: ActorInvestigationShape,
  approvalUrls: z.object({
    broker: z.string(),
    landlord: z.string(),
    brokerPhone: z.string().nullable(),
    landlordPhone: z.string().nullable(),
    brokerName: z.string(),
    landlordName: z.string(),
  }),
});
export type InvestigationSubmitOutput = z.infer<typeof InvestigationSubmitOutput>;

// ===========================================================================
// investigation.getByToken — public, sanitized payload (no internal tokens)
// ===========================================================================
export const InvestigationGetByTokenOutput = z.object({
  id: z.string(),
  actorType: z.nativeEnum(InvestigatedActorType),
  actor: ActorSummaryShape,
  findings: z.string().nullable(),
  status: z.nativeEnum(ActorInvestigationStatus),
  approvedAt: z.date().nullable(),
  approvedByType: ApproverTypeSchema.nullable(),
  documents: z.array(ActorInvestigationDocumentShape),
  policy: z
    .object({
      id: z.string(),
      policyNumber: z.string(),
      rentAmount: z.number(),
    })
    .passthrough(),
  tokenType: ApproverTypeSchema,
  submittedAt: z.date().nullable(),
});
export type InvestigationGetByTokenOutput = z.infer<typeof InvestigationGetByTokenOutput>;

// ===========================================================================
// investigation.approve / investigation.reject
// ===========================================================================
export const InvestigationApproveOutput = z.object({
  success: z.literal(true),
  investigation: ActorInvestigationShape,
});
export type InvestigationApproveOutput = z.infer<typeof InvestigationApproveOutput>;

export const InvestigationRejectOutput = z.object({
  success: z.literal(true),
  investigation: ActorInvestigationShape,
});
export type InvestigationRejectOutput = z.infer<typeof InvestigationRejectOutput>;
