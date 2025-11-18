/**
 * Landlord-specific service
 * Handles all landlord-related business logic and data operations
 */

import { PrismaClient } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import {
  PersonActorData,
  CompanyActorData,
  LandlordData,
  LandlordSubmissionData,
  LandlordResponse,
  PropertyDetails as PropertyDetailsType,
} from '@/lib/types/actor';
import {
  validateLandlordSubmission,
  individualLandlordSchema,
  companyLandlordSchema,
  partialIndividualLandlordSchema,
  partialCompanyLandlordSchema,
} from '@/lib/validations/landlord/landlord.schema';
import { validatePropertyDetails, PropertyDetails } from '@/lib/validations/landlord/property.schema';
import { validateLandlordToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { PropertyDetailsService } from '@/lib/services/PropertyDetailsService';

export class LandlordService extends BaseActorService {
  constructor(prisma?: PrismaClient) {
    super('landlord', prisma);
  }

  /**
   * Get the table name for database operations
   */
  protected getTableName(): string {
    return 'landlord';
  }

  /**
   * Get includes for landlord queries
   */
  protected getIncludes(): any {
    return {
      addressDetails: true,
      policy: true
    };
  }

  /**
   * Validate person landlord data
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const schema = isPartial ? partialIndividualLandlordSchema : individualLandlordSchema;
    const result = schema.safeParse(data);

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
    const schema = isPartial ? partialCompanyLandlordSchema : companyLandlordSchema;
    const result = schema.safeParse(data);

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
    skipValidation: boolean = false
  ): AsyncResult<LandlordData> {
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

    return this.saveActorData('landlord', landlordId, saveData as any, isPartial, skipValidation);
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

      // Validate submission data
      const validationResult = validateLandlordSubmission(data);
      if (!validationResult.success) {
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
      const result = await this.executeTransaction(async (tx) => {
        const { landlord } = tokenValidation;

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

      return result;
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
      const landlord = await this.prisma.landlord.findFirst({
        where: { policyId, isPrimary: true },
        include: {
          addressDetails: true,
          documents: true,
          policy: {
            include: {
              propertyDetails: {
                include: {
                  propertyAddressDetails: true,
                },
              },
            },
          },
        },
      });

      if (!landlord) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Primary landlord not found for policy',
          404
        );
      }

      return landlord as LandlordData;
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
   * Create a new landlord for a policy
   */
  async createLandlord(
    policyId: string,
    data: Partial<LandlordData>,
    isPrimary: boolean = false
  ): AsyncResult<LandlordData> {
    return this.executeTransaction(async (tx) => {
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
          isCompany: data.isCompany || false,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          // Individual name fields
          firstName: data.firstName,
          middleName: data.middleName,
          paternalLastName: data.paternalLastName,
          maternalLastName: data.maternalLastName,
          rfc: data.rfc,
          curp: data.curp,
          companyName: data.companyName,
          companyRfc: data.companyRfc,
          // Legal rep name fields
          legalRepFirstName: data.legalRepFirstName,
          legalRepMiddleName: data.legalRepMiddleName,
          legalRepPaternalLastName: data.legalRepPaternalLastName,
          legalRepMaternalLastName: data.legalRepMaternalLastName,
          legalRepPosition: data.legalRepPosition,
          legalRepRfc: data.legalRepRfc,
          legalRepPhone: data.legalRepPhone,
          legalRepEmail: data.legalRepEmail,
          workPhone: data.workPhone,
          personalEmail: data.personalEmail,
          workEmail: data.workEmail,
          occupation: data.occupation,
          employerName: data.employerName,
          monthlyIncome: data.monthlyIncome,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          clabe: data.clabe,
          accountHolder: data.accountHolder,
          propertyDeedNumber: data.propertyDeedNumber,
          propertyRegistryFolio: data.propertyRegistryFolio,
          requiresCFDI: data.requiresCFDI,
          cfdiData: data.cfdiData,
        },
        include: {
          addressDetails: true,
          documents: true,
        },
      });

      this.log('info', 'Landlord created', { landlordId: landlord.id, policyId, isPrimary });
      return landlord as LandlordData;
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
      const document = await this.prisma.document.create({
        data: {
          landlordId,
          documentType,
          fileName,
          fileUrl,
          uploadedAt: new Date(),
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
   * Check if landlord can submit information
   */
  async canSubmit(landlordId: string): AsyncResult<boolean> {
    const landlordResult = await this.getLandlordById(landlordId);
    if (!landlordResult.ok) {
      return Result.ok(false);
    }

    const landlord = landlordResult.value;

    // Check if basic information is complete
    const hasBasicInfo = this.isInformationComplete(landlord as any);

    // Check if required documents are uploaded (if applicable)
    const hasRequiredDocs = await this.hasRequiredDocuments(landlordId);

    return Result.ok(hasBasicInfo && hasRequiredDocs);
  }

  /**
   * Check if landlord has required documents
   */
  private async hasRequiredDocuments(landlordId: string): Promise<boolean> {
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
      const result = await this.executeTransaction(async (tx) => {
        // Get the primary landlord to find the policyId
        const primaryLandlord = await tx.landlord.findUnique({
          where: { id: primaryLandlordId },
          select: { policyId: true }
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
              const saveResult = await this.saveLandlordInformation(
                landlordData.id,
                landlordData as LandlordData,
                isPartial,
                skipValidation
              );

              if (!saveResult.ok) {
                throw saveResult.error;
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
          where: { id: primaryLandlordId },
          include: {
            addressDetails: true,
            documents: true,
          }
        });

        return updatedLandlord as LandlordData;
      });

      return result;
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
    data: LandlordData | LandlordSubmissionData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<LandlordData> {
    // Check if data is the complex LandlordSubmissionData structure
    if ('landlords' in data && Array.isArray((data as any).landlords)) {
      // Complex multi-landlord submission with property/financial details
      return this.saveMultiLandlordData(
        landlordId,
        data as LandlordSubmissionData,
        isPartial,
        skipValidation
      );
    } else {
      // Simple single landlord update
      return this.saveLandlordInformation(
        landlordId,
        data as LandlordData,
        isPartial,
        skipValidation
      );
    }
  }

  /**
   * Delete a landlord from the database
   * Admin only operation
   */
  public async delete(landlordId: string): AsyncResult<void> {
    return this.deleteActor('Landlord', landlordId);
  }
}
