import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  dualAuthProcedure,
} from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { LandlordService } from '@/lib/services/actors/LandlordService';
import { ActorAuthService } from '@/lib/services/ActorAuthService';
import { PropertyDetailsService } from '@/lib/services/PropertyDetailsService';
import { validateLandlordData } from '@/lib/schemas/landlord';
import { prepareMultiLandlordsForDB } from '@/lib/utils/landlord/prepareForDB';
import { LandlordStrictSchema } from './shared.router';

// ============================================
// LANDLORD-SPECIFIC ROUTER
// ============================================

export const landlordRouter = createTRPCRouter({
  /**
   * Landlord-specific: Save multiple landlords for a policy
   * Handles co-ownership scenarios
   */
  saveMultipleLandlords: dualAuthProcedure
    .input(z.object({
      policyId: z.string(),
      landlords: z.array(LandlordStrictSchema),
      propertyDetails: z.any().optional(),
      isPartial: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = new LandlordService();

      const { landlords, policyData, error } = prepareMultiLandlordsForDB(
        input.landlords,
        { isPartial: input.isPartial }
      );

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error,
        });
      }

      const results = [];
      for (const landlordData of landlords) {
        const result = await service.save(
          landlordData.id || '',
          landlordData,
          input.isPartial,
          false
        );

        if (!result.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error?.message || 'Failed to save landlord',
          });
        }

        results.push(result.value);
      }

      if (policyData && Object.keys(policyData).length > 0) {
        await ctx.prisma.policy.update({
          where: { id: input.policyId },
          data: policyData,
        });
      }

      return {
        landlords: results,
        policyData,
      };
    }),

  /**
   * Landlord-specific: Save property details for a policy
   */
  savePropertyDetails: dualAuthProcedure
    .input(z.object({
      type: z.literal('landlord'),
      identifier: z.string(),
      propertyDetails: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        });
      }

      const landlord = await ctx.prisma.landlord.findUnique({
        where: { id: auth.actor.id },
        select: { policyId: true },
      });

      if (!landlord?.policyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Landlord not associated with a policy',
        });
      }

      const propertyDetailsService = new PropertyDetailsService(ctx.prisma);
      const result = await propertyDetailsService.upsert(landlord.policyId, input.propertyDetails);

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Failed to save property details',
        });
      }

      return result.value;
    }),

  /**
   * Landlord-specific: Save policy financial data
   */
  savePolicyFinancial: dualAuthProcedure
    .input(z.object({
      type: z.literal('landlord'),
      identifier: z.string(),
      policyFinancial: z.object({
        securityDeposit: z.number().optional().nullable(),
        maintenanceFee: z.number().optional().nullable(),
        maintenanceIncludedInRent: z.boolean().optional(),
        issuesTaxReceipts: z.boolean().optional(),
        hasIVA: z.boolean().optional(),
        rentIncreasePercentage: z.number().optional().nullable(),
        paymentMethod: z.string().optional().nullable(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        });
      }

      const landlord = await ctx.prisma.landlord.findUnique({
        where: { id: auth.actor.id },
        select: { policyId: true },
      });

      if (!landlord?.policyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Landlord not associated with a policy',
        });
      }

      const updatedPolicy = await ctx.prisma.policy.update({
        where: { id: landlord.policyId },
        data: input.policyFinancial,
      });

      return updatedPolicy;
    }),

  /**
   * Landlord-specific: Validate landlord data
   */
  validateLandlord: publicProcedure
    .input(z.object({
      data: z.any(),
      isCompany: z.boolean(),
      mode: z.enum(['strict', 'partial', 'admin']).default('strict'),
      tabName: z.string().optional(),
    }))
    .query(({ input }) => {
      const result = validateLandlordData(input.data, {
        isCompany: input.isCompany,
        mode: input.mode as any,
        tabName: input.tabName,
      });

      if (!result.success) {
        return {
          valid: false,
          errors: result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        };
      }

      return {
        valid: true,
        data: result.data,
      };
    }),

  /**
   * Landlord-specific: Get all landlords for a policy
   */
  getLandlordsByPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .query(async ({ input }) => {
      const service = new LandlordService();
      const result = await service.getAllByPolicyId(input.policyId);

      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error?.message || 'Landlords not found',
        });
      }

      return result.value;
    }),

  /**
   * Landlord-specific: Delete a co-owner (non-primary landlord)
   */
  deleteCoOwner: dualAuthProcedure
    .input(z.object({
      type: z.literal('landlord'),
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new LandlordService();
      const result = await service.removeLandlord(input.id);

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Failed to delete landlord',
        });
      }

      return { success: true };
    }),
});
