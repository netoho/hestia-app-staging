import { test, expect, Page } from '@playwright/test';
import { freshDb, getOnlyPolicy, getActorTokens } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  INDIVIDUAL_WALKS,
  fillTabBySchema,
  readFieldsBack,
  diffSurfaces,
  assertSkipsAllowed,
  type ActorWalk,
} from '../helpers/walker';

/**
 * E2E-09 — #180 parity walker, PR A: portal → inline-admin full-field parity
 * for tenant / joint obligor / aval (INDIVIDUAL variants).
 *
 * Every field the canonical domain tab schemas declare is filled through the
 * REAL portal UI (located by the data-field attribute FormControl stamps —
 * RHF name === schema key), then read back field-by-field in the inline
 * admin editor. Since T3 both surfaces render the same ActorWizard; this
 * spec proves the DATA under it survives the round trip. A schema field
 * whose control can't be located (naming drift, unregistered input — the
 * aval companyRfc class) fails the walk unless documented as a conditional.
 *
 * Landlord (collective indexed form) + COMPANY variants + reverse direction
 * + deletes are the next PRs of #180.
 */

const SAVE_BUTTON = 'Guardar y Continuar';

async function walkPortal(page: Page, walk: ActorWalk, token: string) {
  const expected: Record<string, Record<string, string>> = {};
  await page.goto(`${walk.portalPath}/${token}`);

  for (const tab of walk.tabs) {
    // The first walked tab is active on load; subsequent ones via auto-advance
    // after each save. Barrier: the tab's first schema field becomes visible.
    const { filled, skipped } = await fillTabBySchema(page, tab);
    expect(
      Object.keys(filled).length,
      `${walk.actorType}/${tab.id} filled nothing`,
    ).toBeGreaterThan(0);
    assertSkipsAllowed(walk.actorType, tab, skipped);

    await tab.beforeSave?.(page);
    await page.getByRole('button', { name: SAVE_BUTTON }).click();
    await expect(page.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });

    expected[tab.id] = filled;
  }
  return expected;
}

async function readAdminEditor(
  page: Page,
  policyId: string,
  walk: ActorWalk,
  editorIndex: number,
  expected: Record<string, Record<string, string>>,
) {
  await page.goto(`/dashboard/policies/${policyId}?tab=${walk.adminTab}`);
  await page.getByRole('button', { name: 'Editar' }).nth(editorIndex).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  const problems: Record<string, unknown> = {};
  for (const tab of walk.tabs) {
    await dialog.getByRole('tab', { name: tab.label, exact: true }).click();
    const fields = Object.keys(expected[tab.id]);
    // Barrier: wait for the tab content to mount (first expected field).
    await dialog.locator(`[data-field="${fields[0]}"]`).first().waitFor({ timeout: 15_000 });

    const { values, missing } = await readFieldsBack(dialog, tab, fields);
    const diff = diffSurfaces(expected[tab.id], values);
    if (missing.length) problems[`${tab.id}: missing controls`] = missing;
    if (Object.keys(diff).length) problems[`${tab.id}: value drift`] = diff;
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  return problems;
}

test('E2E-09: portal-filled fields are identical in the inline admin editor (tenant + JO + aval)', async ({ page }) => {
  test.setTimeout(600_000);
  await freshDb();

  await createPolicyViaWizard(page, {
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

  // ── Portal pass: fill EVERY schema field through the real portals ─────────
  const expectedByActor: Record<string, Record<string, Record<string, string>>> = {};
  for (const walk of INDIVIDUAL_WALKS) {
    const token =
      walk.actorType === 'tenant'
        ? tokens.tenant!.token
        : walk.actorType === 'jointObligor'
          ? tokens.jointObligors[0].token
          : tokens.avals[0].token;
    expectedByActor[walk.actorType] = await walkPortal(page, walk, token);
  }

  // ── Admin pass: same fields, same values, in the inline editor ────────────
  const allProblems: Record<string, unknown> = {};
  for (const walk of INDIVIDUAL_WALKS) {
    // tenant tab has one Editar; guarantors tab renders JO first, aval second.
    const editorIndex = walk.actorType === 'aval' ? 1 : 0;
    const problems = await readAdminEditor(
      page,
      policy.id,
      walk,
      editorIndex,
      expectedByActor[walk.actorType],
    );
    if (Object.keys(problems).length) allProblems[walk.actorType] = problems;
  }

  expect(allProblems).toEqual({});
});
