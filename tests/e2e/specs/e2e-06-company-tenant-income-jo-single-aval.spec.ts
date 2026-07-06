import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  completeTenantCompanyPortal,
  completeLandlordIndividualPortal,
  completeJointObligorCompanyIncomePortal,
  completeAvalSinglePortal,
} from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

/**
 * E2E-06 — COMPANY tenant + JO COMPANY_INCOME + AVAL individual single +
 * split manual payments: the remaining company-guarantor combo (company JO on
 * the INCOME branch) and the no-spouse aval variant, with the payment leg
 * split 60/40 and both rows driven through the manual record/verify dialogs.
 */
test('E2E-06: company tenant + income company JO + single aval reaches ACTIVE', async ({ page }) => {
  test.setTimeout(600_000);
  await freshDb();

  // 1 — Wizard: company tenant, 60/40 split, BOTH guarantor kinds
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'COMPANY', companyName: 'Comercial Seis SA de CV', email: 'empresa6.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: 'landlord6.e2e@example.com' },
    guarantor: {
      type: 'BOTH',
      jointObligor: { email: 'jo.company.e2e@example.com' },
      aval: { email: 'aval.single.e2e@example.com', firstName: 'Andrea', paternalLastName: 'Cortés' },
    },
    tenantPercentage: 60,
  });

  const policy = await getOnlyPolicy();
  expect(policy.guarantorType).toBe('BOTH');
  expect(policy.tenantPercentage).toBe(60);

  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.jointObligors).toHaveLength(1);
  expect(tokens.avals).toHaveLength(1);

  // 2 — Portals
  await completeTenantCompanyPortal(page, tokens.tenant!.token);
  await completeLandlordIndividualPortal(page, tokens.landlords[0].token);
  await completeJointObligorCompanyIncomePortal(page, tokens.jointObligors[0].token);
  await completeAvalSinglePortal(page, tokens.avals[0].token);

  // 3 — Write-path truth: discriminators survive the full flows
  const tenantRow = await prisma.tenant.findUniqueOrThrow({ where: { id: tokens.tenant!.id } });
  expect(tenantRow.tenantType).toBe('COMPANY');
  expect(tenantRow.informationComplete).toBe(true);

  const joRow = await prisma.jointObligor.findUniqueOrThrow({ where: { id: tokens.jointObligors[0].id } });
  expect(joRow.jointObligorType).toBe('COMPANY');
  expect(joRow.guaranteeMethod).toBe('INCOME');
  expect(joRow.monthlyIncome).toBe(80000);
  expect(joRow.informationComplete).toBe(true);

  const avalRow = await prisma.aval.findUniqueOrThrow({ where: { id: tokens.avals[0].id } });
  expect(avalRow.avalType).toBe('INDIVIDUAL');
  expect(avalRow.maritalStatus).toBe('single');
  expect(avalRow.spouseName).toBeNull();
  expect(avalRow.informationComplete).toBe(true);

  // 4 — Investigations ×3 → auto PENDING_APPROVAL on the last approval
  const tenantApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'tenant',
    actorId: tokens.tenant!.id,
  });
  await approveInvestigationAsLandlord(page, tenantApproval);

  const joApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'jointObligor',
    actorId: tokens.jointObligors[0].id,
  });
  await approveInvestigationAsLandlord(page, joApproval);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO'); // aval pending

  const avalApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'aval',
    actorId: tokens.avals[0].id,
  });
  await approveInvestigationAsLandlord(page, avalApproval);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 30_000 }).toBe('PENDING_APPROVAL');

  // 5 — Split manual payments (60/40), both recorded + verified in the UI
  await seedPendingPayments(policyId, [
    { type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 3000 },
    { type: 'LANDLORD_PORTION', paidBy: 'LANDLORD', amount: 2000 },
  ]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 3000 });
  await recordAndVerifyPayment(page, { policyId, type: 'LANDLORD_PORTION', amount: 2000 });

  // 6 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');
});
