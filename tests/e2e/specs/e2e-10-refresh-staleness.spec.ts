import { test, expect } from '@playwright/test';
import { freshDb, prisma, getOnlyPolicy, getActorTokens } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { seedPendingPayments } from '../helpers/admin';
import {
  walksFor,
  fillTabBySchema,
  fillPlainField,
  fillAddressComposite,
  uploadWalkerDoc,
} from '../helpers/walker';

/**
 * E2E-10 — reload/staleness choreography (#171 edit half + #180 acceptance).
 *
 * Two browser contexts: the ADMIN policy page stays mounted (React Query
 * only refetches on mount/focus/invalidation — a mounted view never
 * self-heals) while the PORTAL context mutates actor data underneath it.
 * Asserts, in order:
 *
 *  1. Actor-section RefreshCw: a mounted tenant card shows the stale name
 *     until the section refresh is clicked.
 *  2. Stale-open editor: the JO inline editor is OPENED over a stale cache
 *     (portal switched the guarantee to PROPERTY after the cache was
 *     primed). The background refetch lands and useWizardDataReset re-seeds
 *     the mounted forms — the guarantee radio flips to PROPERTY with NO
 *     reopen and NO refresh click. This is the #171 prod symptom (radio
 *     stuck on the INCOME default; stale addresses).
 *  3. Payments RefreshCw: a DB-side status flip renders only after the
 *     section refresh.
 *  4. PolicyHeader RefreshCw = TRUE full refresh: one click un-stales a
 *     mounted actor card AND the payments cache (utils.invalidate()), no
 *     navigation.
 */

const SAVE_BUTTON = 'Guardar y Continuar';

test('E2E-10: three refresh buttons + stale-open editor re-seeds (two contexts)', async ({ page: admin, browser }) => {
  test.setTimeout(480_000);
  await freshDb();
  await createPolicyViaWizard(admin, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Wanda', paternalLastName: 'Walker', email: 'walker.tenant@example.com' },
    landlord: { firstName: 'Luis', paternalLastName: 'Dueño', email: 'walker.landlord@example.com' },
    guarantor: {
      type: 'BOTH',
      jointObligor: { email: 'walker.jo@example.com', firstName: 'Jorge', paternalLastName: 'Obligado' },
      aval: { email: 'walker.aval@example.com', firstName: 'Alma', paternalLastName: 'Avalista' },
    },
  });
  const policy = await getOnlyPolicy();
  const tokens = await getActorTokens(policy.id);
  await seedPendingPayments(policy.id, [
    { type: 'TENANT_PORTION', paidBy: 'TENANT', amount: 5800 },
    { type: 'LANDLORD_PORTION', paidBy: 'LANDLORD', amount: 3700 },
  ]);

  const portalCtx = await browser.newContext();
  const portal = await portalCtx.newPage();
  const walks = walksFor('INDIVIDUAL');
  const tenantWalk = walks[0];
  const joWalk = walks[2];

  // ── 1. Actor-section refresh ───────────────────────────────────────────────
  // Mount the tenant tab (primes the card with 'Wanda').
  await admin.goto(`/dashboard/policies/${policy.id}?tab=tenant`);
  await expect(admin.getByText('Wanda', { exact: false }).first()).toBeVisible({ timeout: 30_000 });

  // Portal renames the tenant underneath the mounted card.
  await portal.goto(`${tenantWalk.portalPath}/${tokens.tenant!.token}`);
  await fillTabBySchema(portal, tenantWalk.tabs[0]);
  await fillPlainField(portal, 'firstName', 'Renombrada');
  await portal.getByRole('button', { name: SAVE_BUTTON }).click();
  await expect(portal.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });

  // Mounted view stays stale until the section refresh is clicked.
  await expect(admin.getByText('Renombrada')).toHaveCount(0);
  await admin.getByRole('button', { name: 'Actualizar Inquilino' }).click();
  await expect(admin.getByText('Renombrada').first()).toBeVisible({ timeout: 15_000 });

  // ── 2. Stale-open editor (the #171 symptom) ───────────────────────────────
  // Prime the guarantors caches + prove the INCOME pre-state, then close.
  await admin.getByRole('tab', { name: /Garantes|Obligado/ }).click();
  await admin.getByRole('button', { name: 'Editar' }).nth(joWalk.editorIndex).click();
  const dialog = admin.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('tab', { name: 'Garantía', exact: true }).click();
  // Pre-state: a fresh JO has guaranteeMethod NULL in the DB and the spread
  // `{...initialData}` overrides the tab's INCOME default — NEITHER radio is
  // checked. The portal will set PROPERTY below.
  await expect(
    dialog.locator('[data-field="guaranteeMethod"] [role="radio"][value="PROPERTY"]'),
  ).toHaveAttribute('data-state', 'unchecked', { timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // Portal: JO switches the guarantee to PROPERTY (docs gate the save).
  await portal.goto(`${joWalk.portalPath}/${tokens.jointObligors[0].token}`);
  const joPersonal = await fillTabBySchema(portal, joWalk.tabs[0]);
  await portal.getByRole('button', { name: SAVE_BUTTON }).click();
  await fillTabBySchema(portal, joWalk.tabs[1]); // employment (barrier = its first field)
  await portal.getByRole('button', { name: SAVE_BUTTON }).click();
  const propertyRadio = portal.locator('[data-field="guaranteeMethod"] [role="radio"][value="PROPERTY"]');
  await propertyRadio.waitFor({ state: 'visible', timeout: 30_000 });
  await propertyRadio.click();
  await expect(propertyRadio).toHaveAttribute('data-state', 'checked');
  await fillAddressComposite(portal.locator('[data-field="guaranteePropertyDetails"]').first());
  await fillPlainField(portal, 'propertyValue', '850000');
  await fillPlainField(portal, 'propertyDeedNumber', 'ESC-2026-1234');
  await fillPlainField(portal, 'propertyRegistry', 'FOLIO-556677');
  await uploadWalkerDoc(portal, 'PROPERTY_DEED');
  await uploadWalkerDoc(portal, 'PROPERTY_TAX_STATEMENT');
  await portal.getByRole('button', { name: SAVE_BUTTON }).click();
  await expect(portal.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });

  // Admin re-OPENS the editor over the now-stale cache: the mounted forms
  // must re-seed from the background refetch — radio flips to PROPERTY with
  // no reopen dance and no refresh click.
  await admin.getByRole('button', { name: 'Editar' }).nth(joWalk.editorIndex).click();
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('tab', { name: 'Garantía', exact: true }).click();
  await expect(
    dialog.locator('[data-field="guaranteeMethod"] [role="radio"][value="PROPERTY"]'),
  ).toHaveAttribute('data-state', 'checked', { timeout: 20_000 });
  // The rest of the row re-seeded too (not just the radio): the personal tab
  // shows the email the portal walk generated.
  await dialog.getByRole('tab', { name: 'Personal', exact: true }).click();
  await expect(dialog.locator('[data-field="email"]')).toHaveValue(
    joPersonal.filled['email'],
    { timeout: 15_000 },
  );
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // ── 3. Payments-section refresh ───────────────────────────────────────────
  await admin.getByRole('tab', { name: 'Pagos' }).click();
  await expect(admin.getByText('Pendiente', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(admin.getByText('Completado', { exact: true })).toHaveCount(0);

  await prisma.payment.updateMany({
    where: { policyId: policy.id, type: 'TENANT_PORTION' },
    data: { status: 'COMPLETED', paidAt: new Date() },
  });

  await expect(admin.getByText('Completado', { exact: true })).toHaveCount(0);
  await admin.getByRole('button', { name: 'Actualizar Pagos' }).click();
  await expect(admin.getByText('Completado', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // ── 4. PolicyHeader = TRUE full refresh ───────────────────────────────────
  // Mount the tenant tab again (shows 'Renombrada'), then go stale on TWO
  // fronts at once: a portal rename + a DB payment flip.
  await admin.getByRole('tab', { name: 'Inquilino' }).click();
  await expect(admin.getByText('Renombrada').first()).toBeVisible({ timeout: 30_000 });

  await portal.goto(`${tenantWalk.portalPath}/${tokens.tenant!.token}`);
  await fillPlainField(portal, 'firstName', 'Renombradísima');
  await portal.getByRole('button', { name: SAVE_BUTTON }).click();
  await expect(portal.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });
  await prisma.payment.updateMany({
    where: { policyId: policy.id, type: 'LANDLORD_PORTION' },
    data: { status: 'COMPLETED', paidAt: new Date() },
  });

  // One header click, zero navigation: the mounted tenant card un-stales…
  await expect(admin.getByText('Renombradísima')).toHaveCount(0);
  await admin.getByRole('button', { name: 'Actualizar datos' }).click();
  await expect(admin.getByText('Renombradísima').first()).toBeVisible({ timeout: 15_000 });
  // …and the payments cache was invalidated in the same sweep.
  await admin.getByRole('tab', { name: 'Pagos' }).click();
  await expect(admin.getByText('Completado', { exact: true })).toHaveCount(2, { timeout: 15_000 });

  await portalCtx.close();
});
