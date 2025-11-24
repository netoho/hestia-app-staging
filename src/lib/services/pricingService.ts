import prisma from '../prisma';
import { Package } from '@prisma/client';

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

/**
 * Get the current investigation fee from system configuration
 */
export async function getInvestigationFee(): Promise<number> {
  const config = await prisma.systemConfig.findFirst({
    where: { id: 'system-config-1' }
  });

  return config?.investigationFee || 200;
}

/**
 * Get package details including pricing
 */
export async function getPackageDetails(packageId: string): Promise<Package | null> {
  return prisma.package.findUnique({
    where: { id: packageId }
  });
}

/**
 * Calculate package price based on rent amount and package configuration
 */
export function calculatePackagePrice(rentAmount: number, packageData: Package): number {
  // If package has a percentage, calculate based on rent
  if (packageData.percentage && packageData.percentage > 0) {
    const calculatedPrice = (rentAmount * packageData.percentage) / 100;

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
 * Validate that percentages sum to 100
 */
export function validatePercentageSplit(tenantPercentage?: number, landlordPercentage?: number): boolean {
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
 * Calculate the complete pricing breakdown for a policy
 */
export async function calculatePolicyPricing(input: PricingInput): Promise<PricingCalculation> {
  // Get investigation fee only if requested
  const includeInvestigationFee = input.includeInvestigationFee ?? false;
  const investigationFee = includeInvestigationFee ? await getInvestigationFee() : 0;
  const investigationFeeForResponse = includeInvestigationFee ? investigationFee : null;

  // Initialize calculation summary
  let calculationSummary: CalculationSummary | undefined;

  // Calculate package price
  let packagePrice = 0;
  let packageData: Package | null = null;

  if (input.packageId) {
    packageData = await getPackageDetails(input.packageId);
    if (packageData) {
      packagePrice = calculatePackagePrice(input.rentAmount, packageData);

      // Determine calculation method and details
      const isPercentageBased = packageData.percentage && packageData.percentage > 0;
      const minimumApplied = isPercentageBased &&
        packageData.minAmount &&
        (input.rentAmount * packageData.percentage / 100) < packageData.minAmount;

      // Build calculation summary
      calculationSummary = {
        packageName: packageData.name,
        calculationMethod: isPercentageBased ? 'percentage' : 'flat',
        rentAmount: input.rentAmount,
        percentage: isPercentageBased ? packageData.percentage : undefined,
        flatFee: !isPercentageBased ? packageData.price : undefined,
        minimumAmount: packageData.minAmount || undefined,
        minimumApplied,
        investigationFeeIncluded: includeInvestigationFee,
        formula: generateFormulaString(
          input.rentAmount,
          packageData,
          packagePrice,
          investigationFee,
          includeInvestigationFee,
          minimumApplied
        ),
        breakdown: {
          base: packagePrice,
          investigationFee: investigationFeeForResponse,
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
        total: investigationFee
      }
    };
  }

  // Calculate subtotal
  const subtotal = packagePrice + investigationFee;

  // Calculate IVA (16% of subtotal)
  const ivaRate = 0.16;
  const iva = Math.round((subtotal * ivaRate) * 100) / 100;

  // Calculate total with IVA
  const totalWithIva = subtotal + iva;

  // Determine percentage split
  let tenantPercentage = input.tenantPercentage ?? 100;
  let landlordPercentage = input.landlordPercentage ?? 0;

  // Validate percentages
  if (!validatePercentageSplit(tenantPercentage, landlordPercentage)) {
    throw new Error('Tenant and landlord percentages must sum to 100%');
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

/**
 * Generate a human-readable formula string for the calculation
 */
function generateFormulaString(
  rentAmount: number,
  packageData: Package | null,
  packagePrice: number,
  investigationFee: number,
  includeInvestigationFee: boolean,
  minimumApplied: boolean
): string {
  const formatMoney = (amount: number) => `$${amount.toLocaleString('es-MX')}`;

  if (!packageData) {
    return includeInvestigationFee ?
      `${formatMoney(0)} + ${formatMoney(investigationFee)} = ${formatMoney(investigationFee)}` :
      formatMoney(0);
  }

  let formula = '';

  // Package calculation part
  if (packageData.percentage && packageData.percentage > 0) {
    if (minimumApplied) {
      formula = `Mínimo de ${formatMoney(packageData.minAmount || 0)}`;
    } else {
      formula = `(${formatMoney(rentAmount)} × ${packageData.percentage}%) = ${formatMoney(packagePrice)}`;
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
  const iva = subtotal * 0.16;
  const totalWithIva = subtotal + iva;
  formula += ` + IVA (16%) ${formatMoney(iva)} = ${formatMoney(totalWithIva)}`;

  return formula;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

/**
 * Get all active packages for selection
 */
export async function getActivePackages() {
  return prisma.package.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' }
  });
}

/**
 * Calculate monthly payment if policy offers payment plans
 */
export function calculateMonthlyPayment(
  totalAmount: number,
  months: number = 12,
  interestRate: number = 0
): number {
  if (months <= 0) return totalAmount;

  if (interestRate === 0) {
    return Math.round((totalAmount / months) * 100) / 100;
  }

  // Calculate with interest (simple interest for now)
  const interest = totalAmount * (interestRate / 100);
  const totalWithInterest = totalAmount + interest;
  return Math.round((totalWithInterest / months) * 100) / 100;
}

/**
 * Estimate total policy cost including potential incidents
 * This is for display purposes to show value proposition
 */
export function estimatePotentialSavings(
  rentAmount: number,
  contractMonths: number = 12
): {
  potentialLoss: number;
  policyCost: number;
  savings: number;
} {
  // Potential loss scenarios
  const missedRentMonths = 3; // Average months of missed rent in disputes
  const legalFees = 15000; // Average legal fees
  const propertyDamage = rentAmount * 2; // Typical damage claim

  const potentialLoss = (rentAmount * missedRentMonths) + legalFees + propertyDamage;

  // Rough estimate of policy cost (will be replaced with actual calculation)
  const policyCost = rentAmount * 0.5; // 50% of one month's rent as estimate

  return {
    potentialLoss,
    policyCost,
    savings: potentialLoss - policyCost
  };
}
