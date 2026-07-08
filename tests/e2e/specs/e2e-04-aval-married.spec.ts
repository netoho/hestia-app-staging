import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  completeTenantIndividualPortal,
  completeLandlordIndividualPortal,
  completeAvalMarriedPortal,
} from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

/**
 * E2E-04 — IND tenant + 1 IND landlord + AVAL individual married_joint:
 * covers the AVAL wizard branch, the aval portal (PROPERTY-only guarantee),
 * and the S3 conditional-required refine — the portal helper probes that
 * saving the property tab with married_joint and NO spouse name is blocked,
 * then fills the spouse and saves.
 *
 * #161 also called for a marriage-certificate upload here, but the
 * MARRIAGE_CERTIFICATE category has no upload slot anywhere in the app (dead
 * category: config + service mapping exist, no DocumentManagerCard renders
 * it) — tracked as a UI gap issue, not driveable from this spec.
 */
test('E2E-04: individual aval married_joint reaches ACTIVE', async ({ page }) => {
  test.setTimeout(480_000);
  await freshDb();

  // 1 — Wizard: individual landlord + AVAL guarantor
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez', email: 'tenant4.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: 'landlord4.e2e@example.com' },
    guarantor: { type: 'AVAL', email: 'aval.e2e@example.com', firstName: 'Fernando', paternalLastName: 'Aguilar' },
  });

  const policy = await getOnlyPolicy();
  expect(policy.id).toBe(policyId);
  expect(policy.guarantorType).toBe('AVAL');

  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.landlords).toHaveLength(1);
  expect(tokens.avals).toHaveLength(1);

  // 2 — Portals (real presigned uploads → MinIO)
  await completeTenantIndividualPortal(page, tokens.tenant!.token);
  await completeLandlordIndividualPortal(page, tokens.landlords[0].token);
  await completeAvalMarriedPortal(page, tokens.avals[0].token);

  // S3 write path: married_joint + spouse + property guarantee persisted
  const avalRow = await prisma.aval.findUniqueOrThrow({ where: { id: tokens.avals[0].id } });
  expect(avalRow.maritalStatus).toBe('married_joint');
  expect(avalRow.spouseName).toBe('María Elena López Hernández');
  expect(avalRow.hasPropertyGuarantee).toBe(true);
  expect(avalRow.propertyValue).toBe(2800000);
  expect(avalRow.informationComplete).toBe(true);

  // #177: the optional marriage-certificate slot rendered for married_joint
  // and its upload persisted (a real MinIO object behind an actorDocument
  // row). Optional by ruling — completion above succeeded regardless.
  const marriageCert = await prisma.actorDocument.findFirst({
    where: { avalId: tokens.avals[0].id, category: 'MARRIAGE_CERTIFICATE' },
  });
  expect(marriageCert).not.toBeNull();
  expect(marriageCert?.uploadStatus).toBe('COMPLETE');

  // 3 — Cross-surface parity (#171 class): aval portal-saved values in admin
  await page.goto(`/dashboard/policies/${policyId}?tab=guarantors`);
  await expect(page.getByText(/Fernando/).first()).toBeVisible({ timeout: 30_000 });

  // 4 — Investigations: BOTH tenant and aval must be approved
  const tenantApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'tenant',
    actorId: tokens.tenant!.id,
  });
  await approveInvestigationAsLandlord(page, tenantApproval);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO'); // aval still pending

  const avalApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'aval',
    actorId: tokens.avals[0].id,
  });
  await approveInvestigationAsLandlord(page, avalApproval);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 30_000 }).toBe('PENDING_APPROVAL');

  // 5 — Tenant pays 100%
  await seedPendingPayments(policyId, [{ type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 5000 }]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 5000 });

  // 6 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');
});
