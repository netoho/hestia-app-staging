/**
 * API adapter for the Document (ActorDocument) domain entity. The canonical
 * output (`documentApiOutput`) IS `documentSchema`; the per-procedure outputs
 * derive from it. Replaces the hand-curated shapes in
 * `src/lib/schemas/document/output.ts` (which now re-exports these).
 *
 * The PR-1 (#118) 6-field `confirmUpload` tightening is preserved by deriving
 * `ConfirmUploadDocumentShape` via `.pick` on the canonical schema (with a
 * non-null `uploadedAt`, since the service coalesces it).
 */

import { z } from 'zod';
import { documentSchema } from '../schema';

export const documentApiOutput = documentSchema;
export type DocumentApiOutput = z.infer<typeof documentApiOutput>;
export const documentApiOutputFields = Object.keys(documentApiOutput.shape) as readonly string[];

/** Legacy alias — the full ActorDocument output shape. */
export const ActorDocumentShape = documentApiOutput;

// document.getUploadUrl
export const DocumentGetUploadUrlOutput = z.object({
  success: z.literal(true),
  uploadUrl: z.string(),
  documentId: z.string(),
  s3Key: z.string(),
  expiresIn: z.number(),
});
export type DocumentGetUploadUrlOutput = z.infer<typeof DocumentGetUploadUrlOutput>;

// document.confirmUpload — service returns a 6-field subset (PR-1 #118),
// with a non-null uploadedAt (the service coalesces `?? new Date()`).
export const ConfirmUploadDocumentShape = documentSchema
  .pick({ id: true, fileName: true, category: true, documentType: true, fileSize: true })
  .extend({ uploadedAt: z.date() });
export const DocumentConfirmUploadOutput = z.object({
  success: z.boolean(),
  document: ConfirmUploadDocumentShape.nullable(),
});
export type DocumentConfirmUploadOutput = z.infer<typeof DocumentConfirmUploadOutput>;

// document.listDocuments
export const DocumentListDocumentsOutput = z.object({
  success: z.literal(true),
  documents: z.array(documentApiOutput),
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

// document.listByPolicy — ActorDocument + actorType discriminator
export const DocumentListByPolicyOutput = z.array(
  documentApiOutput.extend({
    actorType: z.enum(['tenant', 'landlord', 'jointObligor', 'aval']),
  }),
);
export type DocumentListByPolicyOutput = z.infer<typeof DocumentListByPolicyOutput>;
