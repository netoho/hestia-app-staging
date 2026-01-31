import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updatePaymentById } from '@/lib/services/paymentService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { sendPaymentCompletedEmail, sendAllPaymentsCompletedEmail } from '@/lib/services/emailService';
import { getActiveAdmins } from '@/lib/services/userService';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@/prisma/generated/prisma-client/enums';

const PAYMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  INVESTIGATION_FEE: 'Cuota de Investigación',
  TENANT_PORTION: 'Pago del Inquilino',
  LANDLORD_PORTION: 'Pago del Arrendador',
};

export async function POST(request: NextRequest) {
  let eventType: string | undefined;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature and get event
    const event = await verifyWebhookSignature(body, signature);
    eventType = event.type;

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const paymentId = session.metadata?.paymentId;
        const paymentType = session.metadata?.paymentType;
        const paidBy = session.metadata?.paidBy;
        const policyId = session.metadata?.policyId;

        if (!paymentId) {
          console.error('Webhook: Missing paymentId in session metadata');
          return NextResponse.json({ received: true, error: 'Missing paymentId' });
        }

        // Atomic idempotency check: try to claim the payment by setting PROCESSING
        // This prevents race conditions when multiple webhooks fire simultaneously
        const claimResult = await prisma.payment.updateMany({
          where: {
            id: paymentId,
            status: PaymentStatus.PENDING, // Only claim if still PENDING
          },
          data: {
            status: PaymentStatus.PROCESSING,
          },
        });

        if (claimResult.count === 0) {
          // Payment already claimed by another webhook or already completed
          const existingPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
            select: { status: true },
          });
          console.log(`Webhook idempotency: payment ${paymentId} status is ${existingPayment?.status}, skipping`);
          return NextResponse.json({ received: true, skipped: true });
        }

        // Update payment status to COMPLETED
        const payment = await updatePaymentById(
          paymentId,
          PaymentStatus.COMPLETED,
          {
            paidAt: new Date(),
            method: session.payment_method_types?.[0] || 'card',
            stripeIntentId: session.payment_intent,
          }
        );

        if (payment && policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';
          const amount = session.amount_total / 100;

          // Log activity with payment type
          await logPolicyActivity({
            policyId,
            action: 'payment_completed',
            description: `Pago completado: ${typeDescription}`,
            performedById: 'system',
            details: {
              amount,
              currency: session.currency?.toUpperCase(),
              paymentType,
              paidBy,
              paymentMethod: session.payment_method_types?.[0] || 'card',
              stripeSessionId: session.id,
              paymentId,
            }
          });

          // Get policy info for email
          const policy = await prisma.policy.findUnique({
            where: { id: policyId },
            select: {
              policyNumber: true,
              tenant: { select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } },
              landlords: { where: { isPrimary: true }, select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } }
            }
          });

          // Send payment confirmation email to payer
          if (policy && session.customer_email) {
            const payerName = paidBy === 'TENANT'
              ? `${policy.tenant?.firstName || ''} ${policy.tenant?.paternalLastName || ''} ${policy.tenant?.maternalLastName || ''}`.trim()
              : policy.landlords?.[0] ? `${policy.landlords[0].firstName || ''} ${policy.landlords[0].paternalLastName || ''} ${policy.landlords[0].maternalLastName || ''}`.trim() : undefined;

            await sendPaymentCompletedEmail({
              email: session.customer_email || policy.tenant?.email,
              payerName: payerName || undefined,
              policyNumber: policy.policyNumber,
              paymentType: typeDescription,
              amount,
              paidAt: new Date()
            });
          }

          // Check if all payments are complete
          const allPayments = await prisma.payment.findMany({
            where: { policyId }
          });

          const allComplete = allPayments.length > 0 &&
            allPayments.every(p => p.status === PaymentStatus.COMPLETED);

          if (allComplete) {
            await logPolicyActivity({
              policyId,
              action: 'all_payments_completed',
              description: 'Todos los pagos de la póliza han sido completados',
              performedById: 'system',
              details: { totalPayments: allPayments.length }
            });

            // Send notification to all admin users
            const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const admins = await getActiveAdmins();

            if (admins.length === 0) {
              console.warn('No active admin users found - skipping admin notification');
            } else {
              for (const admin of admins) {
                if (!admin.email) continue;
                await sendAllPaymentsCompletedEmail({
                  adminEmail: admin.email,
                  policyNumber: policy?.policyNumber || policyId,
                  totalPayments: allPayments.length,
                  totalAmount
                });
              }
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        // Session expired - just log it, DON'T mark payment as FAILED
        // User can create a new session via /payments/[id]
        const session = event.data.object as any;
        const paymentId = session.metadata?.paymentId;
        const paymentType = session.metadata?.paymentType;
        const policyId = session.metadata?.policyId;

        if (!paymentId) {
          console.warn('Webhook: checkout.session.expired missing paymentId in metadata', session.id);
        }

        if (policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';

          await logPolicyActivity({
            policyId,
            action: 'checkout_session_expired',
            description: `Sesión de checkout expirada: ${typeDescription}`,
            performedById: 'system',
            details: {
              paymentType,
              stripeSessionId: session.id,
              paymentId,
            }
          });
        }
        break;
      }

      case 'charge.refunded': {
        // Handle refunds - update payment status to REFUNDED
        const charge = event.data.object as any;
        const paymentIntentId = charge.payment_intent;

        if (!paymentIntentId) {
          console.warn('Webhook: charge.refunded missing payment_intent', charge.id);
          break;
        }

        // Find payment by stripeIntentId
        const refundedPayment = await prisma.payment.findFirst({
          where: { stripeIntentId: paymentIntentId },
          select: { id: true, policyId: true, type: true, amount: true },
        });

        if (!refundedPayment) {
          console.warn(`Webhook: No payment found for payment_intent ${paymentIntentId}`);
          break;
        }

        // Update payment status to REFUNDED
        await prisma.payment.update({
          where: { id: refundedPayment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            refundAmount: charge.amount_refunded / 100,
          },
        });

        // Log activity
        const refundTypeDescription = PAYMENT_TYPE_DESCRIPTIONS[refundedPayment.type] || refundedPayment.type || 'Pago';
        await logPolicyActivity({
          policyId: refundedPayment.policyId,
          action: 'payment_refunded',
          description: `Reembolso procesado: ${refundTypeDescription}`,
          performedById: 'system',
          details: {
            paymentId: refundedPayment.id,
            chargeId: charge.id,
            originalAmount: refundedPayment.amount,
            refundAmount: charge.amount_refunded / 100,
            paymentType: refundedPayment.type,
          },
        });

        console.log(`Webhook: Payment ${refundedPayment.id} marked as REFUNDED (${charge.amount_refunded / 100} MXN)`);
        break;
      }

      // Note: payment_intent.succeeded and payment_intent.payment_failed are intentionally NOT handled.
      // checkout.session.completed/expired already handle these cases and payment_intent events
      // can cause race conditions (payment intent doesn't have paymentId in metadata).

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error(`Webhook error (event: ${eventType || 'unknown'}):`, error);
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
