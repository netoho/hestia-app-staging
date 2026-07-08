import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  completeTenantIndividualPortal,
  completeLandlordCompanyPortal,
  completeJointObligorCompanyPropertyPortal,
} from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

/**
 * E2E-03 — IND tenant + 1 COMPANY landlord + JO COMPANY_PROPERTY + tenant 100%:
 * covers the company-landlord wizard toggle + company landlord portal, the JO
 * portal-side INDIVIDUAL→COMPANY switch, and the PROPERTY guarantee variant
 * (S4b's other write path: property fields + guarantee address + deed/tax
 * docs uploaded inside the Garantía tab).
 */
test('E2E-03: company landlord + company property JO reaches ACTIVE', async ({ page }) => {
  test.setTimeout(480_000);
  await freshDb();

  // 1 — Wizard: company landlord; JO created with email only (the card has no
  //     type toggle — the portal switch to Persona Moral is part of the test)
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez', email: 'tenant3.e2e@example.com' },
    landlord: {
      isCompany: true,
      companyName: 'Inmobiliaria E2E SA de CV',
      companyRfc: 'IEE900101AB1',
      email: 'inmobiliaria.e2e@example.com',
    },
    guarantor: { type: 'JOINT_OBLIGOR', email: 'jo.company.e2e@example.com' },
  });

  const policy = await getOnlyPolicy();
  expect(policy.id).toBe(policyId);
  expect(policy.guarantorType).toBe('JOINT_OBLIGOR');

  const landlordRow = await prisma.landlord.findFirstOrThrow({ where: { policyId } });
  expect(landlordRow.isCompany).toBe(true);
  expect(landlordRow.companyName).toBe('Inmobiliaria E2E SA de CV');

  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.landlords).toHaveLength(1);
  expect(tokens.jointObligors).toHaveLength(1);

  // 2 — Portals (real presigned uploads → MinIO)
  await completeTenantIndividualPortal(page, tokens.tenant!.token);
  await completeLandlordCompanyPortal(page, tokens.landlords[0].token);
  await completeJointObligorCompanyPropertyPortal(page, tokens.jointObligors[0].token);

  // S4b company/property write path landed the 2-axis variant correctly
  const joRow = await prisma.jointObligor.findUniqueOrThrow({ where: { id: tokens.jointObligors[0].id } });
  expect(joRow.jointObligorType).toBe('COMPANY');
  expect(joRow.guaranteeMethod).toBe('PROPERTY');
  expect(joRow.hasPropertyGuarantee).toBe(true);
  expect(joRow.propertyValue).toBe(3500000);
  expect(joRow.informationComplete).toBe(true);

  const landlordDone = await prisma.landlord.findUniqueOrThrow({ where: { id: tokens.landlords[0].id } });
  expect(landlordDone.informationComplete).toBe(true);

  // 3 — Cross-surface parity (#171 class): portal-saved values in the admin view
  await page.goto(`/dashboard/policies/${policyId}?tab=guarantors`);
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Garantías Corporativas E2E SA de CV').first()).toBeVisible();
  await page.goto(`/dashboard/policies/${policyId}?tab=landlord`);
  await expect(page.getByText('Inmobiliaria E2E SA de CV').first()).toBeVisible({ timeout: 30_000 });

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

  // 5 — Tenant pays 100%
  await seedPendingPayments(policyId, [{ type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 5000 }]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 5000 });

  // 6 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');
});
