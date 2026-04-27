/**
 * Integration tests for the /api/cron/* REST endpoints.
 *
 * Six cron handlers — five Vercel-cron-driven, one development-only test
 * trigger. In NODE_ENV=test the production-only cron-secret check is
 * bypassed, so the handlers focus on calling their reminder service.
 *
 * Reminder services run for real against the per-test reset+seeded DB.
 * Each test seeds the minimum data the service is supposed to process,
 * calls the cron, and asserts both the HTTP envelope and that the
 * reminder counters reflect the work.
 */

import { describe, test, expect } from 'bun:test';
import { GET as incompleteActorsGet } from '@/app/api/cron/incomplete-actors-reminder/route';
import { GET as policyExpiryGet } from '@/app/api/cron/policy-expiry/route';
import { GET as policyExpirationReminderGet } from '@/app/api/cron/policy-expiration-reminder/route';
import { GET as policyQuarterlyFollowupGet } from '@/app/api/cron/policy-quarterly-followup/route';
import { GET as receiptReminderGet } from '@/app/api/cron/receipt-reminder/route';
import { GET as testReminderGet } from '@/app/api/cron/test-reminder/route';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createPolicyWithActors } from '../scenarios';
import { buildRequest, readJson } from '../restHelpers';

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

describe('GET /api/cron/incomplete-actors-reminder', () => {
  test('processes COLLECTING_INFO policies and sends reminders to incomplete actors', async () => {
    // createPolicyWithActors defaults to COLLECTING_INFO with primary landlord
    // + tenant, both informationComplete=false, both with email.
    await createPolicyWithActors();

    const res = await incompleteActorsGet(
      buildRequest('GET', 'http://localhost/api/cron/incomplete-actors-reminder'),
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(200);
    const envelope = body as {
      success: boolean;
      timestamp: string;
      result: { policiesProcessed: number; remindersSent: number; errors: unknown[] };
    };
    expect(envelope.success).toBe(true);
    expect(typeof envelope.timestamp).toBe('string');
    expect(envelope.result.policiesProcessed).toBeGreaterThanOrEqual(1);
    // Primary landlord + tenant are both incomplete with email → 2 reminders.
    expect(envelope.result.remindersSent).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(envelope.result.errors)).toBe(true);
  });

  test('returns success with zero counters when no policies are eligible', async () => {
    const res = await incompleteActorsGet(
      buildRequest('GET', 'http://localhost/api/cron/incomplete-actors-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect((body as { result: { policiesProcessed: number } }).result.policiesProcessed).toBe(0);
  });
});

describe('GET /api/cron/policy-expiry', () => {
  test('expires ACTIVE policies whose expiresAt is in the past', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    await prisma.policy.update({
      where: { id: policy.id },
      data: { expiresAt: addDays(new Date(), -1) },
    });

    const res = await policyExpiryGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiry'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect((body as { result: { expired: number } }).result.expired).toBeGreaterThanOrEqual(1);

    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed?.status).toBe(PolicyStatus.EXPIRED);
  });

  test('returns success with expired=0 when no policies are due', async () => {
    const res = await policyExpiryGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiry'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect((body as { result: { expired: number } }).result.expired).toBe(0);
  });
});

describe('GET /api/cron/policy-expiration-reminder', () => {
  test('sends reminders to landlords for policies expiring at a tier window (30d)', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    // Tier window for 30d is [today+29d, today+31d). 30d falls inside.
    await prisma.policy.update({
      where: { id: policy.id },
      data: { expiresAt: addDays(new Date(), 30) },
    });

    const res = await policyExpirationReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiration-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    const result = (body as { result: { totalRemindersSent: number; totalErrors: number } }).result;
    expect(result.totalRemindersSent).toBeGreaterThanOrEqual(1);
    expect(result.totalErrors).toBe(0);

    const log = await prisma.reminderLog.findFirst({
      where: { policyId: policy.id, reminderType: 'policy_expiration_tier_30' },
    });
    expect(log).not.toBeNull();
    expect(log?.status).toBe('sent');
  });

  test('returns totalRemindersSent=0 when no policies are in any tier window', async () => {
    const res = await policyExpirationReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-expiration-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect((body as { result: { totalRemindersSent: number } }).result.totalRemindersSent).toBe(0);
  });
});

describe('GET /api/cron/policy-quarterly-followup', () => {
  test('sends quarterly follow-up to primary landlord of an ACTIVE policy without recent reminder', async () => {
    const { policy, landlord } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });

    const res = await policyQuarterlyFollowupGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-quarterly-followup'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    const result = (body as { result: { policiesProcessed: number; remindersSent: number } }).result;
    expect(result.policiesProcessed).toBeGreaterThanOrEqual(1);
    expect(result.remindersSent).toBeGreaterThanOrEqual(1);

    const log = await prisma.reminderLog.findFirst({
      where: { policyId: policy.id, reminderType: 'policy_quarterly_followup' },
    });
    expect(log).not.toBeNull();
    expect(log?.recipientEmail).toBe(landlord.email);
    expect(log?.status).toBe('sent');
  });

  test('skips policies with a recent quarterly follow-up already logged', async () => {
    const { policy, landlord } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    await prisma.reminderLog.create({
      data: {
        reminderType: 'policy_quarterly_followup',
        recipientEmail: landlord.email,
        policyId: policy.id,
        status: 'sent',
      },
    });

    const res = await policyQuarterlyFollowupGet(
      buildRequest('GET', 'http://localhost/api/cron/policy-quarterly-followup'),
    );
    const { body } = await readJson(res);
    const result = (body as { result: { skipped: number; remindersSent: number } }).result;
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.remindersSent).toBe(0);
  });
});

describe('GET /api/cron/receipt-reminder', () => {
  test('sends a receipt reminder to tenants of ACTIVE policies with pending receipts', async () => {
    const { policy, tenant } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });

    const res = await receiptReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/receipt-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    const result = (body as { result: { policiesProcessed: number; remindersSent: number } }).result;
    expect(result.policiesProcessed).toBeGreaterThanOrEqual(1);
    expect(result.remindersSent).toBeGreaterThanOrEqual(1);

    const log = await prisma.reminderLog.findFirst({
      where: { policyId: policy.id, reminderType: 'tenant_receipt' },
    });
    expect(log).not.toBeNull();
    expect(log?.recipientEmail).toBe(tenant.email);
    expect(log?.status).toBe('sent');
  });

  test('returns success with zero counters when no ACTIVE policies exist', async () => {
    const res = await receiptReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/receipt-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect((body as { result: { policiesProcessed: number } }).result.policiesProcessed).toBe(0);
  });
});

describe('GET /api/cron/test-reminder', () => {
  test('returns 200 with a success envelope outside production', async () => {
    // Same internals as incomplete-actors-reminder; assert it processes any
    // COLLECTING_INFO policy we seed.
    await createPolicyWithActors();

    const res = await testReminderGet(
      buildRequest('GET', 'http://localhost/api/cron/test-reminder'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    const envelope = body as {
      success: boolean;
      message: string;
      result: { policiesProcessed: number; remindersSent: number };
    };
    expect(envelope.success).toBe(true);
    expect(typeof envelope.message).toBe('string');
    expect(envelope.result.policiesProcessed).toBeGreaterThanOrEqual(1);
    expect(envelope.result.remindersSent).toBeGreaterThanOrEqual(1);
  });
});
