/**
 * PropertyDetailsService
 * Manages all property-related details for policies
 */

import { PrismaClient, PropertyDetails as PrismaPropertyDetails } from '@prisma/client';
import { BaseService } from './base/BaseService';
import { Result, AsyncResult } from './types/result';
import { ServiceError, ErrorCode } from './types/errors';
import { PropertyDetails } from '@/lib/types/actor';
import { validatePropertyDetails } from '@/lib/schemas/shared/property.schema';
import { AddressDetails } from '@/lib/types/actor';

export interface PropertyDetailsInput {
  // Property Features
  parkingSpaces?: number | null;
  parkingNumbers?: string | null;
  isFurnished?: boolean;
  hasPhone?: boolean;
  hasElectricity?: boolean;
  hasWater?: boolean;
  hasGas?: boolean;
  hasCableTV?: boolean;
  hasInternet?: boolean;
  otherServices?: string | null;
  utilitiesInLandlordName?: boolean;

  // Additional Property Info
  hasInventory?: boolean;
  hasRules?: boolean;
  petsAllowed?: boolean;
  propertyDeliveryDate?: Date | string | null;
  contractSigningDate?: Date | string | null;
  contractSigningLocation?: string | null;

  // Address
  propertyAddressDetails?: AddressDetails;
}

export class PropertyDetailsService extends BaseService {
  constructor(prisma?: PrismaClient) {
    super({ prisma });
  }

  /**
   * Get property details by policy ID
   */
  async getByPolicyId(policyId: string): AsyncResult<PrismaPropertyDetails | null> {
    return this.executeDbOperation(async () => {
      const propertyDetails = await this.prisma.propertyDetails.findUnique({
        where: { policyId },
        include: {
          propertyAddressDetails: true,
        },
      });

      return propertyDetails;
    }, 'getByPolicyId');
  }

  /**
   * Create property details for a policy
   */
  async create(
    policyId: string,
    data: PropertyDetailsInput
  ): AsyncResult<PrismaPropertyDetails> {
    // Validate input data
    const validationResult = this.validatePropertyDetailsInput(data);
    if (!validationResult.ok) {
      return Result.error(validationResult.error);
    }

    return this.executeTransaction(async (tx) => {
      // Handle property address if provided
      let propertyAddressId: string | undefined;
      if (data.propertyAddressDetails) {
        const addressResult = await this.upsertPropertyAddress(
          data.propertyAddressDetails,
          tx
        );
        if (!addressResult.ok) {
          throw new ServiceError(
            ErrorCode.DATABASE_ERROR,
            'Failed to save property address',
            500
          );
        }
        propertyAddressId = addressResult.value;
      }

      // Create property details
      const propertyDetails = await tx.propertyDetails.create({
        data: {
          policyId,
          propertyAddressId,
          parkingSpaces: data.parkingSpaces,
          parkingNumbers: data.parkingNumbers,
          isFurnished: data.isFurnished ?? false,
          hasPhone: data.hasPhone ?? false,
          hasElectricity: data.hasElectricity ?? true,
          hasWater: data.hasWater ?? true,
          hasGas: data.hasGas ?? false,
          hasCableTV: data.hasCableTV ?? false,
          hasInternet: data.hasInternet ?? false,
          otherServices: data.otherServices,
          utilitiesInLandlordName: data.utilitiesInLandlordName ?? false,
          hasInventory: data.hasInventory ?? false,
          hasRules: data.hasRules ?? false,
          petsAllowed: data.petsAllowed ?? false,
          propertyDeliveryDate: data.propertyDeliveryDate ? new Date(data.propertyDeliveryDate) : null,
          contractSigningDate: data.contractSigningDate ? new Date(data.contractSigningDate) : null,
          contractSigningLocation: data.contractSigningLocation,
        },
        include: {
          propertyAddressDetails: true,
        },
      });

      this.log('info', 'Property details created', { policyId });
      return propertyDetails;
    });
  }

  /**
   * Update property details
   */
  async update(
    policyId: string,
    data: Partial<PropertyDetailsInput>
  ): AsyncResult<PrismaPropertyDetails> {
    // Validate input data if provided
    if (Object.keys(data).length > 0) {
      const validationResult = this.validatePropertyDetailsInput(data, true);
      if (!validationResult.ok) {
        return Result.error(validationResult.error);
      }
    }

    return this.executeTransaction(async (tx) => {
      // Get existing property details to check if it exists
      const existing = await tx.propertyDetails.findUnique({
        where: { policyId },
        select: { id: true, propertyAddressId: true },
      });

      if (!existing) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Property details not found for this policy',
          404
        );
      }

      // Handle property address update if provided
      let propertyAddressId = existing.propertyAddressId;
      if (data.propertyAddressDetails) {
        const addressResult = await this.upsertPropertyAddress(
          data.propertyAddressDetails,
          tx,
          propertyAddressId
        );
        if (!addressResult.ok) {
          throw new ServiceError(
            ErrorCode.DATABASE_ERROR,
            'Failed to update property address',
            500
          );
        }
        propertyAddressId = addressResult.value;
      }

      // Build update data
      const updateData: any = {};
      if (propertyAddressId !== existing.propertyAddressId) {
        updateData.propertyAddressId = propertyAddressId;
      }

      // Add all other fields if provided
      if (data.parkingSpaces !== undefined) updateData.parkingSpaces = data.parkingSpaces;
      if (data.parkingNumbers !== undefined) updateData.parkingNumbers = data.parkingNumbers;
      if (data.isFurnished !== undefined) updateData.isFurnished = data.isFurnished;
      if (data.hasPhone !== undefined) updateData.hasPhone = data.hasPhone;
      if (data.hasElectricity !== undefined) updateData.hasElectricity = data.hasElectricity;
      if (data.hasWater !== undefined) updateData.hasWater = data.hasWater;
      if (data.hasGas !== undefined) updateData.hasGas = data.hasGas;
      if (data.hasCableTV !== undefined) updateData.hasCableTV = data.hasCableTV;
      if (data.hasInternet !== undefined) updateData.hasInternet = data.hasInternet;
      if (data.otherServices !== undefined) updateData.otherServices = data.otherServices;
      if (data.utilitiesInLandlordName !== undefined) updateData.utilitiesInLandlordName = data.utilitiesInLandlordName;
      if (data.hasInventory !== undefined) updateData.hasInventory = data.hasInventory;
      if (data.hasRules !== undefined) updateData.hasRules = data.hasRules;
      if (data.petsAllowed !== undefined) updateData.petsAllowed = data.petsAllowed;
      if (data.propertyDeliveryDate !== undefined) {
        updateData.propertyDeliveryDate = data.propertyDeliveryDate ? new Date(data.propertyDeliveryDate) : null;
      }
      if (data.contractSigningDate !== undefined) {
        updateData.contractSigningDate = data.contractSigningDate ? new Date(data.contractSigningDate) : null;
      }
      if (data.contractSigningLocation !== undefined) updateData.contractSigningLocation = data.contractSigningLocation;

      // Update property details
      const updatedPropertyDetails = await tx.propertyDetails.update({
        where: { policyId },
        data: updateData,
        include: {
          propertyAddressDetails: true,
        },
      });

      this.log('info', 'Property details updated', { policyId });
      return updatedPropertyDetails;
    });
  }

  /**
   * Create or update property details (upsert)
   */
  async upsert(
    policyId: string,
    data: PropertyDetailsInput
  ): AsyncResult<PrismaPropertyDetails> {
    // Check if property details exist
    const existing = await this.getByPolicyId(policyId);

    if (existing.ok && existing.value) {
      // Update existing
      return this.update(policyId, data);
    } else {
      // Create new
      return this.create(policyId, data);
    }
  }

  /**
   * Delete property details
   */
  async delete(policyId: string): AsyncResult<boolean> {
    return this.executeDbOperation(async () => {
      await this.prisma.propertyDetails.delete({
        where: { policyId },
      });

      this.log('info', 'Property details deleted', { policyId });
      return true;
    }, 'deletePropertyDetails');
  }

  /**
   * Validate property details input
   */
  private validatePropertyDetailsInput(
    data: PropertyDetailsInput,
    isPartial: boolean = false
  ): Result<PropertyDetailsInput> {
    // For partial updates, we don't need full validation
    if (isPartial) {
      return Result.ok(data);
    }

    // Use the existing validation schema
    const result = validatePropertyDetails(data as PropertyDetails);
    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid property details',
          400,
          { errors: result.error.errors }
        )
      );
    }

    return Result.ok(data);
  }

  /**
   * Upsert property address
   */
  private async upsertPropertyAddress(
    addressData: AddressDetails,
    tx: any,
    existingAddressId?: string | null
  ): AsyncResult<string> {
    try {
      // Remove id and timestamp fields from addressData to prevent conflicts
      const { id, createdAt, updatedAt, ...cleanAddressData } = addressData as any;

      const address = await tx.propertyAddress.upsert({
        where: { id: existingAddressId || 'new' },
        create: cleanAddressData,
        update: cleanAddressData,
      });

      return Result.ok(address.id);
    } catch (error) {
      this.log('error', 'Failed to upsert property address', error);
      return Result.error(
        new ServiceError(
          ErrorCode.DATABASE_ERROR,
          'Failed to save property address',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }
}