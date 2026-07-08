import { test, expect } from '@playwright/test';
import { freshDb, prisma, getOnlyPolicy, getActorTokens, getPolicyStatus } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';

/**
 * E2E-11 — cancellation + token death (#165).
 *
 * A cancelled protección must not remain reachable through any emailed
 * link: the admin cancels through the real UI (actions menu → reason +
 * mandatory comment → confirm), and every actor portal — tenant, landlord,
 * joint obligor, aval — must reject its previously-valid token. The receipt
 * portal rides the tenant token, so it dies with it by construction.
 */

test('E2E-11: cancelling a policy kills every actor portal token', async ({ page }) => {
  test.setTimeout(300_000);
  await freshDb();
  await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Cana', paternalLastName: 'Celada', email: 'cancel.tenant@example.com' },
    landlord: { firstName: 'Luis', paternalLastName: 'Dueño', email: 'cancel.landlord@example.com' },
    guarantor: {
      type: 'BOTH',
      jointObligor: { email: 'cancel.jo@example.com', firstName: 'Jorge', paternalLastName: 'Obligado' },
      aval: { email: 'cancel.aval@example.com', firstName: 'Alma', paternalLastName: 'Avalista' },
    },
  });
  const policy = await getOnlyPolicy();
  const tokens = await getActorTokens(policy.id);

  const portals: Array<{ path: string; token: string; probe: string }> = [
    { path: '/actor/tenant', token: tokens.tenant!.token, probe: '[name="firstName"]' },
    { path: '/actor/landlord', token: tokens.landlords[0].token, probe: '[name="firstName"]' },
    { path: '/actor/joint-obligor', token: tokens.jointObligors[0].token, probe: '[name="firstName"]' },
    { path: '/actor/aval', token: tokens.avals[0].token, probe: '[name="firstName"]' },
  ];

  // Pre-state: every link is alive (form renders).
  for (const portal of portals) {
    await page.goto(`${portal.path}/${portal.token}`);
    await expect(page.locator(portal.probe).first()).toBeVisible({ timeout: 30_000 });
  }

  // Admin cancels through the real UI.
  await page.goto(`/dashboard/policies/${policy.id}`);
  await page.getByTestId('policy-actions-menu').click();
  await page.getByRole('menuitem', { name: 'Cancelar Protección' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('combobox').click();
  await page.getByRole('option').first().click();
  await dialog.locator('#comment').fill('Cancelación E2E-11: verificación de muerte de tokens.');
  await dialog.getByRole('button', { name: 'Confirmar Cancelación' }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  expect(await getPolicyStatus(policy.id)).toBe('CANCELLED');

  // Every token column is gone…
  const [tenantRow, landlordRow, joRow, avalRow] = await Promise.all([
    prisma.tenant.findFirst({ where: { policyId: policy.id }, select: { accessToken: true, tokenExpiry: true } }),
    prisma.landlord.findFirst({ where: { policyId: policy.id }, select: { accessToken: true, tokenExpiry: true } }),
    prisma.jointObligor.findFirst({ where: { policyId: policy.id }, select: { accessToken: true, tokenExpiry: true } }),
    prisma.aval.findFirst({ where: { policyId: policy.id }, select: { accessToken: true, tokenExpiry: true } }),
  ]);
  for (const row of [tenantRow, landlordRow, joRow, avalRow]) {
    expect(row?.accessToken).toBeNull();
    expect(row?.tokenExpiry).toBeNull();
  }

  // …and every previously-valid link is dead at the portal: error screen,
  // zero form fields.
  for (const portal of portals) {
    await page.goto(`${portal.path}/${portal.token}`);
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(portal.probe)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Guardar y Continuar' })).toHaveCount(0);
  }
});
