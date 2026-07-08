/**
 * Higher-order builders that compose multiple factories.
 *
 * Use these when a test needs a coherent multi-entity state and the precise
 * defaults aren't load-bearing. Reach for raw factories when a test needs to
 * pin specific field values.
 */

import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import {
  adminUser,
  packageFactory,
  policyFactory,
  primaryLandlord,
  tenantFactory,
} from './factories';

export interface PolicyWithActorsResult {
  policy: Awaited<ReturnType<typeof policyFactory.create>>;
  pkg: Awaited<ReturnType<typeof packageFactory.create>>;
  creator: Awaited<ReturnType<typeof adminUser.create>>;
  landlord: Awaited<ReturnType<typeof primaryLandlord.create>>;
  tenant: Awaited<ReturnType<typeof tenantFactory.create>>;
}

/**
 * Create a policy with one primary landlord, one tenant, an owning ADMIN user,
 * and a fresh package.
 */
export async function createPolicyWithActors(overrides: { status?: PolicyStatus } = {}): Promise<PolicyWithActorsResult> {
  const creator = await adminUser.create();
  const pkg = await packageFactory.create();
  const policy = await policyFactory.create(
    { status: overrides.status ?? PolicyStatus.COLLECTING_INFO },
    { transient: { createdById: creator.id, packageId: pkg.id } },
  );
  const landlord = await primaryLandlord.create({}, { transient: { policyId: policy.id } });
  const tenant = await tenantFactory.create({}, { transient: { policyId: policy.id } });
  return { policy, pkg, creator, landlord, tenant };
}

export interface MultiTenantPolicyResult extends PolicyWithActorsResult {
  /** All tenants on the policy in createdAt-asc order; tenants[0] === tenant. */
  tenants: Array<Awaited<ReturnType<typeof tenantFactory.create>>>;
}

/**
 * Create a policy with one landlord and N co-tenants (S5b #169).
 *
 * Builds on createPolicyWithActors (whose tenant becomes tenants[0]) and adds
 * `tenantCount - 1` extra tenant rows with strictly increasing createdAt so
 * that createdAt-asc ordering (the service ordering for tenants) is stable.
 */
export async function createMultiTenantPolicy(
  opts: { tenantCount?: number; status?: PolicyStatus } = {},
): Promise<MultiTenantPolicyResult> {
  const tenantCount = opts.tenantCount ?? 2;
  const base = await createPolicyWithActors({ status: opts.status });
  const tenants = [base.tenant];
  for (let i = 1; i < tenantCount; i++) {
    tenants.push(
      await tenantFactory.create(
        { createdAt: new Date(base.tenant.createdAt.getTime() + i * 1000) },
        { transient: { policyId: base.policy.id } },
      ),
    );
  }
  return { ...base, tenants };
}

export async function createCancelledPolicy() {
  return createPolicyWithActors({ status: PolicyStatus.CANCELLED });
}

export async function createCollectingInfoPolicy() {
  return createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });
}
