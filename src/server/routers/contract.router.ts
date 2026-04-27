import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { ContractGetByPolicyOutput } from '@/lib/schemas/contract/output';

export const contractRouter = createTRPCRouter({
  // Contract procedures will be implemented as needed
  getByPolicy: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .output(ContractGetByPolicyOutput)
    .query(async ({ input }) => {
      // Placeholder
      return null;
    }),
});