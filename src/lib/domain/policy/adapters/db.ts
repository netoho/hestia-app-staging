/**
 * Policy db adapter (S5a Phase C → S5b flip, #133/#169).
 *
 * READ direction — `policyRowToAggregate`: since S5b the DB relation is
 * native 1..N (`Policy.tenants Tenant[]`), so the plural array passes
 * straight through from Prisma. The legacy singular `tenant` key is
 * SYNTHESIZED (`tenants[0] ?? null`) as the explicit transition contract:
 * remaining frontend consumers keep compiling while the component sweep
 * finishes; the key dies in the post-demo cleanup PR. Iterate `tenants`,
 * never index 0 — there is no primary tenant.
 *
 * WRITE direction: policy CREATION builds its aggregate in
 * policyService.createPolicy (wizard payload, now a tenants[] loop) and the
 * only field-level policy write outside it is savePolicyFinancial (landlord
 * flow) — both validate against slices of `policyCoreSchema` where they
 * construct payloads.
 */

import type { PolicyWithRelations, PolicyListRow } from '../select';

type WithTenants = { tenants: readonly unknown[] };

/** The aggregate view: native plural `tenants` + legacy singular `tenant`. */
export type PolicyAggregate<T extends WithTenants> = T & {
  tenant: T['tenants'][number] | null;
};

export function policyRowToAggregate<T extends WithTenants>(row: T): PolicyAggregate<T>;
export function policyRowToAggregate<T extends WithTenants>(row: T | null): PolicyAggregate<T> | null;
export function policyRowToAggregate<T extends WithTenants>(
  row: T | null,
): PolicyAggregate<T> | null {
  if (!row) return null;
  return {
    ...row,
    tenant: (row.tenants[0] ?? null) as T['tenants'][number] | null,
  };
}

export type PolicyAggregateFull = PolicyAggregate<PolicyWithRelations>;
export type PolicyAggregateListRow = PolicyAggregate<PolicyListRow>;
