import { describe, test, expect } from 'bun:test';
import { Prisma } from '@/prisma/generated/prisma-client/client';
import {
  TENANT_REPLACEMENT_RESET,
  TENANT_REPLACEMENT_INPUT_FIELDS,
} from '../copyLists';

/**
 * #159 — static half of the copy-list drift net.
 *
 * Tenant replacement resets the existing row in place. A Tenant column that
 * is neither reset nor set from the input silently carries the OLD tenant's
 * value onto the NEW tenant — a cross-tenant data leak. This test forces
 * every column (present and future) to be explicitly classified.
 *
 * The clone-direction (renewal) and archive-snapshot invariants live in the
 * integration suite (tests/integration/services/policyCloneDrift.test.ts),
 * where a real roundtrip fills every column with markers.
 */

/** Columns the reset deliberately leaves untouched. */
const TENANT_REPLACEMENT_SYSTEM_FIELDS = ['id', 'policyId', 'createdAt', 'updatedAt'] as const;

describe('tenant replacement reset covers every Tenant column (#159)', () => {
  const allColumns = Object.values(Prisma.TenantScalarFieldEnum) as string[];
  const accounted = new Set<string>([
    ...Object.keys(TENANT_REPLACEMENT_RESET),
    ...TENANT_REPLACEMENT_INPUT_FIELDS,
    ...TENANT_REPLACEMENT_SYSTEM_FIELDS,
  ]);

  test('every column is reset, input-set, or explicitly system-excluded', () => {
    const unaccounted = allColumns.filter((c) => !accounted.has(c));
    // New Tenant column? Add it to TENANT_REPLACEMENT_RESET (the safe
    // default), TENANT_REPLACEMENT_INPUT_FIELDS, or — only for true system
    // metadata — TENANT_REPLACEMENT_SYSTEM_FIELDS above.
    expect(unaccounted).toEqual([]);
  });

  test('the lists only name real Tenant columns (catches renames)', () => {
    const real = new Set(allColumns);
    const phantom = [...accounted].filter((c) => !real.has(c));
    expect(phantom).toEqual([]);
  });

  test('reset and input lists do not overlap', () => {
    const overlap = TENANT_REPLACEMENT_INPUT_FIELDS.filter(
      (f) => f in TENANT_REPLACEMENT_RESET,
    );
    expect(overlap).toEqual([]);
  });
});
