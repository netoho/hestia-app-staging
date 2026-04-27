/**
 * Output schemas for package.* tRPC procedures.
 *
 * The Package model is small (~12 fields) and the frontend renders all of
 * them on the public pricing page, so the contract is exhaustive.
 */

import { z } from 'zod';

// Mirror of the Prisma Package model.
export const PackageShape = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  description: z.string(),
  features: z.string(),
  ctaText: z.string(),
  ctaLink: z.string(),
  highlight: z.boolean(),
  percentage: z.number().nullable(),
  minAmount: z.number().nullable(),
  shortDescription: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ===========================================================================
// package.getAll — Package[]
// ===========================================================================
export const PackageGetAllOutput = z.array(PackageShape);
export type PackageGetAllOutput = z.infer<typeof PackageGetAllOutput>;

// ===========================================================================
// package.getById — Package
// ===========================================================================
export const PackageGetByIdOutput = PackageShape;
export type PackageGetByIdOutput = z.infer<typeof PackageGetByIdOutput>;

// ===========================================================================
// package.getStats
// ===========================================================================
export const PackageGetStatsOutput = z.object({
  totalPolicies: z.number(),
  activePolicies: z.number(),
  totalRevenue: z.number(),
});
export type PackageGetStatsOutput = z.infer<typeof PackageGetStatsOutput>;

// ===========================================================================
// package.recommend — packages with computed prices + recommendedId
// ===========================================================================
const PackageWithPriceShape = PackageShape.extend({
  calculatedPrice: z.number(),
  calculatedPriceWithIVA: z.number(),
});

export const PackageRecommendOutput = z.object({
  packages: z.array(PackageWithPriceShape),
  recommendedId: z.string().optional(),
});
export type PackageRecommendOutput = z.infer<typeof PackageRecommendOutput>;
