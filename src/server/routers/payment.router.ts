import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from '@/server/trpc';
import { PaymentType, PayerType, PaymentStatus } from "@/prisma/generated/prisma-client/enums";
import {
  paymentService,
  type PaymentBreakdown,
  type PolicyPaymentSessionsResult,
  type PaymentSummary,
} from '@/lib/services/paymentService';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';

const IVA_MULTIPLIER = 1 + TAX_CONFIG.IVA_RATE;

/**
 * Payment Router
 *
 * Handles all payment-related operations:
 * - List payments for a policy
 * - Generate Stripe checkout sessions
 * - Record and verify manual payments
 * - Regenerate expired payment links
 */
export const paymentRouter = createTRPCRouter({
  /**
   * List payments for a policy
   * Staff/Admin see all, Brokers see only policies they created
   */
  list: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { createdById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they created
      if (userRole === 'BROKER' && policy.createdById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you created',
        });
      }

      return ctx.prisma.payment.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  /**
   * Get payment details with breakdown for a policy
   * Returns the full payment summary including breakdown and all payments
   */
  getPaymentDetails: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }): Promise<PaymentSummary> => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { createdById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they created
      if (userRole === 'BROKER' && policy.createdById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you created',
        });
      }

      return paymentService.getPaymentSummary(policyId);
    }),

  /**
   * Get payment breakdown for a policy (without payment records)
   * Useful for displaying expected payment amounts
   */
  getBreakdown: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }): Promise<PaymentBreakdown> => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { createdById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they created
      if (userRole === 'BROKER' && policy.createdById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you created',
        });
      }

      return paymentService.calculatePaymentBreakdown(policyId);
    }),

  /**
   * Generate Stripe checkout sessions for a policy
   * Creates payment links for investigation fee, tenant portion, and landlord portion
   * Admin/Staff only
   */
  generatePaymentLinks: adminProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .mutation(async ({ input }): Promise<PolicyPaymentSessionsResult> => {
      const { policyId } = input;

      try {
        return await paymentService.createPolicyPaymentSessions(policyId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already has pending payments')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Esta póliza ya tiene pagos pendientes. Use regenerar link para actualizar URLs expiradas.',
          });
        }
        throw error;
      }
    }),

  /**
   * Record a manual payment (non-Stripe)
   * Creates a payment record with PENDING_VERIFICATION status
   * Admin/Staff only
   */
  recordManualPayment: adminProcedure
    .input(z.object({
      policyId: z.string(),
      type: z.nativeEnum(PaymentType),
      amount: z.number().positive(),
      paidBy: z.nativeEnum(PayerType),
      reference: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await paymentService.createManualPayment({
          ...input,
          createdById: ctx.userId,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already completed')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Ya existe un pago completado de tipo ${input.type} para esta póliza`,
          });
        }
        throw error;
      }
    }),

  /**
   * Verify a manual payment
   * Approves or rejects a PENDING_VERIFICATION payment
   * Admin/Staff only
   */
  verifyPayment: adminProcedure
    .input(z.object({
      paymentId: z.string(),
      approved: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { paymentId, approved, notes } = input;
      const { userId } = ctx;

      try {
        return await paymentService.verifyManualPayment(paymentId, approved, userId, notes);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not pending verification')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Este pago no está pendiente de verificación',
          });
        }
        throw error;
      }
    }),

  /**
   * Regenerate an expired checkout URL for a payment
   * Admin/Staff only
   */
  regeneratePaymentUrl: adminProcedure
    .input(z.object({
      paymentId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { paymentId } = input;

      try {
        return await paymentService.regenerateCheckoutUrl(paymentId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('only regenerate URL for pending')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Solo se puede regenerar URL para pagos pendientes',
          });
        }
        throw error;
      }
    }),

  /**
   * Update payment with receipt information after S3 upload
   * Admin/Staff only
   */
  updatePaymentReceipt: adminProcedure
    .input(z.object({
      paymentId: z.string(),
      receiptS3Key: z.string(),
      receiptFileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { paymentId, receiptS3Key, receiptFileName } = input;

      return paymentService.updatePaymentReceipt(paymentId, receiptS3Key, receiptFileName);
    }),

  /**
   * Get a single payment by ID
   */
  getById: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { paymentId } = input;
      const { userId, userRole } = ctx;

      const payment = await ctx.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          policy: {
            select: { createdById: true },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Brokers can only see payments for policies they created
      if (userRole === 'BROKER' && payment.policy.createdById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you created',
        });
      }

      // Remove the policy from the response
      const { policy: _, ...paymentWithoutPolicy } = payment;
      return paymentWithoutPolicy;
    }),

  /**
   * Cancel a pending payment
   * Admin/Staff only
   */
  cancelPayment: adminProcedure
    .input(z.object({
      paymentId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { paymentId, reason } = input;
      const { userId } = ctx;

      const payment = await ctx.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PENDING_VERIFICATION) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo se pueden cancelar pagos pendientes',
        });
      }

      const updatedPayment = await ctx.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          errorMessage: reason || 'Cancelled by admin',
        },
      });

      // Log activity
      await ctx.prisma.policyActivity.create({
        data: {
          policyId: payment.policyId,
          action: 'payment_cancelled',
          description: `Pago cancelado: ${payment.type}`,
          details: {
            paymentId,
            amount: payment.amount,
            type: payment.type,
            reason,
          },
          performedById: userId,
          performedByType: 'user',
        },
      });

      return updatedPayment;
    }),

  /**
   * Get Stripe receipt URL for a completed payment
   * Fetches from Stripe API on demand
   */
  getStripeReceipt: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ input }) => {
      const receiptUrl = await paymentService.getStripeReceiptUrl(input.paymentId);
      return { receiptUrl };
    }),

  /**
   * Edit the amount of a pending payment
   * Admin/Staff only - Cancels existing Stripe session and creates new one
   * Input: subtotal (without IVA) - will add 16% IVA
   */
  editAmount: adminProcedure
    .input(z.object({
      paymentId: z.string(),
      newAmount: z.number().positive().max(862069), // Max subtotal so total stays under 1M
    }))
    .mutation(async ({ input, ctx }) => {
      const { paymentId, newAmount: subtotal } = input;
      const { userId } = ctx;

      // Calculate total with IVA (16%)
      const totalWithIva = Math.round(subtotal * IVA_MULTIPLIER * 100) / 100;

      try {
        return await paymentService.editPaymentAmount(paymentId, totalWithIva, userId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('only edit amount for pending')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Solo se puede editar el monto de pagos pendientes',
          });
        }
        throw error;
      }
    }),

  /**
   * Create a new payment with Stripe checkout link
   * Admin/Staff only - Creates ad-hoc payment for a policy
   * Input: subtotal (without IVA) - will add 16% IVA
   */
  createNew: adminProcedure
    .input(z.object({
      policyId: z.string(),
      amount: z.number().positive().max(862069), // Max subtotal so total stays under 1M
      paidBy: z.nativeEnum(PayerType),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { policyId, amount: subtotal, paidBy, description } = input;
      const { userId } = ctx;

      // Calculate total with IVA (16%)
      const totalWithIva = Math.round(subtotal * IVA_MULTIPLIER * 100) / 100;

      // Verify policy exists
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { id: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Póliza no encontrada',
        });
      }

      try {
        // Create checkout session using existing service method
        const result = await paymentService.createTypedCheckoutSession({
          policyId,
          amount: totalWithIva,
          type: PaymentType.PARTIAL_PAYMENT,
          paidBy,
          description: description || 'Pago Adicional',
        });

        // Log activity
        await ctx.prisma.policyActivity.create({
          data: {
            policyId,
            action: 'payment_created',
            description: `Nuevo pago creado: ${description || 'Pago Adicional'}`,
            details: {
              paymentId: result.paymentId,
              subtotal,
              iva: Math.round(subtotal * TAX_CONFIG.IVA_RATE * 100) / 100,
              totalWithIva,
              paidBy,
              type: PaymentType.PARTIAL_PAYMENT,
            },
            performedById: userId,
            performedByType: 'user',
          },
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Error al crear el pago',
        });
      }
    }),

  // ============================================
  // PUBLIC ENDPOINTS (for /payments/[id] page)
  // ============================================

  /**
   * Get public payment info for the payment page
   * No auth required - returns minimal info safe for public display
   */
  getPublicPayment: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ input }) => {
      const { paymentId } = input;

      const result = await paymentService.getPublicPaymentInfo(paymentId);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pago no encontrado',
        });
      }

      return result;
    }),

  /**
   * Create a checkout session for a pending payment
   * No auth required - used by /payments/[id] page to redirect to Stripe
   * Returns null if payment is already completed, cancelled, or manual
   */
  createCheckoutSession: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ input }) => {
      const { paymentId } = input;

      const result = await paymentService.getOrCreateCheckoutSession(paymentId);

      if (!result) {
        // Payment is not in a state where we can create a session
        // (completed, cancelled, failed, manual, or not found)
        return { checkoutUrl: null, reason: 'not_eligible' };
      }

      return {
        checkoutUrl: result.checkoutUrl,
        expiresAt: result.expiresAt,
      };
    }),
});
