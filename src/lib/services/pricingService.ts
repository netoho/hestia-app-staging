import prisma from '../prisma';
import { Package } from '@prisma/client';

export interface PricingCalculation {
  packagePrice: number;
  investigationFee: number;
  subtotal: number;
  tenantAmount: number;
  landlordAmount: number;
  total: number;
  tenantPercentage: number;
  landlordPercentage: number;
}

export interface PricingInput {
  packageId?: string;
  rentAmount: number;
  tenantPercentage?: number; // 0-100
  landlordPercentage?: number; // 0-100
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
  return await prisma.package.findUnique({
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
  // Get investigation fee
  const investigationFee = await getInvestigationFee();

  // Calculate package price
  let packagePrice = 0;
  if (input.packageId) {
    const packageData = await getPackageDetails(input.packageId);
    if (packageData) {
      packagePrice = calculatePackagePrice(input.rentAmount, packageData);
    }
  }

  // Calculate subtotal
  const subtotal = packagePrice + investigationFee;

  // Determine percentage split
  let tenantPercentage = input.tenantPercentage ?? 100;
  let landlordPercentage = input.landlordPercentage ?? 0;

  // Validate percentages
  if (!validatePercentageSplit(tenantPercentage, landlordPercentage)) {
    throw new Error('Tenant and landlord percentages must sum to 100%');
  }

  // Calculate split amounts
  const tenantAmount = Math.round((subtotal * tenantPercentage / 100) * 100) / 100;
  const landlordAmount = Math.round((subtotal * landlordPercentage / 100) * 100) / 100;

  return {
    packagePrice,
    investigationFee,
    subtotal,
    tenantAmount,
    landlordAmount,
    total: subtotal,
    tenantPercentage,
    landlordPercentage
  };
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
  return await prisma.package.findMany({
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