import { test, expect } from '@playwright/test';
import { freshDb, prisma, getPolicyStatus } from '../helpers/db';
import { seedActiveRenewablePolicy } from '../helpers/seed';
import { completeActorStrict, approvePolicyDirectFromCollecting } from '../helpers/admin';

/**
 * E2E-08 — renewal (phase 4, closes the #161 spanning set):
 * seeded ACTIVE policy (complete tenant + TWO complete landlords + 10 real
 * MinIO documents) → header "Renovar" → per-co-owner selection (uncheck the
 * co-owner's CFDI sub-group) → preview → create → clone assertions (data,
 * documents actually copied through S3, investigation archived on source,
 * fresh PENDING on clone) → every cloned actor passes STRICT completion (no
 * force — the UI-level copy-integrity proof, service-level twin in
 * tests/integration/services/policyCloneDrift.test.ts) → direct
 * COLLECTING_INFO→ACTIVE.
 */
test('E2E-08: renewal clones all landlords with per-co-owner selection and reaches ACTIVE', async ({ page }) => {
  test.setTimeout(420_000);
  await freshDb();

  const seed = await seedActiveRenewablePolicy();

  // 1 — Entry: policy header actions menu → Renovar
  await page.goto(`/dashboard/policies/${seed.policyId}`);
  await expect(page.getByText('Activa').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('policy-actions-menu').click();
  await page.getByRole('menuitem', { name: 'Renovar' }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/policies/${seed.policyId}/renew`));
  await expect(page.getByText('Renovar protección').first()).toBeVisible({ timeout: 30_000 });

  // 2 — Step 1: all cards render; every landlord is first-class (primary +
  //     co-owner each get their own selection card).
  const primaryCard = page
    .locator('div')
    .filter({ has: page.getByText(`Arrendador — ${seed.landlordPrimaryName}`) })
    .filter({ has: page.getByLabel('Datos fiscales / CFDI') })
    .last();
  const coOwnerCard = page
    .locator('div')
    .filter({ has: page.getByText(`Copropietario — ${seed.landlordCoOwnerName}`) })
    .filter({ has: page.getByLabel('Datos fiscales / CFDI') })
    .last();
  await expect(primaryCard).toBeVisible();
  await expect(coOwnerCard).toBeVisible();
  await expect(page.getByText(`Arrendatario — ${seed.tenantName}`)).toBeVisible();

  // Per-co-owner granularity: drop ONLY the co-owner's CFDI sub-group.
  await coOwnerCard.getByLabel('Datos fiscales / CFDI').click();

  // 3 — Preview reflects the selection, then create.
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Revisar y confirmar').first()).toBeVisible();
  await expect(page.getByText('No copiado').first()).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar y crear renovación' }).click();

  // Success toast proves the REAL S3 copy worked: 10 copiados, 0 fallaron.
  await expect(page.getByText('Renovación creada').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/10 documentos copiados/).first()).toBeVisible();
  await expect(page.getByText(/fallaron/)).toHaveCount(0);

  // Redirect to the new policy.
  await page.waitForURL((url) => /\/dashboard\/policies\/[^/]+$/.test(url.pathname) && !url.pathname.includes(seed.policyId), { timeout: 30_000 });

  // 4 — DB truth: clone + linkage + investigation lifecycle
  const source = await prisma.policy.findUniqueOrThrow({
    where: { id: seed.policyId },
    select: { renewedToId: true, status: true },
  });
  expect(source.renewedToId).toBeTruthy();
  expect(source.status).toBe('ACTIVE'); // renewal never touches the source status
  const newPolicyId = source.renewedToId!;
  expect(await getPolicyStatus(newPolicyId)).toBe('COLLECTING_INFO');

  const cloneLandlords = await prisma.landlord.findMany({
    where: { policyId: newPolicyId },
    orderBy: { isPrimary: 'desc' },
  });
  expect(cloneLandlords).toHaveLength(2);
  const [cloneA, cloneB] = cloneLandlords;

  // Carried per selection: primary kept CFDI, co-owner's was dropped — and
  // ONLY that sub-group (banking et al survive on both).
  expect(cloneA.requiresCFDI).toBe(true);
  expect(cloneA.cfdiData).toContain('RAOC750310CD2');
  expect(cloneB.requiresCFDI).toBe(false);
  expect(cloneB.cfdiData).toBeNull();
  expect(cloneB.bankName).toBe('BBVA');
  expect(cloneB.clabe).toBe('012180001234567897');
  // The two fields the drift net caught in PR #182 stay carried:
  expect(cloneA.nationality).toBe('MEXICAN');
  expect(cloneA.address).toBe('Av. Reforma 123, Juárez, CDMX');
  expect(cloneB.address).toBe('Calle Durango 45, Roma Norte, CDMX');

  const cloneTenant = await prisma.tenant.findFirstOrThrow({ where: { policyId: newPolicyId } });
  expect(cloneTenant.curp).toBe('VASJ900215MDFRLL08');
  expect(cloneTenant.informationComplete).toBe(false); // actors must reconfirm

  // Documents copied (rows + the toast above proved the S3 objects).
  expect(await prisma.actorDocument.count({ where: { tenantId: cloneTenant.id } })).toBe(4);
  expect(await prisma.actorDocument.count({ where: { landlordId: cloneA.id } })).toBe(3);
  expect(await prisma.actorDocument.count({ where: { landlordId: cloneB.id } })).toBe(3);

  // Old APPROVED investigation archived as SUPERSEDED; clone starts fresh.
  const archived = await prisma.actorInvestigation.findFirstOrThrow({
    where: { policyId: seed.policyId },
  });
  expect(archived.status).toBe('ARCHIVED');
  expect(archived.archiveReason).toBe('SUPERSEDED');
  expect(
    await prisma.actorInvestigation.count({ where: { policyId: newPolicyId, status: 'PENDING' } }),
  ).toBe(1);

  // 5 — Cross-surface: the new policy's tabs show the cloned actors.
  await page.goto(`/dashboard/policies/${newPolicyId}?tab=landlord`);
  await expect(page.getByText(seed.landlordPrimaryName).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(seed.landlordCoOwnerName).first()).toBeVisible();

  // 6 — THE integrity proof: every cloned actor passes STRICT completion —
  //     no force dialog. A dropped field/document fails here by design.
  await completeActorStrict(page, {
    policyId: newPolicyId,
    actorType: 'tenant',
    actorId: cloneTenant.id,
    cardName: seed.tenantName,
  });
  await completeActorStrict(page, {
    policyId: newPolicyId,
    actorType: 'landlord',
    actorId: cloneA.id,
    cardName: seed.landlordPrimaryName,
  });
  await completeActorStrict(page, {
    policyId: newPolicyId,
    actorType: 'landlord',
    actorId: cloneB.id,
    cardName: seed.landlordCoOwnerName,
  });

  // 7 — Direct COLLECTING_INFO → ACTIVE on the renewed policy.
  await approvePolicyDirectFromCollecting(page, newPolicyId);
  await expect.poll(() => getPolicyStatus(newPolicyId), { timeout: 15_000 }).toBe('ACTIVE');

  // 8 — The source can't be renewed twice: Renovar gone from its menu.
  await page.goto(`/dashboard/policies/${seed.policyId}`);
  await page.getByTestId('policy-actions-menu').click();
  await expect(page.getByRole('menuitem', { name: 'Renovar' })).toBeHidden();
});
