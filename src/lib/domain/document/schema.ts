/**
 * Canonical Document (ActorDocument) domain schema.
 *
 * A LEAF entity (S6a, #134): no multi-tab form, no INDIVIDUAL/COMPANY variants.
 * The canonical schema mirrors the Prisma `ActorDocument` model; the tRPC output
 * (`./adapters/api`), the (empty) include (`./select`), the upload metadata
 * (`./adapters/form`), and the FK mapping (`./adapters/db`) all derive from it.
 *
 * Pattern recipe → `src/lib/domain/README.md`.
 */

import { z } from 'zod';
import {
  DocumentCategory,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';

export const documentSchema = z.object({
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

export type Document = z.infer<typeof documentSchema>;

/** The four actor-FK columns a document can hang off (exactly one is set). */
export const DOCUMENT_ACTOR_FIELDS = [
  'landlordId',
  'tenantId',
  'jointObligorId',
  'avalId',
] as const;
export type DocumentActorField = (typeof DOCUMENT_ACTOR_FIELDS)[number];
