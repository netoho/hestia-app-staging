/**
 * Landlord-specific service
 * Handles all landlord-related business logic and data operations
 */

import {Prisma, PrismaClient} from '@prisma/client';
import { getRequiredDocuments } from '@/lib/constants/actorDocumentRequirements';
import { DocumentCategory } from '@/lib/enums';
import {BaseActorService} from './BaseActorService';
import {AsyncResult, Result} from '../types/result';
import {ErrorCode, ServiceError} from '../types/errors';
import {
  ActorData,
  CompanyActorData,
  LandlordData,
  LandlordResponse,
  LandlordSubmissionData,
  PersonActorData,
  PropertyDetails as PropertyDetailsType,
} from '@/lib/types/actor';
import {
  validateLandlordData,
  validateMultiLandlordSubmission,
  isLandlordComplete,
  validatePrimaryLandlord,
  type LandlordIndividual,
  type LandlordCompany,
} from '@/lib/schemas/landlord';
import {validateLandlordToken} from '@/lib/services/actorTokenService';
import {logPolicyActivity} from '@/lib/services/policyService';
import {PropertyDetailsService} from '@/lib/services/PropertyDetailsService';
import type {LandlordWithRelations} from './types';

export class LandlordService extends BaseActorService<LandlordWithRelations, LandlordData> {
  constructor(prisma?: PrismaClient) {
    super('landlord', prisma);
  }

  /**
   * Get the Prisma delegate for landlord operations
   */
  protected getPrismaDelegate(tx?: any): Prisma.LandlordDelegate {
    return (tx || this.prisma).landlord;
  }

  /**
   * Get includes for landlord queries
   */
  protected getIncludes(): Record<string, boolean | object> {
    return {
      addressDetails: true,
      policy: true
    };
  }

  /**
   * Build update data object from actor data
   * Overrides base method to include landlord-specific fields
   */
  protected buildUpdateData(data: Partial<ActorData>, addressId?: string): any {
    const updateData = super.buildUpdateData(data, addressId);
    const landlordData = data as any;

    // Property fields
    if (landlordData.propertyDeedNumber !== undefined) updateData.propertyDeedNumber = landlordData.propertyDeedNumber || null;
    if (landlordData.propertyRegistryFolio !== undefined) updateData.propertyRegistryFolio = landlordData.propertyRegistryFolio || null;
    if (landlordData.propertyValue !== undefined) updateData.propertyValue = landlordData.propertyValue || null;

    // Financial fields
    if (landlordData.hasAdditionalIncome !== undefined) updateData.hasAdditionalIncome = landlordData.hasAdditionalIncome;
    if (landlordData.additionalIncomeSource !== undefined) updateData.additionalIncomeSource = landlordData.additionalIncomeSource || null;
    if (landlordData.additionalIncomeAmount !== undefined) updateData.additionalIncomeAmount = landlordData.additionalIncomeAmount || null;

    // Company specific
    if (landlordData.businessType !== undefined) updateData.businessType = landlordData.businessType || null;
    if (landlordData.monthlyIncome !== undefined && data.isCompany) {
      // Base service only handles monthlyIncome for persons
      updateData.monthlyIncome = landlordData.monthlyIncome || null;
    }

    // CFDI
    if (landlordData.requiresCFDI !== undefined) updateData.requiresCFDI = landlordData.requiresCFDI;
    if (landlordData.cfdiData !== undefined) updateData.cfdiData = landlordData.cfdiData;

    return updateData;
  }

  /**
   * Validate person landlord data
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const result = validateLandlordData(data, {
      isCompany: false,
      mode: isPartial ? 'partial' : 'strict',
    });

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid person landlord data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as PersonActorData);
  }

  /**
   * Validate company landlord data
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const result = validateLandlordData(data, {
      isCompany: true,
      mode: isPartial ? 'partial' : 'strict',
    });

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid company landlord data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as CompanyActorData);
  }

  /**
   * Save landlord information
   */
  async saveLandlordInformation(
    landlordId: string,
    data: LandlordData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<LandlordWithRelations> {
    // Fetch existing landlord to get current addressId
    const existingLandlord = await this.prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { addressId: true }
    });

    // Add landlord-specific fields to the update data
    const saveData = {
      ...data,
      addressId: existingLandlord?.addressId || undefined, // Include existing addressId
      propertyDeedNumber: data.propertyDeedNumber,
      propertyRegistryFolio: data.propertyRegistryFolio,
      requiresCFDI: data.requiresCFDI,
      cfdiData: data.cfdiData,
    };

    return this.saveActorData(landlordId, saveData, isPartial, skipValidation, tabName);
  }

  /**
   * Save financial details to Policy
   */
  async saveFinancialDetails(
    policyId: string,
    financialData: {
      hasIVA?: boolean;
      issuesTaxReceipts?: boolean;
      securityDeposit?: number | null;
      maintenanceFee?: number | null;
      maintenanceIncludedInRent?: boolean;
      rentIncreasePercentage?: number | null;
      paymentMethod?: string | null;
    }
  ): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const updatedPolicy = await this.prisma.policy.update({
        where: { id: policyId },
        data: {
          hasIVA: financialData.hasIVA,
          issuesTaxReceipts: financialData.issuesTaxReceipts,
          securityDeposit: financialData.securityDeposit,
          maintenanceFee: financialData.maintenanceFee,
          maintenanceIncludedInRent: financialData.maintenanceIncludedInRent,
          rentIncreasePercentage: financialData.rentIncreasePercentage,
          paymentMethod: financialData.paymentMethod,
        },
      });

      this.log('info', 'Financial details saved to policy', { policyId });
      return updatedPolicy;
    }, 'saveFinancialDetails');
  }

  /**
   * Save property details
   */
  async savePropertyDetails(
    policyId: string,
    details: PropertyDetailsType
  ): AsyncResult<PropertyDetailsType> {
    // Use PropertyDetailsService to handle property details
    const propertyDetailsService = new PropertyDetailsService(this.prisma);

    const result = await propertyDetailsService.upsert(policyId, details);

    if (!result.ok) {
      return Result.error(result.error);
    }

    // Convert back to PropertyDetailsType for compatibility
    const savedDetails: PropertyDetailsType = {
      propertyAddressDetails: result.value.propertyAddressDetails || undefined,
      parkingSpaces: result.value.parkingSpaces || undefined,
      parkingNumbers: result.value.parkingNumbers || undefined,
      isFurnished: result.value.isFurnished,
      hasPhone: result.value.hasPhone,
      hasElectricity: result.value.hasElectricity,
      hasWater: result.value.hasWater,
      hasGas: result.value.hasGas,
      hasCableTV: result.value.hasCableTV,
      hasInternet: result.value.hasInternet,
      otherServices: result.value.otherServices || undefined,
      utilitiesInLandlordName: result.value.utilitiesInLandlordName,
      hasInventory: result.value.hasInventory,
      hasRules: result.value.hasRules,
      petsAllowed: result.value.petsAllowed,
      propertyDeliveryDate: result.value.propertyDeliveryDate?.toISOString() || undefined,
      contractSigningDate: result.value.contractSigningDate?.toISOString() || undefined,
      contractSigningLocation: result.value.contractSigningLocation || undefined,
    };

    return Result.ok(savedDetails);
  }

  /**
   * Validate token and save landlord submission
   */
  async validateAndSave(
    token: string,
    data: LandlordSubmissionData,
    isPartial?: boolean
  ): AsyncResult<LandlordResponse> {
    try {
      // Validate token
      const tokenValidation = await validateLandlordToken(token);
      if (!tokenValidation.valid || !tokenValidation.landlord) {
        return Result.error(
          new ServiceError(
            ErrorCode.INVALID_TOKEN,
            tokenValidation.message || 'Invalid token',
            401
          )
        );
      }

      // Set partial flag
      const partial = isPartial ?? data.partial ?? false;

      // Validate submission data using new schema
      const validationResult = validateMultiLandlordSubmission(data);
      if (!validationResult.success && 'error' in validationResult) {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid submission data',
            400,
            { errors: this.formatZodErrors(validationResult.error) }
          )
        );
      }

      // Validate that landlords array exists
      if (!data.landlords || !Array.isArray(data.landlords) || data.landlords.length === 0) {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'At least one landlord is required',
            400
          )
        );
      }

      // Start transaction
      return await this.executeTransaction(async (tx) => {
        const {landlord} = tokenValidation;

        // Save all landlords in the array
        for (const landlordData of data.landlords) {
          if (landlordData.id) {
            const landlordResult = await this.saveLandlordInformation(
              landlordData.id,
              landlordData as LandlordData,
              partial
            );

            if (!landlordResult.ok) {
              throw landlordResult.error;
            }
          }
        }

        // Save property details if provided
        if (data.propertyDetails) {
          const propertyResult = await this.savePropertyDetails(
            landlord!.policyId,
            data.propertyDetails
          );

          if (!propertyResult.ok) {
            throw propertyResult.error;
          }
        }

        // Save financial details to Policy if provided in propertyDetails
        // Financial fields are sent via propertyDetails but stored in Policy
        if (data.propertyDetails) {
          const financialData = this.extractFinancialData(data.propertyDetails);

          // Only save if at least one financial field is provided
          const hasFinancialData = Object.values(financialData).some(v => v !== undefined);
          if (hasFinancialData) {
            const financialResult = await this.saveFinancialDetails(
              landlord!.policyId,
              financialData
            );

            if (!financialResult.ok) {
              throw financialResult.error;
            }
          }
        }

        // Log activity
        await logPolicyActivity({
          policyId: landlord!.policyId,
          action: partial ? 'landlord_info_partial_save' : 'landlord_info_completed',
          description: partial
            ? 'El arrendador guardó información parcial'
            : 'El arrendador completó su información',
          performedById: landlord!.id,
          performedByType: 'landlord',
          details: {
            landlordId: landlord!.id,
            isCompany: data.landlords[0]?.isCompany,
            landlordCount: data.landlords.length,
            partial,
          },
        });

        return {
          success: true,
          message: partial
            ? 'Información guardada parcialmente'
            : 'Información actualizada correctamente',
          landlord: {
            id: landlord!.id,
            informationComplete: !partial,
          },
        } as LandlordResponse;
      });
    } catch (error) {
      this.log('error', 'Landlord submission error', error);
      return Result.error(
        new ServiceError(
          ErrorCode.INTERNAL_ERROR,
          'Error processing landlord submission',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Get landlord by ID
   */
  async getLandlordById(landlordId: string): AsyncResult<LandlordData> {
    return this.getActorById('landlord', landlordId);
  }

  /**
   * Get landlord by policy ID (returns primary landlord for backward compatibility)
   */
  async getLandlordByPolicyId(policyId: string): AsyncResult<LandlordData> {
    return this.getPrimaryLandlord(policyId);
  }

  /**
   * Get primary landlord for a policy
   */
  async getPrimaryLandlord(policyId: string): AsyncResult<LandlordData> {
    return this.executeDbOperation(async () => {
      const landlordRecord = await this.prisma.landlord.findFirst({
        where: {
          policyId,
          isPrimary: true,
        },
        select: { id: true },
      });

      if (!landlordRecord) {
        return Result.error(
          new ServiceError(
            ErrorCode.NOT_FOUND,
            'Primary landlord not found for policy',
            404
          )
        );
      }

      const landlordResult = await this.getActorById(landlordRecord.id);
      if (!landlordResult.ok) {
        return Result.error(landlordResult.error);
      }

      return landlordResult.value as unknown as LandlordData;
    }, 'getPrimaryLandlord');
  }

  /**
   * Get all landlords for a policy
   */
  async getAllLandlords(policyId: string): AsyncResult<LandlordData[]> {
    return this.executeDbOperation(async () => {
      const landlords = await this.prisma.landlord.findMany({
        where: { policyId },
        include: {
          addressDetails: true,
          documents: true,
        },
        orderBy: [
          { isPrimary: 'desc' }, // Primary first
          { createdAt: 'asc' },
        ],
      });

      return landlords as LandlordData[];
    }, 'getAllLandlords');
  }

  /**
   * Get all landlords by policy ID (alias for getAllLandlords)
   */
  async getAllByPolicyId(policyId: string): AsyncResult<LandlordData[]> {
    return this.getAllLandlords(policyId);
  }

  /**
   * Create a new landlord (alias for createLandlord)
   */
  async create(data: any): AsyncResult<LandlordData> {
    return this.createLandlord(data.policyId, data, data.isPrimary);
  }

  /**
   * Create a new landlord for a policy
   */
  async createLandlord(
    policyId: string,
    data: Partial<LandlordData>,
    isPrimary: boolean = false
  ): AsyncResult<LandlordData> {
    return this.executeTransaction(async (tx) => {
      const landlordData = data as any;

      // Handle address if provided
      let addressId: string | undefined;
      if (landlordData.addressDetails) {
        const addressResult = await this.upsertAddress(landlordData.addressDetails);
        if (addressResult.ok) {
          addressId = addressResult.value;
        }
      }

      // If setting as primary, unmark existing primary
      if (isPrimary) {
        await tx.landlord.updateMany({
          where: { policyId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Create new landlord
      const landlord = await tx.landlord.create({
        data: {
          policyId,
          isPrimary,
          addressId,
          isCompany: landlordData.isCompany || false,
          email: landlordData.email || '',
          phone: landlordData.phone || '',
          address: landlordData.address || '',
          // Individual name fields
          firstName: landlordData.firstName,
          middleName: landlordData.middleName,
          paternalLastName: landlordData.paternalLastName,
          maternalLastName: landlordData.maternalLastName,
          rfc: landlordData.rfc,
          curp: landlordData.curp,
          companyName: landlordData.companyName,
          companyRfc: landlordData.companyRfc,
          // Legal rep name fields
          legalRepFirstName: landlordData.legalRepFirstName,
          legalRepMiddleName: landlordData.legalRepMiddleName,
          legalRepPaternalLastName: landlordData.legalRepPaternalLastName,
          legalRepMaternalLastName: landlordData.legalRepMaternalLastName,
          legalRepPosition: landlordData.legalRepPosition,
          legalRepRfc: landlordData.legalRepRfc,
          legalRepPhone: landlordData.legalRepPhone,
          legalRepEmail: landlordData.legalRepEmail,
          workPhone: landlordData.workPhone,
          personalEmail: landlordData.personalEmail,
          workEmail: landlordData.workEmail,
          occupation: landlordData.occupation,
          employerName: landlordData.employerName,
          monthlyIncome: landlordData.monthlyIncome,
          bankName: landlordData.bankName,
          accountNumber: landlordData.accountNumber,
          clabe: landlordData.clabe,
          accountHolder: landlordData.accountHolder,
          propertyDeedNumber: landlordData.propertyDeedNumber,
          propertyRegistryFolio: landlordData.propertyRegistryFolio,
          requiresCFDI: landlordData.requiresCFDI,
          cfdiData: landlordData.cfdiData,
        },
        include: {
          addressDetails: true,
          documents: true,
        },
      });

      this.log('info', 'Landlord created', { landlordId: landlord.id, policyId, isPrimary });
      return landlord as unknown as LandlordData;
    });
  }

  /**
   * Remove a landlord (only if not primary)
   */
  async removeLandlord(landlordId: string): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      const landlord = await this.prisma.landlord.findUnique({
        where: { id: landlordId },
        select: { isPrimary: true },
      });

      if (!landlord) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Landlord not found',
          404
        );
      }

      if (landlord.isPrimary) {
        throw new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot remove primary landlord',
          400
        );
      }

      await this.prisma.landlord.delete({
        where: { id: landlordId },
      });

      this.log('info', 'Landlord removed', { landlordId });
    }, 'removeLandlord');
  }

  /**
   * Upload landlord document
   */
  async uploadDocument(
    landlordId: string,
    documentType: string,
    fileName: string,
    fileUrl: string
  ): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const document = await this.prisma.actorDocument.create({
        data: {
          landlordId,
          category: documentType as any,
          fileName,
          filePath: fileUrl,
          fileSize: 0, // Default or pass as arg
          mimeType: 'application/octet-stream', // Default or pass as arg
        },
      });

      this.log('info', 'Document uploaded', {
        landlordId,
        documentType,
        fileName,
      });

      return document;
    }, 'uploadDocument');
  }

  /**
   * Get an actor by token
   * Used by tRPC router for actor self-service access
   */
  public async getManyByToken(token: string): AsyncResult<LandlordWithRelations[]> {
    return this.executeDbOperation(async () => {
      const delegate = this.getPrismaDelegate();

      const landlord = await delegate.findFirst({
        where: { accessToken: token },
        select: {
          policyId: true,
          tokenExpiry: true,
        }
      });

      if (!landlord) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Actor no encontrado con el token proporcionado'
        );
      }

      // Check token expiry
      if (landlord.tokenExpiry && landlord.tokenExpiry < new Date()) {
        throw new ServiceError(
          ErrorCode.TOKEN_EXPIRED,
          'Token expirado'
        );
      }

      return delegate.findMany({
        where: { policyId: landlord?.policyId },
        include: this.getIncludes(),
      });
    }, 'getManyByToken');
  }



  /**
   * Check if landlord has required documents
   */
  async hasRequiredDocuments(landlordId: string): Promise<boolean> {
    const result = await this.executeDbOperation(async () => {
      const landlord = await this.prisma.landlord.findUnique({
        where: { id: landlordId },
        include: { documents: true },
      });

      if (!landlord) return false;

      const requiredDocs = landlord.isCompany
        ? ['company_constitution', 'legal_powers', 'rfc_document']
        : ['ine'];

      const uploadedTypes = landlord.documents.map(d => d.documentType);
      return requiredDocs.every(docType => uploadedTypes.includes(docType));
    }, 'hasRequiredDocuments');

    return result.ok ? result.value : false;
  }

  /**
   * Extract financial data from property details
   * Helper to centralize financial field extraction logic
   */
  private extractFinancialData(propertyDetails: any) {
    return {
      hasIVA: propertyDetails.hasIVA,
      issuesTaxReceipts: propertyDetails.issuesTaxReceipts,
      securityDeposit: propertyDetails.securityDeposit,
      maintenanceFee: propertyDetails.maintenanceFee,
      maintenanceIncludedInRent: propertyDetails.maintenanceIncludedInRent,
      rentIncreasePercentage: propertyDetails.rentIncreasePercentage,
      paymentMethod: propertyDetails.paymentMethod,
    };
  }

  /**
   * Save complex multi-landlord data with property/financial details
   * Used by admin save() when full LandlordSubmissionData is provided
   */
  private async saveMultiLandlordData(
    primaryLandlordId: string,
    data: LandlordSubmissionData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<LandlordData> {
    try {
      // Start transaction for data consistency
      return await this.executeTransaction(async (tx) => {
        // Get the primary landlord to find the policyId
        const primaryLandlord = await tx.landlord.findUnique({
          where: {id: primaryLandlordId},
          select: {policyId: true}
        });

        if (!primaryLandlord) {
          throw new ServiceError(
            ErrorCode.NOT_FOUND,
            'Primary landlord not found',
            404
          );
        }

        const policyId = primaryLandlord.policyId;

        // 1. Save all landlords in the array
        if (data.landlords && Array.isArray(data.landlords)) {
          for (const landlordData of data.landlords) {
            if (landlordData.id) {
              // UPDATE existing landlord
              const saveResult = await this.saveLandlordInformation(
                landlordData.id,
                landlordData as LandlordData,
                isPartial,
                skipValidation
              );

              if (!saveResult.ok) {
                throw saveResult.error;
              }
            } else {
              // CREATE new landlord (co-owner)
              const createResult = await this.createLandlord(
                policyId,
                landlordData as Partial<LandlordData>,
                landlordData.isPrimary ?? false
              );

              if (!createResult.ok) {
                throw createResult.error;
              }
            }
          }
        }

        // 2. Save property details if provided
        if (data.propertyDetails) {
          const propertyResult = await this.savePropertyDetails(
            policyId,
            data.propertyDetails
          );

          if (!propertyResult.ok) {
            throw propertyResult.error;
          }
        }

        // 3. Save financial details if provided
        // Financial fields are sent via propertyDetails but stored in Policy
        if (data.propertyDetails) {
          const financialData = this.extractFinancialData(data.propertyDetails);

          // Only save if at least one financial field is provided
          const hasFinancialData = Object.values(financialData).some(v => v !== undefined);
          if (hasFinancialData) {
            const financialResult = await this.saveFinancialDetails(
              policyId,
              financialData
            );

            if (!financialResult.ok) {
              throw financialResult.error;
            }
          }
        }

        // Log activity (admin save)
        await logPolicyActivity({
          policyId,
          action: isPartial ? 'landlord_admin_partial_save' : 'landlord_admin_save',
          description: isPartial
            ? 'Admin saved partial landlord information'
            : 'Admin saved landlord information',
          performedByType: 'admin',
          details: {
            primaryLandlordId,
            landlordCount: data.landlords?.length || 0,
            hasPropertyDetails: !!data.propertyDetails,
            partial: isPartial,
            skipValidation
          },
        });

        // Return the primary landlord data
        const updatedLandlord = await tx.landlord.findUnique({
          where: {id: primaryLandlordId},
          include: {
            addressDetails: true,
            documents: true,
          }
        });

        return updatedLandlord as unknown as LandlordData;
      });
    } catch (error) {
      this.log('error', 'Multi-landlord save error', error);
      return Result.error(
        new ServiceError(
          ErrorCode.INTERNAL_ERROR,
          'Error saving landlord data',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Public save method for admin use
   * Handles both simple and complex data structures
   */
  public async save(
    landlordId: string,
    data: LandlordData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<LandlordWithRelations> {
    // Check if data is the complex LandlordSubmissionData structure
    if ('landlords' in data && Array.isArray((data as LandlordSubmissionData).landlords)) {
      // Complex multi-landlord submission with property/financial details
      const result = await this.saveMultiLandlordData(
        landlordId,
        data as LandlordSubmissionData,
        isPartial,
        skipValidation
      );
      // Return the specific landlord that was updated
      if (result.ok) {
        return Result.ok(result.value as unknown as LandlordWithRelations);
      }
      return Result.error(result.error);
    } else {
      // Simple single landlord update
      return this.saveLandlordInformation(
        landlordId,
        data,
        isPartial,
        skipValidation,
        tabName
      );
    }
  }

  /**
   * Delete a landlord from the database
   * Admin only operation
   */
  public async delete(landlordId: string): AsyncResult<void> {
    return this.deleteActor(landlordId);
  }

  /**
   * Validate landlord completeness for submission
   * Implements abstract method from BaseActorService
   */
  protected validateCompleteness(landlord: LandlordWithRelations): Result<boolean> {
    // Use the new isLandlordComplete function from the schema
    const completenessCheck = isLandlordComplete(landlord, Boolean(landlord.isCompany));

    if (!completenessCheck.valid) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Información incompleta',
          400,
          { missingFields: completenessCheck.errors }
        )
      );
    }

    return Result.ok(true);
  }

  /**
   * Validate required documents are uploaded
   * Implements abstract method from BaseActorService
   */
  protected async validateRequiredDocuments(landlordId: string): AsyncResult<boolean> {
    const landlord = await this.getById(landlordId);
    if (!landlord.ok) return landlord;

    const isCompany = landlord.value.isCompany;

    const requiredDocs = getRequiredDocuments('landlord', isCompany);

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        landlordId,
        category: { in: requiredDocs.map(d => d.category) }
      },
      select: { category: true }
    });

    const uploadedCategories = new Set(uploadedDocs.map(d => d.category));
    const missingDocs = requiredDocs.filter(d => !uploadedCategories.has(d.category as DocumentCategory));

    if (missingDocs.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Faltan documentos requeridos',
          400,
          { missingDocuments: missingDocs.map(d => d.category) }
        )
      );
    }

    return Result.ok(true);
  }

  /**
   * Submit all landlords for a policy
   * Special method for multi-landlord submission
   */
  public async submitAllLandlords(
    policyId: string,
    options?: {
      skipValidation?: boolean;
      submittedBy?: string;
    }
  ): AsyncResult<LandlordWithRelations[]> {
    const landlords = await this.getAllByPolicyId(policyId);
    if (!landlords.ok) return landlords;

    const results: LandlordWithRelations[] = [];

    // Submit each landlord
    for (const landlord of landlords.value) {
      if (!landlord.id) continue;
      const result = await this.submitActor(landlord.id, options);
      if (!result.ok) {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            `Error submitting landlord ${(landlord as any).firstName || (landlord as any).companyName}: ${result.error?.message}`,
            400
          )
        );
      }
      results.push(result.value);
    }

    // Ownership percentage validation removed - not needed per requirements

    return Result.ok(results);
  }
}
