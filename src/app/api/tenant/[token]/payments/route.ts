import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/paymentService';
import { getPolicyByToken } from '@/lib/services/policyApplicationService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Verify the token and get policy
    const policy = await getPolicyByToken(token);
    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found or token expired' },
        { status: 404 }
      );
    }

    // Get payments for this policy
    const payments = await PaymentService.getPaymentsByPolicyId(policy.id);

    return NextResponse.json({
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        stripeIntentId: payment.stripeIntentId,
        stripeSessionId: payment.stripeSessionId,
        paidAt: payment.paidAt,
        errorMessage: payment.errorMessage,
        createdAt: payment.createdAt
      }))
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}