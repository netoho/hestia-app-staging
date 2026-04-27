/**
 * Integration tests for the /api/cron/* REST endpoints.
 *
 * Six cron handlers — five Vercel-cron-driven, one development-only test
 * trigger. In NODE_ENV=test the production-only cron-secret check is
 * bypassed, so the handlers focus on calling their reminder service.
 *
 * Reminder services are mocked at preload (see preload.ts), so the tests
 * assert HTTP shape and the success/error envelope without exercising
 * production-only DB timing logic.
 */

import { describe, test, expect } from 'bun:test';
import { GET as incompleteActorsGet } from '@/app/api/cron/incomplete-actors-reminder/route';
import { GET as policyExpiryGet } from '@/app/api/cron/policy-expiry/route';
import { GET as policyExpirationReminderGet } from '@/app/api/cron/policy-expiration-reminder/route';
import { GET as policyQuarterlyFollowupGet } from '@/app/api/cron/policy-quarterly-followup/route';
import { GET as receiptReminderGet } from '@/app/api/cron/receipt-reminder/route';
import { GET as testReminderGet } from '@/app/api/cron/test-reminder/route';
import { buildRequest, readJson } from '../restHelpers';

describe('GET /api/cron/incomplete-actors-reminder', () => {
  test('returns 200 and a success envelope with reminder counts', async () => {
    const res = await incompleteActorsGet(
      buildRequest('GET', 'http://localhost/api/cron/incomplete-actors-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      timestamp: expect.any(String),
      result: {
        policiesProcessed: expect.any(Number),
        remindersSent: expect.any(Number),
        errors: expect.any(Array),
      },
    });
  });
});

describe('GET /api/cron/policy-expiry', () => {
  test('returns 200 with the expiry job result', async () => {
    const res = await policyExpiryGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiry'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, timestamp: expect.any(String) });
  });
});

describe('GET /api/cron/policy-expiration-reminder', () => {
  test('returns 200 with totalRemindersSent + totalErrors', async () => {
    const res = await policyExpirationReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiration-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      result: {
        totalRemindersSent: expect.any(Number),
        totalErrors: expect.any(Number),
      },
    });
  });
});

describe('GET /api/cron/policy-quarterly-followup', () => {
  test('returns 200 with the followup job result', async () => {
    const res = await policyQuarterlyFollowupGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-quarterly-followup'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true });
  });
});

describe('GET /api/cron/receipt-reminder', () => {
  test('returns 200 with policiesProcessed/remindersSent/skipped/errors', async () => {
    const res = await receiptReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/receipt-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      result: {
        policiesProcessed: expect.any(Number),
        remindersSent: expect.any(Number),
        skipped: expect.any(Number),
        errors: expect.any(Array),
      },
    });
  });
});

describe('GET /api/cron/test-reminder', () => {
  test('returns 200 with success envelope outside production', async () => {
    const res = await testReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/test-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
      result: expect.any(Object),
    });
  });
});
