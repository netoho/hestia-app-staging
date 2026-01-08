import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

export const investigationRouter = createTRPCRouter({
  // Investigation procedures will be implemented as needed
  start: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .mutation(async ({ input }) => {
      // Placeholder
      return { success: true };
    }),
});