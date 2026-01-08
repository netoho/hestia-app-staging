import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import type { Payment } from "@/prisma/generated/prisma-client/enums";

/**
 * Payment Router
 *
 * TODO: Implement payment procedures when payment flow is ready:
 * - createCheckoutSession: Create Stripe checkout session
 * - createPaymentIntent: Create Stripe payment intent
 * - getPaymentStatus: Get payment status by ID
 * - webhookHandler: Handle Stripe webhooks (in API route)
 */
export const paymentRouter = createTRPCRouter({
  /**
   * List payments for a policy
   */
  list: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }): Promise<Payment[]> => {
      return ctx.prisma.payment.findMany({
        where: { policyId: input.policyId },
        orderBy: { createdAt: 'desc' },
      });
    }),
});
