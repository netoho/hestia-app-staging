import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { PackageService } from '@/lib/services/packageService';

// Schema for creating/updating packages
const PackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  minAmount: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).optional(),
  order: z.number().int().default(0),
});

const packageService = new PackageService();

export const packageRouter = createTRPCRouter({
  /**
   * Get all active packages
   */
  getAll: publicProcedure
    .query(async () => {
      const result = await packageService.getPackages();
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error.message,
        });
      }
      // Filter to active only
      return result.value.filter(pkg => pkg.isActive);
    }),

  /**
   * Get package by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await packageService.getPackageById(input.id);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error.message,
        });
      }

      if (!result.value) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Package not found',
        });
      }

      return result.value;
    }),

  /**
   * Get package statistics
   */
  getStats: protectedProcedure
    .input(z.object({ packageId: z.string() }))
    .query(async ({ input }) => {
      const [totalPolicies, activePolicies, totalRevenue] = await Promise.all([
        // Total policies using this package
        prisma.policy.count({
          where: { packageId: input.packageId },
        }),

        // Active policies
        prisma.policy.count({
          where: {
            packageId: input.packageId,
            status: { in: ['ACTIVE', 'CONTRACT_SIGNED'] },
          },
        }),

        // Total revenue
        prisma.policy.aggregate({
          where: { packageId: input.packageId },
          _sum: { totalPrice: true },
        }),
      ]);

      return {
        totalPolicies,
        activePolicies,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
      };
    }),

  /**
   * Recommend package based on rent amount
   */
  recommend: publicProcedure
    .input(z.object({ rentAmount: z.number() }))
    .query(async ({ input }) => {
      // Get all active packages using service
      const result = await packageService.getPackages();
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error.message,
        });
      }

      const packages = result.value.filter(pkg => pkg.isActive);

      // Calculate price for each package using service method
      const packagesWithPrice = packages.map(pkg => {
        const price = packageService.calculatePrice(pkg, input.rentAmount);

        return {
          ...pkg,
          calculatedPrice: price,
          calculatedPriceWithIVA: price * 1.16,
        };
      });

      // Sort by price (lowest to highest)
      packagesWithPrice.sort((a, b) => a.calculatedPrice - b.calculatedPrice);

      // Recommend the middle package or the second one if there are 3+
      let recommendedIndex = Math.floor(packagesWithPrice.length / 2);
      if (packagesWithPrice.length >= 3) {
        recommendedIndex = 1; // Second package (middle tier)
      }

      return {
        packages: packagesWithPrice,
        recommendedId: packagesWithPrice[recommendedIndex]?.id,
      };
    }),
});
