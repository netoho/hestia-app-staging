import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { completeTenantCompanyPortal, completeJointObligorIncomePortal } from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

/**
 * E2E-02 — COMPANY tenant + JO INDIVIDUAL_INCOME + 50/50 payment split:
 * both investigable actors (tenant + JO) need approved investigations before
 * the auto-transition fires; two payment rows (tenant + landlord payers);
 * cross-surface parity: JO portal-saved guarantee data must render in the
 * admin policy view (the #171 "visible in one surface only" class).
 */
test('E2E-02: company tenant + income JO + split payments reaches ACTIVE', async ({ page }) => {
  test.setTimeout(480_000);
  await freshDb();

  // 1 — Wizard: company tenant, 1 individual landlord, JO, 50/50 split
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'COMPANY', companyName: 'Empresa E2E SA de CV', email: 'empresa.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: 'landlord2.e2e@example.com' },
    guarantor: { type: 'JOINT_OBLIGOR', email: 'jo.e2e@example.com', firstName: 'Miguel', paternalLastName: 'Santos' },
    tenantPercentage: 50,
  });

  const policy = await getOnlyPolicy();
  expect(policy.guarantorType).toBe('JOINT_OBLIGOR');
  expect(policy.tenantPercentage).toBe(50);

  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.jointObligors).toHaveLength(1);

  // 2 — Portals: company tenant + income-guarantee JO (real uploads → MinIO)
  await completeTenantCompanyPortal(page, tokens.tenant!.token);
  await completeJointObligorIncomePortal(page, tokens.jointObligors[0].token);

  // JO write path lands the 2-axis variant correctly (S4b surface)
  const joRow = await prisma.jointObligor.findUniqueOrThrow({ where: { id: tokens.jointObligors[0].id } });
  expect(joRow.guaranteeMethod).toBe('INCOME');
  expect(joRow.informationComplete).toBe(true);

  // 3 — Cross-surface parity (#171 class): portal-saved values visible in admin
  await page.goto(`/dashboard/policies/${policyId}?tab=guarantors`);
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Ingreso', { exact: true }).first()).toBeVisible();
  await page.goto(`/dashboard/policies/${policyId}?tab=tenant`);
  await expect(page.getByText('Empresa E2E SA de CV').first()).toBeVisible({ timeout: 30_000 });

  // 4 — Investigations: BOTH tenant and JO must be approved before auto-transition
  const tenantApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'tenant',
    actorId: tokens.tenant!.id,
  });
  await approveInvestigationAsLandlord(page, tenantApproval);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO'); // JO still pending

  const joApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'jointObligor',
    actorId: tokens.jointObligors[0].id,
  });
  await approveInvestigationAsLandlord(page, joApproval);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 30_000 }).toBe('PENDING_APPROVAL');

  // 5 — Split payments: tenant + landlord rows, both recorded + verified in the UI
  await seedPendingPayments(policyId, [
    { type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 2500 },
    { type: 'LANDLORD_PORTION', paidBy: 'LANDLORD', amount: 2500 },
  ]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 2500 });
  await recordAndVerifyPayment(page, { policyId, type: 'LANDLORD_PORTION', amount: 2500 });

  // 6 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');
});
