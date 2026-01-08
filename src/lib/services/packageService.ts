/**
 * Package Service
 * Handles all package-related operations with proper error handling
 */

import { Package } from "@/prisma/generated/prisma-client/client";
import { BaseService } from './base/BaseService';
import { AsyncResult, Result } from './types/result';
import { ServiceError, ErrorCode } from './types/errors';

export interface IPackageService {
  getPackages(): AsyncResult<Package[]>;
  getPackageById(id: string): AsyncResult<Package | null>;
  getPackageByName(name: string): AsyncResult<Package | null>;
  calculatePrice(pkg: Package, monthlyRent: number): number;
  validateRentAmount(pkg: Package, monthlyRent: number): Result<void>;
}

export class PackageService extends BaseService implements IPackageService {
  /**
   * Map package data to ensure consistent structure
   */
  private mapPackageData(pkg: any): Package {
    return {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      features: pkg.features, // Keep as string - component will parse it
      ctaText: pkg.ctaText,
      ctaLink: pkg.ctaLink,
      highlight: pkg.highlight,
      percentage: pkg.percentage ?? null,
      minAmount: pkg.minAmount ?? null,
      shortDescription: pkg.shortDescription ?? null,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      isActive: pkg.isActive,
    };
  }

  /**
   * Get all packages
   */
  async getPackages(): AsyncResult<Package[]> {
    this.log('info', 'Fetching all packages');

    return this.executeDbOperation(
      async () => {
        const packages = await this.prisma.package.findMany({
          orderBy: { price: 'asc' },
        });
        return packages.map(this.mapPackageData);
      },
      'getPackages'
    );
  }

  /**
   * Get package by ID
   */
  async getPackageById(id: string): AsyncResult<Package | null> {
    this.log('info', 'Fetching package by ID', { id });

    // Validate input
    const validation = this.validate(id, (id) =>
      !id ? 'Package ID is required' : null
    );
    if (!validation.ok) {
      return validation;
    }


    return this.executeDbOperation(
      async () => {
        const pkg = await this.prisma.package.findUnique({
          where: { id },
        });
        return pkg ? this.mapPackageData(pkg) : null;
      },
      'getPackageById'
    );
  }

  /**
   * Get package by name
   */
  async getPackageByName(name: string): AsyncResult<Package | null> {
    this.log('info', 'Fetching package by name', { name });

    // Validate input
    const validation = this.validate(name, (name) =>
      !name ? 'Package name is required' : null
    );
    if (!validation.ok) {
      return validation;
    }

    return this.executeDbOperation(
      async () => {
        const pkg = await this.prisma.package.findFirst({
          where: { name },
        });
        return pkg ? this.mapPackageData(pkg) : null;
      },
      'getPackageByName'
    );
  }

  /**
   * Calculate package price based on rent amount
   */
  calculatePrice(pkg: Package, monthlyRent: number): number {
    if (!pkg.percentage) {
      // Flat fee package
      return pkg.price;
    }

    // Percentage-based package
    const percentagePrice = (monthlyRent * pkg.percentage) / 100;
    return Math.max(pkg.minAmount || pkg.price, percentagePrice);
  }

  /**
   * Validate if rent amount is within package limits
   */
  validateRentAmount(pkg: Package, monthlyRent: number): Result<void> {
    if (monthlyRent <= 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'El monto de renta debe ser mayor a 0',
          400,
          { monthlyRent }
        )
      );
    }

    return Result.ok(undefined);
  }
}

// Export singleton instance for backward compatibility
export const packageService = new PackageService();

// Legacy export for existing code
export const getPackages = async (): Promise<Package[]> => {
  const result = await packageService.getPackages();
  if (result.ok) {
    return result.value;
  }
  throw result.error;
};
