import { test, expect } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens, getPolicyStatus, prisma } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  completeTenantIndividualPortal,
  completeLandlordIndividualPortal,
  completeLandlordCompanyPortal,
  completeJointObligorIndividualPropertyPortal,
  completeAvalCompanyPortal,
} from '../helpers/portals';
import {
  submitInvestigation,
  approveInvestigationAsLandlord,
  seedPendingPayments,
  recordAndVerifyPayment,
  approvePolicyToActive,
} from '../helpers/admin';

const LANDLORD_IND_EMAIL = 'landlord5.e2e@example.com';
const LANDLORD_COMPANY_EMAIL = 'inmobiliaria5.e2e@example.com';

/**
 * E2E-05 — the fan-out scenario: IND/FOREIGN tenant (immigration document) +
 * TWO landlords (1 individual + 1 company; completion asserted on BOTH — the
 * multi-landlord axis that consumed the June regression epic) + BOTH
 * guarantors (JO INDIVIDUAL_PROPERTY + aval COMPANY). Three investigations
 * must be approved before the auto-transition fires.
 */
test('E2E-05: foreign tenant + two landlords + both guarantors reaches ACTIVE', async ({ page }) => {
  test.setTimeout(600_000);
  await freshDb();

  // 1 — Wizard: two landlords (second is a company), BOTH guarantor kinds
  const { policyId } = await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez', email: 'tenant5.e2e@example.com' },
    landlord: { firstName: 'Carlos', paternalLastName: 'Ramírez', email: LANDLORD_IND_EMAIL },
    coLandlords: [
      { isCompany: true, companyName: 'Inmobiliaria Cinco SA de CV', companyRfc: 'ICE900101AB1', email: LANDLORD_COMPANY_EMAIL },
    ],
    guarantor: {
      type: 'BOTH',
      jointObligor: { email: 'jo.property.e2e@example.com', firstName: 'Ricardo', paternalLastName: 'Fuentes' },
      aval: { email: 'aval.company.e2e@example.com' },
    },
  });

  const policy = await getOnlyPolicy();
  expect(policy.guarantorType).toBe('BOTH');

  // 2 — Fan-out: BOTH landlords exist with their own portal tokens
  const tokens = await getActorTokens(policyId);
  expect(tokens.tenant).toBeTruthy();
  expect(tokens.landlords).toHaveLength(2);
  expect(tokens.jointObligors).toHaveLength(1);
  expect(tokens.avals).toHaveLength(1);

  const indLandlord = tokens.landlords.find((l) => l.email === LANDLORD_IND_EMAIL);
  const companyLandlord = tokens.landlords.find((l) => l.email === LANDLORD_COMPANY_EMAIL);
  expect(indLandlord).toBeTruthy();
  expect(companyLandlord).toBeTruthy();

  // 3 — Portals: foreign tenant (immigration doc), BOTH landlords, both guarantors
  await completeTenantIndividualPortal(page, tokens.tenant!.token, { foreign: true });
  await completeLandlordIndividualPortal(page, indLandlord!.token, { email: LANDLORD_IND_EMAIL });
  await completeLandlordCompanyPortal(page, companyLandlord!.token, { email: LANDLORD_COMPANY_EMAIL });
  await completeJointObligorIndividualPropertyPortal(page, tokens.jointObligors[0].token);
  await completeAvalCompanyPortal(page, tokens.avals[0].token);

  // 4 — Write-path truth
  const tenantRow = await prisma.tenant.findUniqueOrThrow({ where: { id: tokens.tenant!.id } });
  expect(tenantRow.nationality).toBe('FOREIGN');
  expect(tenantRow.informationComplete).toBe(true);

  const joRow = await prisma.jointObligor.findUniqueOrThrow({ where: { id: tokens.jointObligors[0].id } });
  expect(joRow.jointObligorType).toBe('INDIVIDUAL');
  expect(joRow.guaranteeMethod).toBe('PROPERTY');
  expect(joRow.informationComplete).toBe(true);

  const avalRow = await prisma.aval.findUniqueOrThrow({ where: { id: tokens.avals[0].id } });
  expect(avalRow.avalType).toBe('COMPANY');
  expect(avalRow.informationComplete).toBe(true);

  // The fan-out invariant: EVERY landlord completes, not just index 0
  for (const l of tokens.landlords) {
    const row = await prisma.landlord.findUniqueOrThrow({ where: { id: l.id } });
    expect(row.informationComplete).toBe(true);
  }

  // 5 — Investigations: all three investigable actors, each landlord-approved
  const tenantApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'tenant',
    actorId: tokens.tenant!.id,
  });
  await approveInvestigationAsLandlord(page, tenantApproval);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO');

  const joApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'jointObligor',
    actorId: tokens.jointObligors[0].id,
  });
  await approveInvestigationAsLandlord(page, joApproval);
  expect(await getPolicyStatus(policyId)).toBe('COLLECTING_INFO'); // aval still pending

  const avalApproval = await submitInvestigation(page, {
    policyId,
    actorType: 'aval',
    actorId: tokens.avals[0].id,
  });
  await approveInvestigationAsLandlord(page, avalApproval);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 30_000 }).toBe('PENDING_APPROVAL');

  // 6 — Tenant pays 100%
  await seedPendingPayments(policyId, [{ type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 5000 }]);
  await recordAndVerifyPayment(page, { policyId, type: 'TENANT_PORTION', amount: 5000 });

  // 7 — Approve to ACTIVE
  await approvePolicyToActive(page, policyId);
  await expect.poll(() => getPolicyStatus(policyId), { timeout: 15_000 }).toBe('ACTIVE');
});
