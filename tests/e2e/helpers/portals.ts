import { Page, expect } from '@playwright/test';
import { samplePdf } from './files';

/**
 * Drives the actor self-service portals at /actor/<type>/<token> through the
 * real tab wizards (recon maps: #161). Mechanics shared by all portals:
 * - tabs must be saved IN ORDER ("Guardar y Continuar" advances automatically)
 * - the documents tab's button is "Enviar Información" and triggers submitActor
 *   server-side (completeness + required-docs validation → informationComplete)
 * - document uploads are real presigned PUTs to MinIO; the visible file input
 *   is #upload-<category_lowercase>; success = the file name appears in the list
 */

const save = (page: Page) => page.getByRole('button', { name: 'Guardar y Continuar' }).click();

async function waitPortalLoaded(page: Page) {
  await expect(page.getByText('Validando acceso...')).toBeHidden({ timeout: 30_000 });
}

/**
 * RHF hydration barrier: the wizard pre-creates each actor with an email, and
 * the portal form's defaultValues arrive with the getByToken query. Filling
 * before RHF applies them loses the keystrokes on the next render — so wait
 * until the known prefilled field actually shows its value.
 */
async function waitFormHydrated(page: Page, fieldName: string) {
  await expect(page.locator(`[name="${fieldName}"]`)).not.toHaveValue('', { timeout: 30_000 });
}

/**
 * Converging batch-fill for the portal's FIRST tab: late remounts (dev
 * strict-mode double effects + the token/localStorage dance) can wipe values
 * typed right after hydration. Fill everything, wait a beat, verify the whole
 * batch survived — retry until stable. Subsequent tabs mount without async
 * data and don't need this.
 */
async function fillAllStable(page: Page, entries: Array<[string, string]>) {
  await expect(async () => {
    for (const [name, value] of entries) {
      const loc = page.locator(`[name="${name}"]`);
      if ((await loc.inputValue()) !== value) await loc.fill(value);
    }
    await page.waitForTimeout(500); // let any pending remount fire
    for (const [name, value] of entries) {
      await expect(page.locator(`[name="${name}"]`)).toHaveValue(value, { timeout: 2_000 });
    }
  }).toPass({ timeout: 45_000 });
}

/** Upload one PDF into a DocumentManagerCard by category and wait for the row. */
async function uploadDoc(page: Page, category: string): Promise<void> {
  const name = `${category.toLowerCase()}-${Date.now()}`;
  await page.locator(`#upload-${category.toLowerCase()}`).setInputFiles(samplePdf(name));
  await expect(page.getByText(`${name}.pdf`)).toBeVisible({ timeout: 30_000 });
}

/** Fill a field that may be a plain input (has name attr) or a Radix select. */
async function fillOrSelect(page: Page, name: string, value: string): Promise<void> {
  const input = page.locator(`[name="${name}"]`);
  if ((await input.count()) > 0) {
    await input.fill(value);
    return;
  }
  throw new Error(`[e2e] field ${name} not found as input — adjust helper`);
}

async function pickFirstOption(page: Page, combobox: ReturnType<Page['getByRole']>): Promise<void> {
  await combobox.click();
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.getByRole('option').first().click();
}

/**
 * Pick the first option of every Radix select still showing its
 * "Seleccione..." placeholder. Prefilled selects (e.g. nationality) keep
 * their value; required-but-unset ones get a valid choice without the helper
 * having to know each tab's select inventory.
 */
async function pickUnsetSelects(page: Page): Promise<void> {
  const boxes = page.getByRole('combobox');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const box = boxes.nth(i);
    if (/Seleccion/i.test((await box.textContent()) ?? '')) {
      await pickFirstOption(page, box);
    }
  }
}

/** Open the (unset) Radix select and choose the option with the given name. */
async function pickOptionByName(page: Page, optionName: string): Promise<void> {
  const box = page.getByRole('combobox').filter({ hasText: 'Seleccion' }).first();
  await box.click();
  await page.getByRole('option', { name: optionName }).click();
}

/**
 * Optional string fields default to null from the DB while the router INPUT
 * schema takes string|undefined only (#175) — leaving them null 400s the tab
 * save. Fill whichever of them render, with a value that satisfies the
 * field's format.
 */
async function fillOptionalStrings(page: Page, names: string[]): Promise<void> {
  for (const name of names) {
    const loc = page.locator(`[name="${name}"]`);
    if (await loc.count()) {
      const lower = name.toLowerCase();
      await loc.fill(
        lower.includes('email') ? 'opt.e2e@example.com'
          : lower.includes('phone') ? '5500000000'
          : lower.includes('curp') ? 'GOLA850505MDFMPR03'
          : lower.includes('rfc') ? 'XAXX010101000'
          : 'Opcional',
      );
    }
  }
}

/** Fill one commercial-reference card (company actors: 3 required). */
async function fillCommercialReference(page: Page, i: number): Promise<void> {
  await page.locator(`[name="commercialReferences.${i}.companyName"]`).fill(`Proveedor ${i + 1} SA`);
  await page.locator(`[name="commercialReferences.${i}.contactFirstName"]`).fill(`Contacto${i + 1}`);
  await page.locator(`[name="commercialReferences.${i}.contactPaternalLastName"]`).fill(`López${i + 1}`);
  await page.locator(`[name="commercialReferences.${i}.phone"]`).fill(`55987654${30 + i}`);
  const rel = page.locator(`[name="commercialReferences.${i}.relationship"]`);
  if ((await rel.count()) > 0) await rel.fill('Proveedor');
}

/**
 * Fill the nth AddressAutocomplete manual grid on the page. The widget's
 * input ids are static and DUPLICATE when a tab renders several widgets
 * (landlord property tab's two, or one per card in the collective
 * multi-landlord form) — target by occurrence order.
 */
async function fillAddressNth(page: Page, nth: number): Promise<void> {
  await page.locator('#street').nth(nth).fill('Calle Actor');
  await page.locator('#exteriorNumber').nth(nth).fill('45');
  await page.locator('#neighborhood').nth(nth).fill('Roma Norte');
  await page.locator('#postalCode').nth(nth).fill('06700');
  await page.locator('#municipality').nth(nth).fill('Cuauhtémoc');
  await page.locator('#city').nth(nth).fill('Ciudad de México');
  await page.locator('#state').nth(nth).fill('CDMX');
}

async function fillAddress(page: Page): Promise<void> {
  await fillAddressNth(page, 0);
}

async function fillPersonalReference(page: Page, i: number, opts?: { relationship?: string }): Promise<void> {
  await page.locator(`[name="personalReferences.${i}.firstName"]`).fill(`Ref${i + 1}`);
  await page.locator(`[name="personalReferences.${i}.paternalLastName"]`).fill(`Apellido${i + 1}`);
  await page.locator(`[name="personalReferences.${i}.phone"]`).fill(`55123456${70 + i}`);
  const rel = page.locator(`[name="personalReferences.${i}.relationship"]`);
  if ((await rel.count()) > 0) {
    await rel.fill(opts?.relationship ?? 'Amigo');
  } else {
    // relationship rendered as a select in some tabs — scope to the reference card
    const card = page.locator(`[name="personalReferences.${i}.firstName"]`).locator('xpath=ancestor::*[contains(@class,"card") or self::fieldset][1]');
    await pickFirstOption(page, card.getByRole('combobox').first());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT — individual / MEXICAN (E2E-01) · FOREIGN variant (E2E-05)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeTenantIndividualPortal(
  page: Page,
  token: string,
  opts: { foreign?: boolean } = {},
): Promise<void> {
  await page.goto(`/actor/tenant/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal (tenantType INDIVIDUAL + nationality MEXICAN are defaults)
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Juan'],
    ['paternalLastName', 'Pérez'],
    ['curp', 'PEPJ900101HDFRRN09'],
    ['rfc', 'PEPJ900101AB1'],
    ['email', 'tenant.e2e@example.com'],
    ['phone', '5512345678'],
  ]);
  if (opts.foreign) {
    // FOREIGN reveals the passport field; the docs tab later requires the
    // immigration document (requirements config, condition: 'foreign').
    await page.getByRole('radio', { name: 'Extranjera' }).check();
    await expect(page.locator('[name="passport"]')).toBeVisible();
    await page.locator('[name="passport"]').fill('P12345678');
  }
  // addressDetails arrives as null from the DB and the tab schema is
  // .optional() (undefined-only) — filling it yields the object Zod accepts.
  await fillAddress(page);
  await save(page);

  // Tab 2 — Empleo
  await expect(page.locator('[name="occupation"]')).toBeVisible({ timeout: 20_000 });
  await pickFirstOption(page, page.getByRole('combobox').first()); // Situación Laboral
  await page.locator('[name="occupation"]').fill('Ingeniero');
  await page.locator('[name="employerName"]').fill('ACME SA de CV');
  await page.locator('[name="monthlyIncome"]').fill('35000');
  // employerAddressDetails is optional-but-not-nullable in the strict schema —
  // a DB null fails completeness ("Expected object, received null"), so give
  // it a real object (this tab's widget IS the employer address).
  await fillAddress(page);
  await save(page);

  // Tab 3 — Historial (all optional)
  await expect(page.getByRole('button', { name: 'Guardar y Continuar' })).toBeVisible();
  await save(page);

  // Tab 4 — Referencias (3 pre-rendered cards, min 3)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos (IDENTIFICATION, INCOME_PROOF, ADDRESS_PROOF, BANK_STATEMENT;
  // + IMMIGRATION_DOCUMENT when the personal tab saved nationality FOREIGN)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'INCOME_PROOF');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  if (opts.foreign) {
    await uploadDoc(page, 'IMMIGRATION_DOCUMENT');
  }
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT — company (E2E-02)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeTenantCompanyPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/tenant/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Información (company branch renders from the saved tenantType)
  await expect(page.locator('[name="companyName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['companyName', 'Empresa E2E SA de CV'],
    ['companyRfc', 'EMP900101AB1'],
    ['email', 'empresa.e2e@example.com'],
    ['phone', '5511112222'],
    ['legalRepFirstName', 'Laura'],
    ['legalRepPaternalLastName', 'Gómez'],
    ['legalRepPosition', 'Directora'],
    ['legalRepRfc', 'GOLA850505AB1'],
    ['legalRepEmail', 'laura.e2e@example.com'],
    ['legalRepPhone', '5533334444'],
  ]);
  await fillOptionalStrings(page, ['legalRepMiddleName', 'legalRepMaternalLastName', 'personalEmail', 'workPhone']);
  await fillAddress(page);
  await save(page);

  // Tab 2 — Referencias (commercial, 3 required)
  await expect(page.locator('[name="commercialReferences.0.companyName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillCommercialReference(page, i);
  await save(page);

  // Tab 3 — Documentos (5 required for company)
  await expect(page.locator('#upload-company_constitution')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'COMPANY_CONSTITUTION');
  await uploadDoc(page, 'LEGAL_POWERS');
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'TAX_STATUS_CERTIFICATE');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDLORD — individual
// ─────────────────────────────────────────────────────────────────────────────
export async function completeLandlordIndividualPortal(
  page: Page,
  token: string,
  opts: { email?: string } = {},
): Promise<void> {
  await page.goto(`/actor/landlord/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Información (per-record since #189: the portal renders ONLY the
  // token's landlord — the sibling-card hostage workarounds died with the
  // collective form)
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Carlos'],
    ['paternalLastName', 'Ramírez'],
    ['curp', 'RACX800202HDFMRR08'],
    ['rfc', 'RACX800202AB1'],
    ['email', opts.email ?? 'landlord.e2e@example.com'],
    ['phone', '5599887766'],
  ]);
  await fillAddress(page);
  await save(page);

  // Tab 2 — Propiedad (policy-level; property address is UI-required, second
  // widget is optional). May arrive prefilled when another landlord already
  // saved it — fill only when empty.
  await expect(page.locator('#street').first()).toBeVisible({ timeout: 20_000 });
  if (!(await page.locator('#street').first().inputValue())) {
    await fillAddress(page);
  }
  // The date fields reject empty strings ("Formato de fecha debe ser
  // YYYY-MM-DD" — schema lacks empty→null normalization), so fill both.
  const today = new Date().toISOString().slice(0, 10);
  await page.locator('[name="propertyDeliveryDate"]').fill(today);
  await page.locator('[name="contractSigningDate"]').fill(today);
  await save(page);

  // Tab 3 — Financiero (all optional; save through)
  await expect(page.getByRole('button', { name: 'Guardar y Continuar' })).toBeVisible({ timeout: 20_000 });
  await save(page);

  // Tab 4 — Documentos (IDENTIFICATION, PROPERTY_DEED, PROPERTY_TAX_STATEMENT)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// JOINT OBLIGOR — individual / INCOME guarantee (E2E-02)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeJointObligorIncomePortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/joint-obligor/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal (address is REQUIRED here, full 7-field grid)
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Miguel'],
    ['paternalLastName', 'Santos'],
    ['curp', 'SAMX850303HDFNTG05'],
    ['rfc', 'SAMX850303AB1'],
    ['email', 'jo.e2e@example.com'],
    ['phone', '5544556677'],
  ]);
  // Page is settled now — select + address widget fills are safe.
  await pickFirstOption(page, page.getByRole('combobox').first()); // Relación con el Inquilino
  await fillAddress(page);
  await save(page);

  // Tab 2 — Empleo (status + occupation ≥4 chars)
  await expect(page.locator('[name="occupation"]')).toBeVisible({ timeout: 20_000 });
  await pickFirstOption(page, page.getByRole('combobox').first()); // Situación Laboral
  await page.locator('[name="occupation"]').fill('Ingeniero');
  // monthlyIncome defaults to 0 and the schema demands .positive() — the
  // "optional" label lies ("Number must be greater than 0" on save).
  if (await page.locator('[name="monthlyIncome"]').count()) {
    await page.locator('[name="monthlyIncome"]').fill('40000');
  }
  // An empty employer-address object ({}) reaches upsertAddress and blows up
  // the save transaction ("Argument street is missing") — fill it for real.
  if (await page.locator('#street').count()) {
    await fillAddress(page);
  }
  await save(page);

  // Tab 3 — Garantía. The DB's guaranteeMethod is null, which beats the
  // component's INCOME default (the #171 class) — select the radio explicitly
  // so the INCOME branch renders.
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('radio', { name: 'Garantía por Ingresos' }).check();
  await expect(page.locator('[name="bankName"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[name="bankName"]').fill('BBVA');
  await page.locator('[name="accountHolder"]').fill('Miguel Santos');
  await page.locator('[name="monthlyIncome"]').fill('40000');
  await uploadDoc(page, 'INCOME_PROOF');
  await save(page);

  // Tab 4 — Referencias (exactly 3 fixed cards)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos (IDENTIFICATION, ADDRESS_PROOF, BANK_STATEMENT)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDLORD — company (E2E-03)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeLandlordCompanyPortal(
  page: Page,
  token: string,
  opts: { email?: string } = {},
): Promise<void> {
  await page.goto(`/actor/landlord/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Información: the wizard saved isCompany=true, so the company
  // branch renders from the start. Per-record since #189 — only the token's
  // landlord is on this form.
  await expect(page.locator('[name="companyName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['companyName', 'Inmobiliaria E2E SA de CV'],
    ['companyRfc', 'IEE900101AB1'],
    ['email', opts.email ?? 'inmobiliaria.e2e@example.com'],
    ['phone', '5522334455'],
    ['legalRepFirstName', 'Roberto'],
    ['legalRepPaternalLastName', 'Vega'],
  ]);
  await fillOptionalStrings(page, [
    'legalRepMiddleName',
    'legalRepMaternalLastName',
    'legalRepCurp',
    'legalRepRfc',
    'legalRepPosition',
    'legalRepEmail',
    'legalRepPhone',
    'businessType',
    'personalEmail',
    'workEmail',
    'workPhone',
  ]);
  await pickUnsetSelects(page);
  await fillAddress(page);
  await save(page);

  // Tab 2 — Propiedad (policy-level; may be prefilled by another landlord)
  await expect(page.locator('#street').first()).toBeVisible({ timeout: 20_000 });
  if (!(await page.locator('#street').first().inputValue())) {
    await fillAddress(page);
  }
  const today = new Date().toISOString().slice(0, 10);
  await page.locator('[name="propertyDeliveryDate"]').fill(today);
  await page.locator('[name="contractSigningDate"]').fill(today);
  await save(page);

  // Tab 3 — Financiero (all optional; save through)
  await expect(page.getByRole('button', { name: 'Guardar y Continuar' })).toBeVisible({ timeout: 20_000 });
  await save(page);

  // Tab 4 — Documentos (company set: constitution, powers, tax cert, deed, predial)
  await expect(page.locator('#upload-company_constitution')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'COMPANY_CONSTITUTION');
  await uploadDoc(page, 'LEGAL_POWERS');
  await uploadDoc(page, 'TAX_STATUS_CERTIFICATE');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// JOINT OBLIGOR — company (E2E-03 PROPERTY · E2E-06 INCOME)
// ─────────────────────────────────────────────────────────────────────────────

/** Fill the JO Garantía tab's PROPERTY branch (radio + fields + in-tab docs). */
async function fillJoPropertyGuarantee(page: Page): Promise<void> {
  await page.getByRole('radio', { name: 'Garantía con Propiedad' }).check();
  await expect(page.locator('[name="propertyValue"]')).toBeVisible({ timeout: 20_000 });
  await fillAddress(page); // guaranteePropertyDetails widget
  await page.locator('[name="propertyValue"]').fill('3500000');
  await page.locator('[name="propertyDeedNumber"]').fill('ESC-2024-789');
  await page.locator('[name="propertyRegistry"]').fill('FR-123456');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
}

/** Fill the JO Garantía tab's INCOME branch (radio + bank fields + income proof). */
async function fillJoIncomeGuarantee(page: Page): Promise<void> {
  await page.getByRole('radio', { name: 'Garantía por Ingresos' }).check();
  await expect(page.locator('[name="bankName"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[name="bankName"]').fill('BBVA');
  await page.locator('[name="accountHolder"]').fill('Garantías Corporativas E2E');
  await page.locator('[name="monthlyIncome"]').fill('80000');
  await uploadDoc(page, 'INCOME_PROOF');
}

async function completeJointObligorCompanyPortal(
  page: Page,
  token: string,
  method: 'PROPERTY' | 'INCOME',
): Promise<void> {
  await page.goto(`/actor/joint-obligor/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal. The portal opens with the INDIVIDUAL layout (the wizard
  // card has no type toggle, so the JO was created as INDIVIDUAL). Fill the
  // visible individual basics FIRST (they stay registered in RHF after the
  // switch, keeping any individual-schema validation happy), then flip to
  // Persona Moral and fill the company field set. toDb decomposes by the
  // saved jointObligorType.
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Patricia'],
    ['paternalLastName', 'Muñoz'],
    ['curp', 'MUXP800707MDFXXX02'],
    ['rfc', 'MUXP800707AB1'],
    ['email', 'jo.company.e2e@example.com'],
    ['phone', '5566778899'],
  ]);
  await page.getByRole('radio', { name: 'Persona Moral (Empresa)' }).check();
  await expect(page.locator('[name="companyName"]')).toBeVisible();
  await fillAllStable(page, [
    ['companyName', 'Garantías Corporativas E2E SA de CV'],
    ['companyRfc', 'GCE900101AB1'],
    ['legalRepFirstName', 'Patricia'],
    ['legalRepPaternalLastName', 'Muñoz'],
  ]);
  await fillOptionalStrings(page, [
    'legalRepMiddleName',
    'legalRepMaternalLastName',
    'legalRepPosition',
    'legalRepRfc',
    'legalRepEmail',
    'legalRepPhone',
    'personalEmail',
    'workPhone',
  ]);
  await pickUnsetSelects(page); // Relación con el Inquilino (and any other unset select)
  await fillAddress(page);
  await save(page);
  // The type-flip save has no auto-advance marker (the tab set is about to
  // change) — the success toast is the barrier that the save actually landed.
  await expect(page.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });

  // The wizard's tab SET derives from the saved jointObligorType, but its
  // saved/active tab state is client-only (useFormWizardTabs starts all-false)
  // — after the type-switching save the component can strand on a tab id the
  // company set doesn't have. Reload to re-mount with the company tab set,
  // land back on the (prefilled) personal tab, and re-save it to advance into
  // Garantía through the wizard's own gating.
  await page.reload();
  await waitPortalLoaded(page);
  await expect(page.locator('[name="companyName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'companyName');
  await pickUnsetSelects(page);
  await save(page);

  // Tab 2 — Garantía (per-method branch)
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 20_000 });
  if (method === 'PROPERTY') {
    await fillJoPropertyGuarantee(page);
  } else {
    await fillJoIncomeGuarantee(page);
  }
  await save(page);

  // Tab 3 — Referencias (company → 3 commercial references)
  await expect(page.locator('[name="commercialReferences.0.companyName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillCommercialReference(page, i);
  await save(page);

  // Tab 4 — Documentos (company set; guarantee docs already uploaded in Garantía)
  await expect(page.locator('#upload-company_constitution')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'COMPANY_CONSTITUTION');
  await uploadDoc(page, 'LEGAL_POWERS');
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'TAX_STATUS_CERTIFICATE');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

export async function completeJointObligorCompanyPropertyPortal(page: Page, token: string): Promise<void> {
  return completeJointObligorCompanyPortal(page, token, 'PROPERTY');
}

export async function completeJointObligorCompanyIncomePortal(page: Page, token: string): Promise<void> {
  return completeJointObligorCompanyPortal(page, token, 'INCOME');
}

// ─────────────────────────────────────────────────────────────────────────────
// JOINT OBLIGOR — individual / PROPERTY guarantee (E2E-05)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeJointObligorIndividualPropertyPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/joint-obligor/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal (same as the INCOME variant)
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Ricardo'],
    ['paternalLastName', 'Fuentes'],
    ['curp', 'FURX790909HDFNTC03'],
    ['rfc', 'FURX790909AB1'],
    ['email', 'jo.property.e2e@example.com'],
    ['phone', '5511224433'],
  ]);
  await pickFirstOption(page, page.getByRole('combobox').first()); // Relación con el Inquilino
  await fillAddress(page);
  await save(page);

  // Tab 2 — Empleo
  await expect(page.locator('[name="occupation"]')).toBeVisible({ timeout: 20_000 });
  await pickFirstOption(page, page.getByRole('combobox').first()); // Situación Laboral
  await page.locator('[name="occupation"]').fill('Contador');
  if (await page.locator('[name="monthlyIncome"]').count()) {
    await page.locator('[name="monthlyIncome"]').fill('50000');
  }
  if (await page.locator('#street').count()) {
    await fillAddress(page);
  }
  await save(page);

  // Tab 3 — Garantía: PROPERTY. The marital-status card renders for
  // individuals on this branch — pick Soltero(a) so no spouse is required.
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 20_000 });
  await fillJoPropertyGuarantee(page);
  await pickOptionByName(page, 'Soltero(a)');
  await save(page);

  // Tab 4 — Referencias (individual → 3 personal references)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos (individual set; deed/predial already uploaded)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAL — individual, married_joint (E2E-04)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeAvalMarriedPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/aval/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal (avalType INDIVIDUAL is the default radio)
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Fernando'],
    ['paternalLastName', 'Aguilar'],
    ['curp', 'AUFX820404HDFGRR07'],
    ['rfc', 'AUFX820404AB1'],
    ['email', 'aval.e2e@example.com'],
    ['phone', '5577889900'],
    ['relationshipToTenant', 'Familiar'], // plain input on the aval tab (select on JO)
  ]);
  await fillOptionalStrings(page, ['workPhone']);
  await pickUnsetSelects(page);
  await fillAddress(page);
  await save(page);

  // Tab 2 — Empleo
  await expect(page.locator('[name="occupation"]')).toBeVisible({ timeout: 20_000 });
  await pickUnsetSelects(page); // Situación Laboral
  await page.locator('[name="occupation"]').fill('Arquitecto');
  // monthlyIncome defaults to 0 and the schema demands .positive() (#175).
  if (await page.locator('[name="monthlyIncome"]').count()) {
    await page.locator('[name="monthlyIncome"]').fill('45000');
  }
  await fillOptionalStrings(page, ['employerName', 'position', 'incomeSource']);
  // An empty employer-address object reaches upsertAddress and 500s the tab
  // save ("Argument street is missing" — #175) — fill it for real.
  if (await page.locator('#street').count()) {
    await fillAddress(page);
  }
  await save(page);

  // Tab 3 — Propiedad: property guarantee + estado civil.
  await expect(page.locator('[name="propertyValue"]')).toBeVisible({ timeout: 20_000 });
  await fillAddress(page); // guaranteePropertyDetails widget
  await page.locator('[name="propertyValue"]').fill('2800000');
  await page.locator('[name="propertyDeedNumber"]').fill('ESC-2019-456');
  await page.locator('[name="propertyRegistry"]').fill('FR-654321');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');

  // married_joint (sociedad conyugal) reveals the spouse block. Probe the S3
  // conditional refine first: saving WITHOUT the spouse name must be blocked
  // on this tab, then filling it lets the save through.
  await pickOptionByName(page, 'Casado(a) - Sociedad Conyugal');
  await expect(page.locator('[name="spouseName"]')).toBeVisible();
  await save(page);
  await expect(page.getByText('Spouse name is required when married')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[name="propertyValue"]')).toBeVisible(); // still on the tab

  await page.locator('[name="spouseName"]').fill('María Elena López Hernández');
  await page.locator('[name="spouseRfc"]').fill('LOHM840606AB1');
  await page.locator('[name="spouseCurp"]').fill('LOHM840606MDFPRR04');
  // The married_* statuses reveal the OPTIONAL marriage-certificate slot
  // (#177 ruling: renders, never gates) — exercise the upload here.
  await uploadDoc(page, 'MARRIAGE_CERTIFICATE');
  await save(page);

  // Tab 4 — Referencias (3 personal references)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos (IDENTIFICATION, INCOME_PROOF, ADDRESS_PROOF, BANK_STATEMENT)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'INCOME_PROOF');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAL — individual, single (E2E-06)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeAvalSinglePortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/aval/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal (avalType INDIVIDUAL is the default radio)
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Andrea'],
    ['paternalLastName', 'Cortés'],
    ['curp', 'COXA900808MDFRRN01'],
    ['rfc', 'COXA900808AB1'],
    ['email', 'aval.single.e2e@example.com'],
    ['phone', '5599881122'],
    ['relationshipToTenant', 'Amiga'], // plain input on the aval tab
  ]);
  await fillOptionalStrings(page, ['workPhone']);
  await pickUnsetSelects(page);
  await fillAddress(page);
  await save(page);

  // Tab 2 — Empleo
  await expect(page.locator('[name="occupation"]')).toBeVisible({ timeout: 20_000 });
  await pickUnsetSelects(page); // Situación Laboral
  await page.locator('[name="occupation"]').fill('Diseñadora');
  if (await page.locator('[name="monthlyIncome"]').count()) {
    await page.locator('[name="monthlyIncome"]').fill('38000');
  }
  await fillOptionalStrings(page, ['employerName', 'position', 'incomeSource']);
  if (await page.locator('#street').count()) {
    await fillAddress(page);
  }
  await save(page);

  // Tab 3 — Propiedad: property guarantee, estado civil soltera (no spouse block)
  await expect(page.locator('[name="propertyValue"]')).toBeVisible({ timeout: 20_000 });
  await fillAddress(page); // guaranteePropertyDetails widget
  await page.locator('[name="propertyValue"]').fill('1900000');
  await page.locator('[name="propertyDeedNumber"]').fill('ESC-2021-111');
  await page.locator('[name="propertyRegistry"]').fill('FR-222333');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
  await pickOptionByName(page, 'Soltero(a)');
  await expect(page.locator('[name="spouseName"]')).toHaveCount(0);
  await save(page);

  // Tab 4 — Referencias (3 personal references)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'INCOME_PROOF');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAL — company (E2E-05)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeAvalCompanyPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/aval/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal: fill visible individual basics first (same rationale as
  // the JO company helper), flip to Persona Moral, fill the company set. The
  // service uses the POSTED avalType for tab filtering, so the company fields
  // persist on this very save.
  await expect(page.locator('[name="firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'email');
  await fillAllStable(page, [
    ['firstName', 'Marta'],
    ['paternalLastName', 'Ibarra'],
    ['curp', 'IAMX810101MDFBRR09'],
    ['rfc', 'IAMX810101AB1'],
    ['email', 'aval.company.e2e@example.com'],
    ['phone', '5544335566'],
  ]);
  await page.getByRole('radio', { name: 'Persona Moral (Empresa)' }).check();
  await expect(page.locator('[name="companyName"]')).toBeVisible();
  await fillAllStable(page, [
    ['companyName', 'Avales Corporativos E2E SA de CV'],
    ['companyRfc', 'ACE900101AB1'],
    ['legalRepFirstName', 'Marta'],
    ['legalRepPaternalLastName', 'Ibarra'],
    ['legalRepPosition', 'Directora General'],
    ['legalRepRfc', 'IAMX810101AB1'],
    ['legalRepEmail', 'marta.rep@example.com'],
    ['legalRepPhone', '5544335577'],
  ]);
  await fillOptionalStrings(page, [
    'legalRepMiddleName',
    'legalRepMaternalLastName',
    'workPhone',
  ]);
  if (await page.locator('[name="relationshipToTenant"]').count()) {
    await page.locator('[name="relationshipToTenant"]').fill('Socio Comercial');
  }
  await pickUnsetSelects(page);
  await fillAddress(page);
  await save(page);
  // Type-flip save barrier (tab set is about to lose Empleo).
  await expect(page.getByText('✓ Guardado').first()).toBeVisible({ timeout: 30_000 });

  // Same client-only tabSaved dance as the JO company helper: reload to mount
  // the company tab set, re-save the (prefilled) personal tab to advance.
  await page.reload();
  await waitPortalLoaded(page);
  await expect(page.locator('[name="companyName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'companyName');
  await pickUnsetSelects(page);
  await save(page);

  // Tab 2 — Propiedad (company: no estado-civil card)
  await expect(page.locator('[name="propertyValue"]')).toBeVisible({ timeout: 20_000 });
  await fillAddress(page);
  await page.locator('[name="propertyValue"]').fill('5200000');
  await page.locator('[name="propertyDeedNumber"]').fill('ESC-2018-999');
  await page.locator('[name="propertyRegistry"]').fill('FR-888777');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
  await save(page);

  // Tab 3 — Referencias (company → 3 commercial references)
  await expect(page.locator('[name="commercialReferences.0.companyName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillCommercialReference(page, i);
  await save(page);

  // Tab 4 — Documentos (company set)
  await expect(page.locator('#upload-company_constitution')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'COMPANY_CONSTITUTION');
  await uploadDoc(page, 'LEGAL_POWERS');
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'TAX_STATUS_CERTIFICATE');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}
