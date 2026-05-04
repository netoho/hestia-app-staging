/**
 * Integration tests for /api/reports/policies/csv.
 *
 * The report includes EVERY policy created in the date window (regardless of
 * status — pipeline, active, terminal). Each lifecycle timestamp gets its own
 * column so consumers can re-sort/filter independently in Excel. Filter is
 * applied to `createdAt`. Sorted by `createdAt DESC`.
 *
 * Broker columns derive from `managedBy.*`:
 *   - `Nombre del broker` falls back to literal `"CS"` when `managedById` is null.
 *   - `ID del broker` is empty when `managedById` is null.
 */

import { describe, test, expect } from 'bun:test';
import { GET } from '@/app/api/reports/policies/csv/route';
import { PolicyStatus, UserRole } from '@/prisma/generated/prisma-client/enums';
import { adminUser, brokerUser, packageFactory, policyFactory, userFactory } from '../factories';
import { withSession, buildRequest } from '../restHelpers';

const BOM = '﻿';

async function readCsv(res: Response): Promise<{ status: number; ct: string | null; body: string }> {
  return {
    status: res.status,
    ct: res.headers.get('content-type'),
    body: await res.text(),
  };
}

describe('GET /api/reports/policies/csv', () => {
  test('returns 401 without session', async () => {
    const res = await GET(buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'));
    expect(res.status).toBe(401);
  });

  test('returns 403 for BROKER', async () => {
    const broker = await brokerUser.create();
    const result = await withSession(broker, async () => {
      const res = await GET(buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'));
      return res.status;
    });
    expect(result).toBe(403);
  });

  test('returns 400 for invalid preset', async () => {
    const admin = await adminUser.create();
    const status = await withSession(admin, async () => {
      const res = await GET(buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=bogus'));
      return res.status;
    });
    expect(status).toBe(400);
  });

  test('custom preset requires from/to', async () => {
    const admin = await adminUser.create();
    const status = await withSession(admin, async () => {
      const res = await GET(buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=custom'));
      return res.status;
    });
    expect(status).toBe(400);
  });

  test('returns CSV with BOM and the 16-column header for ADMIN with no policies', async () => {
    const admin = await adminUser.create();
    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    expect(result.status).toBe(200);
    expect(result.ct).toContain('text/csv');
    expect(result.body.startsWith(BOM)).toBe(true);

    const body = result.body.slice(BOM.length);
    const firstLine = body.split('\n')[0];

    // Identity + status
    expect(firstLine).toContain('Nº protección');
    expect(firstLine).toContain('Estado');
    // Lifecycle timestamps — every one gets its own column
    expect(firstLine).toContain('Fecha de creación');
    expect(firstLine).toContain('Fecha de envío');
    expect(firstLine).toContain('Fecha de aprobación');
    expect(firstLine).toContain('Fecha de activación');
    expect(firstLine).toContain('Fecha de expiración');
    expect(firstLine).toContain('Fecha de cancelación');
    // Contract dates (wizard-captured, distinct from system activatedAt/expiresAt)
    expect(firstLine).toContain('Inicio de contrato');
    expect(firstLine).toContain('Fin de contrato');
    // Plan + financial + broker
    expect(firstLine).toContain('Tipo (paquete)');
    expect(firstLine).toContain('Garantía');
    expect(firstLine).toContain('Monto de renta');
    expect(firstLine).toContain('Costo de la protección');
    expect(firstLine).toContain('ID del broker');
    expect(firstLine).toContain('Nombre del broker');

    // Legacy column names from earlier iterations should NOT appear.
    expect(firstLine).not.toContain('Vendedor / CS');
    expect(firstLine).not.toContain('Inicio de vigencia');
    expect(firstLine).not.toContain('Fin de vigencia');
    expect(firstLine).not.toContain('Fecha activación');  // current column is "Fecha de activación"
  });

  test('STAFF can also download the report', async () => {
    const staff = await userFactory.create({ role: UserRole.STAFF });
    const status = await withSession(staff, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return res.status;
    });
    expect(status).toBe(200);
  });

  test('includes pipeline-stage policies (activatedAt may be null)', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();
    // A COLLECTING_INFO policy with no activatedAt — used to be excluded under
    // the activatedAt filter; should now be included since the filter is on
    // createdAt and the row was created today (in the currentMonth preset).
    await policyFactory.create(
      { status: PolicyStatus.COLLECTING_INFO, activatedAt: null },
      { transient: { createdById: admin.id, packageId: pkg.id } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    const lines = result.body.slice(BOM.length).split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(2); // header + 1 row (the pipeline policy)
    // Estado column shows the localized status label.
    expect(lines[1]).toContain('Recopilando');
  });

  test('Estado column reflects every status', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    const allStatuses = [
      PolicyStatus.COLLECTING_INFO,
      PolicyStatus.PENDING_APPROVAL,
      PolicyStatus.ACTIVE,
      PolicyStatus.EXPIRED,
      PolicyStatus.CANCELLED,
    ];
    for (const status of allStatuses) {
      await policyFactory.create(
        { status, activatedAt: status === PolicyStatus.COLLECTING_INFO || status === PolicyStatus.PENDING_APPROVAL ? null : new Date() },
        { transient: { createdById: admin.id, packageId: pkg.id } },
      );
    }

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    const body = result.body.slice(BOM.length);
    expect(body).toContain('Recopilando');
    expect(body).toContain('Pendiente');
    expect(body).toContain('Activa');
    expect(body).toContain('Expirada');
    expect(body).toContain('Cancelada');
  });

  test('lifecycle timestamps populate their respective columns', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    // A fully-cancelled policy that went through every state — every timestamp set.
    await policyFactory.create(
      {
        status: PolicyStatus.CANCELLED,
        submittedAt: new Date(2026, 4, 1),
        approvedAt: new Date(2026, 4, 2),
        activatedAt: new Date(2026, 4, 3),
        expiresAt: new Date(2027, 4, 3),
        cancelledAt: new Date(2026, 4, 15),
        contractStartDate: new Date(2026, 4, 5),
        contractEndDate: new Date(2027, 4, 5),
      },
      { transient: { createdById: admin.id, packageId: pkg.id } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    const body = result.body.slice(BOM.length);
    // Spot-check each formatted date is present in the row.
    expect(body).toContain('01/05/2026'); // submittedAt
    expect(body).toContain('02/05/2026'); // approvedAt
    expect(body).toContain('03/05/2026'); // activatedAt
    expect(body).toContain('15/05/2026'); // cancelledAt
    expect(body).toContain('05/05/2026'); // contractStartDate
  });

  test('"Nombre del broker" falls back to "CS" when managedById is null', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    await policyFactory.create(
      {
        status: PolicyStatus.ACTIVE,
        activatedAt: new Date(),
        rentAmount: 18000,
        totalPrice: 5500,
      },
      { transient: { createdById: admin.id, packageId: pkg.id, managedById: null } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    const body = result.body.slice(BOM.length);
    expect(body).toContain('CS');
    expect(body).toContain('18000');
    expect(body).toContain('5500');
  });

  test('broker columns populated from managedBy when assigned', async () => {
    const broker = await brokerUser.create({ name: 'Brian Broker' });
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    await policyFactory.create(
      { status: PolicyStatus.ACTIVE, activatedAt: new Date() },
      { transient: { createdById: admin.id, packageId: pkg.id, managedById: broker.id } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    expect(result.body).toContain('Brian Broker');
  });

  test('broker columns are CS/blank when managedById is null', async () => {
    const admin = await adminUser.create({ name: 'Admin Person' });
    const pkg = await packageFactory.create();
    await policyFactory.create(
      { status: PolicyStatus.ACTIVE, activatedAt: new Date() },
      { transient: { createdById: admin.id, packageId: pkg.id, managedById: null } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    expect(result.body).not.toContain('Admin Person');
    const lines = result.body.slice(BOM.length).split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(2); // header + 1 row
    expect(lines[1]).toContain('CS');
  });

  test('rows ordered by createdAt DESC (newest first)', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    // Both dates within the current month and on/before today, so the
    // currentMonth preset filter (createdAt: gte startOfMonth, lte endOfToday)
    // includes both rows.
    const now = new Date();
    const olderDate = new Date(now.getFullYear(), now.getMonth(), 1);
    olderDate.setHours(8, 0, 0, 0);
    const newerDate = new Date(now);
    newerDate.setHours(now.getHours() - 1, 0, 0, 0);

    const older = await policyFactory.create(
      {
        status: PolicyStatus.COLLECTING_INFO,
        policyNumber: `POL-OLDER-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: olderDate,
      },
      { transient: { createdById: admin.id, packageId: pkg.id } },
    );
    const newer = await policyFactory.create(
      {
        status: PolicyStatus.COLLECTING_INFO,
        policyNumber: `POL-NEWER-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: newerDate,
      },
      { transient: { createdById: admin.id, packageId: pkg.id } },
    );

    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=currentMonth'),
      );
      return readCsv(res);
    });
    const body = result.body.slice(BOM.length);
    const newerIdx = body.indexOf(newer.policyNumber);
    const olderIdx = body.indexOf(older.policyNumber);
    expect(newerIdx).toBeGreaterThan(-1);
    expect(olderIdx).toBeGreaterThan(-1);
    expect(newerIdx).toBeLessThan(olderIdx); // newer appears first
  });

  test('Content-Disposition uses preset slug + date in filename', async () => {
    const admin = await adminUser.create();
    const result = await withSession(admin, async () => {
      const res = await GET(
        buildRequest('GET', 'http://localhost/api/reports/policies/csv?preset=ytd'),
      );
      return res.headers.get('content-disposition');
    });
    expect(result).toMatch(/filename="protecciones_ano-en-curso_\d{8}\.csv"/);
  });
});
