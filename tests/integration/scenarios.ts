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

export async function createCancelledPolicy() {
  return createPolicyWithActors({ status: PolicyStatus.CANCELLED });
}

export async function createCollectingInfoPolicy() {
  return createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });
}
