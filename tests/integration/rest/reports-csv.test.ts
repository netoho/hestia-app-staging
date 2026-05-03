/**
 * Integration tests for /api/reports/policies/csv.
 *
 * Under the new model, `managedById` is the broker who tracks the policy:
 *   - Self-created broker policies are auto-assigned (managedById = createdById).
 *   - ADMIN/STAFF-created policies start with managedById = null and are
 *     assigned via the picker (or stay "CS" forever if direct deal).
 * The CSV "ID del broker" / "Nombre del broker" columns source from
 * `managedBy`, with "Nombre del broker" falling back to the literal "CS"
 * when null.
 *
 * The legacy "Vendedor / CS" column was dropped — its data is redundant
 * with the new "Nombre del broker" column.
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

  test('returns CSV with BOM and 10-column header for ADMIN with no policies', async () => {
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
    expect(firstLine).toContain('Fecha activación');
    expect(firstLine).toContain('Nº protección');
    expect(firstLine).toContain('Tipo (paquete)');
    expect(firstLine).toContain('Garantía');
    expect(firstLine).toContain('Monto de renta');
    expect(firstLine).toContain('Costo de la protección');
    expect(firstLine).toContain('ID del broker');
    expect(firstLine).toContain('Nombre del broker');
    expect(firstLine).toContain('Inicio de vigencia');
    expect(firstLine).toContain('Fin de vigencia');
    // Vendedor / CS column was dropped under the new managedBy-as-broker model.
    expect(firstLine).not.toContain('Vendedor / CS');
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

  test('excludes policies with activatedAt = null', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();
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
    // header only — no data rows
    expect(lines.length).toBe(1);
  });

  test('"Nombre del broker" falls back to "CS" when managedById is null', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    const today = new Date();
    await policyFactory.create(
      {
        status: PolicyStatus.ACTIVE,
        activatedAt: today,
        expiresAt: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
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

    // Admin-created and assigned to a broker via the picker (scenario 2).
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
    // Admin's name should NOT appear in the broker columns under the new model.
    expect(result.body).not.toContain('Admin Person');
    const lines = result.body.slice(BOM.length).split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(2); // header + 1 row
    // ID del broker is empty, Nombre del broker is "CS".
    expect(lines[1]).toContain('CS');
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
