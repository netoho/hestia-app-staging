import { PaymentStatus } from '@prisma/client';
import { PaymentMethod, PaymentMethodType } from '@/lib/prisma-types';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

// Stripe instance will be created when needed
let stripe: Stripe | null = null;

// Initialize Stripe only when needed
// Helper function to map Stripe payment methods to our enum
export function mapStripePaymentMethodToEnum(stripeMethod?: string): PaymentMethodType {
  if (!stripeMethod) return 'CARD';

  switch (stripeMethod.toLowerCase()) {
    case 'card':
      return 'CARD';
    case 'bank_transfer':
    case 'ach_debit':
    case 'sepa_debit':
      return 'BANK_TRANSFER';
    case 'cash':
      return 'CASH';
    default:
      return 'CARD'; // Default fallback
  }
}

async function getStripe(): Promise<Stripe> {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  if (!stripe) {
    throw new Error('Failed to initialize Stripe');
  }

  return stripe!;
}

export interface CreatePaymentIntentParams {
  policyId: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionParams {
  policyId: string;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export class PaymentService {
  /**
   * Create a payment record in the database
   */
  static async createPaymentRecord({
    policyId,
    amount,
    currency = 'MXN',
    stripeIntentId,
    stripeSessionId,
    description,
    metadata,
  }: {
    policyId: string;
    amount: number;
    currency?: string;
    stripeIntentId?: string;
    stripeSessionId?: string;
    description?: string;
    metadata?: any;
  }) {
    return await prisma.payment.create({
      data: {
        policyId,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        stripeIntentId,
        stripeSessionId,
        description,
        metadata,
      },
    });
  }

  /**
   * Create a Stripe Payment Intent for direct card payments
   */
  static async createPaymentIntent({
    policyId,
    amount,
    currency = 'MXN',
    description,
    metadata = {},
  }: CreatePaymentIntentParams) {
    const stripeInstance = await getStripe();

    // Create payment intent in Stripe
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        policyId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record in database
    const payment = await this.createPaymentRecord({
      policyId,
      amount,
      currency,
      stripeIntentId: paymentIntent.id,
      description,
      metadata,
    });

    return {
      ...paymentIntent,
      payment,
    };
  }

  /**
   * Create a Stripe Checkout Session for hosted payment page
   */
  static async createCheckoutSession({
    policyId,
    amount,
    currency = 'MXN',
    successUrl,
    cancelUrl,
    customerEmail,
    metadata = {},
  }: CreateCheckoutSessionParams) {
    const stripeInstance = await getStripe();

    // Get policy details for line item description
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { packageName: true, tenantEmail: true },
    });

    // Create checkout session in Stripe
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: policy?.packageName || 'Protección de Garantía',
              description: `Pago de protección para ${policy?.tenantEmail || 'inquilino'}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || policy?.tenantEmail,
      metadata: {
        policyId,
        ...metadata,
      },
      // Enable enhanced security (3D Secure)
      payment_intent_data: {
        metadata: {
          policyId,
          ...metadata,
        },
      },
    });

    // Create payment record in database
    const payment = await this.createPaymentRecord({
      policyId,
      amount,
      currency,
      stripeSessionId: session.id,
      description: `Policy payment for ${policyId}`,
      metadata,
    });

    return {
      id: session.id,
      checkoutUrl: session.url,
      stripeSessionId: session.id,
      payment,
    };
  }

  /**
   * Update payment status based on Stripe webhook events
   */
  static async updatePaymentStatus(
    stripeObjectId: string,
    status: PaymentStatus,
    additionalData?: {
      method?: PaymentMethodType | string;
      paidAt?: Date;
      errorMessage?: string;
      stripeCustomerId?: string;
    }
  ) {
    // Find payment by either intent ID or session ID
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeIntentId: stripeObjectId },
          { stripeSessionId: stripeObjectId },
        ],
      },
    });

    if (!payment) {
      throw new Error(`Payment not found for Stripe ID: ${stripeObjectId}`);
    }

    // Map payment method if provided
    const mappedAdditionalData = additionalData ? {
      ...additionalData,
      method: additionalData.method ? mapStripePaymentMethodToEnum(additionalData.method as string) : undefined,
    } : {};

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...mappedAdditionalData,
      },
    });

    // Update policy payment status if payment is completed
    if (status === PaymentStatus.COMPLETED) {
      await prisma.policy.update({
        where: { id: payment.policyId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });

      // Log activity
      await prisma.policyActivity.create({
        data: {
          policyId: payment.policyId,
          action: 'payment_completed',
          details: {
            amount: payment.amount,
            currency: payment.currency,
            method: additionalData?.method,
          },
          performedBy: 'system',
        },
      });
    }

    return updatedPayment;
  }

  /**
   * Get payment status for a policy
   */
  static async getPaymentsByPolicyId(policyId: string) {
    return await prisma.payment.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Process refund for a payment
   */
  static async processRefund(paymentId: string, amount?: number, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments');
    }

    const stripeInstance = await getStripe();
    const refundAmount = amount || payment.amount;

    // Create refund in Stripe
    const refund = await stripeInstance.refunds.create({
      payment_intent: payment.stripeIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason || 'requested_by_customer',
    });

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: refundAmount,
      },
    });

    // Update policy payment status
    await prisma.policy.update({
      where: { id: payment.policyId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: payment.policyId,
        action: 'payment_refunded',
        details: {
          amount: refundAmount,
          currency: payment.currency,
          reason,
          refundId: refund.id,
        },
        performedBy: 'system',
      },
    });

    return updatedPayment;
  }

  /**
   * Verify webhook signature from Stripe
   */
  static async verifyWebhookSignature(payload: string, signature: string): Promise<any> {
    const stripeInstance = await getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripeInstance.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
