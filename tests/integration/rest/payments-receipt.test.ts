/**
 * Integration tests for /api/payments/[paymentId]/receipt — admin-only
 * upload + the dual-tier download (admin/staff bypass; broker/tenant/
 * landlord must be associated with the policy AND the payer).
 */

import { describe, test, expect } from 'bun:test';
import {
  GET as receiptGet,
  POST as receiptPost,
  PUT as receiptPut,
} from '@/app/api/payments/[paymentId]/receipt/route';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createPolicyWithActors } from '../scenarios';
import { pendingPayment } from '../factories';
import { userFactory } from '../factories';
import { withSession, buildRequest } from '../restHelpers';

async function paramsFor(paymentId: string): Promise<{ params: Promise<{ paymentId: string }> }> {
  return { params: Promise.resolve({ paymentId }) };
}

describe('POST /api/payments/[paymentId]/receipt', () => {
  test('issues a presigned upload URL for ADMIN', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const result = await withSession(admin, async () => {
      const res = await receiptPost(
        buildRequest('POST', `http://localhost/api/payments/${payment.id}/receipt`, {
          fileName: 'receipt.pdf',
          contentType: 'application/pdf',
          fileSize: 12345,
        }),
        await paramsFor(payment.id),
      );
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      uploadUrl: expect.any(String),
      s3Key: expect.any(String),
      fileName: 'receipt.pdf',
      expiresIn: 300,
    });
  });

  test('returns 401 for unauthenticated', async () => {
    const res = await receiptPost(
      buildRequest('POST', 'http://localhost/api/payments/p/receipt', {
        fileName: 'r.pdf',
        contentType: 'application/pdf',
        fileSize: 100,
      }),
      await paramsFor('p'),
    );
    expect(res.status).toBe(401);
  });

  test('returns 401 for BROKER (admin/staff only)', async () => {
    const broker = await userFactory.create({ role: UserRole.BROKER });
    const result = await withSession(broker, async () => {
      const res = await receiptPost(
        buildRequest('POST', 'http://localhost/api/payments/p/receipt', {
          fileName: 'r.pdf',
          contentType: 'application/pdf',
          fileSize: 100,
        }),
        await paramsFor('p'),
      );
      return res.status;
    });
    expect(result).toBe(401);
  });

  test('returns 404 when payment does not exist', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const result = await withSession(admin, async () => {
      const res = await receiptPost(
        buildRequest('POST', 'http://localhost/api/payments/nope/receipt', {
          fileName: 'r.pdf',
          contentType: 'application/pdf',
          fileSize: 100,
        }),
        await paramsFor('nope'),
      );
      return res.status;
    });
    expect(result).toBe(404);
  });

  test('returns 400 for unsupported MIME type', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const result = await withSession(admin, async () => {
      const res = await receiptPost(
        buildRequest('POST', `http://localhost/api/payments/${payment.id}/receipt`, {
          fileName: 'r.exe',
          contentType: 'application/x-msdownload',
          fileSize: 100,
        }),
        await paramsFor(payment.id),
      );
      return res.status;
    });
    expect(result).toBe(400);
  });
});

describe('PUT /api/payments/[paymentId]/receipt', () => {
  test('persists receiptS3Key and receiptFileName for ADMIN', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const status = await withSession(admin, async () => {
      const res = await receiptPut(
        buildRequest('PUT', `http://localhost/api/payments/${payment.id}/receipt`, {
          s3Key: 'payments/test/key.pdf',
          fileName: 'receipt.pdf',
        }),
        await paramsFor(payment.id),
      );
      return res.status;
    });
    expect(status).toBe(200);

    const refreshed = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(refreshed?.receiptS3Key).toBe('payments/test/key.pdf');
    expect(refreshed?.receiptFileName).toBe('receipt.pdf');
  });

  test('returns 401 for unauthenticated', async () => {
    const res = await receiptPut(
      buildRequest('PUT', 'http://localhost/api/payments/p/receipt', {
        s3Key: 'k',
        fileName: 'f',
      }),
      await paramsFor('p'),
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when payment does not exist', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const status = await withSession(admin, async () => {
      const res = await receiptPut(
        buildRequest('PUT', 'http://localhost/api/payments/nope/receipt', {
          s3Key: 'k',
          fileName: 'f',
        }),
        await paramsFor('nope'),
      );
      return res.status;
    });
    expect(status).toBe(404);
  });
});

describe('GET /api/payments/[paymentId]/receipt', () => {
  test('returns the signed URL for ADMIN', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create(
      { receiptS3Key: 'payments/key.pdf', receiptFileName: 'r.pdf' },
      { transient: { policyId: policy.id } },
    );

    const result = await withSession(admin, async () => {
      const res = await receiptGet(
        buildRequest('GET', `http://localhost/api/payments/${payment.id}/receipt`),
        await paramsFor(payment.id),
      );
      return { status: res.status, body: await res.json() };
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ url: expect.any(String), fileName: 'r.pdf' });
  });

  test('returns 401 for unauthenticated', async () => {
    const res = await receiptGet(
      buildRequest('GET', 'http://localhost/api/payments/p/receipt'),
      await paramsFor('p'),
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when payment has no receipt', async () => {
    const admin = await userFactory.create({ role: UserRole.ADMIN });
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const status = await withSession(admin, async () => {
      const res = await receiptGet(
        buildRequest('GET', `http://localhost/api/payments/${payment.id}/receipt`),
        await paramsFor(payment.id),
      );
      return res.status;
    });
    expect(status).toBe(404);
  });
});
