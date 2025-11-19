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
import type {
  ActorModelMap,
  ActorTypeLiteral,
  PersonalReferenceInput,
  CommercialReferenceInput
} from './types';

export abstract class BaseActorService<
  TModel extends ActorModelMap[keyof ActorModelMap],
  TData extends ActorData
> extends BaseService {
  protected actorType: ActorTypeLiteral;

  constructor(actorType: ActorTypeLiteral, prisma?: PrismaClient) {
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
    references: PersonalReferenceInput[]
  ): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Build where clause based on actor type
      const whereClause = this.buildReferenceWhereClause(actorId);

      // Delete existing references
      await this.prisma.personalReference.deleteMany({
        where: whereClause
      });

      // Create new references if provided
      if (references && references.length > 0) {
        const dataClause = this.buildReferenceDataClause(actorId);

        await this.prisma.personalReference.createMany({
          data: references.map((ref) => ({
            ...dataClause,
            firstName: ref.firstName,
            middleName: ref.middleName || null,
            paternalLastName: ref.paternalLastName,
            maternalLastName: ref.maternalLastName,
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
   * Build where clause for reference queries based on actor type
   */
  private buildReferenceWhereClause(actorId: string): Record<string, string> {
    const key = `${this.actorType}Id`;
    return { [key]: actorId };
  }

  /**
   * Build data clause for reference creation based on actor type
   */
  private buildReferenceDataClause(actorId: string): Record<string, string> {
    const key = `${this.actorType}Id`;
    return { [key]: actorId };
  }

  /**
   * Save commercial references for an actor
   */
  protected async saveCommercialReferences(
    actorId: string,
    references: CommercialReferenceInput[]
  ): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Build where clause based on actor type
      const whereClause = this.buildReferenceWhereClause(actorId);

      // Delete existing references
      await this.prisma.commercialReference.deleteMany({
        where: whereClause
      });

      // Create new references if provided
      if (references && references.length > 0) {
        const dataClause = this.buildReferenceDataClause(actorId);

        await this.prisma.commercialReference.createMany({
          data: references.map((ref) => ({
            ...dataClause,
            companyName: ref.companyName,
            contactFirstName: ref.contactFirstName,
            contactMiddleName: ref.contactMiddleName || null,
            contactPaternalLastName: ref.contactPaternalLastName,
            contactMaternalLastName: ref.contactMaternalLastName,
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
      // Individual name fields
      if (personData.firstName !== undefined) updateData.firstName = personData.firstName;
      if (personData.middleName !== undefined) updateData.middleName = personData.middleName || null;
      if (personData.paternalLastName !== undefined) updateData.paternalLastName = personData.paternalLastName;
      if (personData.maternalLastName !== undefined) updateData.maternalLastName = personData.maternalLastName || null;
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
      // Legal rep name fields
      if (companyData.legalRepFirstName !== undefined) updateData.legalRepFirstName = companyData.legalRepFirstName;
      if (companyData.legalRepMiddleName !== undefined) updateData.legalRepMiddleName = companyData.legalRepMiddleName || null;
      if (companyData.legalRepPaternalLastName !== undefined) updateData.legalRepPaternalLastName = companyData.legalRepPaternalLastName;
      if (companyData.legalRepMaternalLastName !== undefined) updateData.legalRepMaternalLastName = companyData.legalRepMaternalLastName || null;
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
  protected async saveActorData(
    actorId: string,
    data: TData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<TModel> {
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

      // Get the Prisma delegate for this actor type
      const delegate = this.getPrismaDelegate(tx);

      // Execute update using the proper delegate
      const result = await delegate.update({
        where: { id: actorId },
        data: updateData,
        include: this.getIncludes()
      });

      this.log('info', `${this.actorType} data saved`, {
        actorId,
        isPartial
      });

      return result as TModel;
    });
  }

  /**
   * Get the Prisma delegate for this actor type
   * Must be implemented by concrete services
   */
  protected abstract getPrismaDelegate(tx?: any): any;

  /**
   * Get actor by ID
   */
  protected async getActorById(actorId: string): AsyncResult<TModel> {
    return this.executeDbOperation(async () => {
      const delegate = this.getPrismaDelegate();

      const actor = await delegate.findUnique({
        where: { id: actorId },
        include: this.getIncludes()
      });

      if (!actor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          `${this.actorType} not found`,
          404
        );
      }

      return actor as TModel;
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
      return hasBasicInfo && !!(personData.firstName && personData.paternalLastName);
    }

    if (isCompanyActor(data)) {
      const companyData = data as CompanyActorData;
      return hasBasicInfo &&
        !!companyData.companyName &&
        !!companyData.companyRfc &&
        !!(companyData.legalRepFirstName && companyData.legalRepPaternalLastName) &&
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

  /**
   * Check if all actors are complete and transition policy status if needed
   * This should be called after an actor completes their information (not partial save)
   */
  protected async checkAndTransitionPolicyStatus(
    policyId: string,
    performedBy: string = 'system'
  ): AsyncResult<{ transitioned: boolean; newStatus?: string }> {
    try {
      // Get the policy to check current status
      const policy = await this.prisma.policy.findUnique({
        where: { id: policyId },
        select: { status: true }
      });

      if (!policy) {
        return Result.error(
          new ServiceError(
            ErrorCode.NOT_FOUND,
            'Policy not found',
            404
          )
        );
      }

      // Only transition if currently in COLLECTING_INFO status
      if (policy.status !== 'COLLECTING_INFO') {
        return Result.ok({ transitioned: false });
      }

      // Check if all actors are complete using the improved function
      const { checkPolicyActorsComplete } = await import('@/lib/services/actorTokenService');
      const actorsStatus = await checkPolicyActorsComplete(policyId);

      // If all actors are complete, transition to UNDER_INVESTIGATION
      if (actorsStatus.allComplete) {
        const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');

        await transitionPolicyStatus(
          policyId,
          'UNDER_INVESTIGATION',
          performedBy,
          'All actor information completed'
        );

        this.log('info', 'Policy status transitioned to UNDER_INVESTIGATION', {
          policyId,
          performedBy,
          allActorsComplete: actorsStatus
        });

        return Result.ok({
          transitioned: true,
          newStatus: 'UNDER_INVESTIGATION'
        });
      }

      return Result.ok({
        transitioned: false,
        ...actorsStatus // Include completion details for debugging
      });
    } catch (error) {
      this.log('error', 'Failed to check and transition policy status', {
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't fail the operation if transition check fails
      return Result.ok({ transitioned: false });
    }
  }

  /**
   * Delete an actor from the database
   * Used by concrete services to implement public delete methods
   */
  protected async deleteActor(actorId: string): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      const delegate = this.getPrismaDelegate();

      await delegate.delete({
        where: { id: actorId }
      });
    }, 'delete');
  }

  /**
   * Public methods required by tRPC router
   * These wrap the protected methods to provide a consistent interface
   */

  /**
   * Get an actor by ID
   * Used by tRPC router for admin access
   */
  public async getById(id: string): AsyncResult<TModel> {
    return this.getActorById(id);
  }

  /**
   * Get an actor by token
   * Used by tRPC router for actor self-service access
   */
  public async getByToken(token: string): AsyncResult<TModel> {
    return this.executeDbOperation(async () => {
      const delegate = this.getPrismaDelegate();

      const actor = await delegate.findFirst({
        where: { accessToken: token },
        include: this.getIncludes()
      });

      if (!actor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Actor no encontrado con el token proporcionado'
        );
      }

      // Check token expiry
      if (actor.tokenExpiry && actor.tokenExpiry < new Date()) {
        throw new ServiceError(
          ErrorCode.TOKEN_EXPIRED,
          'Token expirado'
        );
      }

      return actor as TModel;
    }, 'getByToken');
  }

  /**
   * Update an actor
   * Wrapper for save method to match tRPC router expectations
   */
  public async update(
    id: string,
    data: TData,
    options?: {
      skipValidation?: boolean;
      updatedById?: string;
      isPartial?: boolean;
    }
  ): AsyncResult<TModel> {
    return this.save(
      id,
      data,
      options?.isPartial ?? true,
      options?.skipValidation ?? false
    );
  }

  /**
   * Submit actor information (mark as complete)
   * Called AFTER the last tab has been successfully saved
   * This method only validates completeness and marks the actor as done
   */
  public async submitActor(
    id: string,
    options?: {
      skipValidation?: boolean;
      submittedBy?: string;
    }
  ): AsyncResult<TModel> {
    return this.executeTransaction(async (tx) => {
      // 1. Get the current actor data
      const delegate = this.getPrismaDelegate(tx);
      const actor = await delegate.findUnique({
        where: { id },
        include: this.getIncludes()
      });

      if (!actor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          `${this.actorType} not found`,
          404
        );
      }

      // 2. Validate completeness (all required fields filled)
      if (!options?.skipValidation) {
        const validationResult = this.validateCompleteness(actor);
        if (!validationResult.ok) {
          throw validationResult.error;
        }
      }

      // 3. Check required documents
      const docsCheckResult = await this.validateRequiredDocuments(id);
      if (!docsCheckResult.ok) {
        throw new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Faltan documentos requeridos',
          400,
          docsCheckResult.error
        );
      }

      // 4. Mark as complete
      const updatedActor = await delegate.update({
        where: { id },
        data: {
          informationComplete: true,
          completedAt: new Date(),
          submittedBy: options?.submittedBy ?? 'self',
        },
        include: this.getIncludes()
      });

      // 5. Check if all actors complete → transition policy status
      await this.checkAndTransitionPolicyStatus(
        actor.policyId,
        options?.submittedBy ?? 'system'
      );

      // 6. Log the submission
      await this.logActivity(
        actor.policyId,
        'ACTOR_SUBMITTED',
        `${this.actorType} información completada`,
        id,
        { submittedBy: options?.submittedBy ?? 'self' }
      );

      this.log('info', `${this.actorType} submitted successfully`, { actorId: id });

      return updatedActor as TModel;
    });
  }

  /**
   * Validate that all required fields are filled
   * Uses the existing data in the database, not new input
   * Must be implemented by concrete services based on actor type
   */
  protected abstract validateCompleteness(actor: TModel): Result<boolean>;

  /**
   * Validate required documents are uploaded
   * Must be implemented by concrete services based on actor type
   */
  protected abstract validateRequiredDocuments(actorId: string): AsyncResult<boolean>;

  /**
   * Abstract save method to be implemented by concrete services
   */
  public abstract save(
    id: string,
    data: TData,
    isPartial?: boolean,
    skipValidation?: boolean
  ): AsyncResult<TModel>;

  /**
   * Get the includes for database queries
   * Can be overridden by concrete services
   */
  protected getIncludes(): Record<string, boolean | object> {
    return {
      addressDetails: true,
      policy: true
    };
  }
}
