import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, mapStripePaymentMethodToEnum } from '@/lib/services/paymentService';
import { logPolicyActivity } from '@/lib/services/policyService';

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
    const event = await PaymentService.verifyWebhookSignature(body, signature);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Update payment status
        const payment = await PaymentService.updatePaymentStatus(
          session.id,
          'COMPLETED',
          {
            paidAt: new Date(),
            method: session.payment_method_types?.[0] || 'card'
          }
        );

        if (payment && session.metadata?.policyId) {
          // Log activity
          await logPolicyActivity({
            policyId: session.metadata.policyId,
            action: 'payment_completed',
            description: 'Payment completed via Stripe',
            performedById: 'system',
            details: {
              amount: session.amount_total / 100, // Convert from cents
              currency: session.currency?.toUpperCase(),
              paymentMethod: session.payment_method_types?.[0] || 'card',
              stripeSessionId: session.id
            }
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any;
        
        // Update payment status
        await PaymentService.updatePaymentStatus(
          session.id,
          'FAILED',
          {
            errorMessage: 'Checkout session expired'
          }
        );

        if (session.metadata?.policyId) {
          // Log activity
          await logPolicyActivity({
            policyId: session.metadata.policyId,
            action: 'payment_failed',
            description: 'Checkout session expired',
            performedById: 'system',
            details: {
              reason: 'Checkout session expired',
              stripeSessionId: session.id
            }
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        
        // Update payment status if it was a payment intent
        await PaymentService.updatePaymentStatus(
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
        await PaymentService.updatePaymentStatus(
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
