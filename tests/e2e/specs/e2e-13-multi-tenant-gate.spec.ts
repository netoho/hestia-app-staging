import { test, expect } from '@playwright/test';
import { freshDb, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { forceCompleteActor, approvePolicyDirectFromCollecting } from '../helpers/admin';

/**
 * E2E-13 — multi-tenant gate journey (#169).
 *
 * A protección with TWO tenants cannot advance until EVERY tenant is
 * complete — the gate iterates the collection, there is no primary. Both
 * tenants receive their own portal token at creation; completing only one
 * leaves the direct-approval action unavailable and the status held;
 * completing the second opens the gate and the policy activates with both
 * tenants as co-arrendatarios (the carátula renders for the collection).
 *
 * The gate LOGIC is unit/integration-locked (tenant-multi.test.ts); this
 * spec proves it end-to-end through the real admin UI + workflow service.
 * Direct COLLECTING_INFO → ACTIVE edge (no payments/investigations) mirrors
 * E2E-07, extended to N tenants.
 */

test('E2E-13: two-tenant gate — advance blocks until BOTH complete, then activates', async ({ page }) => {
  test.setTimeout(300_000);
  await freshDb();

  const TENANT_A = 'journey.tenantA@example.com';
  const TENANT_B = 'journey.tenantB@example.com';
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Ana', paternalLastName: 'Uno', email: TENANT_A },
    coTenants: [{ type: 'INDIVIDUAL', firstName: 'Beto', paternalLastName: 'Dos', email: TENANT_B }],
    landlord: { firstName: 'Lucía', paternalLastName: 'Casera', email: 'journey.landlord@example.com' },
    guarantor: { type: 'NONE' },
  });

  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO');

  // Two tenants, each with their OWN portal token (createdAt asc; no primary).
  const tokens = await getActorTokens(policyId);
  expect(tokens.tenants).toHaveLength(2);
  const tenantA = tokens.tenants.find((t) => t.email === TENANT_A)!;
  const tenantB = tokens.tenants.find((t) => t.email === TENANT_B)!;
  expect(tenantA.token).not.toBe(tenantB.token);

  // Complete the landlord + tenant A (Inquilino 1). Tenant B stays incomplete.
  await forceCompleteActor(page, { policyId, actorType: 'landlord', actorId: tokens.landlords[0].id });
  await forceCompleteActor(page, { policyId, actorType: 'tenant', actorId: tenantA.id, cardName: 'Inquilino 1' });

  // GATE (the load-bearing multi-tenant assertion): with one tenant still
  // incomplete, the direct-approval action is NOT offered and the status holds.
  await page.goto(`/dashboard/policies/${policyId}`);
  await expect(page.getByText('Recopilando Información').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Aprobar Protección' })).toHaveCount(0);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO');

  // Complete tenant B (Inquilino 2) — now every tenant is complete.
  await forceCompleteActor(page, { policyId, actorType: 'tenant', actorId: tenantB.id, cardName: 'Inquilino 2' });

  // Gate opens: the direct COLLECTING_INFO → ACTIVE edge now succeeds.
  await approvePolicyDirectFromCollecting(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');

  // The ACTIVE policy carries BOTH tenants, both complete — no primary.
  const tenantsAtActive = await prisma.tenant.findMany({
    where: { policyId },
    orderBy: { createdAt: 'asc' },
  });
  expect(tenantsAtActive).toHaveLength(2);
  expect(tenantsAtActive.every((t) => t.informationComplete)).toBe(true);

  // The carátula (co-arrendatario cover) generates for the collection — the
  // getPolicyForCover + coverPageTransformer handle N tenants without crashing.
  const cover = await page.request.get(`/api/policies/${policyId}/contract-cover`);
  expect(cover.status()).toBe(200);
  expect(cover.headers()['content-type']).toContain('wordprocessingml');
});
