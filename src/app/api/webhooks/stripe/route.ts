import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, mapStripePaymentMethodToEnum } from '@/lib/services/paymentService';
import { addPolicyActivity } from '@/lib/services/policyApplicationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log('Received Stripe webhook:', body);
    console.log('Received signature:', signature);

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
          await addPolicyActivity(
            session.metadata.policyId,
            'payment_completed',
            'system',
            {
              amount: session.amount_total / 100, // Convert from cents
              currency: session.currency?.toUpperCase(),
              paymentMethod: session.payment_method_types?.[0] || 'card',
              stripeSessionId: session.id
            }
          );
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
          await addPolicyActivity(
            session.metadata.policyId,
            'payment_failed',
            'system',
            {
              reason: 'Checkout session expired',
              stripeSessionId: session.id
            }
          );
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
        console.log(`Unhandled event type: ${event.type}`);
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
