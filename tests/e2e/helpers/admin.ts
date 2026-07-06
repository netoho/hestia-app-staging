import { Page, expect } from '@playwright/test';
import { prisma } from './db';
import { samplePdf } from './files';

/**
 * Admin dashboard flows: investigation lifecycle, public landlord approval,
 * payments (manual record + verify), policy approval. Recon map: #161.
 */

// ─── Investigation ───────────────────────────────────────────────────────────

/**
 * Creates + submits an investigation for an actor through the admin UI
 * (findings ≥10 chars, ≥1 INVESTIGATION_SUPPORT document via real presigned
 * upload), then returns the landlord approval URL (token read from the DB —
 * same canonical-source pattern as actor tokens; avoids clipboard permissions).
 */
export async function submitInvestigation(
  page: Page,
  opts: { policyId: string; actorType: 'tenant' | 'jointObligor' | 'aval'; actorId: string },
): Promise<string> {
  await page.goto(`/dashboard/policies/${opts.policyId}/investigation/${opts.actorType}/${opts.actorId}/new`);

  await page.locator('#findings').fill('Investigación E2E: historial verificado, sin incidencias encontradas.');

  const docName = `investigation-${Date.now()}`;
  await page.locator('#document-upload').setInputFiles(samplePdf(docName));
  await expect(page.getByText(`${docName}.pdf`)).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Enviar para Aprobación' }).click();
  await page.getByRole('button', { name: 'Confirmar y Enviar' }).click();

  // Submitted dialog shows the approval links; the token is canonical in the DB.
  await expect(page.getByText(/investigation\/approve\//).first()).toBeVisible({ timeout: 30_000 });

  const inv = await prisma.actorInvestigation.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { landlordToken: true },
  });
  if (!inv?.landlordToken) throw new Error('[e2e] no landlordToken after investigation submit');
  return `/investigation/approve/${inv.landlordToken}`;
}

/** Any landlord approves via the public link — first to act wins. */
export async function approveInvestigationAsLandlord(page: Page, approvalPath: string): Promise<void> {
  await page.goto(approvalPath);
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  // Some builds confirm via dialog, some approve directly — click if present.
  await page
    .getByRole('button', { name: 'Confirmar Aprobación' })
    .click({ timeout: 5_000 })
    .catch(() => {});
  await expect(page.getByText('Investigación Aprobada').first()).toBeVisible({ timeout: 30_000 });
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface SeedPaymentRow {
  type: 'TENANT_PORTION' | 'LANDLORD_PORTION' | 'INVESTIGATION_FEE';
  paidBy: 'TENANT' | 'LANDLORD';
  amount: number;
}

/**
 * Payment rows are only ever created through Stripe checkout paths
 * (generatePaymentLinks / createNew), which this suite deliberately excludes.
 * Seed the PENDING rows the Stripe flow would have created, then drive the
 * REAL manual-record (with receipt upload → MinIO) + verify UI on them.
 */
export async function seedPendingPayments(policyId: string, rows: SeedPaymentRow[]): Promise<void> {
  for (const [i, row] of rows.entries()) {
    const subtotal = Math.round((row.amount / 1.16) * 100) / 100;
    await prisma.payment.create({
      data: {
        policyId,
        amount: row.amount,
        subtotal,
        iva: Math.round((row.amount - subtotal) * 100) / 100,
        currency: 'MXN',
        status: 'PENDING',
        type: row.type,
        paidBy: row.paidBy,
        description: `E2E seeded ${row.type} ${i + 1}`,
      },
    });
  }
}

const TYPE_LABEL: Record<SeedPaymentRow['type'], string> = {
  TENANT_PORTION: 'Pago del Inquilino',
  LANDLORD_PORTION: 'Pago del Arrendador',
  INVESTIGATION_FEE: 'Cuota de Investigación',
};

/**
 * On the Pagos tab: record a manual payment (receipt PDF required — real
 * presigned upload) and verify it, scoped to the card for the given type.
 */
export async function recordAndVerifyPayment(
  page: Page,
  opts: { policyId: string; type: SeedPaymentRow['type']; amount: number },
): Promise<void> {
  await page.goto(`/dashboard/policies/${opts.policyId}?tab=payments`);

  const card = page
    .locator('div')
    .filter({ has: page.getByText(TYPE_LABEL[opts.type], { exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Registrar Pago Manual' }) })
    .last();

  await card.getByRole('button', { name: 'Registrar Pago Manual' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Registrar Pago Manual')).toBeVisible();
  // The dialog's amount prefill arrives as 0 (expectedAmount wiring quirk) —
  // set it explicitly or the submit silently blocks.
  await dialog.locator('#amount').fill(String(opts.amount));
  const receiptName = `receipt-${opts.type.toLowerCase()}-${Date.now()}`;
  await dialog.locator('input[type="file"]').setInputFiles(samplePdf(receiptName));
  await dialog.getByRole('button', { name: 'Registrar Pago' }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText('Por Verificar').first()).toBeVisible({ timeout: 30_000 });

  const verifyCard = page
    .locator('div')
    .filter({ has: page.getByText(TYPE_LABEL[opts.type], { exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Verificar Pago' }) })
    .last();
  await verifyCard.getByRole('button', { name: 'Verificar Pago' }).click();

  const verifyDialog = page.getByRole('dialog');
  await expect(verifyDialog.getByText('Verificar Pago Manual')).toBeVisible();
  await verifyDialog.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(verifyDialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText('Completado').first()).toBeVisible({ timeout: 30_000 });
}

// ─── Status ──────────────────────────────────────────────────────────────────

/** PENDING_APPROVAL → ACTIVE via the header actions menu (payments must be settled). */
export async function approvePolicyToActive(page: Page, policyId: string): Promise<void> {
  await page.goto(`/dashboard/policies/${policyId}`);
  await expect(page.getByText('Pendiente de Aprobación').first()).toBeVisible({ timeout: 30_000 });

  await page.getByTestId('policy-actions-menu').click();
  await page.getByRole('menuitem', { name: 'Aprobar Protección' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await expect(page.getByText('Activa').first()).toBeVisible({ timeout: 30_000 });
}

// ─── Admin fast path (E2E-07) ────────────────────────────────────────────────

/**
 * Force-complete an actor from its policy-detail tab card: "Completar" opens
 * the two-step MarkCompleteDialog — the strict attempt fails server-side
 * (nothing was filled through the portal), the force layout lists the missing
 * data, and "Confirmar y Forzar Completo" overrides it.
 */
export async function forceCompleteActor(
  page: Page,
  opts: { policyId: string; actorType: 'tenant' | 'landlord'; actorId: string },
): Promise<void> {
  await page.goto(`/dashboard/policies/${opts.policyId}?tab=${opts.actorType}`);
  await page.getByRole('button', { name: 'Completar' }).first().click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Marcar Completo' })).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Marcar Completo' }).click();

  // Strict path rejects with requiresForce → force layout.
  await expect(
    dialog.getByText('¿Marcar como completo con información faltante?'),
  ).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Confirmar y Forzar Completo' }).click();

  await expect
    .poll(
      async () => {
        const row =
          opts.actorType === 'tenant'
            ? await prisma.tenant.findUnique({
                where: { id: opts.actorId },
                select: { informationComplete: true },
              })
            : await prisma.landlord.findUnique({
                where: { id: opts.actorId },
                select: { informationComplete: true },
              });
        return row?.informationComplete;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

/**
 * COLLECTING_INFO → ACTIVE via the prominent header approve button — it only
 * renders for staff/admin once EVERY actor is informationComplete. This
 * direct edge validates actor completeness ONLY (no payments, no
 * investigations — policyWorkflowService.validateStatusRequirements), which
 * is exactly the least-tested path E2E-07 exists to lock.
 */
export async function approvePolicyDirectFromCollecting(page: Page, policyId: string): Promise<void> {
  await page.goto(`/dashboard/policies/${policyId}`);
  await expect(page.getByText('Recopilando Información').first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Aprobar Protección' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await expect(page.getByText('Activa').first()).toBeVisible({ timeout: 30_000 });
}
