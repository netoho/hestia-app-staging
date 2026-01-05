import { BaseService } from './base/BaseService';
import { Package } from "@/prisma/generated/prisma-client/client";
import { PREMIUM_TIERS, TAX_CONFIG, LOCALE_CONFIG } from "@/lib/constants/businessConfig";
import { ServiceError, ErrorCode } from './types/errors';

export interface CalculationSummary {
  packageName: string;
  calculationMethod: 'percentage' | 'flat' | 'none';
  rentAmount?: number;
  percentage?: number;
  flatFee?: number;
  minimumAmount?: number;
  minimumApplied: boolean;
  investigationFeeIncluded: boolean;
  formula: string;
  breakdown: {
    base: number;
    investigationFee: number | null;
    subtotal: number;
    iva: number;
    total: number;
  };
}

export interface PricingCalculation {
  packagePrice: number;
  investigationFee: number | null;
  subtotal: number;
  iva: number;
  ivaRate: number;
  totalWithIva: number;
  tenantAmount: number;
  landlordAmount: number;
  total: number;
  tenantPercentage: number;
  landlordPercentage: number;
  calculationSummary?: CalculationSummary;
}

export interface PricingInput {
  packageId?: string;
  rentAmount: number;
  tenantPercentage?: number; // 0-100
  landlordPercentage?: number; // 0-100
  includeInvestigationFee?: boolean; // Optional, defaults to false
}

class PricingService extends BaseService {
  /**
   * Get the effective percentage for premium package based on rent amount
   */
  private getPremiumPercentage(rentAmount: number, basePercentage: number): number {
    for (const tier of PREMIUM_TIERS) {
      if (rentAmount >= tier.minRent) {
        return tier.percentage;
      }
    }
    return basePercentage;
  }

  /**
   * Validate that percentages sum to 100
   */
  private validatePercentageSplit(tenantPercentage?: number, landlordPercentage?: number): boolean {
    if (tenantPercentage === undefined && landlordPercentage === undefined) {
      return true; // Default split is valid
    }

    if (tenantPercentage === undefined || landlordPercentage === undefined) {
      return false; // Both must be provided if one is
    }

    const total = tenantPercentage + landlordPercentage;
    return Math.abs(total - 100) < 0.01; // Allow for small floating point errors
  }

  /**
   * Generate a human-readable formula string for the calculation
   */
  private generateFormulaString(
    rentAmount: number,
    packageData: Package | null,
    packagePrice: number,
    investigationFee: number,
    includeInvestigationFee: boolean,
    minimumApplied: boolean,
    effectivePercentage?: number | null
  ): string {
    const formatMoney = (amount: number) => `$${amount.toLocaleString(LOCALE_CONFIG.DEFAULT)}`;

    if (!packageData) {
      return includeInvestigationFee ?
        `${formatMoney(0)} + ${formatMoney(investigationFee)} = ${formatMoney(investigationFee)}` :
        formatMoney(0);
    }

    let formula = '';
    const percentageToShow = effectivePercentage ?? packageData.percentage;

    // Package calculation part
    if (packageData.percentage && packageData.percentage > 0) {
      if (minimumApplied) {
        formula = `Mínimo de ${formatMoney(packageData.minAmount || 0)}`;
      } else {
        formula = `(${formatMoney(rentAmount)} × ${percentageToShow}%) = ${formatMoney(packagePrice)}`;
      }
    } else {
      formula = `${formatMoney(packagePrice)}`;
    }

    // Add investigation fee if included
    if (includeInvestigationFee) {
      formula += ` + ${formatMoney(investigationFee)}`;
    }

    // Add subtotal
    const subtotal = packagePrice + investigationFee;
    formula += ` = ${formatMoney(subtotal)}`;

    // Add IVA calculation
    const iva = subtotal * TAX_CONFIG.IVA_RATE;
    const totalWithIva = subtotal + iva;
    formula += ` + IVA (${TAX_CONFIG.IVA_RATE * 100}%) ${formatMoney(iva)} = ${formatMoney(totalWithIva)}`;

    return formula;
  }

  /**
   * Get the current investigation fee from system configuration
   */
  async getInvestigationFee(): Promise<number> {
    const config = await this.prisma.systemConfig.findFirst({
      where: { id: 'system-config-1' }
    });

    return config?.investigationFee || 200;
  }

  /**
   * Get package details including pricing
   */
  async getPackageDetails(packageId: string): Promise<Package | null> {
    return this.prisma.package.findUnique({
      where: { id: packageId }
    });
  }

  /**
   * Calculate package price based on rent amount and package configuration
   */
  calculatePackagePrice(rentAmount: number, packageData: Package): number {
    // If package has a percentage, calculate based on rent
    if (packageData.percentage && packageData.percentage > 0) {
      // For premium package, apply tiered percentages for high rents
      const effectivePercentage = packageData.id === 'premium'
        ? this.getPremiumPercentage(rentAmount, packageData.percentage)
        : packageData.percentage;

      const calculatedPrice = (rentAmount * effectivePercentage) / 100;

      // Apply minimum amount if configured
      if (packageData.minAmount && calculatedPrice < packageData.minAmount) {
        return packageData.minAmount;
      }

      return Math.round(calculatedPrice * 100) / 100; // Round to 2 decimals
    }

    // Otherwise, use flat price
    return packageData.price;
  }

  /**
   * Calculate the complete pricing breakdown for a policy
   */
  async calculatePolicyPricing(input: PricingInput): Promise<PricingCalculation> {
    // Get investigation fee only if requested
    const includeInvestigationFee = input.includeInvestigationFee ?? false;
    const investigationFee = includeInvestigationFee ? await this.getInvestigationFee() : 0;
    const investigationFeeForResponse = includeInvestigationFee ? investigationFee : null;

    // Initialize calculation summary
    let calculationSummary: CalculationSummary | undefined;

    // Calculate package price
    let packagePrice = 0;
    let packageData: Package | null = null;

    if (input.packageId) {
      packageData = await this.getPackageDetails(input.packageId);
      if (packageData) {
        packagePrice = this.calculatePackagePrice(input.rentAmount, packageData);

        // Determine calculation method and details
        const isPercentageBased = packageData.percentage && packageData.percentage > 0;

        // Get effective percentage (may differ for premium tiered pricing)
        const effectivePercentage = isPercentageBased && packageData.id === 'premium'
          ? this.getPremiumPercentage(input.rentAmount, packageData.percentage)
          : packageData.percentage;

        const minimumApplied = isPercentageBased &&
          packageData.minAmount &&
          (input.rentAmount * effectivePercentage! / 100) < packageData.minAmount;

        // Build calculation summary
        calculationSummary = {
          packageName: packageData.name,
          calculationMethod: isPercentageBased ? 'percentage' : 'flat',
          rentAmount: input.rentAmount,
          percentage: isPercentageBased ? effectivePercentage : undefined,
          flatFee: !isPercentageBased ? packageData.price : undefined,
          minimumAmount: packageData.minAmount || undefined,
          minimumApplied,
          investigationFeeIncluded: includeInvestigationFee,
          formula: this.generateFormulaString(
            input.rentAmount,
            packageData,
            packagePrice,
            investigationFee,
            includeInvestigationFee,
            minimumApplied,
            effectivePercentage
          ),
          breakdown: {
            base: packagePrice,
            investigationFee: investigationFeeForResponse,
            subtotal: 0,
            iva: 0,
            total: packagePrice + investigationFee
          }
        };
      }
    } else {
      // No package selected
      calculationSummary = {
        packageName: 'Sin paquete',
        calculationMethod: 'none',
        rentAmount: input.rentAmount,
        minimumApplied: false,
        investigationFeeIncluded: includeInvestigationFee,
        formula: includeInvestigationFee ? `$0 + $${investigationFee} = $${investigationFee}` : '$0',
        breakdown: {
          base: 0,
          investigationFee: investigationFeeForResponse,
          subtotal: 0,
          iva: 0,
          total: investigationFee
        }
      };
    }

    // Calculate subtotal
    const subtotal = packagePrice + investigationFee;

    // Calculate IVA
    const ivaRate = TAX_CONFIG.IVA_RATE;
    const iva = Math.round((subtotal * ivaRate) * 100) / 100;

    // Calculate total with IVA
    const totalWithIva = subtotal + iva;

    // Determine percentage split
    const tenantPercentage = input.tenantPercentage ?? 100;
    const landlordPercentage = input.landlordPercentage ?? 0;

    // Validate percentages
    if (!this.validatePercentageSplit(tenantPercentage, landlordPercentage)) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Tenant and landlord percentages must sum to 100%',
        400,
        { tenantPercentage, landlordPercentage }
      );
    }

    // Calculate split amounts based on total with IVA
    const tenantAmount = Math.round((totalWithIva * tenantPercentage / 100) * 100) / 100;
    const landlordAmount = Math.round((totalWithIva * landlordPercentage / 100) * 100) / 100;

    // Update calculation summary with IVA if it exists
    if (calculationSummary) {
      calculationSummary.breakdown.subtotal = subtotal;
      calculationSummary.breakdown.iva = iva;
      calculationSummary.breakdown.total = totalWithIva;
    }

    return {
      packagePrice,
      investigationFee: investigationFeeForResponse,
      subtotal,
      iva,
      ivaRate,
      totalWithIva,
      tenantAmount,
      landlordAmount,
      total: totalWithIva,
      tenantPercentage,
      landlordPercentage,
      calculationSummary
    };
  }
}

// Export singleton instance
export const pricingService = new PricingService();

// Export legacy functions for backwards compatibility
export const getInvestigationFee = pricingService.getInvestigationFee.bind(pricingService);
export const getPackageDetails = pricingService.getPackageDetails.bind(pricingService);
export const calculatePackagePrice = pricingService.calculatePackagePrice.bind(pricingService);
export const calculatePolicyPricing = pricingService.calculatePolicyPricing.bind(pricingService);

// Re-export formatCurrency from shared utility for backwards compatibility
export { formatCurrency } from '@/lib/utils/currency';
