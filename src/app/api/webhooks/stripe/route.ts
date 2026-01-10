import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updatePaymentStatus } from '@/lib/services/paymentService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { sendPaymentCompletedEmail, sendAllPaymentsCompletedEmail } from '@/lib/services/emailService';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@/prisma/generated/prisma-client/enums';

const PAYMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  INVESTIGATION_FEE: 'Cuota de Investigación',
  TENANT_PORTION: 'Porción del Inquilino',
  LANDLORD_PORTION: 'Porción del Arrendador',
};

export async function POST(request: NextRequest) {
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

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const paymentType = session.metadata?.paymentType;
        const paidBy = session.metadata?.paidBy;
        const policyId = session.metadata?.policyId;

        // Update payment status
        const payment = await updatePaymentStatus(
          session.id,
          'COMPLETED',
          {
            paidAt: new Date(),
            method: session.payment_method_types?.[0] || 'card'
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
              stripeSessionId: session.id
            }
          });

          // Get policy info for email
          const policy = await prisma.policy.findUnique({
            where: { id: policyId },
            select: {
              policyNumber: true,
              tenant: { select: { email: true, firstName: true, lastName: true } },
              landlords: { where: { isPrimary: true }, select: { email: true, firstName: true, lastName: true } }
            }
          });

          // Send payment confirmation email to payer
          if (policy && session.customer_email) {
            const payerName = paidBy === 'TENANT'
              ? `${policy.tenant?.firstName || ''} ${policy.tenant?.lastName || ''}`.trim()
              : policy.landlords?.[0] ? `${policy.landlords[0].firstName || ''} ${policy.landlords[0].lastName || ''}`.trim() : undefined;

            await sendPaymentCompletedEmail({
              email: session.customer_email,
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
        const session = event.data.object as any;
        const paymentType = session.metadata?.paymentType;
        const policyId = session.metadata?.policyId;

        // Update payment status
        await updatePaymentStatus(
          session.id,
          'FAILED',
          {
            errorMessage: 'Checkout session expired'
          }
        );

        if (policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';

          // Log activity with payment type
          await logPolicyActivity({
            policyId,
            action: 'payment_expired',
            description: `Link de pago expirado: ${typeDescription}`,
            performedById: 'system',
            details: {
              reason: 'Checkout session expired',
              paymentType,
              stripeSessionId: session.id
            }
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        
        // Update payment status if it was a payment intent
        await updatePaymentStatus(
          paymentIntent.id,
          'COMPLETED',
          {
            paidAt: new Date(),
            method: paymentIntent.payment_method_types?.[0] || 'card'
          }
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        
        // Update payment status
        await updatePaymentStatus(
          paymentIntent.id,
          'FAILED',
          {
            errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
          }
        );
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
