import { test, expect, Page } from '@playwright/test';
import { freshDb, prisma, getOnlyPolicy, getActorTokens, type ActorTokens } from '../helpers/db';
import { createPolicyViaWizard } from '../helpers/wizard';
import { seedActorDocument, s3ObjectExists } from '../helpers/seed';
import {
  walksFor,
  walkableFields,
  fillTabBySchema,
  fillPlainField,
  readFieldsBack,
  diffSurfaces,
  assertSkipsAllowed,
  type ActorWalk,
  type WalkTab,
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
 * save-hostage product call (de-collectivization = #189). COMPANY variants
 * are DB-seeded (the type-flip dance itself is E2E-02/06 territory).
 *
 * E2E-09c is the REVERSE direction: after a forward walk, the admin edits a
 * probe field per tab in the inline editor and the portal must render every
 * probe. INDIVIDUAL only — both surfaces render the same ActorWizard, so the
 * COMPANY forward walk (09b) plus one reverse direction covers the
 * invariant. E2E-09d: admin deletes (a personal reference + a document)
 * propagate to the portal, the DB, and S3. Staleness choreography is
 * E2E-10 (own spec).
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

// ─── E2E-09c: reverse direction — admin probes render in the portal ─────────

/**
 * Probe fields are restricted to format-free text controls so a plain
 * `.fill()` stays resolver-valid. First match wins; a tab with no candidate
 * is skipped (the forward walk already proved its parity) — but every actor
 * must yield at least one probe.
 */
const PROBE_PREFERENCE: RegExp[] = [
  /email$/i,
  /^employerName$/,
  /^occupation$/,
  /^bankName$/,
  /^accountHolder$/,
  /^propertyDeedNumber$/,
  /^previousLandlordName$/,
  /^companyName$/,
  /^businessDescription$/,
];

function pickProbe(filledFields: string[]): string | null {
  for (const rule of PROBE_PREFERENCE) {
    const hit = filledFields.find((f) => rule.test(f));
    if (hit) return hit;
  }
  return null;
}

function probeValueFor(field: string, actor: string, tabId: string): string {
  return /email$/i.test(field)
    ? `probe.${actor}.${tabId}@example.com`.toLowerCase()
    : `Probe ${actor} ${tabId}`;
}

test('E2E-09c: reverse direction — admin inline probe edits render in the actor portals', async ({ page }) => {
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
  const walks = walksFor('INDIVIDUAL');

  // Forward pass: make every tab resolver-valid so bare saves advance later.
  const expectedByActor: Record<string, Record<string, Record<string, string>>> = {};
  for (const walk of walks) {
    expectedByActor[walk.actorType] = await walkPortal(page, walk, tokenFor(walk, tokens));
  }

  // Admin pass: one probe per tab through the inline editor (free tab nav).
  const probes: Record<string, Record<string, { field: string; value: string }>> = {};
  for (const walk of walks) {
    await page.goto(`/dashboard/policies/${policy.id}?tab=${walk.adminTab}`);
    await page.getByRole('button', { name: 'Editar' }).nth(walk.editorIndex).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    probes[walk.actorType] = {};
    for (const tab of walk.tabs) {
      if (tab.transitFill) continue;
      const probeField = pickProbe(Object.keys(expectedByActor[walk.actorType][tab.id]));
      if (!probeField) continue;
      const value = probeValueFor(probeField, walk.actorType, tab.id);

      await dialog.getByRole('tab', { name: tab.label, exact: true }).click();
      const name = (tab.prefix ?? '') + probeField;
      await fillPlainField(dialog, name, value);
      await dialog.getByRole('button', { name: SAVE_BUTTON }).click();
      // Save barrier: the wizard auto-advances on success, unmounting this
      // tab (a documents tab always follows the walked tabs, so there is
      // always somewhere to advance to).
      await dialog
        .locator(`[data-field="${name}"]`)
        .waitFor({ state: 'hidden', timeout: 30_000 });

      probes[walk.actorType][tab.id] = { field: probeField, value };
    }
    expect(
      Object.keys(probes[walk.actorType]).length,
      `${walk.actorType}: no probe-able tab`,
    ).toBeGreaterThan(0);

    // Close via the X button — Escape proved unreliable right after a save's
    // auto-advance (dialog stayed open under the walker).
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  }

  // Portal pass: every probe must render on the actor's own surface.
  const drift: Record<string, unknown> = {};
  for (const walk of walks) {
    await page.goto(`${walk.portalPath}/${tokenFor(walk, tokens)}`);
    for (const [i, tab] of walk.tabs.entries()) {
      if (tab.transitFill) {
        await tab.transitFill(page);
        await page.getByRole('button', { name: SAVE_BUTTON }).click();
        continue;
      }
      const probe = probes[walk.actorType][tab.id];
      const waitField = (tab.prefix ?? '') + (probe?.field ?? Object.keys(expectedByActor[walk.actorType][tab.id])[0]);
      await page.locator(`[data-field="${waitField}"]`).first().waitFor({ timeout: 30_000 });

      if (probe) {
        const { values } = await readFieldsBack(page, tab, [probe.field]);
        if (values[probe.field] !== probe.value) {
          drift[`${walk.actorType}/${tab.id}/${probe.field}`] = {
            admin: probe.value,
            portal: values[probe.field],
          };
        }
      }
      // Advance (sequential portal gating) — not needed after the last tab.
      if (i < walk.tabs.length - 1) {
        await page.getByRole('button', { name: SAVE_BUTTON }).click();
      }
    }
  }
  expect(drift).toEqual({});
});

// ─── E2E-09d: admin deletes propagate to portal + DB + S3 ────────────────────

test('E2E-09d: admin deletes — reference and document removal propagate to portal, DB and S3', async ({ page }) => {
  test.setTimeout(420_000);
  // Document deletion asks for a NATIVE window.confirm — Playwright dismisses
  // native dialogs by default, which silently aborts the delete.
  page.on('dialog', (d) => void d.accept());
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
  const tenantWalk = walksFor('INDIVIDUAL')[0];
  const tenantId = tokens.tenant!.id;

  // Seed 4 references (one above the UI minimum of 3, so one is deletable)
  // and one document with a REAL MinIO object behind it.
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      personalReferences: {
        create: Array.from({ length: 4 }, (_, i) => ({
          firstName: `Referencia${i + 1}`,
          paternalLastName: 'Borrable',
          phone: `55222222${String(i).padStart(2, '0')}`,
          relationship: 'Amistad',
          email: `ref${i + 1}@example.com`,
          occupation: 'Comerciante',
        })),
      },
    },
  });
  const doc = await seedActorDocument('BANK_STATEMENT', 'tenant', { tenantId });
  expect(await s3ObjectExists(doc.s3Key)).toBe(true);

  const refFieldCount = (scope: Page | ReturnType<Page['locator']>) =>
    scope.locator('[data-field^="personalReferences."][data-field$=".firstName"]').count();

  // Portal pre-state: advance to the references tab; the 4 seeded cards render.
  const token = tokenFor(tenantWalk, tokens);
  await page.goto(`${tenantWalk.portalPath}/${token}`);
  for (const tab of tenantWalk.tabs) {
    await fillTabBySchema(page, tab);
    await page.getByRole('button', { name: SAVE_BUTTON }).click();
  }
  await page.locator('[data-field="personalReferences.0.firstName"]').waitFor({ timeout: 30_000 });
  expect(await refFieldCount(page)).toBe(4);

  // Admin: delete reference #4, save; then delete the document.
  await page.goto(`/dashboard/policies/${policy.id}?tab=tenant`);
  await page.getByRole('button', { name: 'Editar' }).nth(0).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  await dialog.getByRole('tab', { name: 'Referencias', exact: true }).click();
  await dialog.locator('[data-field="personalReferences.3.firstName"]').waitFor({ timeout: 15_000 });
  expect(await refFieldCount(dialog)).toBe(4);
  await dialog
    .getByText('Referencia Personal 4', { exact: true })
    .locator('..')
    .getByRole('button')
    .click();
  await expect(dialog.locator('[data-field="personalReferences.3.firstName"]')).toBeHidden();
  await dialog.getByRole('button', { name: SAVE_BUTTON }).click();
  // Save barrier: auto-advance unmounts the references tab.
  await dialog
    .locator('[data-field="personalReferences.0.firstName"]')
    .waitFor({ state: 'hidden', timeout: 30_000 });

  await dialog.getByRole('tab', { name: 'Documentos', exact: true }).click();
  await dialog.getByText(doc.fileName).waitFor({ timeout: 15_000 });
  await dialog.getByTitle('Eliminar documento').click();
  await expect(dialog.getByText(doc.fileName)).toBeHidden({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // DB + S3: the row is gone everywhere; deleteDocument removes the S3
  // object BEFORE the row (documentService.ts) — avatars are the remaining
  // #172 gap, not actor documents.
  expect(
    await prisma.personalReference.count({ where: { tenantId } }),
  ).toBe(3);
  expect(
    await prisma.actorDocument.findUnique({ where: { id: doc.id } }),
  ).toBeNull();
  expect(await s3ObjectExists(doc.s3Key)).toBe(false);

  // Portal post-state: 3 cards; the document is gone from the documents tab.
  await page.goto(`${tenantWalk.portalPath}/${token}`);
  for (const tab of tenantWalk.tabs) {
    await page
      .locator(`[data-field="${(tab.prefix ?? '') + walkFirstField(tab)}"]`)
      .first()
      .waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: SAVE_BUTTON }).click();
  }
  await page.locator('[data-field="personalReferences.0.firstName"]').waitFor({ timeout: 30_000 });
  expect(await refFieldCount(page)).toBe(3);
  // Save the (3 valid seeded) references to unlock the documents tab.
  await page.getByRole('button', { name: SAVE_BUTTON }).click();
  await expect(page.getByRole('button', { name: 'Enviar Información' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(doc.fileName)).toHaveCount(0);
});

/** First expected-rendered field of a walked tab (barrier helper). */
function walkFirstField(tab: WalkTab): string {
  const allowed = new Set(tab.allowedSkip ?? []);
  const fields = walkableFields(tab.schema);
  return fields.find((f) => !allowed.has(f) && !allowed.has(f.split('.')[0])) ?? fields[0];
}

// ─── E2E-09e: multi-landlord — per-record isolation + admin add/remove ──────

test('E2E-09e: multi-landlord — per-record portals, zero cross-bleed, admin add/remove co-owner', async ({ page }) => {
  test.setTimeout(420_000);
  await freshDb();
  const LANDLORD_A_EMAIL = 'walker.landlordA@example.com';
  const LANDLORD_B_EMAIL = 'walker.landlordB@example.com';
  await createPolicyViaWizard(page, {
    tenant: { type: 'INDIVIDUAL', firstName: 'Wanda', paternalLastName: 'Walker', email: 'walker.tenant@example.com' },
    landlord: { firstName: 'Aurelio', paternalLastName: 'Primero', email: LANDLORD_A_EMAIL },
    coLandlords: [{ firstName: 'Berta', paternalLastName: 'Segunda', email: LANDLORD_B_EMAIL }],
    guarantor: { type: 'NONE' },
  });
  const policy = await getOnlyPolicy();
  const tokens = await getActorTokens(policy.id);
  const landlordA = tokens.landlords.find((l) => l.email === LANDLORD_A_EMAIL)!;
  const landlordB = tokens.landlords.find((l) => l.email === LANDLORD_B_EMAIL)!;
  const ownerTab = walksFor('INDIVIDUAL')[1].tabs[0];

  // Portal A: renders ONLY its own record — plain names, own email, no
  // indexed collective fields, and the sibling is nowhere on the page.
  await page.goto(`/actor/landlord/${landlordA.token}`);
  await expect(page.locator('[name="email"]')).toHaveValue(LANDLORD_A_EMAIL, { timeout: 30_000 });
  expect(await page.locator('[name^="landlords."]').count()).toBe(0);
  await expect(page.getByText('Berta')).toHaveCount(0);

  await fillTabBySchema(page, ownerTab);
  await fillPlainField(page, 'firstName', 'SoloPropietarioA');
  await fillPlainField(page, 'email', LANDLORD_A_EMAIL);
  await page.getByRole('button', { name: SAVE_BUTTON }).click();
  await page.locator('[name="propertyDeliveryDate"]').waitFor({ timeout: 30_000 });

  // Portal B: untouched by A's save; fill with DISTINCT values.
  await page.goto(`/actor/landlord/${landlordB.token}`);
  await expect(page.locator('[name="email"]')).toHaveValue(LANDLORD_B_EMAIL, { timeout: 30_000 });
  await expect(page.locator('[name="firstName"]')).not.toHaveValue('SoloPropietarioA');
  await fillTabBySchema(page, ownerTab);
  await fillPlainField(page, 'firstName', 'CopropietariaB');
  await fillPlainField(page, 'email', LANDLORD_B_EMAIL);
  await page.getByRole('button', { name: SAVE_BUTTON }).click();
  await page.locator('[name="propertyDeliveryDate"]').waitFor({ timeout: 30_000 });

  // DB: both rows hold their own values — no bleed in either direction.
  const rowA = await prisma.landlord.findUnique({ where: { id: landlordA.id } });
  const rowB = await prisma.landlord.findUnique({ where: { id: landlordB.id } });
  expect(rowA?.firstName).toBe('SoloPropietarioA');
  expect(rowB?.firstName).toBe('CopropietariaB');

  // Admin: one editor per landlord card, each per-record.
  await page.goto(`/dashboard/policies/${policy.id}?tab=landlord`);
  const seen = new Set<string>();
  for (const idx of [0, 1]) {
    await page.getByRole('button', { name: 'Editar' }).nth(idx).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const control = dialog.locator('[data-field="firstName"]');
    await control.waitFor({ timeout: 15_000 });
    seen.add(await control.inputValue());
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  }
  expect(seen).toEqual(new Set(['SoloPropietarioA', 'CopropietariaB']));

  // Admin adds a co-owner: a third card appears, DB row exists empty, and
  // the activity trail records it.
  await page.getByRole('button', { name: 'Agregar Copropietario' }).click();
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(3, { timeout: 20_000 });
  const added = await prisma.landlord.findFirst({
    where: { policyId: policy.id, email: '' },
  });
  expect(added).not.toBeNull();
  expect(
    await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'landlord_added' },
    }),
  ).not.toBeNull();

  // Admin removes it (confirm dialog) — card gone, row gone, event logged
  // (#183: removal now leaves an audit trace).
  await page.getByRole('button', { name: 'Eliminar' }).last().click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(2, { timeout: 20_000 });
  expect(
    await prisma.landlord.findUnique({ where: { id: added!.id } }),
  ).toBeNull();
  expect(
    await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'landlord_removed' },
    }),
  ).not.toBeNull();
});
