import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { completeTenantIndividualPortal, completeLandlordIndividualPortal } from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

/**
 * E2E-01 — baseline happy path:
 * individual MEXICAN tenant + 1 individual landlord + guarantor NONE +
 * tenant pays 100% → wizard → portals → investigation → landlord approval
 * → auto PENDING_APPROVAL → payment settled → ACTIVE.
 */
test('E2E-01: baseline policy reaches ACTIVE', { tag: '@core' }, async ({ page }) => {
  test.setTimeout(420_000);
  await freshDb();

  // 1 — Creation wizard (staff)
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez', email: 'tenant.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: 'landlord.e2e@example.com' },
    guarantor: { type: 'NONE' },
  });

  const policy = await getOnlyPolicy();
  expect(policy.id).toBe(policyId);
  expect(policy.status).toBe('COLLECTING_INFO');

  // 2 — Actor tokens come from the DB (persisted before any email attempt)
  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.landlords).toHaveLength(1);

  // 3 — Portals: tenant + landlord fill and submit (real uploads → MinIO)
  await completeTenantIndividualPortal(page, tokens.tenant!.token);
  await completeLandlordIndividualPortal(page, tokens.landlords[0].token);

  const tenantRow = await prisma.tenant.findUniqueOrThrow({ where: { id: tokens.tenant!.id } });
  expect(tenantRow.informationComplete).toBe(true);

  // 4 — Investigation (tenant is the only investigable actor) + public approval
  const approvalPath = await submitInvestigation(page, {
    policyId,
    actorType: 'tenant',
    actorId: tokens.tenant!.id,
  });
  await approveInvestigationAsLandlord(page, approvalPath);

  // 5 — All investigations approved → auto COLLECTING_INFO → PENDING_APPROVAL
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 30_000 }).toBe('PENDING_APPROVAL');

  // 6 — Payment leg: tenant pays 100% (rows seeded — Stripe checkout creation
  //     is out of scope; manual record + receipt upload + verify run in the UI)
  await seedPendingPayments(policyId, [{ type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 5000 }]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 5000 });

  // 7 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');

  const activated = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });
  expect(activated.activatedAt).not.toBeNull();
  expect(activated.expiresAt).not.toBeNull();
});
