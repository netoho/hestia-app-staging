/**
 * S5a Phase C (#133) — policy adapter tests.
 *
 * The api drift test is BIDIRECTIONAL: a canonical field missing from the
 * wire is the #174 strip class (the contract lock silently drops it and
 * admin renders false/empty data); a wire field missing from the canonical
 * is contract fiction. `id/createdAt/updatedAt` are the deliberate
 * Prisma-emitted exceptions.
 */

import { describe, it, expect } from 'bun:test';
import { policyCoreSchema } from '../schema';
import {
  policyApiCoreShape,
  policyApiCoreFields,
  POLICY_PRISMA_EMITTED_FIELDS,
} from '../adapters/api';
import { policyRowToAggregate } from '../adapters/db';

describe('policy api adapter — drift', () => {
  // `status` is the union DISCRIMINATOR — it lives on every lifecycle
  // variant rather than on the core object, but it is canonical.
  const canonicalKeys = new Set(['status', ...Object.keys(policyCoreSchema.shape)]);
  const emitted = new Set<string>(POLICY_PRISMA_EMITTED_FIELDS);

  it('every wire field exists on the canonical schema (or is Prisma-emitted)', () => {
    for (const field of policyApiCoreFields) {
      if (!canonicalKeys.has(field) && !emitted.has(field)) {
        throw new Error(
          `policyApiCoreShape.${field} is not on the canonical policy schema. ` +
            `Add it to policyCoreSchema (preferred) or drop it from the wire.`,
        );
      }
    }
  });

  it('every canonical field reaches the wire (the #174 strip guard)', () => {
    const wireKeys = new Set(policyApiCoreFields);
    for (const field of canonicalKeys) {
      if (!wireKeys.has(field)) {
        throw new Error(
          `policyCoreSchema.${field} is missing from policyApiCoreShape — ` +
            `the contract lock would strip it from every policy response.`,
        );
      }
    }
  });

  it('status stays the discriminator on both sides', () => {
    expect(policyApiCoreShape.shape.status).toBeDefined();
    expect(canonicalKeys.has('status')).toBe(true);
  });
});

describe('policyRowToAggregate — native plural, legacy singular (S5b)', () => {
  it('passes the native tenants array through and derives legacy singular from tenants[0]', () => {
    const row = { id: 'p1', tenants: [{ id: 't1' }, { id: 't2' }], landlords: [] };
    const aggregate = policyRowToAggregate(row);
    expect(aggregate.tenants).toEqual([{ id: 't1' }, { id: 't2' }]);
    // Legacy singular = tenants[0] during the transition (never index-1 semantics).
    expect(aggregate.tenant).toEqual({ id: 't1' });
  });

  it('derives a null legacy singular from an empty tenants array', () => {
    const aggregate = policyRowToAggregate({ id: 'p1', tenants: [] });
    expect(aggregate.tenants).toEqual([]);
    expect(aggregate.tenant).toBeNull();
  });

  it('passes null through for missing rows', () => {
    expect(policyRowToAggregate(null)).toBeNull();
  });
});
