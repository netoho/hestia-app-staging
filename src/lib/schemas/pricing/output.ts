/**
 * Output schemas for pricing.* tRPC procedures.
 *
 * Pricing matters: this is the contract money-related UI relies on. The
 * shapes mirror PricingService.PricingCalculation column-for-column.
 */

import { z } from 'zod';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';

// ---------------------------------------------------------------------------
// PricingCalculation (shared)
// ---------------------------------------------------------------------------
const CalculationSummaryShape = z.unknown();

const PricingCalculationShape = z.object({
  packagePrice: z.number(),
  investigationFee: z.number().nullable(),
  subtotal: z.number(),
  iva: z.number(),
  ivaRate: z.number(),
  totalWithIva: z.number(),
  tenantAmount: z.number(),
  landlordAmount: z.number(),
  total: z.number(),
  tenantPercentage: z.number(),
  landlordPercentage: z.number(),
  calculationSummary: CalculationSummaryShape.optional(),
});

// ===========================================================================
// pricing.calculate
// ===========================================================================
export const PricingCalculateOutput = PricingCalculationShape;
export type PricingCalculateOutput = z.infer<typeof PricingCalculateOutput>;

// ===========================================================================
// pricing.calculateWithOverride — manual branch omits ivaRate / calculationSummary
// ===========================================================================
export const PricingCalculateWithOverrideOutput = PricingCalculationShape.extend({
  ivaRate: z.number().optional(),
  isManualOverride: z.boolean().optional(),
});
export type PricingCalculateWithOverrideOutput = z.infer<typeof PricingCalculateWithOverrideOutput>;

// ===========================================================================
// pricing.getPricingHistory
// ===========================================================================
const PricingHistoryPackageShape = z
  .object({
    name: z.string(),
    percentage: z.number().nullable(),
    price: z.number(),
    minAmount: z.number().nullable(),
  })
  .nullable();

export const PricingGetHistoryOutput = z.object({
  totalPrice: z.number(),
  tenantPercentage: z.number(),
  landlordPercentage: z.number(),
  package: PricingHistoryPackageShape,
  rentAmount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PricingGetHistoryOutput = z.infer<typeof PricingGetHistoryOutput>;

// ===========================================================================
// pricing.validatePricing
// ===========================================================================
export const PricingValidateOutput = z.object({
  isValid: z.boolean(),
  expectedPrice: z.number(),
  calculatedPrice: z.number(),
  difference: z.number(),
});
export type PricingValidateOutput = z.infer<typeof PricingValidateOutput>;

// ===========================================================================
// pricing.getPolicyPricing — admin
// ===========================================================================
export const PricingGetPolicyPricingOutput = z.object({
  data: z.object({
    packageId: z.string().nullable(),
    totalPrice: z.number(),
    tenantPercentage: z.number(),
    landlordPercentage: z.number(),
    guarantorType: z.nativeEnum(GuarantorType),
  }),
  policyNumber: z.string(),
  propertyAddress: z.unknown().nullable(),
  rentAmount: z.number(),
});
export type PricingGetPolicyPricingOutput = z.infer<typeof PricingGetPolicyPricingOutput>;

// ===========================================================================
// pricing.updatePolicyPricing — admin
// ===========================================================================
export const PricingUpdatePolicyPricingOutput = z.object({
  data: z.object({
    packageId: z.string().nullable(),
    totalPrice: z.number(),
    tenantPercentage: z.number(),
    landlordPercentage: z.number(),
    guarantorType: z.nativeEnum(GuarantorType),
  }),
});
export type PricingUpdatePolicyPricingOutput = z.infer<typeof PricingUpdatePolicyPricingOutput>;
