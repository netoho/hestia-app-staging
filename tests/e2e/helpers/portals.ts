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
 * Fill the AddressAutocomplete manual grid. The widget's input ids are static
 * and DUPLICATE when a tab renders two widgets (landlord property tab) — the
 * primary address renders first, so target the first match.
 */
async function fillAddress(page: Page): Promise<void> {
  await page.locator('#street').first().fill('Calle Actor');
  await page.locator('#exteriorNumber').first().fill('45');
  await page.locator('#neighborhood').first().fill('Roma Norte');
  await page.locator('#postalCode').first().fill('06700');
  await page.locator('#municipality').first().fill('Cuauhtémoc');
  await page.locator('#city').first().fill('Ciudad de México');
  await page.locator('#state').first().fill('CDMX');
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
// TENANT — individual / MEXICAN (E2E-01)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeTenantIndividualPortal(page: Page, token: string): Promise<void> {
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
// LANDLORD — individual (single landlord)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeLandlordIndividualPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/landlord/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Información (owner-info; index 0 = the only landlord)
  await expect(page.locator('[name="landlords.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'landlords.0.email');
  await fillAllStable(page, [
    ['landlords.0.firstName', 'Carlos'],
    ['landlords.0.paternalLastName', 'Ramírez'],
    ['landlords.0.curp', 'RACX800202HDFMRR08'],
    ['landlords.0.rfc', 'RACX800202AB1'],
    ['landlords.0.email', 'landlord.e2e@example.com'],
    ['landlords.0.phone', '5599887766'],
  ]);
  await fillAddress(page); // Dirección Actual is UI-required on this tab
  await save(page);

  // Tab 2 — Propiedad (property address is UI-required; second widget is optional)
  await expect(page.locator('#street').first()).toBeVisible({ timeout: 20_000 });
  await fillAddress(page);
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
export async function completeLandlordCompanyPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/landlord/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Información: the wizard saved isCompany=true, so the company
  // branch renders from the start (no toggle dance needed).
  await expect(page.locator('[name="landlords.0.companyName"]')).toBeVisible({ timeout: 20_000 });
  await waitFormHydrated(page, 'landlords.0.email');
  await fillAllStable(page, [
    ['landlords.0.companyName', 'Inmobiliaria E2E SA de CV'],
    ['landlords.0.companyRfc', 'IEE900101AB1'],
    ['landlords.0.email', 'inmobiliaria.e2e@example.com'],
    ['landlords.0.phone', '5522334455'],
    ['landlords.0.legalRepFirstName', 'Roberto'],
    ['landlords.0.legalRepPaternalLastName', 'Vega'],
  ]);
  await fillOptionalStrings(page, [
    'landlords.0.legalRepMiddleName',
    'landlords.0.legalRepMaternalLastName',
    'landlords.0.legalRepCurp',
    'landlords.0.legalRepRfc',
    'landlords.0.legalRepPosition',
    'landlords.0.legalRepEmail',
    'landlords.0.legalRepPhone',
    'landlords.0.businessType',
    'landlords.0.personalEmail',
    'landlords.0.workEmail',
    'landlords.0.workPhone',
  ]);
  await pickUnsetSelects(page);
  await fillAddress(page); // Dirección Actual is UI-required on this tab
  await save(page);

  // Tab 2 — Propiedad (same layout as the individual variant)
  await expect(page.locator('#street').first()).toBeVisible({ timeout: 20_000 });
  await fillAddress(page);
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
// JOINT OBLIGOR — company / PROPERTY guarantee (E2E-03)
// ─────────────────────────────────────────────────────────────────────────────
export async function completeJointObligorCompanyPropertyPortal(page: Page, token: string): Promise<void> {
  await page.goto(`/actor/joint-obligor/${token}`);
  await waitPortalLoaded(page);

  // Tab 1 — Personal. The portal opens with the INDIVIDUAL layout (the wizard
  // card has no type toggle, so the JO was created as INDIVIDUAL). The tab's
  // zodResolver was also built for INDIVIDUAL at mount — so fill the visible
  // individual basics FIRST (they stay registered in RHF after the switch and
  // keep that validation happy), then flip to Persona Moral and fill the
  // company field set. toDb decomposes by the saved jointObligorType.
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

  // Tab 2 — Garantía: PROPERTY method (radio), property data + in-tab deed/tax docs
  await expect(page.getByText('Método de Garantía')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('radio', { name: 'Garantía con Propiedad' }).check();
  await expect(page.locator('[name="propertyValue"]')).toBeVisible({ timeout: 20_000 });
  await fillAddress(page); // guaranteePropertyDetails widget
  await page.locator('[name="propertyValue"]').fill('3500000');
  await page.locator('[name="propertyDeedNumber"]').fill('ESC-2024-789');
  await page.locator('[name="propertyRegistry"]').fill('FR-123456');
  await uploadDoc(page, 'PROPERTY_DEED');
  await uploadDoc(page, 'PROPERTY_TAX_STATEMENT');
  await save(page);

  // Tab 3 — Referencias (company → 3 commercial references)
  await expect(page.locator('[name="commercialReferences.0.companyName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillCommercialReference(page, i);
  await save(page);

  // Tab 4 — Documentos (company set; deed/predial already uploaded in Garantía)
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
  await save(page);

  // Tab 4 — Referencias (3 personal references)
  await expect(page.locator('[name="personalReferences.0.firstName"]')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await fillPersonalReference(page, i);
  await save(page);

  // Tab 5 — Documentos (IDENTIFICATION, INCOME_PROOF, ADDRESS_PROOF, BANK_STATEMENT;
  // no MARRIAGE_CERTIFICATE card exists anywhere in the aval flow — see the
  // dead-category note on the E2E-04 spec)
  await expect(page.locator('#upload-identification')).toBeVisible({ timeout: 20_000 });
  await uploadDoc(page, 'IDENTIFICATION');
  await uploadDoc(page, 'INCOME_PROOF');
  await uploadDoc(page, 'ADDRESS_PROOF');
  await uploadDoc(page, 'BANK_STATEMENT');
  await page.getByRole('button', { name: 'Enviar Información' }).click();
  await expect(page.getByText(/Información (Enviada|Completa)/)).toBeVisible({ timeout: 30_000 });
}
