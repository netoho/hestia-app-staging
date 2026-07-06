import { Page, expect } from '@playwright/test';

/**
 * Drives the policy-creation wizard at /dashboard/policies/new.
 * Selector strategy (recon 2026-07-05): RHF `name` attributes + label text are
 * stable; Radix selects have no name — one `combobox` per step, targeted by
 * role. The bottom "Guardar y Continuar" submits the active step's form.
 */

export interface WizardTenant {
  type: 'INDIVIDUAL' | 'COMPANY';
  firstName?: string;
  paternalLastName?: string;
  companyName?: string;
  email: string;
}

export interface WizardOptions {
  rentAmount?: number;
  tenant: WizardTenant;
  landlord: { firstName: string; paternalLastName: string; email: string };
  guarantor: { type: 'NONE' } | { type: 'JOINT_OBLIGOR'; email: string; firstName?: string; paternalLastName?: string };
  /** landlordPercentage auto-mirrors (sum enforced to 100). Default 100. */
  tenantPercentage?: number;
}

const next = (page: Page) => page.getByRole('button', { name: 'Guardar y Continuar' }).click();

function isoDate(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

export async function createPolicyViaWizard(page: Page, opts: WizardOptions): Promise<{ policyId: string }> {
  const rent = opts.rentAmount ?? 15000;

  await page.goto('/dashboard/policies/new');

  // ── Step 1: Propiedad ────────────────────────────────────────────────────
  await expect(page.getByText('Información de la Propiedad')).toBeVisible();
  // Manual address form is open by default; country pre-filled "México".
  await page.locator('#street').fill('Av. Reforma');
  await page.locator('#exteriorNumber').fill('123');
  await page.locator('#neighborhood').fill('Juárez');
  await page.locator('#postalCode').fill('06600'); // exactly 5 digits (schema regex)
  await page.locator('#municipality').fill('Cuauhtémoc');
  await page.locator('#city').fill('Ciudad de México');
  await page.locator('#state').fill('CDMX');
  await page.locator('[name="rentAmount"]').fill(String(rent));
  await page.locator('[name="startDate"]').fill(isoDate(0));
  await page.locator('[name="endDate"]').fill(isoDate(12));
  await next(page);

  // ── Step 2: Precio ───────────────────────────────────────────────────────
  await expect(page.getByText('Configuración de Precio')).toBeVisible();
  // Wait for package.getAll to populate the select, pick the first package.
  const packageSelect = page.getByRole('combobox');
  await expect(packageSelect).toBeVisible({ timeout: 20_000 });
  await packageSelect.click();
  await page.getByRole('option').first().click();
  // Auto-calc must finish (calculatedPrice > 0 gates the step).
  await expect(page.getByText('Total con IVA:')).toBeVisible({ timeout: 20_000 });
  if (opts.tenantPercentage !== undefined && opts.tenantPercentage !== 100) {
    await page.getByLabel('Porcentaje Inquilino').fill(String(opts.tenantPercentage));
    await expect(page.getByLabel('Porcentaje Arrendador')).toHaveValue(String(100 - opts.tenantPercentage));
  }
  await next(page);

  // ── Step 3: Arrendador (1 individual) ───────────────────────────────────
  await expect(page.getByText('Arrendador Principal')).toBeVisible();
  await page.locator('[name="landlords.0.firstName"]').fill(opts.landlord.firstName);
  await page.locator('[name="landlords.0.paternalLastName"]').fill(opts.landlord.paternalLastName);
  await page.locator('[name="landlords.0.email"]').fill(opts.landlord.email);
  await next(page);

  // ── Step 4: Inquilino ────────────────────────────────────────────────────
  await expect(page.getByText('Información del Inquilino')).toBeVisible();
  if (opts.tenant.type === 'COMPANY') {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Persona Moral (Empresa)' }).click();
    await page.locator('[name="companyName"]').fill(opts.tenant.companyName ?? 'Empresa E2E SA de CV');
  } else {
    await page.locator('[name="firstName"]').fill(opts.tenant.firstName ?? 'Juan');
    await page.locator('[name="paternalLastName"]').fill(opts.tenant.paternalLastName ?? 'Pérez');
  }
  await page.locator('[name="email"]').fill(opts.tenant.email);
  await next(page);

  // ── Step 5: Garantía ─────────────────────────────────────────────────────
  await expect(page.getByText('Obligado Solidario / Aval')).toBeVisible();
  if (opts.guarantor.type === 'JOINT_OBLIGOR') {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Obligado Solidario', exact: true }).click();
    // Selecting the type auto-appends one JO card.
    if (opts.guarantor.firstName) {
      await page.locator('[name="jointObligors.0.firstName"]').fill(opts.guarantor.firstName);
    }
    if (opts.guarantor.paternalLastName) {
      await page.locator('[name="jointObligors.0.paternalLastName"]').fill(opts.guarantor.paternalLastName);
    }
    await page.locator('[name="jointObligors.0.email"]').fill(opts.guarantor.email);
  }
  await next(page);

  // ── Step 6: Revisar ──────────────────────────────────────────────────────
  await expect(page.getByText('Revisar y Confirmar')).toBeVisible();
  await page.getByRole('button', { name: 'Crear Protección' }).click();

  // Success: toast "Protección creada" + redirect to the policy detail page.
  await page.waitForURL(/\/dashboard\/policies\/(?!new)[\w-]+$/, { timeout: 30_000 });
  const policyId = page.url().split('/').pop()!;
  return { policyId };
}
