import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { forceCompleteActor, approvePolicyDirectFromCollecting } from '../helpers/admin';

/**
 * E2E-07 — the admin fast path, the least-tested regression zone: NO actor
 * portal is ever opened. Staff force-completes each actor through the
 * two-step MarkCompleteDialog (strict attempt → requiresForce → confirm),
 * then activates the protección DIRECTLY from COLLECTING_INFO via the
 * prominent header button. The direct edge validates actor completeness only
 * — no payments, no investigations (policyWorkflowService).
 */
test('E2E-07: admin force-complete + direct COLLECTING_INFO→ACTIVE', async ({ page }) => {
  test.setTimeout(300_000);
  await freshDb();

  // 1 — Minimal wizard: tenant + landlord, no guarantor
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez', email: 'tenant7.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: 'landlord7.e2e@example.com' },
    guarantor: { type: 'NONE' },
  });

  const policy = await getOnlyPolicy();
  expect(policy.status).toBe('COLLECTING_INFO');

  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.landlords).toHaveLength(1);

  // 2 — Force-complete both actors through the admin UI (portals untouched)
  await forceCompleteActor(page, { policyId, actorType: 'tenant', actorId: tokens.tenant!.id });
  await forceCompleteActor(page, { policyId, actorType: 'landlord', actorId: tokens.landlords[0].id });

  // 3 — Direct COLLECTING_INFO → ACTIVE via the prominent approve button
  await approvePolicyDirectFromCollecting(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');

  // 4 — The direct edge's semantics: activated with NO payments and NO
  //     investigations ever created, and the activation stamped.
  const activated = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });
  expect(activated.activatedAt).not.toBeNull();
  expect(activated.expiresAt).not.toBeNull();

  expect(await prisma.payment.count({ where: { policyId } })).toBe(0);
  expect(await prisma.actorInvestigation.count()).toBe(0);
});
