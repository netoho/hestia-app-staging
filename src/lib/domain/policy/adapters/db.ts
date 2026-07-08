/**
 * Policy db adapter (S5a Phase C, #133).
 *
 * READ direction — `policyRowToAggregate`: the canonical aggregate models
 * `tenants` as an ARRAY (2026-07-07 ruling for S5b #169) while the DB keeps
 * its 1:1 `Tenant.policyId @unique` until S5b's migration. Every service
 * read passes through this wrap so consumers are collection-aware today and
 * S5b only drops the constraint.
 *
 * The legacy singular `tenant` key is preserved on the way out — existing
 * frontend consumers keep working during the transition; S5b removes it
 * after the component sweep. Iterate `tenants`, never index 0.
 *
 * WRITE direction: policy CREATION builds its aggregate in
 * policyService.createPolicy (wizard payload) and the only field-level
 * policy write outside it is savePolicyFinancial (landlord flow) — both
 * validate against slices of `policyCoreSchema` where they construct
 * payloads. A full `toDb` lands with S5b's write-path work, where tenant
 * collection writes make it load-bearing.
 */

import type { PolicyWithRelations, PolicyListRow } from '../select';

type WithTenant<T> = T & { tenant?: unknown | null };

/** The aggregate view: row + plural tenants (legacy `tenant` retained). */
export type PolicyAggregate<T extends WithTenant<object>> = T & {
  tenants: NonNullable<T['tenant']>[];
};

export function policyRowToAggregate<T extends WithTenant<object>>(row: T): PolicyAggregate<T>;
export function policyRowToAggregate<T extends WithTenant<object>>(row: T | null): PolicyAggregate<T> | null;
export function policyRowToAggregate<T extends WithTenant<object>>(
  row: T | null,
): PolicyAggregate<T> | null {
  if (!row) return null;
  return {
    ...row,
    tenants: (row.tenant ? [row.tenant] : []) as NonNullable<T['tenant']>[],
  };
}

export type PolicyAggregateFull = PolicyAggregate<PolicyWithRelations>;
export type PolicyAggregateListRow = PolicyAggregate<PolicyListRow>;
