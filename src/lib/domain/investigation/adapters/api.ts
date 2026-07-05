/**
 * API adapter for the Investigation domain entity. Every investigation.*
 * output derives from the canonical schema; replaces the hand-curated shapes in
 * `src/lib/schemas/investigation/output.ts` (which now re-exports these).
 *
 * The PUBLIC `getByToken` payload is a `.pick` on the canonical schema
 * (`INVESTIGATION_PUBLIC_FIELDS`) — the sanitization invariant (PR #100): broker/
 * landlord tokens, tokenExpiry, and the approval/archive internals are excluded
 * by construction, and `.output()` strips anything extra the resolver returns.
 */

import { z } from 'zod';
import {
  investigationSchema,
  investigationDocumentSchema,
  ApproverTypeSchema,
  INVESTIGATION_PUBLIC_FIELDS,
} from '../schema';

export const investigationApiOutput = investigationSchema;
export type InvestigationApiOutput = z.infer<typeof investigationApiOutput>;
export const investigationApiOutputFields = Object.keys(investigationApiOutput.shape) as readonly string[];

// Legacy aliases used across the router + tests.
export const ActorInvestigationShape = investigationSchema;
export const ActorInvestigationDocumentShape = investigationDocumentSchema;

const ActorSummaryShape = z.object({ id: z.string() }).passthrough().nullable();

// investigation.create
export const InvestigationCreateOutput = z.object({
  success: z.literal(true),
  investigation: investigationSchema,
});
export type InvestigationCreateOutput = z.infer<typeof InvestigationCreateOutput>;

// investigation.getById
export const InvestigationGetByIdOutput = investigationSchema.extend({
  documents: z.array(investigationDocumentSchema),
  policy: z.object({ id: z.string(), policyNumber: z.string() }).passthrough(),
  actor: ActorSummaryShape,
});
export type InvestigationGetByIdOutput = z.infer<typeof InvestigationGetByIdOutput>;

// investigation.getApprovalUrls
export const InvestigationGetApprovalUrlsOutput = z.object({
  broker: z.string(),
  landlord: z.string(),
  brokerName: z.string(),
  landlordName: z.string(),
  landlordPhone: z.string().nullable(),
  tokenExpiry: z.date().nullable(),
});
export type InvestigationGetApprovalUrlsOutput = z.infer<typeof InvestigationGetApprovalUrlsOutput>;

// investigation.getByActor
export const InvestigationGetByActorOutput = z.array(
  investigationSchema.extend({
    documents: z.array(investigationDocumentSchema),
  }),
);
export type InvestigationGetByActorOutput = z.infer<typeof InvestigationGetByActorOutput>;

// investigation.getByPolicy
export const InvestigationGetByPolicyOutput = z.array(
  investigationSchema.extend({
    documents: z.array(investigationDocumentSchema),
    actorName: z.string(),
    documentsCount: z.number(),
  }),
);
export type InvestigationGetByPolicyOutput = z.infer<typeof InvestigationGetByPolicyOutput>;

// investigation.update
export const InvestigationUpdateOutput = z.object({
  success: z.literal(true),
  investigation: investigationSchema,
});
export type InvestigationUpdateOutput = z.infer<typeof InvestigationUpdateOutput>;

// investigation.archive
export const InvestigationArchiveOutput = z.object({ success: z.literal(true) });
export type InvestigationArchiveOutput = z.infer<typeof InvestigationArchiveOutput>;

// investigation.getDocumentUploadUrl
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

// investigation.removeDocument
export const InvestigationRemoveDocumentOutput = z.object({ success: z.literal(true) });
export type InvestigationRemoveDocumentOutput = z.infer<typeof InvestigationRemoveDocumentOutput>;

// investigation.getDocumentDownloadUrl / getDocumentDownloadUrlByToken
export const InvestigationGetDocumentDownloadUrlOutput = z.object({
  success: z.literal(true),
  downloadUrl: z.string(),
  fileName: z.string(),
  expiresIn: z.number(),
});
export type InvestigationGetDocumentDownloadUrlOutput = z.infer<
  typeof InvestigationGetDocumentDownloadUrlOutput
>;

// investigation.submit
export const InvestigationSubmitOutput = z.object({
  success: z.literal(true),
  investigation: investigationSchema,
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

// investigation.getByToken — PUBLIC, sanitized (no internal tokens/secrets).
// Derived via `.pick(INVESTIGATION_PUBLIC_FIELDS)` so secrets cannot leak.
export const InvestigationGetByTokenOutput = investigationSchema
  .pick(INVESTIGATION_PUBLIC_FIELDS)
  .extend({
    actor: ActorSummaryShape,
    documents: z.array(investigationDocumentSchema),
    policy: z
      .object({
        id: z.string(),
        policyNumber: z.string(),
        rentAmount: z.number(),
      })
      .passthrough(),
    tokenType: ApproverTypeSchema,
  });
export type InvestigationGetByTokenOutput = z.infer<typeof InvestigationGetByTokenOutput>;

// investigation.approve / investigation.reject
export const InvestigationApproveOutput = z.object({
  success: z.literal(true),
  investigation: investigationSchema,
});
export type InvestigationApproveOutput = z.infer<typeof InvestigationApproveOutput>;

export const InvestigationRejectOutput = z.object({
  success: z.literal(true),
  investigation: investigationSchema,
});
export type InvestigationRejectOutput = z.infer<typeof InvestigationRejectOutput>;
