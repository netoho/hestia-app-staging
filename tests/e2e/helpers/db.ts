import { E2E_DATABASE_URL } from '../playwright.config';

// Pin the spec-side prisma client to the e2e DB before the shared helpers load.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? E2E_DATABASE_URL;

import { prisma, resetDatabase, seedTestData } from '../../utils/database';

export { prisma };

/** Reset + reseed — call at the top of every scenario (workers=1, serial). */
export async function freshDb(): Promise<void> {
  await resetDatabase();
  await seedTestData();
}

export interface ActorTokens {
  tenant?: { id: string; token: string };
  landlords: Array<{ id: string; token: string; email: string }>;
  jointObligors: Array<{ id: string; token: string }>;
  avals: Array<{ id: string; token: string }>;
}

/**
 * Actor portal tokens are persisted at policy.create BEFORE any email attempt
 * (actorTokenService), so the DB is the canonical place a test reads them from —
 * no email capture needed.
 */
export async function getActorTokens(policyId: string): Promise<ActorTokens> {
  const [tenant, landlords, jointObligors, avals] = await Promise.all([
    prisma.tenant.findFirst({ where: { policyId }, select: { id: true, accessToken: true } }),
    prisma.landlord.findMany({ where: { policyId }, select: { id: true, accessToken: true, email: true } }),
    prisma.jointObligor.findMany({ where: { policyId }, select: { id: true, accessToken: true } }),
    prisma.aval.findMany({ where: { policyId }, select: { id: true, accessToken: true } }),
  ]);

  return {
    tenant: tenant?.accessToken ? { id: tenant.id, token: tenant.accessToken } : undefined,
    landlords: landlords
      .filter((l) => l.accessToken)
      .map((l) => ({ id: l.id, token: l.accessToken as string, email: l.email ?? '' })),
    jointObligors: jointObligors
      .filter((j) => j.accessToken)
      .map((j) => ({ id: j.id, token: j.accessToken as string })),
    avals: avals
      .filter((a) => a.accessToken)
      .map((a) => ({ id: a.id, token: a.accessToken as string })),
  };
}

/** The policy created by the wizard in the current scenario (fresh DB ⇒ exactly one). */
export async function getOnlyPolicy() {
  const policies = await prisma.policy.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  if (policies.length !== 1) {
    throw new Error(`[e2e] expected exactly 1 policy in the fresh DB, found ${policies.length}`);
  }
  return policies[0];
}

export async function getPolicyStatus(policyId: string): Promise<string> {
  const p = await prisma.policy.findUniqueOrThrow({ where: { id: policyId }, select: { status: true } });
  return p.status;
}
