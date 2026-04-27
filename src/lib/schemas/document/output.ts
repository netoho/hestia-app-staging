/**
 * Output schemas for document.* tRPC procedures.
 *
 * The router wraps documentService for actor-document upload flow plus
 * admin-only download / list-by-policy. ActorDocument shape mirrors the
 * Prisma model.
 */

import { z } from 'zod';
import {
  DocumentCategory,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';

export const ActorDocumentShape = z.object({
  id: z.string(),
  category: z.nativeEnum(DocumentCategory),
  documentType: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  s3Key: z.string(),
  s3Bucket: z.string(),
  s3Region: z.string().nullable(),
  landlordId: z.string().nullable(),
  tenantId: z.string().nullable(),
  jointObligorId: z.string().nullable(),
  avalId: z.string().nullable(),
  uploadStatus: z.nativeEnum(DocumentUploadStatus),
  uploadedAt: z.date().nullable(),
  uploadedBy: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  verifiedBy: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// document.getUploadUrl
export const DocumentGetUploadUrlOutput = z.object({
  success: z.literal(true),
  uploadUrl: z.string(),
  documentId: z.string(),
  s3Key: z.string(),
  expiresIn: z.number(),
});
export type DocumentGetUploadUrlOutput = z.infer<typeof DocumentGetUploadUrlOutput>;

// document.confirmUpload
export const DocumentConfirmUploadOutput = z.object({
  success: z.boolean(),
  document: ActorDocumentShape.nullable(),
});
export type DocumentConfirmUploadOutput = z.infer<typeof DocumentConfirmUploadOutput>;

// document.listDocuments
export const DocumentListDocumentsOutput = z.object({
  success: z.literal(true),
  documents: z.array(ActorDocumentShape),
});
export type DocumentListDocumentsOutput = z.infer<typeof DocumentListDocumentsOutput>;

// document.deleteDocument
export const DocumentDeleteOutput = z.object({
  success: z.literal(true),
  message: z.string(),
});
export type DocumentDeleteOutput = z.infer<typeof DocumentDeleteOutput>;

// document.getDownloadUrl / getDownloadUrlById
export const DocumentGetDownloadUrlOutput = z.object({
  success: z.literal(true),
  downloadUrl: z.string(),
  fileName: z.string(),
  expiresIn: z.number(),
});
export type DocumentGetDownloadUrlOutput = z.infer<typeof DocumentGetDownloadUrlOutput>;

// document.listByPolicy — array of ActorDocument-with-actorType
export const DocumentListByPolicyOutput = z.array(
  ActorDocumentShape.extend({
    actorType: z.enum(['tenant', 'landlord', 'jointObligor', 'aval']),
  }),
);
export type DocumentListByPolicyOutput = z.infer<typeof DocumentListByPolicyOutput>;
