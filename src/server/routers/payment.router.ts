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
import { cfdiIssuanceService } from '@/lib/services/cfdi/cfdiIssuanceService';
import { cfdiReconciliationService } from '@/lib/services/cfdi/reconciliationService';
import { ServiceError } from '@/lib/services/types/errors';
import {
  PaymentListOutput,
  PaymentSummaryOutput,
  PaymentBreakdownOutput,
  PolicyPaymentSessionsOutput,
  PaymentRecordOutput,
  PaymentGetByIdOutput,
  PaymentSessionOutput,
  PaymentCfdiResendOutput,
  PaymentCfdiRefreshOutput,
  PaymentSendLinkOutput,
  PaymentStripeReceiptOutput,
  PaymentPublicInfoOutput,
  PaymentCheckoutSessionOutput,
  PaymentSpeiSessionOutput,
  PaymentSpeiDetailsOutput,
} from '@/lib/schemas/payment/output';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';
import { PAYMENT_LIMITS } from '@/lib/config/payments';
import { calculateIVA } from '@/lib/utils/money';

/**
 * Payment payer input — COMPANY excluded (not a real payment actor, #213). Kept
 * as a runtime refine on the full enum so the field's TS type stays PayerType
 * (no frontend enum→literal friction); COMPANY is simply rejected at parse time.
 */
const payerInputSchema = z
  .nativeEnum(PayerType)
  .refine((v) => v !== PayerType.COMPANY, 'COMPANY no es un pagador válido');

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
    .output(PaymentListOutput)
    .query(async ({ input, ctx }) => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { managedById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they manage
      if (userRole === 'BROKER' && policy.managedById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you manage',
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
    .output(PaymentSummaryOutput)
    .query(async ({ input, ctx }): Promise<PaymentSummary> => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { managedById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they manage
      if (userRole === 'BROKER' && policy.managedById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you manage',
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
    .output(PaymentBreakdownOutput)
    .query(async ({ input, ctx }): Promise<PaymentBreakdown> => {
      const { policyId } = input;
      const { userId, userRole } = ctx;

      // Verify access to this policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { managedById: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Brokers can only see payments for policies they manage
      if (userRole === 'BROKER' && policy.managedById !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view payments for policies you manage',
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
    .output(PolicyPaymentSessionsOutput)
    .mutation(async ({ input }): Promise<PolicyPaymentSessionsResult> => {
      const { policyId } = input;

      try {
        return await paymentService.createPolicyPaymentSessions(policyId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already has pending payments')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Esta protección ya tiene pagos pendientes. Use regenerar link para actualizar URLs expiradas.',
          });
        }
        throw error;
      }
    }),

  /**
   * Email the shared payment link of a TENANT-paid payment to every tenant
   * of the policy (skipping tenants without email). All tenants receive the
   * SAME public /payments/[id] link; any of them can complete the payment.
   */
  sendPaymentLinkToTenants: protectedProcedure
    .input(z.object({
      paymentId: z.string(),
    }))
    .output(PaymentSendLinkOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await paymentService.sendPaymentLinkToTenants(input.paymentId, ctx.userId);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Pago no encontrado' });
          }
          if (error.message.includes('tenant-paid')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Solo los pagos a cargo del inquilino se pueden enviar a los inquilinos',
            });
          }
          if (error.message.includes('shareable link')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Este pago no tiene un link de pago activo',
            });
          }
          if (error.message.includes('email on file')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Ningún inquilino tiene correo electrónico registrado',
            });
          }
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
      paymentId: z.string().optional(),
      // Only allow types appropriate for manual payment entry
      type: z.enum([
        PaymentType.TENANT_PORTION,
        PaymentType.LANDLORD_PORTION,
        PaymentType.PARTIAL_PAYMENT,
        PaymentType.INCIDENT_PAYMENT,
        PaymentType.INVESTIGATION_FEE,
      ]),
      amount: z.number().positive(),
      paidBy: payerInputSchema,
      reference: z.string().optional(),
      description: z.string().optional(),
      satFormaPago: z.string().optional(),
    }))
    .output(PaymentRecordOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.paymentId) {
          return await paymentService.convertToManualPayment(input.paymentId, {
            amount: input.amount,
            paidBy: input.paidBy,
            reference: input.reference,
            description: input.description,
            createdById: ctx.userId,
            satFormaPago: input.satFormaPago,
          });
        }
        return await paymentService.createManualPayment({
          ...input,
          createdById: ctx.userId,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already completed')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Ya existe un pago completado de tipo ${input.type} para esta protección`,
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
      // SAT c_FormaPago the approver confirms/overrides for the CFDI (#213).
      satFormaPago: z.string().optional(),
    }))
    .output(PaymentRecordOutput)
    .mutation(async ({ input, ctx }) => {
      const { paymentId, approved, notes, satFormaPago } = input;
      const { userId } = ctx;

      try {
        return await paymentService.verifyManualPayment(paymentId, approved, userId, notes, satFormaPago);
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
   * "Reenviar factura" (#215): self-healing CFDI resend for a completed payment.
   * Generates the micfdi record if missing (or link-less), then re-emails the
   * permanent portal link to the payer group. Admin/Staff only.
   */
  resendCfdiPortalLink: adminProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentCfdiResendOutput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await cfdiIssuanceService.resendForPayment(input.paymentId, ctx.userId);
      } catch (error) {
        if (error instanceof ServiceError) {
          if (error.statusCode === 404) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Pago no encontrado' });
          }
          if (error.statusCode === 400) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Solo los pagos completados pueden generar factura',
            });
          }
          // micfdi failure — surface its message so staff know why.
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        throw error;
      }
    }),

  /**
   * On-demand CFDI status refresh (#216): pull the record's current state from
   * micfdi (status/folio/uuid/totals) and return the refreshed summary.
   * Admin/Staff only.
   */
  refreshCfdiStatus: adminProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentCfdiRefreshOutput)
    .mutation(async ({ input }) => {
      try {
        return await cfdiReconciliationService.refreshForPayment(input.paymentId);
      } catch (error) {
        if (error instanceof ServiceError) {
          if (error.statusCode === 404) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'El pago no tiene factura registrada' });
          }
          if (error.statusCode === 400) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
          }
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
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
    .output(PaymentRecordOutput)
    .mutation(async ({ input }) => {
      const { paymentId, receiptS3Key, receiptFileName } = input;

      return paymentService.updatePaymentReceipt(paymentId, receiptS3Key, receiptFileName);
    }),

  /**
   * Get a single payment by ID
   */
  getById: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentGetByIdOutput)
    .query(async ({ input, ctx }) => {
      const { paymentId } = input;
      const { userId, userRole } = ctx;

      const payment = await ctx.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          policy: {
            select: { managedById: true },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Brokers can only see payments for policies they manage
      if (userRole === 'BROKER' && payment.policy.managedById !== userId) {
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
    .output(PaymentRecordOutput)
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

      const cancellableStatuses = [PaymentStatus.PENDING, PaymentStatus.PENDING_VERIFICATION, PaymentStatus.FAILED];
      if (!cancellableStatuses.includes(payment.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo se pueden cancelar pagos pendientes o fallidos',
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
    .output(PaymentStripeReceiptOutput)
    .mutation(async ({ input }) => {
      const receiptUrl = await paymentService.getStripeReceiptUrl(input.paymentId);
      return { receiptUrl };
    }),

  /**
   * Get Stripe receipt URL for a completed payment
   * Fetches from Stripe API on demand PUBLIC procedure #TODO: add rate limiting
   */
  getStripePublicReceipt: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentStripeReceiptOutput)
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
      newAmount: z.number().positive().max(PAYMENT_LIMITS.MAX_SUBTOTAL), // Max subtotal so total stays under 1M
    }))
    .output(PaymentSessionOutput)
    .mutation(async ({ input, ctx }) => {
      const { paymentId, newAmount: subtotal } = input;
      const { userId } = ctx;

      // Calculate total with IVA (16%)
      const breakdown = calculateIVA(subtotal);

      try {
        return await paymentService.editPaymentAmount(paymentId, breakdown.total, userId);
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
      amount: z.number().positive().max(PAYMENT_LIMITS.MAX_SUBTOTAL), // Max subtotal so total stays under 1M
      paidBy: payerInputSchema,
      description: z.string().optional(),
    }))
    .output(PaymentSessionOutput)
    .mutation(async ({ input, ctx }) => {
      const { policyId, amount: subtotal, paidBy, description } = input;
      const { userId } = ctx;

      // Calculate total with IVA (16%)
      const breakdown = calculateIVA(subtotal);

      // Verify policy exists
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: policyId },
        select: { id: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Protección no encontrada',
        });
      }

      try {
        // Create checkout session using existing service method
        const result = await paymentService.createTypedCheckoutSession({
          policyId,
          amount: breakdown.total,
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
              subtotal: breakdown.subtotal,
              iva: breakdown.iva,
              totalWithIva: breakdown.total,
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
    .output(PaymentPublicInfoOutput)
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
    .output(PaymentCheckoutSessionOutput)
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

  /**
   * Create a SPEI (bank transfer) session for a pending payment
   * No auth required - used by /payments/[id] page
   */
  createSpeiSession: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentSpeiSessionOutput)
    .mutation(async ({ input }) => {
      const result = await paymentService.createSpeiPaymentIntent(input.paymentId);
      return result;
    }),

  /**
   * Get SPEI details for a payment (public endpoint)
   */
  getSpeiDetails: publicProcedure
    .input(z.object({ paymentId: z.string() }))
    .output(PaymentSpeiDetailsOutput)
    .query(async ({ input }) => {
      const result = await paymentService.getSpeiDetails(input.paymentId);
      return result;
    }),
});
