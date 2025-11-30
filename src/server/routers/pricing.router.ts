import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from '@/server/trpc';
import { calculatePolicyPricing } from '@/lib/services/pricingService';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { logPolicyActivity } from '@/lib/services/policyService';
import { GuarantorType } from "@/prisma/generated/prisma-client/enums";

// Schema for price calculation
const CalculatePriceSchema = z.object({
  packageId: z.string(),
  rentAmount: z.number().positive(),
  tenantPercentage: z.number().min(0).max(100),
  landlordPercentage: z.number().min(0).max(100),
  includeInvestigationFee: z.boolean().optional().default(false),
});

export const pricingRouter = createTRPCRouter({
  /**
   * Calculate policy price based on package and rent
   */
  calculate: protectedProcedure
    .input(CalculatePriceSchema)
    .mutation(async ({ input }) => {
      // Validate percentages sum to 100
      const percentageSum = input.tenantPercentage + input.landlordPercentage;
      if (Math.abs(percentageSum - 100) > 0.01) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tenant and landlord percentages must sum to 100%',
        });
      }

      // Get package details
      const packageData = await prisma.package.findUnique({
        where: { id: input.packageId },
      });

      if (!packageData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Package not found',
        });
      }

      // Calculate price - the service now handles everything including tenant/landlord amounts
      const result = await calculatePolicyPricing({
        packageId: input.packageId,
        rentAmount: input.rentAmount,
        tenantPercentage: input.tenantPercentage,
        landlordPercentage: input.landlordPercentage,
        includeInvestigationFee: input.includeInvestigationFee,
      });

      return result;
    }),

  /**
   * Calculate price with manual override
   */
  calculateWithOverride: protectedProcedure
    .input(CalculatePriceSchema.extend({
      manualPrice: z.number().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      // If manual price is provided, use it
      if (input.manualPrice) {
        const iva = input.manualPrice * 0.16;
        const totalWithIva = input.manualPrice + iva;
        const tenantAmount = totalWithIva * (input.tenantPercentage / 100);
        const landlordAmount = totalWithIva * (input.landlordPercentage / 100);

        return {
          packagePrice: input.manualPrice,
          investigationFee: 0,
          subtotal: input.manualPrice,
          iva,
          totalWithIva,
          total: totalWithIva,
          tenantPercentage: input.tenantPercentage,
          landlordPercentage: input.landlordPercentage,
          tenantAmount,
          landlordAmount,
          isManualOverride: true,
        };
      }

      // Otherwise calculate normally
      return pricingRouter.calculate._def.mutation({ input, ctx: {} as any });
    }),

  /**
   * Get pricing history for a policy
   */
  getPricingHistory: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        select: {
          totalPrice: true,
          tenantPercentage: true,
          landlordPercentage: true,
          package: {
            select: {
              name: true,
              percentage: true,
              price: true,
              minAmount: true,
            },
          },
          rentAmount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      return policy;
    }),

  /**
   * Validate pricing for a policy
   */
  validatePricing: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      expectedPrice: z.number(),
    }))
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        include: { package: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Recalculate price
      const calculatedPrice = await calculatePolicyPricing({
        packageId: policy.packageId,
        rentAmount: policy.rentAmount,
        tenantPercentage: policy.tenantPercentage || 100,
        landlordPercentage: policy.landlordPercentage || 0,
        includeInvestigationFee: false,
      });

      const isValid = Math.abs(calculatedPrice.totalWithIva - input.expectedPrice) < 0.01;

      return {
        isValid,
        expectedPrice: input.expectedPrice,
        calculatedPrice: calculatedPrice.totalWithIva,
        difference: input.expectedPrice - calculatedPrice.totalWithIva,
      };
    }),

  /**
   * Get policy pricing data for editing
   */
  getPolicyPricing: adminProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        select: {
          id: true,
          policyNumber: true,
          propertyDetails: {
            select: {
              propertyAddressId: true,
              propertyAddressDetails: true,
            }
          },
          rentAmount: true,
          packageId: true,
          totalPrice: true,
          tenantPercentage: true,
          landlordPercentage: true,
          guarantorType: true,
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      return {
        data: {
          packageId: policy.packageId,
          totalPrice: policy.totalPrice,
          tenantPercentage: policy.tenantPercentage,
          landlordPercentage: policy.landlordPercentage,
          guarantorType: policy.guarantorType,
        },
        policyNumber: policy.policyNumber,
        propertyAddress: policy.propertyDetails?.propertyAddressDetails,
        rentAmount: policy.rentAmount,
      };
    }),

  /**
   * Update policy pricing information
   */
  updatePolicyPricing: adminProcedure
    .input(z.object({
      policyId: z.string(),
      packageId: z.string().nullable().optional(),
      totalPrice: z.number().min(0),
      tenantPercentage: z.number().min(0).max(100),
      landlordPercentage: z.number().min(0).max(100),
      guarantorType: z.nativeEnum(GuarantorType),
    }))
    .mutation(async ({ input, ctx }) => {
      const { policyId, ...data } = input;

      // Verify policy exists
      const existingPolicy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: {
          id: true,
          totalPrice: true,
          packageId: true,
          tenantPercentage: true,
          landlordPercentage: true,
          guarantorType: true,
        },
      });

      if (!existingPolicy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Update policy pricing
      const updatedPolicy = await prisma.policy.update({
        where: { id: policyId },
        data: {
          packageId: data.packageId || null,
          totalPrice: data.totalPrice,
          tenantPercentage: data.tenantPercentage,
          landlordPercentage: data.landlordPercentage,
          guarantorType: data.guarantorType,
        },
      });

      // Log activity with details of what changed
      const changes: Record<string, any> = {};
      if (existingPolicy.totalPrice !== data.totalPrice) {
        changes.previousPrice = existingPolicy.totalPrice;
        changes.newPrice = data.totalPrice;
      }
      if (existingPolicy.packageId !== data.packageId) {
        changes.previousPackageId = existingPolicy.packageId;
        changes.newPackageId = data.packageId;
      }
      if (existingPolicy.tenantPercentage !== data.tenantPercentage) {
        changes.previousTenantPercentage = existingPolicy.tenantPercentage;
        changes.newTenantPercentage = data.tenantPercentage;
      }
      if (existingPolicy.guarantorType !== data.guarantorType) {
        changes.previousGuarantorType = existingPolicy.guarantorType;
        changes.newGuarantorType = data.guarantorType;
      }

      await logPolicyActivity({
        policyId,
        action: 'pricing_updated',
        description: 'Pricing information updated by internal team',
        performedById: ctx.userId,
        details: {
          ...data,
          ...changes,
        },
      });

      return {
        data: {
          packageId: updatedPolicy.packageId,
          totalPrice: updatedPolicy.totalPrice,
          tenantPercentage: updatedPolicy.tenantPercentage,
          landlordPercentage: updatedPolicy.landlordPercentage,
          guarantorType: updatedPolicy.guarantorType,
        },
      };
    }),
});
