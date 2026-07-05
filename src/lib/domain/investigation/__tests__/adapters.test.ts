/**
 * Unit tests for the Investigation adapters: api (drift + the SANITIZATION
 * invariant on the public getByToken payload), db (terminal-status), form.
 */

import { describe, it, expect } from 'bun:test';
import {
  investigationApiOutput,
  investigationApiOutputFields,
  InvestigationGetByTokenOutput,
} from '../adapters/api';
import { isTerminalStatus } from '../adapters/db';
import { investigationEditableFields } from '../adapters/form';
import { investigationSchema } from '../schema';

// Secrets that must NEVER appear in the public, token-scoped payload.
const SECRET_FIELDS = [
  'brokerToken',
  'landlordToken',
  'tokenExpiry',
  'submittedBy',
  'approvedBy',
  'approvalNotes',
  'rejectionReason',
  'archivedAt',
  'archivedBy',
  'archiveReason',
  'archiveComment',
  'policyId',
];

describe('investigation api adapter — drift', () => {
  it('every API field exists on the canonical schema', () => {
    const schemaKeys = new Set(Object.keys(investigationSchema.shape));
    for (const field of investigationApiOutputFields) {
      expect(schemaKeys.has(field)).toBe(true);
    }
  });
});

describe('investigation api adapter — getByToken sanitization (PR #100)', () => {
  const tokenKeys = Object.keys(InvestigationGetByTokenOutput.shape);

  it('exposes the public fields', () => {
    for (const f of ['id', 'actorType', 'findings', 'status', 'approvedAt', 'approvedByType', 'submittedAt', 'actor', 'documents', 'policy', 'tokenType']) {
      expect(tokenKeys).toContain(f);
    }
  });

  it('omits every secret field', () => {
    for (const secret of SECRET_FIELDS) {
      expect(tokenKeys).not.toContain(secret);
    }
  });

  it('strips a secret even if the resolver leaks it (default Zod object mode)', () => {
    const parsed = InvestigationGetByTokenOutput.parse({
      id: 'inv1',
      actorType: 'TENANT',
      findings: 'ok',
      status: 'PENDING',
      approvedAt: null,
      approvedByType: null,
      submittedAt: new Date(),
      actor: { id: 't1' },
      documents: [],
      policy: { id: 'p1', policyNumber: 'POL-1', rentAmount: 10000 },
      tokenType: 'BROKER',
      // leaked secrets — must be stripped:
      brokerToken: 'SECRET',
      landlordToken: 'SECRET',
    });
    expect((parsed as Record<string, unknown>).brokerToken).toBeUndefined();
    expect((parsed as Record<string, unknown>).landlordToken).toBeUndefined();
  });
});

describe('investigation db adapter — isTerminalStatus', () => {
  it('treats APPROVED/REJECTED/ARCHIVED as terminal', () => {
    expect(isTerminalStatus('APPROVED' as never)).toBe(true);
    expect(isTerminalStatus('REJECTED' as never)).toBe(true);
    expect(isTerminalStatus('ARCHIVED' as never)).toBe(true);
  });
  it('treats PENDING as non-terminal', () => {
    expect(isTerminalStatus('PENDING' as never)).toBe(false);
  });
});

describe('investigation form adapter', () => {
  it('exposes the staff-editable fields', () => {
    expect(investigationEditableFields).toContain('findings');
    expect(investigationEditableFields).toContain('approvalNotes');
  });
});
