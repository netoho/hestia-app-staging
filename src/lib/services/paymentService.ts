import 'server-only';

import {
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PayerType,
} from "@/prisma/generated/prisma-client/enums";
import type { Payment } from "@/prisma/generated/prisma-client/client";
import Stripe from 'stripe';
import { ServiceError, ErrorCode } from './types/errors';
import { BaseService } from './base/BaseService';
import { pricingService } from './pricingService';

// Stripe instance will be created when needed
let stripe: Stripe | null = null;

// Helper function to map Stripe payment methods to our enum
export function mapStripePaymentMethodToEnum(stripeMethod?: string): PaymentMethod {
  if (!stripeMethod) return PaymentMethod.CARD;

  switch (stripeMethod.toLowerCase()) {
    case 'card':
      return PaymentMethod.CARD;
    case 'bank_transfer':
    case 'ach_debit':
    case 'sepa_debit':
      return PaymentMethod.BANK_TRANSFER;
    case 'cash':
      return PaymentMethod.CASH;
    default:
      return PaymentMethod.CARD;
  }
}

async function getStripe(): Promise<Stripe> {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ServiceError(ErrorCode.STRIPE_API_ERROR, 'STRIPE_SECRET_KEY environment variable is required', 500);
    }

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  if (!stripe) {
    throw new ServiceError(ErrorCode.STRIPE_API_ERROR, 'Failed to initialize Stripe', 500);
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

// New types for payment breakdown and sessions
export interface PaymentBreakdown {
  investigationFee: number;
  subtotal: number;
  iva: number;
  totalWithIva: number;
  tenantPercentage: number;
  landlordPercentage: number;
  tenantAmount: number;
  landlordAmount: number;
  tenantAmountAfterFee: number; // Tenant amount minus investigation fee
  includesInvestigationFee: boolean;
}

export interface PaymentSessionResult {
  paymentId: string;
  checkoutUrl: string;
  amount: number;
  type: PaymentType;
  expiresAt: Date;
}

export interface PolicyPaymentSessionsResult {
  investigationFee: PaymentSessionResult | null;
  tenantPayment: PaymentSessionResult | null;
  landlordPayment: PaymentSessionResult | null;
}

export interface PaymentWithStatus extends Payment {
  isExpired?: boolean;
}

export interface PaymentSummary {
  policyId: string;
  breakdown: PaymentBreakdown;
  payments: PaymentWithStatus[];
  overallStatus: 'pending' | 'partial' | 'completed';
  totalPaid: number;
  totalRemaining: number;
}

export interface CreateManualPaymentParams {
  policyId: string;
  type: PaymentType;
  amount: number;
  paidBy: PayerType;
  reference?: string;
  description?: string;
}

export interface CreateTypedCheckoutParams {
  policyId: string;
  amount: number;
  type: PaymentType;
  paidBy: PayerType;
  description: string;
  customerEmail?: string;
}

class PaymentService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Create a payment record in the database
   */
  async createPaymentRecord({
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
    return this.prisma.payment.create({
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
  async createPaymentIntent({
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
  async createCheckoutSession({
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
    const policy = await this.prisma.policy.findUnique({
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
  async updatePaymentStatus(
    stripeObjectId: string,
    status: PaymentStatus,
    additionalData?: {
      method?: PaymentMethod | string;
      paidAt?: Date;
      errorMessage?: string;
      stripeCustomerId?: string;
    }
  ) {
    // Find payment by either intent ID or session ID
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { stripeIntentId: stripeObjectId },
          { stripeSessionId: stripeObjectId },
        ],
      },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, `Payment not found for Stripe ID: ${stripeObjectId}`, 404, { stripeObjectId });
    }

    // Map payment method if provided
    const mappedAdditionalData = additionalData ? {
      ...additionalData,
      method: additionalData.method ? mapStripePaymentMethodToEnum(additionalData.method as string) : undefined,
    } : {};

    // Update payment record
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...mappedAdditionalData,
      },
    });

    // Update policy payment status if payment is completed
    if (status === PaymentStatus.COMPLETED) {
      await this.prisma.policy.update({
        where: { id: payment.policyId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });

      // Log activity
      await this.prisma.policyActivity.create({
        data: {
          policyId: payment.policyId,
          action: 'payment_completed',
          details: {
            amount: payment.amount,
            currency: payment.currency,
            method: additionalData?.method,
          },
          performedById: 'system',
        },
      });
    }

    return updatedPayment;
  }

  /**
   * Get payment status for a policy
   */
  async getPaymentsByPolicyId(policyId: string) {
    return this.prisma.payment.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Verify webhook signature from Stripe
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<any> {
    const stripeInstance = await getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new ServiceError(ErrorCode.STRIPE_API_ERROR, 'Stripe webhook secret not configured', 500);
    }

    return stripeInstance.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  // ============================================
  // NEW PAYMENT METHODS
  // ============================================

  /**
   * Calculate payment breakdown for a policy
   * Returns the amounts each party needs to pay
   */
  async calculatePaymentBreakdown(policyId: string): Promise<PaymentBreakdown> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        packageId: true,
        rentAmount: true,
        totalPrice: true,
        tenantPercentage: true,
        landlordPercentage: true,
      },
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Use pricing service to calculate the breakdown
    const pricing = await pricingService.calculatePolicyPricing({
      packageId: policy.packageId || undefined,
      rentAmount: policy.rentAmount,
      tenantPercentage: policy.tenantPercentage,
      landlordPercentage: policy.landlordPercentage,
      includeInvestigationFee: true,
    });

    const investigationFee = pricing.investigationFee || 0;
    const tenantAmountAfterFee = Math.max(0, pricing.tenantAmount - investigationFee);

    return {
      investigationFee,
      subtotal: pricing.subtotal,
      iva: pricing.iva,
      totalWithIva: pricing.totalWithIva,
      tenantPercentage: pricing.tenantPercentage,
      landlordPercentage: pricing.landlordPercentage,
      tenantAmount: pricing.tenantAmount,
      landlordAmount: pricing.landlordAmount,
      tenantAmountAfterFee,
      includesInvestigationFee: investigationFee > 0,
    };
  }

  /**
   * Create a typed checkout session with proper metadata
   */
  async createTypedCheckoutSession({
    policyId,
    amount,
    type,
    paidBy,
    description,
    customerEmail,
  }: CreateTypedCheckoutParams): Promise<PaymentSessionResult> {
    const stripeInstance = await getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get policy for metadata
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { policyNumber: true, tenant: { select: { email: true } } },
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const successUrl = `${baseUrl}/dashboard/policies/${policyId}?payment=success&type=${type}`;
    const cancelUrl = `${baseUrl}/dashboard/policies/${policyId}?payment=cancelled&type=${type}`;

    // Create checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: description,
              description: `Póliza ${policy.policyNumber}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || policy.tenant?.email,
      metadata: {
        policyId,
        paymentType: type,
        paidBy,
      },
      payment_intent_data: {
        metadata: {
          policyId,
          paymentType: type,
          paidBy,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    });

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        policyId,
        amount,
        currency: 'MXN',
        status: PaymentStatus.PENDING,
        type,
        paidBy,
        stripeSessionId: session.id,
        checkoutUrl: session.url,
        checkoutUrlExpiry: expiresAt,
        description,
      },
    });

    return {
      paymentId: payment.id,
      checkoutUrl: session.url!,
      amount,
      type,
      expiresAt,
    };
  }

  /**
   * Create all payment sessions for a policy
   * Generates Stripe checkout URLs for investigation fee, tenant portion, and landlord portion
   */
  async createPolicyPaymentSessions(policyId: string): Promise<PolicyPaymentSessionsResult> {
    // Check for existing pending payments - don't create duplicates
    const existingPayments = await this.prisma.payment.findMany({
      where: {
        policyId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
    });

    if (existingPayments.length > 0) {
      throw new ServiceError(
        ErrorCode.ALREADY_EXISTS,
        'Policy already has pending payments. Use regenerateCheckoutUrl to update expired links.',
        400,
        { existingCount: existingPayments.length }
      );
    }

    const breakdown = await this.calculatePaymentBreakdown(policyId);
    const result: PolicyPaymentSessionsResult = {
      investigationFee: null,
      tenantPayment: null,
      landlordPayment: null,
    };

    // Create investigation fee payment if applicable
    if (breakdown.investigationFee > 0) {
      result.investigationFee = await this.createTypedCheckoutSession({
        policyId,
        amount: breakdown.investigationFee,
        type: PaymentType.INVESTIGATION_FEE,
        paidBy: PayerType.TENANT,
        description: 'Cuota de Investigación',
      });
    }

    // Create tenant payment if tenant percentage > 0
    if (breakdown.tenantPercentage > 0 && breakdown.tenantAmountAfterFee > 0) {
      result.tenantPayment = await this.createTypedCheckoutSession({
        policyId,
        amount: breakdown.tenantAmountAfterFee,
        type: PaymentType.TENANT_PORTION,
        paidBy: PayerType.TENANT,
        description: 'Pago del Inquilino - Prima de Póliza',
      });
    }

    // Create landlord payment if landlord percentage > 0
    if (breakdown.landlordPercentage > 0 && breakdown.landlordAmount > 0) {
      result.landlordPayment = await this.createTypedCheckoutSession({
        policyId,
        amount: breakdown.landlordAmount,
        type: PaymentType.LANDLORD_PORTION,
        paidBy: PayerType.LANDLORD,
        description: 'Pago del Arrendador - Prima de Póliza',
      });
    }

    // Log activity
    await this.prisma.policyActivity.create({
      data: {
        policyId,
        action: 'payment_links_generated',
        description: 'Links de pago generados',
        details: {
          investigationFee: breakdown.investigationFee,
          tenantAmount: breakdown.tenantAmountAfterFee,
          landlordAmount: breakdown.landlordAmount,
        },
        performedById: 'system',
      },
    });

    return result;
  }

  /**
   * Get payment summary for a policy with all payment details
   */
  async getPaymentSummary(policyId: string): Promise<PaymentSummary> {
    const [breakdown, payments] = await Promise.all([
      this.calculatePaymentBreakdown(policyId),
      this.prisma.payment.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Add expiration status to payments
    const now = new Date();
    const paymentsWithStatus: PaymentWithStatus[] = payments.map((payment: Payment) => ({
      ...payment,
      isExpired: payment.checkoutUrlExpiry ? payment.checkoutUrlExpiry < now : false,
    }));

    // Calculate totals
    const completedPayments = payments.filter((p: Payment) => p.status === PaymentStatus.COMPLETED);
    const totalPaid = completedPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    const totalRemaining = breakdown.totalWithIva - totalPaid;

    // Determine overall status
    let overallStatus: 'pending' | 'partial' | 'completed' = 'pending';
    if (totalPaid >= breakdown.totalWithIva) {
      overallStatus = 'completed';
    } else if (totalPaid > 0) {
      overallStatus = 'partial';
    }

    return {
      policyId,
      breakdown,
      payments: paymentsWithStatus,
      overallStatus,
      totalPaid,
      totalRemaining: Math.max(0, totalRemaining),
    };
  }

  /**
   * Create a manual payment record (for non-Stripe payments)
   * Status is set to PENDING_VERIFICATION until admin approves
   */
  async createManualPayment({
    policyId,
    type,
    amount,
    paidBy,
    reference,
    description,
  }: CreateManualPaymentParams): Promise<Payment> {
    // Verify policy exists
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Check for duplicate completed payment of same type
    const existingCompleted = await this.prisma.payment.findFirst({
      where: {
        policyId,
        type,
        status: PaymentStatus.COMPLETED,
      },
    });

    if (existingCompleted) {
      throw new ServiceError(
        ErrorCode.ALREADY_EXISTS,
        `Payment of type ${type} already completed for this policy`,
        400,
        { type }
      );
    }

    // Create manual payment with PENDING_VERIFICATION status
    const payment = await this.prisma.payment.create({
      data: {
        policyId,
        amount,
        currency: 'MXN',
        status: PaymentStatus.PENDING_VERIFICATION,
        method: PaymentMethod.MANUAL,
        type,
        paidBy,
        isManual: true,
        reference,
        description: description || `Pago manual - ${type}`,
      },
    });

    // Log activity
    await this.prisma.policyActivity.create({
      data: {
        policyId,
        action: 'manual_payment_recorded',
        description: `Pago manual registrado: ${type}`,
        details: {
          paymentId: payment.id,
          amount,
          type,
          reference,
        },
        performedById: 'system',
      },
    });

    return payment;
  }

  /**
   * Verify a manual payment (admin only)
   * Approves or rejects a PENDING_VERIFICATION payment
   */
  async verifyManualPayment(
    paymentId: string,
    approved: boolean,
    verifierId: string,
    notes?: string
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
    }

    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Payment is not pending verification',
        400,
        { currentStatus: payment.status }
      );
    }

    const newStatus = approved ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        verificationNotes: notes,
        paidAt: approved ? new Date() : undefined,
      },
    });

    // Log activity
    await this.prisma.policyActivity.create({
      data: {
        policyId: payment.policyId,
        action: approved ? 'manual_payment_verified' : 'manual_payment_rejected',
        description: approved
          ? `Pago manual verificado: ${payment.type}`
          : `Pago manual rechazado: ${payment.type}`,
        details: {
          paymentId,
          amount: payment.amount,
          type: payment.type,
          verifiedBy: verifierId,
          notes,
        },
        performedById: verifierId,
        performedByType: 'user',
      },
    });

    return updatedPayment;
  }

  /**
   * Update payment receipt info (after S3 upload)
   */
  async updatePaymentReceipt(
    paymentId: string,
    receiptS3Key: string,
    receiptFileName: string
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptS3Key,
        receiptFileName,
      },
    });
  }

  /**
   * Regenerate an expired checkout URL for a payment
   */
  async regenerateCheckoutUrl(paymentId: string): Promise<PaymentSessionResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        policy: {
          select: { tenant: { select: { email: true } } },
        },
      },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Can only regenerate URL for pending payments',
        400,
        { currentStatus: payment.status }
      );
    }

    // Create new checkout session
    const result = await this.createTypedCheckoutSession({
      policyId: payment.policyId,
      amount: payment.amount,
      type: payment.type as PaymentType,
      paidBy: payment.paidBy as PayerType,
      description: payment.description || 'Pago de Póliza',
      customerEmail: payment.policy.tenant?.email,
    });

    // Update the existing payment record with new session info
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        stripeSessionId: null, // Clear old session
        checkoutUrl: result.checkoutUrl,
        checkoutUrlExpiry: result.expiresAt,
      },
    });

    // Delete the newly created payment (we just want the session)
    await this.prisma.payment.delete({
      where: { id: result.paymentId },
    });

    return {
      ...result,
      paymentId, // Return original payment ID
    };
  }

  /**
   * Get a specific payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }
}

// Singleton instance
export const paymentService = new PaymentService();

// Bound legacy function exports for backwards compatibility
export const createPaymentRecord = paymentService.createPaymentRecord.bind(paymentService);
export const createPaymentIntent = paymentService.createPaymentIntent.bind(paymentService);
export const createCheckoutSession = paymentService.createCheckoutSession.bind(paymentService);
export const updatePaymentStatus = paymentService.updatePaymentStatus.bind(paymentService);
export const getPaymentsByPolicyId = paymentService.getPaymentsByPolicyId.bind(paymentService);
export const verifyWebhookSignature = paymentService.verifyWebhookSignature.bind(paymentService);

// New method exports
export const calculatePaymentBreakdown = paymentService.calculatePaymentBreakdown.bind(paymentService);
export const createPolicyPaymentSessions = paymentService.createPolicyPaymentSessions.bind(paymentService);
export const getPaymentSummary = paymentService.getPaymentSummary.bind(paymentService);
export const createManualPayment = paymentService.createManualPayment.bind(paymentService);
export const verifyManualPayment = paymentService.verifyManualPayment.bind(paymentService);
export const updatePaymentReceipt = paymentService.updatePaymentReceipt.bind(paymentService);
export const regenerateCheckoutUrl = paymentService.regenerateCheckoutUrl.bind(paymentService);
export const getPaymentById = paymentService.getPaymentById.bind(paymentService);

// Re-export class for type usage
export { PaymentService };
