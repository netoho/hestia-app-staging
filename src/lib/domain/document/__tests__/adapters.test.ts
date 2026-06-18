/**
 * Unit tests for the Document adapters: api (drift + the PR-1 6-field
 * confirmUpload shape), db (actorFieldFor + toDbCreate), form (upload fields).
 */

import { describe, it, expect } from 'bun:test';
import { DocumentCategory } from '@/prisma/generated/prisma-client/enums';
import {
  documentApiOutput,
  documentApiOutputFields,
  ConfirmUploadDocumentShape,
  DocumentConfirmUploadOutput,
} from '../adapters/api';
import { actorFieldFor, toDbCreate } from '../adapters/db';
import { documentUploadFields } from '../adapters/form';
import { documentSchema } from '../schema';

describe('document api adapter', () => {
  it('confirmUpload shape is exactly the 6 PR-1 fields', () => {
    expect(Object.keys(ConfirmUploadDocumentShape.shape).sort()).toEqual(
      ['category', 'documentType', 'fileName', 'fileSize', 'id', 'uploadedAt'].sort(),
    );
  });

  it('confirmUpload requires a non-null uploadedAt (service coalesces)', () => {
    const base = {
      id: 'd1',
      fileName: 'f.pdf',
      category: 'IDENTIFICATION',
      documentType: 'INE',
      fileSize: 10,
    };
    expect(
      DocumentConfirmUploadOutput.safeParse({ success: true, document: { ...base, uploadedAt: new Date() } }).success,
    ).toBe(true);
    expect(
      DocumentConfirmUploadOutput.safeParse({ success: true, document: { ...base, uploadedAt: null } }).success,
    ).toBe(false);
  });

  it('drift: every API field exists on the canonical schema', () => {
    const schemaKeys = new Set(Object.keys(documentSchema.shape));
    for (const field of documentApiOutputFields) {
      expect(schemaKeys.has(field)).toBe(true);
    }
  });
});

describe('document db adapter', () => {
  it('actorFieldFor maps each actor type to its FK column', () => {
    expect(actorFieldFor('landlord')).toBe('landlordId');
    expect(actorFieldFor('tenant')).toBe('tenantId');
    expect(actorFieldFor('jointObligor')).toBe('jointObligorId');
    expect(actorFieldFor('aval')).toBe('avalId');
  });

  it('toDbCreate sets only the matching FK + PENDING status + originalName', () => {
    const out = toDbCreate({
      category: DocumentCategory.IDENTIFICATION,
      documentType: 'INE',
      fileName: 'ine.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: 'k',
      s3Bucket: 'b',
      actorType: 'tenant',
      actorId: 't1',
    });
    expect(out.tenantId).toBe('t1');
    expect(out.landlordId).toBeUndefined();
    expect(out.uploadStatus).toBe('PENDING');
    expect(out.originalName).toBe('ine.pdf');
    expect(out.uploadedBy).toBe('self');
  });
});

describe('document form adapter', () => {
  it('exposes the upload-request fields', () => {
    expect(documentUploadFields).toContain('category');
    expect(documentUploadFields).toContain('fileName');
    expect(documentUploadFields).toContain('mimeType');
  });
});
