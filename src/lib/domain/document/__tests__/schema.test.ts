/**
 * Unit tests for the canonical Document (ActorDocument) schema (S6a, #134).
 */

import { describe, it, expect } from 'bun:test';
import { documentSchema, DOCUMENT_ACTOR_FIELDS } from '../schema';

const validDoc = {
  id: 'd1',
  category: 'IDENTIFICATION',
  documentType: 'INE',
  fileName: 'ine.pdf',
  originalName: 'ine.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  s3Key: 'actors/tenant/t1/ine.pdf',
  s3Bucket: 'hestia-documents',
  s3Region: 'us-east-1',
  landlordId: null,
  tenantId: 't1',
  jointObligorId: null,
  avalId: null,
  uploadStatus: 'COMPLETE',
  uploadedAt: new Date(),
  uploadedBy: 'self',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('documentSchema', () => {
  it('parses a valid ActorDocument', () => {
    expect(documentSchema.safeParse(validDoc).success).toBe(true);
  });

  it('rejects a missing required field (s3Key)', () => {
    const { s3Key: _omit, ...rest } = validDoc;
    expect(documentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid category', () => {
    expect(documentSchema.safeParse({ ...validDoc, category: 'NOT_A_CATEGORY' }).success).toBe(false);
  });

  it('lists the four actor FK columns', () => {
    expect([...DOCUMENT_ACTOR_FIELDS]).toEqual(['landlordId', 'tenantId', 'jointObligorId', 'avalId']);
  });
});
