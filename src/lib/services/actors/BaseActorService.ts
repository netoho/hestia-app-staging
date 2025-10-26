/**
 * Base service class for actor entities
 * Provides common functionality for all actor types (Landlord, Tenant, Aval, Obligor)
 */

import { PrismaClient } from '@prisma/client';
import { BaseService } from '../base/BaseService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import {
  ActorData,
  PersonActorData,
  CompanyActorData,
  isPersonActor,
  isCompanyActor,
  AddressDetails,
  ValidationError,
} from '@/lib/types/actor';
import { ZodError } from 'zod';

export abstract class BaseActorService extends BaseService {
  protected actorType: string;

  constructor(actorType: string, prisma?: PrismaClient) {
    super({ prisma });
    this.actorType = actorType;
  }

  /**
   * Validate person actor data
   */
  abstract validatePersonData(data: PersonActorData, isPartial?: boolean): Result<PersonActorData>;

  /**
   * Validate company actor data
   */
  abstract validateCompanyData(data: CompanyActorData, isPartial?: boolean): Result<CompanyActorData>;

  /**
   * Validate actor data based on type
   */
  protected validateActorData(data: ActorData, isPartial: boolean = false): Result<ActorData> {
    try {
      if (isPersonActor(data)) {
        return this.validatePersonData(data as PersonActorData, isPartial);
      } else if (isCompanyActor(data)) {
        return this.validateCompanyData(data as CompanyActorData, isPartial);
      } else {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid actor type: must be either person or company',
            400
          )
        );
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Validation failed',
            400,
            { errors: this.formatZodErrors(error) }
          )
        );
      }
      throw error;
    }
  }

  /**
   * Format Zod validation errors for API response
   */
  protected formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }

  /**
   * Create or update address
   */
  protected async upsertAddress(
    addressData: AddressDetails,
    existingAddressId?: string | null
  ): AsyncResult<string> {
    return this.executeDbOperation(async () => {
      // Remove id and timestamp fields from addressData to prevent conflicts
      const { id, createdAt, updatedAt, ...cleanAddressData } = addressData as any;

      const address = await this.prisma.propertyAddress.upsert({
        where: { id: existingAddressId || '' },
        create: cleanAddressData,
        update: cleanAddressData,
      });
      return address.id;
    }, 'upsertAddress');
  }

  /**
   * Upsert multiple addresses at once
   * Handles address, employer address, and guarantee property address
   */
  protected async upsertMultipleAddresses(data: {
    addressDetails?: any;
    employerAddressDetails?: any;
    guaranteePropertyDetails?: any;
    previousRentalAddressDetails?: any;
  }): AsyncResult<{
    addressId?: string;
    employerAddressId?: string;
    guaranteePropertyAddressId?: string;
    previousRentalAddressId?: string;
  }> {
    return this.executeDbOperation(async () => {
      const updates: any = {};

      // Upsert current address
      if (data.addressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddressData } = data.addressDetails as any;
        const currentAddress = await this.prisma.propertyAddress.upsert({
          where: { id: data.addressDetails?.id || '' },
          create: cleanAddressData,
          update: cleanAddressData,
        });
        updates.addressId = currentAddress.id;
      }

      // Upsert employer address
      if (data.employerAddressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddressData } = data.employerAddressDetails as any;
        const employerAddress = await this.prisma.propertyAddress.upsert({
          where: { id: data.employerAddressDetails?.id || '' },
          create: cleanAddressData,
          update: cleanAddressData,
        });
        updates.employerAddressId = employerAddress.id;
      }

      // Upsert guarantee property address
      if (data.guaranteePropertyDetails) {
        const { id, createdAt, updatedAt, ...cleanAddressData } = data.guaranteePropertyDetails as any;
        const guaranteePropertyAddress = await this.prisma.propertyAddress.upsert({
          where: { id: data.guaranteePropertyDetails?.id || '' },
          create: cleanAddressData,
          update: cleanAddressData,
        });
        updates.guaranteePropertyAddressId = guaranteePropertyAddress.id;
      }

      // Upsert previous rental address
      if (data.previousRentalAddressDetails) {
        const { id, createdAt, updatedAt, ...cleanAddressData } = data.previousRentalAddressDetails as any;
        const previousRentalAddress = await this.prisma.propertyAddress.upsert({
          where: { id: data.previousRentalAddressDetails?.id || '' },
          create: cleanAddressData,
          update: cleanAddressData,
        });
        updates.previousRentalAddressId = previousRentalAddress.id;
      }

      return updates;
    }, 'upsertMultipleAddresses');
  }

  /**
   * Save personal references for an actor
   */
  protected async savePersonalReferences(
    actorId: string,
    references: any[],
    actorType: 'tenant' | 'aval' | 'jointObligor' | 'landlord'
  ): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Build where clause based on actor type
      const whereClause: any = {};
      whereClause[`${actorType}Id`] = actorId;

      // Delete existing references
      await this.prisma.personalReference.deleteMany({
        where: whereClause
      });

      // Create new references if provided
      if (references && references.length > 0) {
        const dataClause: any = {};
        dataClause[`${actorType}Id`] = actorId;

        await this.prisma.personalReference.createMany({
          data: references.map((ref: any) => ({
            ...dataClause,
            name: ref.name,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
            address: ref.address || null,
          }))
        });
      }
    }, 'savePersonalReferences');
  }

  /**
   * Save commercial references for an actor
   */
  protected async saveCommercialReferences(
    actorId: string,
    references: any[],
    actorType: 'aval' | 'jointObligor' | 'landlord'
  ): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Build where clause based on actor type
      const whereClause: any = {};
      whereClause[`${actorType}Id`] = actorId;

      // Delete existing references
      await this.prisma.commercialReference.deleteMany({
        where: whereClause
      });

      // Create new references if provided
      if (references && references.length > 0) {
        const dataClause: any = {};
        dataClause[`${actorType}Id`] = actorId;

        await this.prisma.commercialReference.createMany({
          data: references.map((ref: any) => ({
            ...dataClause,
            companyName: ref.companyName,
            contactName: ref.contactName,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            yearsOfRelationship: ref.yearsOfRelationship || null,
          }))
        });
      }
    }, 'saveCommercialReferences');
  }

  /**
   * Build update data object from actor data
   */
  protected buildUpdateData(data: ActorData, addressId?: string): any {
    const updateData: any = {
      isCompany: data.isCompany,
      email: data.email,
      phone: data.phone,
    };

    // Add optional common fields if provided
    if (data.workPhone !== undefined) updateData.workPhone = data.workPhone || null;
    if (data.address !== undefined) updateData.address = data.address;
    if (addressId) updateData.addressId = addressId;

    // Bank information
    if (data.bankName !== undefined) updateData.bankName = data.bankName || null;
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber || null;
    if (data.clabe !== undefined) updateData.clabe = data.clabe || null;
    if (data.accountHolder !== undefined) updateData.accountHolder = data.accountHolder || null;

    // Additional info
    if (data.additionalInfo !== undefined) updateData.additionalInfo = data.additionalInfo || null;

    // Add person-specific fields
    if (isPersonActor(data)) {
      const personData = data as PersonActorData;
      if (personData.fullName !== undefined) updateData.fullName = personData.fullName;
      if (personData.rfc !== undefined) updateData.rfc = personData.rfc || null;
      if (personData.curp !== undefined) updateData.curp = personData.curp || null;
      if (personData.occupation !== undefined) updateData.occupation = personData.occupation || null;
      if (personData.employerName !== undefined) updateData.employerName = personData.employerName || null;
      if (personData.monthlyIncome !== undefined) updateData.monthlyIncome = personData.monthlyIncome || null;
      if (personData.personalEmail !== undefined) updateData.personalEmail = personData.personalEmail || null;
      if (personData.workEmail !== undefined) updateData.workEmail = personData.workEmail || null;
    }

    // Add company-specific fields
    if (isCompanyActor(data)) {
      const companyData = data as CompanyActorData;
      if (companyData.companyName !== undefined) updateData.companyName = companyData.companyName;
      if (companyData.companyRfc !== undefined) updateData.companyRfc = companyData.companyRfc;
      if (companyData.legalRepName !== undefined) updateData.legalRepName = companyData.legalRepName;
      if (companyData.legalRepPosition !== undefined) updateData.legalRepPosition = companyData.legalRepPosition;
      if (companyData.legalRepRfc !== undefined) updateData.legalRepRfc = companyData.legalRepRfc || null;
      if (companyData.legalRepPhone !== undefined) updateData.legalRepPhone = companyData.legalRepPhone;
      if (companyData.legalRepEmail !== undefined) updateData.legalRepEmail = companyData.legalRepEmail;
      if (companyData.workEmail !== undefined) updateData.workEmail = companyData.workEmail || null;
    }

    return updateData;
  }

  /**
   * Save actor data (generic implementation)
   */
  protected async saveActorData<T extends ActorData>(
    tableName: string,
    actorId: string,
    data: T,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<T> {
    // Skip validation if requested (for admin endpoints)
    if (!skipValidation) {
      // Validate data
      const validationResult = this.validateActorData(data, isPartial);
      if (!validationResult.ok) {
        return Result.error(validationResult.error);
      }
    }

    return this.executeTransaction(async (tx) => {
      // Handle address if provided
      let addressId: string | undefined;
      if (data.addressDetails) {
        const addressResult = await this.upsertAddress(data.addressDetails, data.addressId);
        if (!addressResult.ok) {
          throw new Error('Failed to save address');
        }
        addressId = addressResult.value;
      }

      // Build update data
      const updateData = this.buildUpdateData(data, addressId);

      // Mark as complete if not partial
      if (!isPartial) {
        updateData.informationComplete = true;
        updateData.completedAt = new Date();
      }

      // Execute update based on table name
      const result = await (tx as any)[tableName].update({
        where: { id: actorId },
        data: updateData,
      });

      this.log('info', `${this.actorType} data saved`, {
        actorId,
        isPartial,
        tableName
      });

      return result as T;
    });
  }

  /**
   * Get actor by ID
   */
  protected async getActorById(tableName: string, actorId: string): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const actor = await (this.prisma as any)[tableName].findUnique({
        where: { id: actorId },
        include: {
          address: true,
          documents: true,
        },
      });

      if (!actor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          `${this.actorType} not found`,
          404
        );
      }

      return actor;
    }, `get${this.actorType}ById`);
  }

  /**
   * Check if actor information is complete
   */
  protected isInformationComplete(data: ActorData): boolean {
    // Common required fields
    const hasBasicInfo = !!(data.email && data.phone && data.address);

    if (isPersonActor(data)) {
      const personData = data as PersonActorData;
      return hasBasicInfo && !!personData.fullName;
    }

    if (isCompanyActor(data)) {
      const companyData = data as CompanyActorData;
      return hasBasicInfo &&
        !!companyData.companyName &&
        !!companyData.companyRfc &&
        !!companyData.legalRepName &&
        !!companyData.legalRepPhone &&
        !!companyData.legalRepEmail;
    }

    return false;
  }

  /**
   * Log actor activity
   */
  protected async logActivity(
    policyId: string,
    action: string,
    description: string,
    actorId?: string,
    details?: any
  ): AsyncResult<void> {
    try {
      await this.prisma.policyActivity.create({
        data: {
          policyId,
          action,
          description,
          performedById: actorId,
          performedByType: this.actorType,
          details: details || undefined,
        },
      });
      return Result.ok(undefined);
    } catch (error) {
      this.log('error', 'Failed to log activity', error);
      // Don't fail the operation if logging fails
      return Result.ok(undefined);
    }
  }
}