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

export type WizardLandlord =
  | { isCompany?: false; firstName: string; paternalLastName: string; email: string }
  | { isCompany: true; companyName: string; companyRfc?: string; email: string };

/**
 * JO and aval wizard cards capture name+email only; the actor's INDIVIDUAL vs
 * COMPANY type is chosen later, inside their portal (there is no toggle here).
 */
export interface WizardGuarantorActor {
  email: string;
  firstName?: string;
  paternalLastName?: string;
}

export type WizardGuarantor =
  | { type: 'NONE' }
  | ({ type: 'JOINT_OBLIGOR' } & WizardGuarantorActor)
  | ({ type: 'AVAL' } & WizardGuarantorActor)
  | { type: 'BOTH'; jointObligor: WizardGuarantorActor; aval: WizardGuarantorActor };

export interface WizardOptions {
  rentAmount?: number;
  tenant: WizardTenant;
  landlord: WizardLandlord;
  /** Co-owners appended via "Agregar copropietario" (each may be a company). */
  coLandlords?: WizardLandlord[];
  guarantor: WizardGuarantor;
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

  // ── Step 3: Arrendador ───────────────────────────────────────────────────
  await expect(page.getByText('Arrendador Principal')).toBeVisible();

  const fillLandlordCard = async (index: number, landlord: WizardLandlord) => {
    if (landlord.isCompany) {
      // Radix checkbox labeled "El arrendador es una empresa" swaps the entry
      // to the company field set — one checkbox per card.
      await page.getByRole('checkbox', { name: 'El arrendador es una empresa' }).nth(index).click();
      await expect(page.locator(`[name="landlords.${index}.companyName"]`)).toBeVisible();
      await page.locator(`[name="landlords.${index}.companyName"]`).fill(landlord.companyName);
      if (landlord.companyRfc) {
        await page.locator(`[name="landlords.${index}.companyRfc"]`).fill(landlord.companyRfc);
      }
    } else {
      await page.locator(`[name="landlords.${index}.firstName"]`).fill(landlord.firstName);
      await page.locator(`[name="landlords.${index}.paternalLastName"]`).fill(landlord.paternalLastName);
    }
    await page.locator(`[name="landlords.${index}.email"]`).fill(landlord.email);
  };

  await fillLandlordCard(0, opts.landlord);
  for (const [i, co] of (opts.coLandlords ?? []).entries()) {
    await page.getByRole('button', { name: 'Agregar copropietario' }).click();
    await expect(page.locator(`[name="landlords.${i + 1}.email"]`)).toBeVisible();
    await fillLandlordCard(i + 1, co);
  }
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
  if (opts.guarantor.type !== 'NONE') {
    const fillGuarantorCard = async (prefix: 'jointObligors' | 'avals', actor: WizardGuarantorActor) => {
      if (actor.firstName) {
        await page.locator(`[name="${prefix}.0.firstName"]`).fill(actor.firstName);
      }
      if (actor.paternalLastName) {
        await page.locator(`[name="${prefix}.0.paternalLastName"]`).fill(actor.paternalLastName);
      }
      await page.locator(`[name="${prefix}.0.email"]`).fill(actor.email);
    };

    const optionLabel =
      opts.guarantor.type === 'JOINT_OBLIGOR' ? 'Obligado Solidario'
      : opts.guarantor.type === 'AVAL' ? 'Aval'
      : 'Ambos';
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
    // Selecting the type auto-appends one card per guarantor kind.
    if (opts.guarantor.type === 'BOTH') {
      await fillGuarantorCard('jointObligors', opts.guarantor.jointObligor);
      await fillGuarantorCard('avals', opts.guarantor.aval);
    } else {
      await fillGuarantorCard(
        opts.guarantor.type === 'JOINT_OBLIGOR' ? 'jointObligors' : 'avals',
        opts.guarantor,
      );
    }
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
