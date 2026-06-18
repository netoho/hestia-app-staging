/**
 * Canonical Investigation (ActorInvestigation) domain schema (S6b, #135).
 *
 * The investigation row has a lifecycle (PENDING → APPROVED / REJECTED /
 * ARCHIVED) plus broker/landlord approval tokens. The canonical schema mirrors
 * the Prisma model; the tRPC outputs (`./adapters/api`) derive from it — in
 * particular the PUBLIC, sanitized `getByToken` projection is a `.pick` on this
 * schema, so a new secret column can't leak into the public payload unless it
 * is explicitly picked.
 *
 * Persistence lives inline in the (service-less) investigation router, so the
 * db/form adapters here are intentionally thin. Pattern recipe →
 * `src/lib/domain/README.md`.
 */

import { z } from 'zod';
import {
  InvestigatedActorType,
  ActorInvestigationStatus,
  InvestigationArchiveReason,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';

export const ApproverTypeSchema = z.enum(['BROKER', 'LANDLORD']);
export type ApproverType = z.infer<typeof ApproverTypeSchema>;

export const investigationSchema = z.object({
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
export type Investigation = z.infer<typeof investigationSchema>;

export const investigationDocumentSchema = z.object({
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
export type InvestigationDocument = z.infer<typeof investigationDocumentSchema>;

/** Fields the public, token-scoped `getByToken` payload is allowed to expose.
 *  The api adapter `.pick`s exactly these — secrets (broker/landlordToken,
 *  tokenExpiry, submittedBy, approvedBy, approvalNotes, rejectionReason, archive*)
 *  are deliberately excluded. */
export const INVESTIGATION_PUBLIC_FIELDS = {
  id: true,
  actorType: true,
  findings: true,
  status: true,
  approvedAt: true,
  approvedByType: true,
  submittedAt: true,
} as const;

/** Lifecycle states that are terminal (no further transitions). */
export const INVESTIGATION_TERMINAL_STATUSES = [
  ActorInvestigationStatus.APPROVED,
  ActorInvestigationStatus.REJECTED,
  ActorInvestigationStatus.ARCHIVED,
] as const;
