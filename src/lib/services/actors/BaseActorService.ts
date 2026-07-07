/**
 * Base service class for actor entities
 * Provides common functionality for all actor types (Landlord, Tenant, Aval, Obligor)
 */

import { PrismaClient } from "@/prisma/generated/prisma-client/client";
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
  AddressWithMetadata,
  cleanAddressData,
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
  abstract validatePersonData(data: Partial<PersonActorData>, isPartial?: boolean): Result<PersonActorData>;

  /**
   * Validate company actor data
   */
  abstract validateCompanyData(data: Partial<CompanyActorData>, isPartial?: boolean): Result<CompanyActorData>;

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
   * Wrap a Zod safeParse result into a Result<T>
   * Eliminates repetitive error handling in validatePersonData/validateCompanyData
   *
   * @param parseResult - The result from zod.safeParse()
   * @param errorMessage - Custom error message for the ServiceError
   * @returns Result<T> with the parsed data or a validation error
   */
  protected wrapZodValidation<T>(
    parseResult: { success: true; data: T } | { success: false; error: ZodError },
    errorMessage: string = 'Validation failed'
  ): Result<T> {
    if (!parseResult.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          errorMessage,
          400,
          { errors: this.formatZodErrors(parseResult.error) }
        )
      );
    }
    return Result.ok(parseResult.data);
  }

  /**
   * Validate actor data based on type
   */
  protected validateActorData(data: Partial<ActorData>, isPartial: boolean = false): Result<ActorData> {
    try {
      if (isPersonActor(data as ActorData)) {
        return this.validatePersonData(data as Partial<PersonActorData>, isPartial);
      } else {
        return this.validateCompanyData(data as Partial<CompanyActorData>, isPartial);
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
   * Create or update address.
   * A payload without a street is "nothing to persist": the portals post {}
   * for untouched optional address widgets, and street is the only required
   * PropertyAddress column — letting such payloads through threw
   * PrismaClientValidationError on every save that carried one (the tenant
   * Historial tab, most visibly). No-op keeps the existing link, and the
   * caller drops the payload key as it does for a real upsert.
   */
  protected async upsertAddress(
    addressData: AddressWithMetadata,
    existingAddressId?: string | null
  ): AsyncResult<string | undefined> {
    return this.executeDbOperation(async () => {
      // Remove id and timestamp fields from addressData to prevent conflicts
      const cleanData = cleanAddressData(addressData);

      if (!cleanData.street) {
        return existingAddressId ?? undefined;
      }

      const address = await this.prisma.propertyAddress.upsert({
        where: { id: existingAddressId || '' },
        create: cleanData,
        update: cleanData,
      });
      return address.id;
    }, 'upsertAddress');
  }

  /**
   * Upsert multiple addresses at once
   * Handles address, employer address, and guarantee property address
   */
  protected async upsertMultipleAddresses(data: {
    addressDetails?: AddressWithMetadata;
    employerAddressDetails?: AddressWithMetadata;
    guaranteePropertyDetails?: AddressWithMetadata;
    previousRentalAddressDetails?: AddressWithMetadata;
  }): AsyncResult<{
    addressId?: string;
    employerAddressId?: string;
    guaranteePropertyAddressId?: string;
    previousRentalAddressId?: string;
  }> {
    return this.executeDbOperation(async () => {
      const updates: {
        addressId?: string;
        employerAddressId?: string;
        guaranteePropertyAddressId?: string;
        previousRentalAddressId?: string;
      } = {};

      // Streetless payloads are skipped for the same reason upsertAddress
      // no-ops on them: nothing to persist, and Prisma rejects the create.
      const upsertOne = async (details: AddressWithMetadata) => {
        const cleanData = cleanAddressData(details);
        if (!cleanData.street) return undefined;
        const address = await this.prisma.propertyAddress.upsert({
          where: { id: details.id || '' },
          create: cleanData,
          update: cleanData,
        });
        return address.id;
      };

      if (data.addressDetails) {
        updates.addressId = await upsertOne(data.addressDetails);
      }
      if (data.employerAddressDetails) {
        updates.employerAddressId = await upsertOne(data.employerAddressDetails);
      }
      if (data.guaranteePropertyDetails) {
        updates.guaranteePropertyAddressId = await upsertOne(data.guaranteePropertyDetails);
      }
      if (data.previousRentalAddressDetails) {
        updates.previousRentalAddressId = await upsertOne(data.previousRentalAddressDetails);
      }

      return updates;
    }, 'upsertMultipleAddresses');
  }

  /**
   * Save personal references for an actor
   * Public method to allow tRPC router to call directly
   */
  public async savePersonalReferences(
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
   * Public method to allow tRPC router to call directly
   */
  public async saveCommercialReferences(
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
  protected buildUpdateData(data: Partial<ActorData>): any {
    const updateData: any = {};

    if (data.isCompany !== undefined) updateData.isCompany = data.isCompany;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;

    // Add optional common fields if provided
    if (data.workPhone !== undefined) updateData.workPhone = data.workPhone || null;
    if (data.address !== undefined) updateData.address = data.address;

    // Bank information
    if (data.bankName !== undefined) updateData.bankName = data.bankName || null;
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber || null;
    if (data.clabe !== undefined) updateData.clabe = data.clabe || null;
    if (data.accountHolder !== undefined) updateData.accountHolder = data.accountHolder || null;

    // Additional info
    if (data.additionalInfo !== undefined) updateData.additionalInfo = data.additionalInfo || null;

    // Add person-specific fields
    if (data.isCompany === false || data.isCompany === undefined) {
      const personData = data as Partial<PersonActorData>;
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
    if (data.isCompany === true || data.isCompany === undefined) {
      const companyData = data as Partial<CompanyActorData>;
      if (companyData.companyName !== undefined) updateData.companyName = companyData.companyName;
      if (companyData.companyRfc !== undefined) updateData.companyRfc = companyData.companyRfc;
      // Legal rep name fields
      if (companyData.legalRepFirstName !== undefined) updateData.legalRepFirstName = companyData.legalRepFirstName;
      if (companyData.legalRepMiddleName !== undefined) updateData.legalRepMiddleName = companyData.legalRepMiddleName || null;
      if (companyData.legalRepPaternalLastName !== undefined) updateData.legalRepPaternalLastName = companyData.legalRepPaternalLastName;
      if (companyData.legalRepMaternalLastName !== undefined) updateData.legalRepMaternalLastName = companyData.legalRepMaternalLastName || null;
      if (companyData.legalRepPosition !== undefined) updateData.legalRepPosition = companyData.legalRepPosition;
      if (companyData.legalRepRfc !== undefined) updateData.legalRepRfc = companyData.legalRepRfc || null;
      if (companyData.legalRepCurp !== undefined) updateData.legalRepCurp = companyData.legalRepCurp || null;
      if (companyData.legalRepPhone !== undefined) updateData.legalRepPhone = companyData.legalRepPhone;
      if (companyData.legalRepEmail !== undefined) updateData.legalRepEmail = companyData.legalRepEmail;
      if (companyData.workEmail !== undefined) updateData.workEmail = companyData.workEmail || null;
      // personalEmail was only handled on the person branch — company actors
      // silently dropped it on every update (#180 walker finding; the
      // hand-enumeration residue flagged on #171/#152).
      if (companyData.personalEmail !== undefined) updateData.personalEmail = companyData.personalEmail || null;
    }

    return updateData;
  }

  /**
   * Save actor data (generic implementation)
   */
  protected async saveActorData(
    actorId: string,
    data: Partial<TData>,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<TModel> {
    // Skip validation if requested (for admin endpoints)
    if (!skipValidation) {
      // Log tab context for debugging
      if (tabName && isPartial) {
        this.log('info', `Saving ${this.actorType} tab "${tabName}" with fields:`, Object.keys(data));
      }

      // Validate data
      const validationResult = this.validateActorData(data as Partial<ActorData>, isPartial);
      if (!validationResult.ok) {
        return Result.error(validationResult.error);
      }
    }

    return this.executeTransaction(async (tx) => {
      // Handle address if provided - cast to record type that includes potential address fields
      type DataWithAddresses = Partial<TData> & {
        addressDetails?: AddressWithMetadata;
        employerAddressDetails?: AddressWithMetadata;
        guaranteePropertyDetails?: AddressWithMetadata;
        previousRentalAddressDetails?: AddressWithMetadata;
      };

      const {
        addressDetails,
        employerAddressDetails,
        guaranteePropertyDetails,
        previousRentalAddressDetails,
        ...restData
      } = data as DataWithAddresses;

      const upsertAddressesResult = await this.upsertMultipleAddresses({
        addressDetails,
        employerAddressDetails,
        guaranteePropertyDetails,
        previousRentalAddressDetails,
      })

      // Build update data
      const updateData = this.buildUpdateData(restData as Partial<ActorData>);

      if (upsertAddressesResult.ok) {
        if (upsertAddressesResult.value.addressId) {
          updateData.addressId = upsertAddressesResult.value.addressId;
        }
        if (upsertAddressesResult.value.employerAddressId) {
          updateData.employerAddressId = upsertAddressesResult.value.employerAddressId;
        }
        if (upsertAddressesResult.value.guaranteePropertyAddressId) {
          updateData.guaranteePropertyAddressId = upsertAddressesResult.value.guaranteePropertyAddressId;
        }
        if (upsertAddressesResult.value.previousRentalAddressId) {
          updateData.previousRentalAddressId = upsertAddressesResult.value.previousRentalAddressId;
        }
      }

      // Mark as complete if not partial
      if (!isPartial) {
        updateData.informationComplete = true;
        updateData.completedAt = new Date();
      }

      // Get the Prisma delegate for this actor type
      const delegate = this.getPrismaDelegate(tx);

      console.log(`Updating ${this.actorType} with ID ${actorId}. Partial: ${isPartial}. Update data:`, updateData);

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

      // Check if all investigated actors have approved investigations
      const { checkAllInvestigationsApproved } = await import('@/lib/services/policyWorkflowService');
      const allApproved = await checkAllInvestigationsApproved(policyId);

      // If all investigations approved, transition to PENDING_APPROVAL
      if (allApproved) {
        const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');

        await transitionPolicyStatus(
          policyId,
          'PENDING_APPROVAL',
          performedBy,
          'All actor investigations approved'
        );

        this.log('info', 'Policy status transitioned to PENDING_APPROVAL', {
          policyId,
          performedBy,
        });

        return Result.ok({
          transitioned: true,
          newStatus: 'PENDING_APPROVAL'
        });
      }

      return Result.ok({
        transitioned: false,
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
          'Actor not found with the provided token'
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
    data: Partial<TData>,
    options?: {
      skipValidation?: boolean;
      updatedById?: string;
      isPartial?: boolean;
      tabName?: string;
    }
  ): AsyncResult<TModel> {
    return this.save(
      id,
      data,
      options?.isPartial ?? true,
      options?.skipValidation ?? false,
      options?.tabName
    );
  }

  /**
   * Submit actor information (mark as complete)
   * Called AFTER the last tab has been successfully saved
   * This method only validates completeness and marks the actor as done
   *
   * When `skipValidation` is `true` (admin "Forzar Completo" path) BOTH the
   * completeness check AND the required-documents check are bypassed. The
   * actor is still marked complete, and the activity log records exactly
   * which fields + documents were missing at force-time so audits can see
   * what was overridden.
   *
   * When `skipValidation` is `false` and validation fails, the thrown
   * ServiceError carries `requiresForce: true` plus `missingFields` /
   * `missingDocuments` arrays in its `context`. The tRPC errorFormatter
   * surfaces those on `shape.data` so the client can offer a force-confirm
   * step without a second round-trip.
   */
  public async submitActor(
    id: string,
    options?: {
      skipValidation?: boolean;
      submittedBy?: string;
      skipPolicyTransition?: boolean;
    }
  ): AsyncResult<TModel> {
    // Execute transaction for actor update
    const result = await this.executeTransaction(async (tx) => {
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

      // 2. Always probe completeness + documents so we can:
      //    (a) refuse the submission with structured details when not forcing
      //    (b) record exactly what was missing in the activity log when forcing
      const completenessResult = this.validateCompleteness(actor);
      const docsCheckResult = await this.validateRequiredDocuments(id);

      const missingFields = !completenessResult.ok
        ? (completenessResult.error?.context as { missingFields?: unknown[] } | undefined)?.missingFields ?? []
        : [];
      const missingDocuments = !docsCheckResult.ok
        ? (docsCheckResult.error?.context as { missingDocuments?: unknown[] } | undefined)?.missingDocuments ?? []
        : [];

      if (!options?.skipValidation) {
        if (!completenessResult.ok) {
          // Re-throw the completeness error, enriched with requiresForce so
          // the router/client can offer the force path.
          const ce = completenessResult.error;
          throw new ServiceError(
            ce?.code ?? ErrorCode.VALIDATION_ERROR,
            ce?.message ?? 'Información incompleta',
            ce?.statusCode ?? 400,
            {
              ...(ce?.context ?? {}),
              requiresForce: true,
              missingFields,
              missingDocuments,
            },
            true,
            ce instanceof ServiceError ? (ce as any).userMessage : undefined,
          );
        }
        if (!docsCheckResult.ok) {
          throw new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Faltan documentos requeridos',
            400,
            {
              requiresForce: true,
              missingFields,
              missingDocuments,
              docsContext: docsCheckResult.error,
            },
          );
        }
      }

      // 3. Mark as complete
      const updatedActor = await delegate.update({
        where: { id },
        data: {
          informationComplete: true,
          completedAt: new Date(),
        },
        include: this.getIncludes()
      });

      // 4. Log the submission. When the submission is being forced past
      //    validation, record `forcedByAdmin: true` plus the specific
      //    missing fields/documents so audits can see what was overridden.
      const wasForced = !!options?.skipValidation && (missingFields.length > 0 || missingDocuments.length > 0);
      await this.logActivity(
        actor.policyId,
        'ACTOR_SUBMITTED',
        `${this.actorType} información completada`,
        id,
        {
          submittedBy: options?.submittedBy ?? 'self',
          ...(wasForced
            ? {
                forcedByAdmin: true,
                forcedByUserId: options?.submittedBy ?? null,
                missingFields,
                missingDocuments,
              }
            : {}),
        },
      );

      this.log('info', `${this.actorType} submitted successfully`, { actorId: id, forced: wasForced });

      return updatedActor as TModel;
    });

    // Return early if transaction failed
    if (!result.ok) {
      return result;
    }

    // 6. Check if all actors complete → transition policy status
    // This runs OUTSIDE the transaction so it can see the committed data
    if (!options?.skipPolicyTransition) {
      await this.checkAndTransitionPolicyStatus(
        result.value.policyId,
        options?.submittedBy ?? 'system'
      );
    }

    return result;
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
    data: Partial<TData>,
    isPartial?: boolean,
    skipValidation?: boolean,
    tabName?: string
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
