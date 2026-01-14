/**
 * Aval-specific service
 * Handles all aval-related business logic and data operations
 */

import {AvalType, DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { Prisma, PrismaClient} from "@/prisma/generated/prisma-client/client";
import { getRequiredDocuments } from '@/lib/constants/actorDocumentRequirements';
import { DocumentCategory as DocumentCategoryEnum } from "@/prisma/generated/prisma-client/enums";
import {BaseActorService} from './BaseActorService';
import {AsyncResult, Result} from '../types/result';
import {ErrorCode, ServiceError} from '../types/errors';
import {ActorData, AddressDetails, CompanyActorData, PersonActorData} from '@/lib/types/actor';
import type {AvalWithRelations} from './types';
import {
  avalStrictSchema,
  avalPartialSchema,
  avalAdminSchema,
  getAvalSchema,
  validateAvalData,
  type AvalFormData
} from '@/lib/schemas/aval';
import { prepareAvalForDB } from '@/lib/utils/aval/prepareForDB';

export class AvalService extends BaseActorService<AvalWithRelations, ActorData> {
  constructor(prisma?: PrismaClient) {
    super('aval', prisma);
  }

  /**
   * Get the Prisma delegate for aval operations
   */
  protected getPrismaDelegate(tx?: any): Prisma.AvalDelegate {
    return (tx || this.prisma).aval;
  }

  /**
   * Get includes for aval queries
   */
  protected getIncludes(): Record<string, boolean | object> {
    return {
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
      personalReferences: true,
      commercialReferences: true,
      policy: true
    };
  }

  /**
   * Validate person aval data
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const dataWithType = { ...data, avalType: 'INDIVIDUAL' as const };
    const mode = isPartial ? 'partial' : 'strict';
    const result = validateAvalData(dataWithType, mode);
    return this.wrapZodValidation(result, 'Invalid person aval data') as Result<PersonActorData>;
  }

  /**
   * Validate company aval data
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const dataWithType = { ...data, avalType: 'COMPANY' as const };
    const mode = isPartial ? 'partial' : 'strict';
    const result = validateAvalData(dataWithType, mode);
    return this.wrapZodValidation(result, 'Invalid company aval data') as Result<CompanyActorData>;
  }

  /**
   * Validate aval data with flexible mode support
   */
  validateAvalDataWithMode(
    data: any,
    mode: 'strict' | 'partial' | 'admin' = 'strict'
  ): Result<AvalFormData> {
    const result = validateAvalData(data, mode);
    return this.wrapZodValidation(result, 'Invalid aval data');
  }

  /**
   * Save aval information
   */
  async saveAvalInformation(
    avalId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<AvalWithRelations> {
    return this.executeTransaction(async (tx) => {
      // Fetch existing aval to determine avalType
      const existingAval = await tx.aval.findUnique({
        where: { id: avalId },
        select: {
          avalType: true,
          addressId: true,
          employerAddressId: true,
          guaranteePropertyAddressId: true
        }
      });

      if (!existingAval) {
        throw new ServiceError(ErrorCode.NOT_FOUND, 'Aval not found', 404, { avalId: id });
      }

      // Prepare data for database using the new utility
      const preparedData = prepareAvalForDB(data, {
        avalType: existingAval.avalType,
        isPartial,
        tabName
      });

      // Validate unless explicitly skipped
      if (!skipValidation) {
        const validationResult = this.validateAvalDataWithMode(
          preparedData,
          isPartial ? 'partial' : 'strict'
        );
        if (!validationResult.ok) {
          throw validationResult.error;
        }
      }

      // Handle addresses
      let addressId: string | undefined;
      let employerAddressId: string | undefined;
      let guaranteePropertyAddressId: string | undefined;

      // Upsert current address
      if (preparedData.addressDetails) {
        const addressResult = await this.upsertAddress(
          preparedData.addressDetails,
          existingAval?.addressId
        );
        if (!addressResult.ok) {
          throw new ServiceError(ErrorCode.DATABASE_ERROR, 'Failed to save current address', 500, { error: addressResult.error });
        }
        addressId = addressResult.value;
      }

      // Upsert employer address (if individual)
      if (preparedData.employerAddressDetails) {
        const employerAddressResult = await this.upsertAddress(
          preparedData.employerAddressDetails,
          existingAval?.employerAddressId
        );
        if (!employerAddressResult.ok) {
          throw new ServiceError(ErrorCode.DATABASE_ERROR, 'Failed to save employer address', 500, { error: employerAddressResult.error });
        }
        employerAddressId = employerAddressResult.value;
      }

      // Upsert guarantee property address (MANDATORY for Aval)
      if (preparedData.guaranteePropertyDetails) {
        const propertyAddressResult = await this.upsertAddress(
          preparedData.guaranteePropertyDetails,
          existingAval?.guaranteePropertyAddressId
        );
        if (!propertyAddressResult.ok) {
          throw new ServiceError(ErrorCode.DATABASE_ERROR, 'Failed to save guarantee property address', 500, { error: propertyAddressResult.error });
        }
        guaranteePropertyAddressId = propertyAddressResult.value;
      }

      // Build update data
      const updateData = this.buildAvalUpdateData(
        preparedData,
        addressId,
        employerAddressId,
        guaranteePropertyAddressId
      );

      // Update aval
      const updatedAval = await tx.aval.update({
        where: { id: avalId },
        data: updateData,
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          personalReferences: true,
          commercialReferences: true,
        }
      });

      this.log('info', 'Aval data saved', {
        avalId,
        isPartial,
        tabName,
        avalType: existingAval.avalType
      });

      return updatedAval;
    });
  }

  /**
   * Build update data object from aval data
   */
  private buildAvalUpdateData(
    data: any,
    addressId?: string,
    employerAddressId?: string,
    guaranteePropertyAddressId?: string
  ): any {
    // Start with base actor update data
    const updateData = this.buildUpdateData(data);

    // Handle avalType (should be set by prepareAvalForDB)
    if (data.avalType !== undefined) {
      updateData.avalType = data.avalType;
    }

    // Add aval-specific fields
    if (data.relationshipToTenant !== undefined) {
      updateData.relationshipToTenant = data.relationshipToTenant || null;
    }
    if (addressId) updateData.addressId = addressId;

    // Employment fields (for individuals)
    if (data.employmentStatus !== undefined) updateData.employmentStatus = data.employmentStatus || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.employerAddress !== undefined) updateData.employerAddress = data.employerAddress || null;
    if (data.incomeSource !== undefined) updateData.incomeSource = data.incomeSource || null;
    if (employerAddressId) updateData.employerAddressId = employerAddressId;

    // Property guarantee fields (MANDATORY for Aval)
    if (data.hasPropertyGuarantee !== undefined) updateData.hasPropertyGuarantee = data.hasPropertyGuarantee;
    if (data.guaranteeMethod !== undefined) updateData.guaranteeMethod = data.guaranteeMethod || null;
    if (data.propertyAddress !== undefined) updateData.propertyAddress = data.propertyAddress || null;
    if (data.propertyValue !== undefined) updateData.propertyValue = data.propertyValue || null;
    if (data.propertyDeedNumber !== undefined) updateData.propertyDeedNumber = data.propertyDeedNumber || null;
    if (data.propertyRegistry !== undefined) updateData.propertyRegistry = data.propertyRegistry || null;
    if (data.propertyTaxAccount !== undefined) updateData.propertyTaxAccount = data.propertyTaxAccount || null;
    if (data.propertyUnderLegalProceeding !== undefined) {
      updateData.propertyUnderLegalProceeding = data.propertyUnderLegalProceeding || false;
    }
    if (guaranteePropertyAddressId) updateData.guaranteePropertyAddressId = guaranteePropertyAddressId;

    // Marriage information (for property guarantee)
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus || null;
    if (data.spouseName !== undefined) updateData.spouseName = data.spouseName || null;
    if (data.spouseRfc !== undefined) updateData.spouseRfc = data.spouseRfc || null;
    if (data.spouseCurp !== undefined) updateData.spouseCurp = data.spouseCurp || null;

    // Nationality field
    if (data.nationality !== undefined) updateData.nationality = data.nationality || null;
    if (data.passport !== undefined) updateData.passport = data.passport || null;

    return updateData;
  }

  /**
   * Save guarantee property address
   * Avals may have a property guarantee with its own address
   */
  async saveGuaranteePropertyAddress(
    avalId: string,
    addressData: AddressDetails
  ): AsyncResult<string> {
    return this.executeDbOperation(async () => {
      // Check if aval already has a guarantee property address
      const existingAval = await this.prisma.aval.findUnique({
        where: { id: avalId },
        select: { guaranteePropertyAddressId: true }
      });

      const { id, createdAt, updatedAt, ...cleanAddress } = addressData as any;

      const address = await this.prisma.propertyAddress.upsert({
        where: { id: existingAval?.guaranteePropertyAddressId || '' },
        create: cleanAddress,
        update: cleanAddress
      });

      // Update aval with new address ID
      await this.prisma.aval.update({
        where: { id: avalId },
        data: { guaranteePropertyAddressId: address.id }
      });

      this.log('info', 'Guarantee property address saved', { avalId, addressId: address.id });

      return address.id;
    }, 'saveGuaranteePropertyAddress');
  }

  /**
   * Save personal references
   */
  async savePersonalReferences(avalId: string, references: any[]): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Delete existing
      await this.prisma.personalReference.deleteMany({
        where: { avalId }
      });

      // Create new
      if (references.length > 0) {
        await this.prisma.personalReference.createMany({
          data: references.map(ref => ({
            avalId,
            firstName: ref.firstName,
            middleName: ref.middleName || null,
            paternalLastName: ref.paternalLastName,
            maternalLastName: ref.maternalLastName || null,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
            address: ref.address || null,
          }))
        });
      }

      this.log('info', 'Personal references saved', { avalId, count: references.length });
    }, 'savePersonalReferences');
  }

  /**
   * Save commercial references
   */
  async saveCommercialReferences(avalId: string, references: any[]): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Delete existing
      await this.prisma.commercialReference.deleteMany({
        where: { avalId }
      });

      // Create new
      if (references.length > 0) {
        await this.prisma.commercialReference.createMany({
          data: references.map(ref => ({
            avalId,
            companyName: ref.companyName,
            contactFirstName: ref.contactFirstName,
            contactMiddleName: ref.contactMiddleName || null,
            contactPaternalLastName: ref.contactPaternalLastName,
            contactMaternalLastName: ref.contactMaternalLastName || null,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            yearsOfRelationship: ref.yearsOfRelationship || null,
          }))
        });
      }

      this.log('info', 'Commercial references saved', { avalId, count: references.length });
    }, 'saveCommercialReferences');
  }

  /**
   * Get aval by ID
   */
  async getAvalById(avalId: string): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const aval = await this.prisma.aval.findUnique({
        where: { id: avalId },
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          personalReferences: true,
          commercialReferences: true,
          documents: true,
          policy: {
            select: {
              id: true,
              policyNumber: true,
              status: true
            }
          }
        },
      });

      if (!aval) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Aval not found',
          404
        );
      }

      return aval;
    }, 'getAvalById');
  }

  /**
   * Get aval by policy ID
   */
  async getAvalsByPolicyId(policyId: string): AsyncResult<any[]> {
    return this.executeDbOperation(async () => {
      return await this.prisma.aval.findMany({
        where: {policyId},
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          personalReferences: true,
          commercialReferences: true,
          documents: true,
        },
        orderBy: {createdAt: 'asc'}
      });
    }, 'getAvalsByPolicyId');
  }

  /**
   * Get all avals by policy ID (alias for getAvalsByPolicyId)
   */
  async getAllByPolicyId(policyId: string): AsyncResult<any[]> {
    return this.getAvalsByPolicyId(policyId);
  }

  /**
   * Create a new aval
   */
  async create(data: any): AsyncResult<AvalWithRelations> {
    return this.executeTransaction(async (tx) => {
      const aval = await tx.aval.create({
        data: {
          policyId: data.policyId,
          isCompany: data.isCompany,
          firstName: data.firstName,
          middleName: data.middleName,
          paternalLastName: data.paternalLastName,
          maternalLastName: data.maternalLastName,
          companyName: data.companyName,
          email: data.email,
          phone: data.phone || data.phoneNumber,
          relationshipToTenant: data.relationshipToTenant,
        },
        include: this.getIncludes()
      });

      return aval as AvalWithRelations;
    });
  }

  /**
   * Get aval references
   */
  async getAvalReferences(avalId: string): AsyncResult<{ personal: any[], commercial: any[] }> {
    return this.executeDbOperation(async () => {
      const [personal, commercial] = await Promise.all([
        this.prisma.personalReference.findMany({
          where: { avalId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.commercialReference.findMany({
          where: { avalId },
          orderBy: { createdAt: 'desc' },
        })
      ]);

      return { personal, commercial };
    }, 'getAvalReferences');
  }

  /**
   * Upload aval document
   */
  async uploadDocument(
    avalId: string,
    documentType: string,
    fileName: string,
    fileUrl: string
  ): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const document = await this.prisma.actorDocument.create({
        data: {
          avalId,
          category: this.mapDocumentTypeToCategory(documentType),
          documentType,
          fileName,
          originalName: fileName,
          fileSize: 0, // To be updated by actual file upload
          mimeType: 'application/octet-stream', // To be updated
          s3Key: fileUrl,
          s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
          uploadedBy: 'self',
        },
      });

      this.log('info', 'Document uploaded', {
        avalId,
        documentType,
        fileName,
      });

      return document;
    }, 'uploadDocument');
  }

  /**
   * Map document type to category enum
   */
  private mapDocumentTypeToCategory(documentType: string): DocumentCategory {
    const mapping: Record<string, DocumentCategory> = {
      'identification': DocumentCategory.IDENTIFICATION,
      'ine': DocumentCategory.IDENTIFICATION,
      'passport': DocumentCategory.PASSPORT,
      'proof_of_income': DocumentCategory.INCOME_PROOF,
      'proof_of_address': DocumentCategory.ADDRESS_PROOF,
      'bank_statement': DocumentCategory.BANK_STATEMENT,
      'property_deed': DocumentCategory.PROPERTY_DEED,
      'property_tax': DocumentCategory.PROPERTY_TAX_STATEMENT,
      'marriage_certificate': DocumentCategory.MARRIAGE_CERTIFICATE,
      'tax_return': DocumentCategory.TAX_RETURN,
      'company_constitution': DocumentCategory.COMPANY_CONSTITUTION,
      'legal_powers': DocumentCategory.LEGAL_POWERS,
      'income_proof': DocumentCategory.INCOME_PROOF,
      'address_proof': DocumentCategory.ADDRESS_PROOF,
      'employment_letter': DocumentCategory.EMPLOYMENT_LETTER,
      'property_tax_statement': DocumentCategory.PROPERTY_TAX_STATEMENT,
      'tax_status_certificate': DocumentCategory.TAX_STATUS_CERTIFICATE,
      'credit_report': DocumentCategory.CREDIT_REPORT,
      'property_registry': DocumentCategory.PROPERTY_REGISTRY,
      'property_appraisal': DocumentCategory.PROPERTY_APPRAISAL,
      'immigration_document': DocumentCategory.IMMIGRATION_DOCUMENT,
      'utility_bill': DocumentCategory.UTILITY_BILL,
      'payroll_receipt': DocumentCategory.PAYROLL_RECEIPT,
      'other': DocumentCategory.OTHER,
    };




    return mapping[documentType.toLocaleLowerCase()] || DocumentCategory.OTHER;
  }

  /**
   * Check if aval has required documents
   */
  async hasRequiredDocuments(avalId: string): Promise<boolean> {
    const result = await this.executeDbOperation(async () => {
      const aval = await this.prisma.aval.findUnique({
        where: { id: avalId },
        include: { documents: true },
      });

      if (!aval) return false;

      const requiredDocs = aval.isCompany
        ? ['company_constitution', 'legal_powers', 'property_deed', 'property_tax']
        : ['ine', 'property_deed', 'property_tax'];

      const uploadedTypes = aval.documents.map(d => d.documentType);
      return requiredDocs.every(docType => uploadedTypes.includes(docType));
    }, 'hasRequiredDocuments');

    return result.ok ? result.value : false;
  }

  /**
   * Public save method for admin use
   * Wraps the internal saveAvalInformation method
   */
  public async save(
    avalId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<AvalWithRelations> {
    return this.saveAvalInformation(avalId, data, isPartial, skipValidation, tabName);
  }

  /**
   * Delete an aval from the database
   * Admin only operation
   */
  public async delete(avalId: string): AsyncResult<void> {
    return this.deleteActor(avalId);
  }

  /**
   * Validate aval completeness for submission
   * Implements abstract method from BaseActorService
   */
  protected validateCompleteness(aval: AvalWithRelations): Result<boolean> {
    const errors: string[] = [];

    if (!aval.isCompany) {
      // Person validation
      if (!aval.firstName) errors.push('Nombre requerido');
      if (!aval.paternalLastName) errors.push('Apellido paterno requerido');
      // maternalLastName is optional in schema
    } else {
      // Company validation
      if (!aval.companyName) errors.push('Razón social requerida');
      if (!aval.companyRfc) errors.push('RFC de empresa requerido');
      if (!aval.legalRepFirstName) errors.push('Nombre del representante requerido');
      if (!aval.legalRepPaternalLastName) errors.push('Apellido paterno del representante requerido');
      // legalRepMaternalLastName is optional in schema
    }

    // Common required fields
    if (!aval.email) errors.push('Email requerido');
    if (!aval.phone) errors.push('Teléfono requerido');
    if (!aval.addressDetails) errors.push('Dirección requerida');
    if (!aval.relationshipToTenant) errors.push('Relación con el inquilino requerida');

    // Aval specific - must have property guarantee
    if (!aval.hasPropertyGuarantee) errors.push('Garantía de propiedad requerida');
    if (!aval.propertyDeedNumber) errors.push('Número de escritura de garantía requerido');
    if (!aval.propertyRegistry) errors.push('Folio de registro de garantía requerido');
    if (!aval.propertyValue) errors.push('Valor de propiedad de garantía requerido');

    // Check references (minimum 3 for aval)
    const referenceCount = aval.personalReferences?.length ?? 0;
    if (referenceCount < 3) {
      errors.push('Mínimo 3 referencias requeridas');
    }

    if (errors.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Información incompleta',
          400,
          { missingFields: errors }
        )
      );
    }

    return Result.ok(true);
  }

  /**
   * Validate required documents are uploaded
   * Implements abstract method from BaseActorService
   */
  protected async validateRequiredDocuments(avalId: string): AsyncResult<boolean> {
    const aval = await this.getById(avalId);
    if (!aval.ok) return aval;

    const isCompany = aval.value.isCompany;
    const nationality = aval.value.nationality;

    const requiredDocs = getRequiredDocuments('aval', isCompany, {
      nationality: nationality as 'MEXICAN' | 'FOREIGN' | undefined,
    });

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        avalId,
        category: { in: requiredDocs.map(d => d.category) }
      },
      select: { category: true }
    });

    const uploadedCategories = new Set(uploadedDocs.map(d => d.category));
    const missingDocs = requiredDocs.filter(d => !uploadedCategories.has(d.category as DocumentCategoryEnum));

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
}
