import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

export const paymentRouter = createTRPCRouter({
  // Payment procedures will be implemented as needed
  list: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      // Placeholder
      return [];
    }),
});