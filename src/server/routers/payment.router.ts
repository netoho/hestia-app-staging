import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '@/server/trpc';
import { PaymentType, PayerType, PaymentStatus } from "@/prisma/generated/prisma-client/enums";
import {
  paymentService,
  type PaymentBreakdown,
  type PolicyPaymentSessionsResult,
  type PaymentSummary,
} from '@/lib/services/paymentService';

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
    .mutation(async ({ input }) => {
      try {
        return await paymentService.createManualPayment(input);
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
          status: PaymentStatus.FAILED,
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
});
