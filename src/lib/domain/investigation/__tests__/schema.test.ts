/**
 * Unit tests for the canonical Investigation (ActorInvestigation) schema (S6b, #135).
 */

import { describe, it, expect } from 'bun:test';
import {
  investigationSchema,
  investigationDocumentSchema,
  INVESTIGATION_TERMINAL_STATUSES,
} from '../schema';

const validInvestigation = {
  id: 'inv1',
  policyId: 'p1',
  actorType: 'TENANT',
  actorId: 't1',
  findings: 'All clear',
  submittedBy: 'staff-1',
  submittedAt: new Date(),
  status: 'PENDING',
  approvedBy: null,
  approvedByType: null,
  approvedAt: null,
  approvalNotes: null,
  rejectionReason: null,
  archivedAt: null,
  archivedBy: null,
  archiveReason: null,
  archiveComment: null,
  brokerToken: 'btok',
  landlordToken: 'ltok',
  tokenExpiry: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('investigationSchema', () => {
  it('parses a valid ActorInvestigation', () => {
    expect(investigationSchema.safeParse(validInvestigation).success).toBe(true);
  });

  it('rejects a missing required field (submittedBy)', () => {
    const { submittedBy: _omit, ...rest } = validInvestigation;
    expect(investigationSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid status', () => {
    expect(investigationSchema.safeParse({ ...validInvestigation, status: 'NOPE' }).success).toBe(false);
  });

  it('accepts an approved-by-broker fixture (lifecycle state)', () => {
    const approved = {
      ...validInvestigation,
      status: 'APPROVED',
      approvedBy: 'broker-1',
      approvedByType: 'BROKER',
      approvedAt: new Date(),
    };
    expect(investigationSchema.safeParse(approved).success).toBe(true);
  });

  it('lists the terminal lifecycle states', () => {
    expect([...INVESTIGATION_TERMINAL_STATUSES]).toEqual(['APPROVED', 'REJECTED', 'ARCHIVED']);
  });
});

describe('investigationDocumentSchema', () => {
  it('parses a valid investigation document', () => {
    expect(
      investigationDocumentSchema.safeParse({
        id: 'd1',
        investigationId: 'inv1',
        fileName: 'report.pdf',
        originalName: 'report.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        s3Key: 'k',
        s3Bucket: 'b',
        uploadStatus: 'COMPLETE',
        createdAt: new Date(),
      }).success,
    ).toBe(true);
  });
});
