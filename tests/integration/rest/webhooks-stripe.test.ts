/**
 * Integration tests for the Stripe webhook handler.
 *
 * The handler verifies the request signature via paymentService's
 * `verifyWebhookSignature` (which delegates to the Stripe SDK that's
 * already mocked at preload — `webhooks.constructEvent` parses the body
 * as JSON). We focus on signature gating + the most-trafficked event
 * (`checkout.session.completed`) — the rest of the event-type ladder is
 * left to follow-up coverage.
 */

import { describe, test, expect } from 'bun:test';
import { POST as stripeWebhookPost } from '@/app/api/webhooks/stripe/route';
import { PaymentStatus } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createPolicyWithActors } from '../scenarios';
import { pendingPayment } from '../factories';

function buildWebhookRequest(eventBody: unknown, signature: string | null): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body: JSON.stringify(eventBody),
  });
}

describe('POST /api/webhooks/stripe', () => {
  test('returns 400 when stripe-signature header is missing', async () => {
    const res = await stripeWebhookPost(buildWebhookRequest({ type: 'noop' }, null) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Missing stripe-signature header' });
  });

  test('completes a PENDING checkout.session.completed payment and marks COMPLETED', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_completed_via_test',
          amount_total: 100000, // cents
          currency: 'mxn',
          customer_email: 'tenant@hestia.test',
          payment_intent: 'pi_test_completed',
          payment_method_types: ['card'],
          metadata: {
            paymentId: payment.id,
            paymentType: payment.type,
            paidBy: payment.paidBy,
            policyId: policy.id,
          },
        },
      },
    };

    const res = await stripeWebhookPost(
      buildWebhookRequest(event, 'fake-signature') as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ received: true });

    // Side effects: payment marked COMPLETED with stripeIntentId persisted.
    const refreshed = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(refreshed?.status).toBe(PaymentStatus.COMPLETED);
    expect(refreshed?.stripeIntentId).toBe('pi_test_completed');
    expect(refreshed?.paidAt).toBeInstanceOf(Date);

    // Activity log was written.
    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'payment_completed' },
    });
    expect(activity).not.toBeNull();
  });

  test('idempotent: a second checkout.session.completed for the same payment is skipped', async () => {
    const { policy } = await createPolicyWithActors();
    const payment = await pendingPayment.create({}, { transient: { policyId: policy.id } });

    const buildEvent = () => ({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_idem_test',
          amount_total: 50000,
          currency: 'mxn',
          customer_email: 'tenant@hestia.test',
          payment_intent: 'pi_idem',
          payment_method_types: ['card'],
          metadata: {
            paymentId: payment.id,
            paymentType: payment.type,
            paidBy: payment.paidBy,
            policyId: policy.id,
          },
        },
      },
    });

    const first = await stripeWebhookPost(
      buildWebhookRequest(buildEvent(), 'fake-signature') as never,
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({ received: true });

    const second = await stripeWebhookPost(
      buildWebhookRequest(buildEvent(), 'fake-signature') as never,
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    // Second call hits the atomic PENDING-only filter and is skipped.
    expect(secondBody).toMatchObject({ received: true, skipped: true });
  });
});
