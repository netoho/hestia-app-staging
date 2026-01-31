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
import { TAX_CONFIG } from '@/lib/constants/businessConfig';
import { calculateSubtotalFromTotal } from '@/lib/utils/money';
import { PAYMENT_LIMITS } from '@/lib/config/payments';

// IVA multiplier for convenience (1 + 0.16 = 1.16)
const IVA_MULTIPLIER = 1 + TAX_CONFIG.IVA_RATE;

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
  createdById?: string;  // User ID who recorded the manual payment
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
    // Calculate subtotal and IVA from amount (amount includes 16% IVA)
    const breakdown = calculateSubtotalFromTotal(amount);

    return this.prisma.payment.create({
      data: {
        policyId,
        amount,
        subtotal: breakdown.subtotal,
        iva: breakdown.iva,
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

    // Create checkout session in Stripe with idempotency key for retry safety
    const idempotencyKey = `checkout-${policyId}-${amount}`;
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
    }, { idempotencyKey });

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
   * Private helper: Check if all payments complete and update policy status
   * Must be called within a transaction
   */
  private async checkAndUpdatePolicyPaymentStatus(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    policyId: string,
    completedPayment: { type: string | null; amount: number; currency: string },
    method?: string
  ) {
    // Log activity for this individual payment
    await tx.policyActivity.create({
      data: {
        policyId,
        action: 'payment_completed',
        description: `Pago completado: ${completedPayment.type}`,
        details: {
          amount: completedPayment.amount,
          currency: completedPayment.currency,
          method,
        },
        performedById: 'system',
      },
    });

    // Check if ALL payments for this policy are now completed
    const allPayments = await tx.payment.findMany({
      where: { policyId },
      select: { status: true },
    });

    const allCompleted = allPayments.length > 0 &&
      allPayments.every(p => p.status === PaymentStatus.COMPLETED);

    if (allCompleted) {
      await tx.policy.update({
        where: { id: policyId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });
    }

    return allCompleted;
  }

  /**
   * Check if all payments are completed and update policy status
   * Used when activity log is already created elsewhere (e.g., manual payment verification)
   */
  private async updatePolicyPaymentStatusIfComplete(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    policyId: string
  ): Promise<boolean> {
    const allPayments = await tx.payment.findMany({
      where: { policyId },
      select: { status: true },
    });

    const allCompleted = allPayments.length > 0 &&
      allPayments.every(p => p.status === PaymentStatus.COMPLETED);

    if (allCompleted) {
      await tx.policy.update({
        where: { id: policyId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });
    }

    return allCompleted;
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

    // Use transaction to ensure atomicity when updating payment + policy status
    return this.prisma.$transaction(async (tx) => {
      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          ...mappedAdditionalData,
        },
      });

      // Update policy payment status if ALL payments are completed
      if (status === PaymentStatus.COMPLETED) {
        await this.checkAndUpdatePolicyPaymentStatus(
          tx,
          payment.policyId,
          { type: payment.type, amount: payment.amount, currency: payment.currency },
          additionalData?.method as string
        );
      }

      return updatedPayment;
    });
  }

  /**
   * Update payment status by internal payment ID (preferred for webhooks)
   */
  async updatePaymentById(
    paymentId: string,
    status: PaymentStatus,
    additionalData?: {
      method?: PaymentMethod | string;
      paidAt?: Date;
      errorMessage?: string;
      stripeIntentId?: string;
    }
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, `Payment not found: ${paymentId}`, 404, { paymentId });
    }

    // Map payment method if provided
    const mappedAdditionalData = additionalData ? {
      ...additionalData,
      method: additionalData.method ? mapStripePaymentMethodToEnum(additionalData.method as string) : undefined,
    } : {};

    // Use transaction to ensure atomicity when updating payment + policy status
    return this.prisma.$transaction(async (tx) => {
      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          ...mappedAdditionalData,
        },
      });

      // Update policy payment status if ALL payments are completed
      if (status === PaymentStatus.COMPLETED) {
        await this.checkAndUpdatePolicyPaymentStatus(
          tx,
          payment.policyId,
          { type: payment.type, amount: payment.amount, currency: payment.currency },
          additionalData?.method as string
        );
      }

      return updatedPayment;
    });
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

    // Use pricing service to get base calculation (especially investigationFee)
    const pricing = await pricingService.calculatePolicyPricing({
      packageId: policy.packageId || undefined,
      rentAmount: policy.rentAmount,
      tenantPercentage: policy.tenantPercentage,
      landlordPercentage: policy.landlordPercentage,
      includeInvestigationFee: true,
    });

    // Use stored totalPrice if available (supports manual price override)
    // Otherwise fall back to calculated pricing
    let totalWithIva: number;
    let subtotal: number;
    let iva: number;
    let tenantAmount: number;
    let landlordAmount: number;

    if (policy.totalPrice && policy.totalPrice > 0) {
      // Manual override: use stored price
      totalWithIva = policy.totalPrice;
      const breakdown = calculateSubtotalFromTotal(totalWithIva);
      subtotal = breakdown.subtotal;
      iva = breakdown.iva;
      // Recalculate amounts based on percentages
      tenantAmount = Math.round((subtotal * (policy.tenantPercentage / 100)) * 100) / 100;
      landlordAmount = Math.round((subtotal * (policy.landlordPercentage / 100)) * 100) / 100;
    } else {
      // Use calculated pricing
      totalWithIva = pricing.totalWithIva;
      subtotal = pricing.subtotal;
      iva = pricing.iva;
      tenantAmount = pricing.tenantAmount;
      landlordAmount = pricing.landlordAmount;
    }

    const investigationFee = pricing.investigationFee || 0;
    const tenantAmountAfterFee = Math.max(0, tenantAmount - investigationFee);

    return {
      investigationFee,
      subtotal,
      iva,
      totalWithIva,
      tenantPercentage: policy.tenantPercentage,
      landlordPercentage: policy.landlordPercentage,
      tenantAmount,
      landlordAmount,
      tenantAmountAfterFee,
      includesInvestigationFee: investigationFee > 0,
    };
  }

  /**
   * Create a typed checkout session with proper metadata
   * Creates DB record first, then Stripe session with proper paymentId in URLs
   */
  async createTypedCheckoutSession({
    policyId,
    amount,
    type,
    paidBy,
    description,
    customerEmail,
  }: CreateTypedCheckoutParams): Promise<PaymentSessionResult> {
    // Validate amount
    if (amount <= 0) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive', 400, { amount });
    }
    if (amount > PAYMENT_LIMITS.MAX_TOTAL) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, 'Amount exceeds maximum limit', 400, { amount, maxAllowed: PAYMENT_LIMITS.MAX_TOTAL });
    }

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

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Calculate subtotal and IVA from total amount (amount includes 16% IVA)
    const breakdown = calculateSubtotalFromTotal(amount);

    // 1. Create payment record FIRST (without Stripe session)
    const payment = await this.prisma.payment.create({
      data: {
        policyId,
        amount,
        subtotal: breakdown.subtotal,
        iva: breakdown.iva,
        currency: 'MXN',
        status: PaymentStatus.PENDING,
        type,
        paidBy,
        checkoutUrlExpiry: expiresAt,
        description,
      },
    });

    // 2. Create Stripe session with actual paymentId in URLs
    const successUrl = `${baseUrl}/payments/${payment.id}?status=success`;
    const cancelUrl = `${baseUrl}/payments/${payment.id}?status=cancelled`;

    let session: Stripe.Checkout.Session;
    try {
      // If tax rate is configured, send subtotal (before IVA) and let Stripe add tax
      const taxRateId = process.env.STRIPE_TAX_RATE_ID;
      const subtotalForStripe = taxRateId ? Math.round((amount / IVA_MULTIPLIER) * 100) : Math.round(amount * 100);

      // Idempotency key based on payment ID for retry safety
      const idempotencyKey = `typed-${payment.id}`;
      session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: description,
                description: `Póliza ${policy.policyNumber}`,
              },
              unit_amount: subtotalForStripe,
            },
            quantity: 1,
            ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail || policy.tenant?.email,
        metadata: {
          paymentId: payment.id,
          policyId,
          paymentType: type,
          paidBy,
        },
        payment_intent_data: {
          metadata: {
            paymentId: payment.id,
            policyId,
            paymentType: type,
            paidBy,
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      }, { idempotencyKey });
    } catch (error) {
      // If Stripe fails, delete the orphaned payment record
      await this.prisma.payment.delete({ where: { id: payment.id } });
      throw new ServiceError(
        ErrorCode.STRIPE_API_ERROR,
        'Failed to create Stripe checkout session',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // 3. Update payment record with Stripe session info
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeSessionId: session.id,
        checkoutUrl: session.url,
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
        'Policy already has pending payments. Expired links auto-refresh when accessed.',
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
    createdById,
  }: CreateManualPaymentParams): Promise<Payment> {
    // Verify policy exists
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Validate amount
    if (amount <= 0 || amount > PAYMENT_LIMITS.MAX_TOTAL) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        `Amount must be between 0 and ${PAYMENT_LIMITS.MAX_TOTAL.toLocaleString()} MXN`,
        400,
        { amount, maxAllowed: PAYMENT_LIMITS.MAX_TOTAL }
      );
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

    // Calculate subtotal and IVA from amount (amount includes 16% IVA)
    const breakdown = calculateSubtotalFromTotal(amount);

    // Create manual payment with PENDING_VERIFICATION status
    const payment = await this.prisma.payment.create({
      data: {
        policyId,
        amount,
        subtotal: breakdown.subtotal,
        iva: breakdown.iva,
        currency: 'MXN',
        status: PaymentStatus.PENDING_VERIFICATION,
        method: PaymentMethod.MANUAL,
        type,
        paidBy,
        isManual: true,
        reference,
        description: description || `Pago manual - ${type}`,
        createdById,
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
    const newStatus = approved ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

    // Use transaction with atomic claim to prevent race conditions
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: only proceed if payment is still PENDING_VERIFICATION
      const claimResult = await tx.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING_VERIFICATION,
        },
        data: {
          status: newStatus,
          verifiedBy: verifierId,
          verifiedAt: new Date(),
          verificationNotes: notes,
          paidAt: approved ? new Date() : undefined,
        },
      });

      if (claimResult.count === 0) {
        // Payment was already processed or doesn't exist
        const existing = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { status: true },
        });
        if (!existing) {
          throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
        }
        throw new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Payment is not pending verification',
          400,
          { currentStatus: existing.status }
        );
      }

      // Fetch the updated payment for activity logging
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });

      // Log activity
      await tx.policyActivity.create({
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

      // Check and update policy payment status if approved
      if (approved) {
        await this.updatePolicyPaymentStatusIfComplete(tx, payment.policyId);
      }

      return payment;
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
   * Get or create a checkout session for a payment
   * Used by public /payments/[id] page to create sessions on demand
   * Returns null if payment is already completed, cancelled, failed, or manual
   */
  async getOrCreateCheckoutSession(paymentId: string): Promise<{
    checkoutUrl: string;
    expiresAt: Date;
  } | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        policy: {
          select: { policyNumber: true, tenant: { select: { email: true } } },
        },
      },
    });

    if (!payment) {
      return null;
    }

    // If payment is completed, cancelled, failed, or pending verification (manual) → return null
    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.PENDING_VERIFICATION ||
      payment.isManual
    ) {
      return null;
    }

    // Only proceed for PENDING non-manual payments
    if (payment.status !== PaymentStatus.PENDING) {
      return null;
    }

    // Validate payment type and paidBy
    if (!payment.type || !Object.values(PaymentType).includes(payment.type as PaymentType)) {
      return null;
    }
    if (!payment.paidBy || !Object.values(PayerType).includes(payment.paidBy as PayerType)) {
      return null;
    }

    const stripeInstance = await getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const successUrl = `${baseUrl}/payments/${paymentId}?status=success`;
    const cancelUrl = `${baseUrl}/payments/${paymentId}?status=cancelled`;

    // If tax rate is configured, send subtotal (before IVA) and let Stripe add tax
    const taxRateId = process.env.STRIPE_TAX_RATE_ID;
    const subtotalForStripe = taxRateId ? Math.round((payment.amount / IVA_MULTIPLIER) * 100) : Math.round(payment.amount * 100);

    // Idempotency key for on-demand session creation - uses existing sessionId or 'new'
    const idempotencyKey = `session-${paymentId}-${payment.stripeSessionId ?? 'new'}`;

    // Create new Stripe session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: payment.description || 'Pago de Póliza',
              description: `Póliza ${payment.policy.policyNumber}`,
            },
            unit_amount: subtotalForStripe,
          },
          quantity: 1,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: payment.policy.tenant?.email,
      metadata: {
        paymentId: payment.id,
        policyId: payment.policyId,
        paymentType: payment.type,
        paidBy: payment.paidBy,
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment.id,
          policyId: payment.policyId,
          paymentType: payment.type,
          paidBy: payment.paidBy,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    }, { idempotencyKey });

    // Update payment record with new session info
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        stripeSessionId: session.id,
        checkoutUrl: session.url,
        checkoutUrlExpiry: expiresAt,
      },
    });

    return {
      checkoutUrl: session.url!,
      expiresAt,
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

  /**
   * Get public payment info (for /payments/[id] page)
   * Returns minimal info safe for public display
   */
  async getPublicPaymentInfo(paymentId: string): Promise<{
    id: string;
    status: PaymentStatus;
    type: string | null;
    amount: number;
    subtotal: number | null;
    iva: number | null;
    policyNumber: string;
    isManual: boolean;
  } | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        policy: {
          select: { policyNumber: true },
        },
      },
    });

    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      status: payment.status,
      type: payment.type,
      amount: payment.amount,
      subtotal: payment.subtotal,
      iva: payment.iva,
      policyNumber: payment.policy.policyNumber,
      isManual: payment.isManual || false,
    };
  }

  /**
   * Edit the amount of a pending payment
   * Cancels existing Stripe session and creates a new one with the updated amount
   */
  async editPaymentAmount(
    paymentId: string,
    newAmount: number,
    editedById: string
  ): Promise<PaymentSessionResult> {
    // Validate amount
    if (newAmount <= 0) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive', 400, { newAmount });
    }
    if (newAmount > PAYMENT_LIMITS.MAX_TOTAL) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, `Amount exceeds maximum limit (${PAYMENT_LIMITS.MAX_TOTAL.toLocaleString()} MXN)`, 400, { newAmount, maxAllowed: PAYMENT_LIMITS.MAX_TOTAL });
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        policy: {
          select: { policyNumber: true, tenant: { select: { email: true } } },
        },
      },
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Can only edit amount for pending payments',
        400,
        { currentStatus: payment.status }
      );
    }

    // Validate payment type and paidBy
    if (!payment.type || !Object.values(PaymentType).includes(payment.type as PaymentType)) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, 'Invalid payment type', 400, { type: payment.type });
    }
    if (!payment.paidBy || !Object.values(PayerType).includes(payment.paidBy as PayerType)) {
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, 'Invalid payer type', 400, { paidBy: payment.paidBy });
    }

    const previousAmount = payment.amount;
    const stripeInstance = await getStripe();

    // Expire old Stripe session if exists
    if (payment.stripeSessionId) {
      try {
        await stripeInstance.checkout.sessions.expire(payment.stripeSessionId);
      } catch (error) {
        // Session might already be expired or completed, continue anyway
        console.warn('Failed to expire old Stripe session:', error);
      }
    }

    // Create new Stripe session with updated amount
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const successUrl = `${baseUrl}/payments/${paymentId}?status=success`;
    const cancelUrl = `${baseUrl}/payments/${paymentId}?status=cancelled`;

    // Calculate subtotal for tax (exclusive IVA)
    const taxRateId = process.env.STRIPE_TAX_RATE_ID;
    const subtotalForStripe = taxRateId ? Math.round((newAmount / IVA_MULTIPLIER) * 100) : Math.round(newAmount * 100);

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: payment.description || 'Pago de Póliza',
              description: `Póliza ${payment.policy.policyNumber}`,
            },
            unit_amount: subtotalForStripe,
          },
          quantity: 1,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: payment.policy.tenant?.email,
      metadata: {
        paymentId: payment.id,
        policyId: payment.policyId,
        paymentType: payment.type,
        paidBy: payment.paidBy,
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment.id,
          policyId: payment.policyId,
          paymentType: payment.type,
          paidBy: payment.paidBy,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };

    // Idempotency key for edit operation - same payment+amount = same session
    const idempotencyKey = `edit-${paymentId}-${newAmount}`;
    const session = await stripeInstance.checkout.sessions.create(sessionConfig, { idempotencyKey });

    // Calculate subtotal and IVA from new amount (newAmount includes 16% IVA)
    const breakdown = calculateSubtotalFromTotal(newAmount);

    // Update payment record with new amount and session
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amount: newAmount,
          subtotal: breakdown.subtotal,
          iva: breakdown.iva,
          stripeSessionId: session.id,
          checkoutUrl: session.url,
          checkoutUrlExpiry: expiresAt,
        },
      });

      // Log activity
      await tx.policyActivity.create({
        data: {
          policyId: payment.policyId,
          action: 'payment_amount_edited',
          description: `Monto de pago editado: ${payment.type}`,
          details: {
            paymentId,
            previousAmount,
            newAmount,
            paymentType: payment.type,
          },
          performedById: editedById,
          performedByType: 'user',
        },
      });
    });

    return {
      paymentId,
      checkoutUrl: session.url!,
      amount: newAmount,
      type: payment.type as PaymentType,
      expiresAt,
    };
  }

  /**
   * Get Stripe receipt URL for a payment
   * Always fetches fresh from Stripe API (receipt URLs expire after 30 days)
   */
  async getStripeReceiptUrl(paymentId: string): Promise<string | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { stripeIntentId: true, status: true },
    });

    if (!payment) return null;
    if (payment.status !== PaymentStatus.COMPLETED) return null;
    if (!payment.stripeIntentId) return null;

    try {
      const stripeInstance = await getStripe();
      const intent = await stripeInstance.paymentIntents.retrieve(payment.stripeIntentId, {
        expand: ['latest_charge'],
      });

      const charge = intent.latest_charge as Stripe.Charge | null;
      return charge?.receipt_url || null;
    } catch (error) {
      console.error('Error fetching Stripe receipt URL:', error);
      return null;
    }
  }
}

// Singleton instance
export const paymentService = new PaymentService();

// Bound legacy function exports for backwards compatibility
export const createPaymentRecord = paymentService.createPaymentRecord.bind(paymentService);
export const createPaymentIntent = paymentService.createPaymentIntent.bind(paymentService);
export const createCheckoutSession = paymentService.createCheckoutSession.bind(paymentService);
export const updatePaymentStatus = paymentService.updatePaymentStatus.bind(paymentService);
export const updatePaymentById = paymentService.updatePaymentById.bind(paymentService);
export const getPaymentsByPolicyId = paymentService.getPaymentsByPolicyId.bind(paymentService);
export const verifyWebhookSignature = paymentService.verifyWebhookSignature.bind(paymentService);

// New method exports
export const calculatePaymentBreakdown = paymentService.calculatePaymentBreakdown.bind(paymentService);
export const createPolicyPaymentSessions = paymentService.createPolicyPaymentSessions.bind(paymentService);
export const getPaymentSummary = paymentService.getPaymentSummary.bind(paymentService);
export const createManualPayment = paymentService.createManualPayment.bind(paymentService);
export const verifyManualPayment = paymentService.verifyManualPayment.bind(paymentService);
export const updatePaymentReceipt = paymentService.updatePaymentReceipt.bind(paymentService);
export const getPaymentById = paymentService.getPaymentById.bind(paymentService);
export const editPaymentAmount = paymentService.editPaymentAmount.bind(paymentService);
export const getOrCreateCheckoutSession = paymentService.getOrCreateCheckoutSession.bind(paymentService);
export const getPublicPaymentInfo = paymentService.getPublicPaymentInfo.bind(paymentService);

// Re-export class for type usage
export { PaymentService };
