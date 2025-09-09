import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/paymentService';
import { getPolicyByToken, addPolicyActivity } from '@/lib/services/policyApplicationService';

interface CreatePaymentBody {
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body: CreatePaymentBody = await request.json();

    // Validate required fields
    if (!body.amount || !body.currency || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, description' },
        { status: 400 }
      );
    }

    // Verify the token and get policy
    const policy = await getPolicyByToken(token);
    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found or token expired' },
        { status: 404 }
      );
    }

    // Check if policy already has a completed payment
    const existingPayments = await PaymentService.getPaymentsByPolicyId(policy.id);
    const hasCompletedPayment = existingPayments.some((p: any) => p.status === 'COMPLETED');
    
    if (hasCompletedPayment) {
      return NextResponse.json(
        { error: 'Payment already completed for this policy' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await PaymentService.createCheckoutSession({
      policyId: policy.id,
      amount: body.amount,
      currency: body.currency,
      successUrl: body.returnUrl + '&payment=success',
      cancelUrl: body.returnUrl + '&payment=cancelled',
      customerEmail: policy.tenantEmail,
      metadata: {
        policyId: policy.id,
        tenantEmail: policy.tenantEmail,
        tokenAccess: token
      }
    });

    // Log activity
    await addPolicyActivity(
      policy.id,
      'payment_initiated',
      'tenant',
      {
        amount: body.amount,
        currency: body.currency,
        stripeSessionId: checkoutSession.stripeSessionId
      }
    );

    return NextResponse.json({
      paymentId: checkoutSession.id,
      checkoutUrl: checkoutSession.checkoutUrl,
      stripeSessionId: checkoutSession.stripeSessionId
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}