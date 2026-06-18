/**
 * DB adapter for the Document (ActorDocument) entity. Documents aren't built
 * from user form input, so there is no empty-string/number normalization — the
 * adapter's job is the actorType → actor-FK mapping (the one spot that knew
 * which column an actor's document hangs off) plus the create-payload builder.
 */

import { DocumentUploadStatus, DocumentCategory } from '@/prisma/generated/prisma-client/enums';
import type { DocumentActorField } from '../schema';

const ACTOR_FIELD = {
  landlord: 'landlordId',
  tenant: 'tenantId',
  jointObligor: 'jointObligorId',
  aval: 'avalId',
} as const satisfies Record<string, DocumentActorField>;

export type DocumentActorType = keyof typeof ACTOR_FIELD;

/** The ActorDocument column holding the FK for a given actor type. */
export function actorFieldFor(actorType: DocumentActorType): DocumentActorField {
  return ACTOR_FIELD[actorType];
}

export interface DocumentCreateMetadata {
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  s3Region?: string | null;
  uploadedBy?: string | null;
  actorType: DocumentActorType;
  actorId: string;
}

/** Build the Prisma ActorDocument create payload (PENDING) from upload metadata. */
export function toDbCreate(meta: DocumentCreateMetadata): Record<string, unknown> {
  return {
    category: meta.category,
    documentType: meta.documentType,
    fileName: meta.fileName,
    originalName: meta.fileName,
    fileSize: meta.fileSize,
    mimeType: meta.mimeType,
    s3Key: meta.s3Key,
    s3Bucket: meta.s3Bucket,
    s3Region: meta.s3Region ?? null,
    uploadedBy: meta.uploadedBy ?? 'self',
    uploadStatus: DocumentUploadStatus.PENDING,
    [actorFieldFor(meta.actorType)]: meta.actorId,
  };
}
