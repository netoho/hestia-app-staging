/**
 * Integration tests for /api/policies/[policyId]/contract-cover and
 * /api/policies/[policyId]/pdf — both export binary payloads (.docx
 * and .pdf respectively) for ADMIN/STAFF/BROKER. Brokers can only
 * access policies they created.
 *
 * docx and pdf generation services are mocked at preload to return
 * deterministic Buffers — we assert the response status, headers,
 * and that the body has non-zero length.
 */

import { describe, test, expect } from 'bun:test';
import { GET as coverGet } from '@/app/api/policies/[policyId]/contract-cover/route';
import { GET as pdfGet } from '@/app/api/policies/[policyId]/pdf/route';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import { createPolicyWithActors } from '../scenarios';
import { userFactory } from '../factories';
import { withSession, buildRequest } from '../restHelpers';

async function paramsFor(policyId: string): Promise<{ params: Promise<{ policyId: string }> }> {
  return { params: Promise.resolve({ policyId }) };
}

describe('GET /api/policies/[policyId]/contract-cover', () => {
  test('returns a docx attachment for ADMIN', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();

    const result = await withSession(admin, async () => {
      const res = await coverGet(
        buildRequest('GET', `http://localhost/api/policies/${policy.id}/contract-cover`),
        await paramsFor(policy.id),
      );
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        contentDisposition: res.headers.get('content-disposition'),
        body: await res.arrayBuffer(),
      };
    });
    expect(result.status).toBe(200);
    expect(result.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result.contentDisposition).toContain('attachment');
    expect(result.body.byteLength).toBeGreaterThan(0);
  });

  test('returns 401 for unauthenticated', async () => {
    const res = await coverGet(
      buildRequest('GET', 'http://localhost/api/policies/p/contract-cover'),
      await paramsFor('p'),
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when policy does not exist', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const status = await withSession(admin, async () => {
      const res = await coverGet(
        buildRequest('GET', 'http://localhost/api/policies/nope/contract-cover'),
        await paramsFor('nope'),
      );
      return res.status;
    });
    expect(status).toBe(404);
  });

  test('returns 403 when BROKER reads someone else\'s policy', async () => {
    const broker = await userFactory.create({ role: UserRole.BROKER });
    const { policy } = await createPolicyWithActors();

    const status = await withSession(broker, async () => {
      const res = await coverGet(
        buildRequest('GET', `http://localhost/api/policies/${policy.id}/contract-cover`),
        await paramsFor(policy.id),
      );
      return res.status;
    });
    expect(status).toBe(403);
  });
});

describe('GET /api/policies/[policyId]/pdf', () => {
  test('returns a pdf attachment for ADMIN', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();

    const result = await withSession(admin, async () => {
      const res = await pdfGet(
        buildRequest('GET', `http://localhost/api/policies/${policy.id}/pdf`),
        await paramsFor(policy.id),
      );
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        contentDisposition: res.headers.get('content-disposition'),
        body: await res.arrayBuffer(),
      };
    });
    expect(result.status).toBe(200);
    expect(result.contentType).toBe('application/pdf');
    expect(result.contentDisposition).toContain('attachment');
    expect(result.body.byteLength).toBeGreaterThan(0);
  });

  test('returns 401 for unauthenticated', async () => {
    const res = await pdfGet(
      buildRequest('GET', 'http://localhost/api/policies/p/pdf'),
      await paramsFor('p'),
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when policy does not exist', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const status = await withSession(admin, async () => {
      const res = await pdfGet(
        buildRequest('GET', 'http://localhost/api/policies/nope/pdf'),
        await paramsFor('nope'),
      );
      return res.status;
    });
    expect(status).toBe(404);
  });

  test('returns 403 when BROKER reads someone else\'s policy', async () => {
    const broker = await userFactory.create({ role: UserRole.BROKER });
    const { policy } = await createPolicyWithActors();

    const status = await withSession(broker, async () => {
      const res = await pdfGet(
        buildRequest('GET', `http://localhost/api/policies/${policy.id}/pdf`),
        await paramsFor(policy.id),
      );
      return res.status;
    });
    expect(status).toBe(403);
  });
});
