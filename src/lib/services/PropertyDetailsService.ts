/**
 * PropertyDetailsService
 * Manages all property-related details for policies
 */

import { RulesType } from "@/prisma/generated/prisma-client/enums";
import { PrismaClient, PropertyDetails as PrismaPropertyDetails } from "@/prisma/generated/prisma-client/client";
import { BaseService } from './base/BaseService';
import { Result, AsyncResult } from './types/result';
import { ServiceError, ErrorCode } from './types/errors';
import { PropertyDetails } from '@/lib/types/actor';
import { validatePropertyDetails } from '@/lib/schemas/shared/property.schema';
import { AddressDetails } from '@/lib/types/actor';

export interface PropertyDetailsInput {
  // Property Type and Description
  propertyType?: string | null;
  propertyDescription?: string | null;

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
  rulesType?: RulesType | null;
  petsAllowed?: boolean;
  propertyDeliveryDate?: Date | string | null;
  contractSigningDate?: Date | string | null;

  // Addresses
  propertyAddressDetails?: AddressDetails;
  contractSigningAddressDetails?: AddressDetails;
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
          contractSigningAddressDetails: true,
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

      // Handle contract signing address if provided
      let contractSigningAddressId: string | undefined;
      if (data.contractSigningAddressDetails) {
        const addressResult = await this.upsertPropertyAddress(
          data.contractSigningAddressDetails,
          tx
        );
        if (!addressResult.ok) {
          throw new ServiceError(
            ErrorCode.DATABASE_ERROR,
            'Failed to save contract signing address',
            500
          );
        }
        contractSigningAddressId = addressResult.value;
      }

      // Create property details
      const propertyDetails = await tx.propertyDetails.create({
        data: {
          policyId,
          propertyAddressId,
          contractSigningAddressId,
          propertyType: data.propertyType as any,
          propertyDescription: data.propertyDescription,
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
          rulesType: data.rulesType,
          petsAllowed: data.petsAllowed ?? false,
          propertyDeliveryDate: data.propertyDeliveryDate ? new Date(data.propertyDeliveryDate) : null,
          contractSigningDate: data.contractSigningDate ? new Date(data.contractSigningDate) : null,
        },
        include: {
          propertyAddressDetails: true,
          contractSigningAddressDetails: true,
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
        select: { id: true, propertyAddressId: true, contractSigningAddressId: true },
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
      if (data.propertyAddressDetails && data.propertyAddressDetails.street) {
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

      // Handle contract signing address update if provided
      let contractSigningAddressId = existing.contractSigningAddressId;
      if (data.contractSigningAddressDetails && data.contractSigningAddressDetails.street) {
        const addressResult = await this.upsertPropertyAddress(
          data.contractSigningAddressDetails,
          tx,
          contractSigningAddressId
        );
        if (!addressResult.ok) {
          throw new ServiceError(
            ErrorCode.DATABASE_ERROR,
            'Failed to update contract signing address',
            500
          );
        }
        contractSigningAddressId = addressResult.value;
      }

      // Build update data
      const updateData: any = {};
      if (propertyAddressId !== existing.propertyAddressId) {
        updateData.propertyAddressId = propertyAddressId;
      }
      if (contractSigningAddressId !== existing.contractSigningAddressId) {
        updateData.contractSigningAddressId = contractSigningAddressId;
      }

      // Add all other fields if provided
      if (data.propertyType !== undefined) updateData.propertyType = data.propertyType;
      if (data.propertyDescription !== undefined) updateData.propertyDescription = data.propertyDescription;
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
      if (data.rulesType !== undefined) updateData.rulesType = data.rulesType;
      if (data.petsAllowed !== undefined) updateData.petsAllowed = data.petsAllowed;
      if (data.propertyDeliveryDate !== undefined) {
        updateData.propertyDeliveryDate = data.propertyDeliveryDate ? new Date(data.propertyDeliveryDate) : null;
      }
      if (data.contractSigningDate !== undefined) {
        updateData.contractSigningDate = data.contractSigningDate ? new Date(data.contractSigningDate) : null;
      }

      // Update property details
      const updatedPropertyDetails = await tx.propertyDetails.update({
        where: { policyId },
        data: updateData,
        include: {
          propertyAddressDetails: true,
          contractSigningAddressDetails: true,
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
