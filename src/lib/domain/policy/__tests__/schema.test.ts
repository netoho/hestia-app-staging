/**
 * S5a (#133) — canonical policy schema tests.
 *
 * One valid fixture per lifecycle state, one rejection per state-required
 * field, one ± per refinement, and a Prisma drift test pinning every core
 * scalar to a real Policy column.
 */

import { describe, it, expect } from 'bun:test';
import { Prisma } from '@/prisma/generated/prisma-client/client';
import {
  policySchema,
  policyCoreSchema,
  policyRenewalPreconditionsSchema,
  guarantorTypeChangePreconditionsSchema,
} from '../schema';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tenantRef = (complete = true) => ({
  id: 't1',
  informationComplete: complete,
  tenantType: 'INDIVIDUAL' as const,
});

const landlordRef = () => ({
  id: 'l1',
  informationComplete: true,
  isCompany: false,
  isPrimary: true,
});

const base = {
  policyNumber: 'POL-20260708-AAA',
  rentAmount: 15000,
  contractLength: 12,
  guarantorType: 'NONE' as const,
  totalPrice: 4100,
  tenantPercentage: 100,
  landlordPercentage: 0,
  createdById: 'user-1',
  tenants: [tenantRef()],
  landlords: [landlordRef()],
  jointObligors: [],
  avals: [],
};

const collecting = { ...base, status: 'COLLECTING_INFO' as const, tenants: [tenantRef(false)] };

const active = {
  ...base,
  status: 'ACTIVE' as const,
  activatedAt: new Date('2026-01-01'),
  expiresAt: new Date('2026-12-31'),
};

const cancelled = {
  ...base,
  status: 'CANCELLED' as const,
  cancelledAt: new Date(),
  cancellationReason: 'OTHER' as const,
};

// ---------------------------------------------------------------------------
// Per-state parse + reject
// ---------------------------------------------------------------------------

describe('policySchema lifecycle variants', () => {
  it('parses a COLLECTING_INFO policy with incomplete tenants', () => {
    expect(policySchema.safeParse(collecting).success).toBe(true);
  });

  it('parses PENDING_APPROVAL when every tenant is complete', () => {
    expect(policySchema.safeParse({ ...base, status: 'PENDING_APPROVAL' }).success).toBe(true);
  });

  it('rejects PENDING_APPROVAL with an incomplete tenant (all-tenants gate)', () => {
    const result = policySchema.safeParse({
      ...base,
      status: 'PENDING_APPROVAL',
      tenants: [tenantRef(true), tenantRef(false)],
    });
    expect(result.success).toBe(false);
  });

  it('rejects PENDING_APPROVAL with zero tenants', () => {
    expect(
      policySchema.safeParse({ ...base, status: 'PENDING_APPROVAL', tenants: [] }).success,
    ).toBe(false);
  });

  it('parses an ACTIVE policy with activation dates', () => {
    expect(policySchema.safeParse(active).success).toBe(true);
  });

  it('rejects ACTIVE without activatedAt/expiresAt', () => {
    expect(policySchema.safeParse({ ...base, status: 'ACTIVE' }).success).toBe(false);
  });

  it('parses EXPIRED with its dates', () => {
    expect(policySchema.safeParse({ ...active, status: 'EXPIRED' }).success).toBe(true);
  });

  it('parses CANCELLED with cancelledAt + reason', () => {
    expect(policySchema.safeParse(cancelled).success).toBe(true);
  });

  it('rejects CANCELLED without a cancellation reason', () => {
    const { cancellationReason: _drop, ...rest } = cancelled;
    expect(policySchema.safeParse(rest).success).toBe(false);
  });

  it('rejects any state with zero landlords', () => {
    expect(policySchema.safeParse({ ...collecting, landlords: [] }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-state refinements
// ---------------------------------------------------------------------------

describe('policySchema refinements', () => {
  it('rejects a percentage split that does not sum to 100', () => {
    expect(
      policySchema.safeParse({ ...collecting, tenantPercentage: 60, landlordPercentage: 30 })
        .success,
    ).toBe(false);
  });

  it('accepts a 50/50 split', () => {
    expect(
      policySchema.safeParse({ ...collecting, tenantPercentage: 50, landlordPercentage: 50 })
        .success,
    ).toBe(true);
  });

  it('rejects post-collection guarantorType=BOTH with no avals', () => {
    expect(
      policySchema.safeParse({
        ...base,
        status: 'PENDING_APPROVAL',
        guarantorType: 'BOTH',
        jointObligors: [{ id: 'jo1', informationComplete: true }],
        avals: [],
      }).success,
    ).toBe(false);
  });

  it('allows COLLECTING_INFO to be transiently guarantor-less (type change window)', () => {
    expect(
      policySchema.safeParse({ ...collecting, guarantorType: 'JOINT_OBLIGOR', jointObligors: [] })
        .success,
    ).toBe(true);
  });

  it('accepts post-collection guarantors matching the declared type', () => {
    expect(
      policySchema.safeParse({
        ...base,
        status: 'PENDING_APPROVAL',
        guarantorType: 'JOINT_OBLIGOR',
        jointObligors: [{ id: 'jo1', informationComplete: true }],
      }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Operation preconditions
// ---------------------------------------------------------------------------

describe('operation precondition guards', () => {
  it('renewal: ACTIVE and EXPIRED pass; others fail', () => {
    const landlords = [{ id: 'l1' }];
    expect(policyRenewalPreconditionsSchema.safeParse({ status: 'ACTIVE', landlords }).success).toBe(true);
    expect(policyRenewalPreconditionsSchema.safeParse({ status: 'EXPIRED', landlords }).success).toBe(true);
    expect(
      policyRenewalPreconditionsSchema.safeParse({ status: 'COLLECTING_INFO', landlords }).success,
    ).toBe(false);
    expect(
      policyRenewalPreconditionsSchema.safeParse({ status: 'CANCELLED', landlords }).success,
    ).toBe(false);
  });

  it('renewal: no landlords, no renewal', () => {
    expect(
      policyRenewalPreconditionsSchema.safeParse({ status: 'ACTIVE', landlords: [] }).success,
    ).toBe(false);
  });

  it('guarantor-type change: only pre-activation states', () => {
    expect(guarantorTypeChangePreconditionsSchema.safeParse({ status: 'COLLECTING_INFO' }).success).toBe(true);
    expect(guarantorTypeChangePreconditionsSchema.safeParse({ status: 'PENDING_APPROVAL' }).success).toBe(true);
    expect(guarantorTypeChangePreconditionsSchema.safeParse({ status: 'ACTIVE' }).success).toBe(false);
    expect(guarantorTypeChangePreconditionsSchema.safeParse({ status: 'EXPIRED' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Prisma drift — every core scalar is a real Policy column
// ---------------------------------------------------------------------------

describe('policyCoreSchema ↔ Prisma drift', () => {
  it('every core schema key exists on the Prisma Policy model', () => {
    const prismaColumns = new Set<string>(Object.values(Prisma.PolicyScalarFieldEnum));
    for (const key of Object.keys(policyCoreSchema.shape)) {
      if (!prismaColumns.has(key)) {
        throw new Error(
          `policyCoreSchema.${key} is not a Policy column. ` +
            `Add the column (with a manual migration) or remove it from the schema.`,
        );
      }
    }
  });
});
