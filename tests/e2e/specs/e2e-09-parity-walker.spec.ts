import { test, expect, Page } from '@playwright/test';
import { freshDb, prisma, getOnlyPolicy, getActorTokens, type ActorTokens } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import {
  walksFor,
  fillTabBySchema,
  readFieldsBack,
  diffSurfaces,
  assertSkipsAllowed,
  type ActorWalk,
  type WalkVariant,
} from '../helpers/walker';

/**
 * E2E-09 — #180 parity walker: portal → inline-admin full-field parity for
 * ALL FOUR actors, INDIVIDUAL and COMPANY variants.
 *
 * Every field the canonical domain tab schemas declare is filled through the
 * REAL portal UI (located by the data-field attribute FormControl stamps —
 * RHF name === schema key), then read back field-by-field in the inline
 * admin editor. A schema field whose control can't be located fails the walk
 * unless documented as a conditional.
 *
 * Landlord runs the collective form with a SINGLE landlord (indexed names,
 * `landlords.0.*`); multi-landlord parity is blocked on the #171
 * save-hostage product call. COMPANY variants are DB-seeded (the type-flip
 * dance itself is E2E-02/06 territory). Reverse direction + deletes +
 * staleness choreography are the next PRs of #180.
 */

const SAVE_BUTTON = 'Guardar y Continuar';

function tokenFor(walk: ActorWalk, tokens: ActorTokens): string {
  switch (walk.actorType) {
    case 'tenant':
      return tokens.tenant!.token;
    case 'landlord':
      return tokens.landlords[0].token;
    case 'jointObligor':
      return tokens.jointObligors[0].token;
    case 'aval':
      return tokens.avals[0].token;
  }
}

/** Flip every actor to its COMPANY variant directly in the DB (seed convention). */
async function flipActorsToCompany(policyId: string): Promise<void> {
  await prisma.tenant.updateMany({ where: { policyId }, data: { tenantType: 'COMPANY' } });
  await prisma.landlord.updateMany({ where: { policyId }, data: { isCompany: true } });
  await prisma.jointObligor.updateMany({
    where: { policyId },
    data: { jointObligorType: 'COMPANY' },
  });
  await prisma.aval.updateMany({ where: { policyId }, data: { avalType: 'COMPANY' } });
}

async function walkPortal(page: Page, walk: ActorWalk, token: string) {
  const expected: Record<string, Record<string, string>> = {};
  await page.goto(`${walk.portalPath}/${token}`);

  for (const [i, tab] of walk.tabs.entries()) {
    if (tab.transitFill) {
      // Pass-through tab: satisfy its save gate and move on (no asserts —
      // the next tab's own first-field barrier is the synchronization).
      await tab.transitFill(page);
      await page.getByRole('button', { name: SAVE_BUTTON }).click();
      continue;
    }
    // The first walked tab is active on load; subsequent ones via
    // auto-advance after each save — fillTabBySchema's first-field barrier
    // (30s) is the inter-tab synchronization; a lingering toast from the
    // previous save can false-pass a toast assert, so only the FINAL save
    // (no next tab to wait on) uses one.
    const { filled, skipped } = await fillTabBySchema(page, tab);
    expect(
      Object.keys(filled).length,
      `${walk.actorType}/${tab.id} filled nothing`,
    ).toBeGreaterThan(0);
    assertSkipsAllowed(walk.actorType, tab, skipped);

    await tab.beforeSave?.(page);
    if (i === walk.tabs.length - 1) {
      // Fresh-toast barrier for the terminal save: no follow-up tab exists.
      await expect(page.getByText('✓ Guardado')).toHaveCount(0, { timeout: 15_000 });
      await page.getByRole('button', { name: SAVE_BUTTON }).click();
      try {
        await expect(page.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });
      } catch (err) {
        // Toastless save = the resolver rejected (possibly on an unmounted
        // field — no visible feedback). Surface what RHF actually flagged.
        const invalid = await page
          .locator('[data-field][aria-invalid="true"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('data-field')));
        const messages = await page
          .locator('form p.text-destructive, form [id$="-form-item-message"]')
          .allTextContents();
        throw new Error(
          `${walk.actorType}/${tab.id}: save produced no toast. aria-invalid fields: ${JSON.stringify(invalid)}; messages: ${JSON.stringify(messages)}`,
          { cause: err },
        );
      }
    } else {
      await page.getByRole('button', { name: SAVE_BUTTON }).click();
    }

    expected[tab.id] = filled;
  }
  return expected;
}

async function readAdminEditor(
  page: Page,
  policyId: string,
  walk: ActorWalk,
  expected: Record<string, Record<string, string>>,
) {
  await page.goto(`/dashboard/policies/${policyId}?tab=${walk.adminTab}`);
  await page.getByRole('button', { name: 'Editar' }).nth(walk.editorIndex).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  const problems: Record<string, unknown> = {};
  for (const tab of walk.tabs) {
    if (tab.transitFill) continue; // pass-through tab, nothing asserted
    await dialog.getByRole('tab', { name: tab.label, exact: true }).click();
    const fields = Object.keys(expected[tab.id]);
    // Barrier: wait for the tab content to mount (first expected field).
    await dialog
      .locator(`[data-field="${(tab.prefix ?? '') + fields[0]}"]`)
      .first()
      .waitFor({ timeout: 15_000 });

    const { values, missing } = await readFieldsBack(dialog, tab, fields);
    const diff = diffSurfaces(expected[tab.id], values);
    if (missing.length) problems[`${tab.id}: missing controls`] = missing;
    if (Object.keys(diff).length) problems[`${tab.id}: value drift`] = diff;
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  return problems;
}

async function runWalk(page: Page, variant: WalkVariant) {
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
  if (variant === 'COMPANY') await flipActorsToCompany(policy.id);
  const tokens = await getActorTokens(policy.id);

  // ── Portal pass: fill EVERY schema field through the real portals ─────────
  const walks = walksFor(variant);
  const expectedByActor: Record<string, Record<string, Record<string, string>>> = {};
  for (const walk of walks) {
    expectedByActor[walk.actorType] = await walkPortal(page, walk, tokenFor(walk, tokens));
  }

  // ── Admin pass: same fields, same values, in the inline editor ────────────
  const allProblems: Record<string, unknown> = {};
  for (const walk of walks) {
    const problems = await readAdminEditor(page, policy.id, walk, expectedByActor[walk.actorType]);
    if (Object.keys(problems).length) allProblems[walk.actorType] = problems;
  }

  expect(allProblems).toEqual({});
}

test('E2E-09a: INDIVIDUAL variants — portal fields identical in the inline admin editor (all four actors)', async ({ page }) => {
  test.setTimeout(600_000);
  await runWalk(page, 'INDIVIDUAL');
});

test('E2E-09b: COMPANY variants — portal fields identical in the inline admin editor (all four actors)', async ({ page }) => {
  test.setTimeout(600_000);
  await runWalk(page, 'COMPANY');
});
