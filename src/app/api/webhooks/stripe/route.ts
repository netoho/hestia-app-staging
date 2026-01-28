import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updatePaymentById } from '@/lib/services/paymentService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { sendPaymentCompletedEmail, sendAllPaymentsCompletedEmail } from '@/lib/services/emailService';
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

        // Idempotency check: skip if payment already completed
        const existingPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
          select: { status: true },
        });

        if (existingPayment?.status === PaymentStatus.COMPLETED) {
          console.log(`Webhook idempotency: payment ${paymentId} already completed, skipping`);
          return NextResponse.json({ received: true, skipped: true });
        }

        // Update payment status using our internal ID
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

            // Send notification to admin
            const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@hestiaplp.com.mx';

            await sendAllPaymentsCompletedEmail({
              adminEmail,
              policyNumber: policy?.policyNumber || policyId,
              totalPayments: allPayments.length,
              totalAmount
            });
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
