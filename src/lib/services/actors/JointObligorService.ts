/**
 * JointObligor-specific service
 * Handles all joint obligor-related business logic and data operations
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import { PersonActorData, CompanyActorData, ActorData } from '@/lib/types/actor';
import type { JointObligorWithRelations } from './types';
import { z } from 'zod';
import { personWithNationalitySchema } from '@/lib/validations/actors/person.schema';
import { companyActorSchema } from '@/lib/validations/actors/company.schema';

// JointObligor-specific validation schemas
const jointObligorPersonSchema = personWithNationalitySchema.extend({
  relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  guaranteeMethod: z.enum(['income', 'property']).optional(),
  hasPropertyGuarantee: z.boolean().optional(),
  hasProperties: z.boolean().optional(),

  // Property guarantee fields
  propertyAddress: z.string().optional().nullable(),
  propertyValue: z.number().optional().nullable(),
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistry: z.string().optional().nullable(),
  propertyTaxAccount: z.string().optional().nullable(),
  propertyUnderLegalProceeding: z.boolean().optional(),

  // Employment fields
  employmentStatus: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employerAddress: z.string().optional().nullable(),
  incomeSource: z.string().optional().nullable(),

  // Marriage information (for property guarantee)
  maritalStatus: z.string().optional().nullable(),
  spouseName: z.string().optional().nullable(),
  spouseRfc: z.string().optional().nullable(),
  spouseCurp: z.string().optional().nullable(),
});

const jointObligorCompanySchema = companyActorSchema.extend({
  relationshipToTenant: z.string().min(1, 'Relationship to tenant is required'),
  guaranteeMethod: z.enum(['income', 'property']).optional(),
  hasPropertyGuarantee: z.boolean().optional(),

  // Property guarantee fields (companies can also own guarantee properties)
  propertyAddress: z.string().optional().nullable(),
  propertyValue: z.number().optional().nullable(),
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistry: z.string().optional().nullable(),
  propertyTaxAccount: z.string().optional().nullable(),
  propertyUnderLegalProceeding: z.boolean().optional(),
});

export class JointObligorService extends BaseActorService<JointObligorWithRelations, ActorData> {
  constructor(prisma?: PrismaClient) {
    super('jointObligor', prisma);
  }

  /**
   * Get the Prisma delegate for joint obligor operations
   */
  protected getPrismaDelegate(tx?: any): Prisma.JointObligorDelegate {
    return (tx || this.prisma).jointObligor;
  }

  /**
   * Get includes for joint obligor queries
   */
  protected getIncludes(): Record<string, boolean | object> {
    return {
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
      references: true,
      commercialReferences: true,
      policy: true
    };
  }

  /**
   * Validate person joint obligor data
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const schema = isPartial ? jointObligorPersonSchema.partial() : jointObligorPersonSchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid person joint obligor data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as PersonActorData);
  }

  /**
   * Validate company joint obligor data
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const schema = isPartial ? jointObligorCompanySchema.partial() : jointObligorCompanySchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid company joint obligor data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as CompanyActorData);
  }

  /**
   * Save joint obligor information
   */
  async saveJointObligorInformation(
    jointObligorId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<JointObligorWithRelations> {
    // Fetch existing joint obligor to get current addressId
    const existingJointObligor = await this.prisma.jointObligor.findUnique({
      where: { id: jointObligorId },
      select: { addressId: true }
    });

    // Add joint-obligor-specific fields to the update data
    const saveData = {
      ...data,
      addressId: existingJointObligor?.addressId || undefined,
      relationshipToTenant: data.relationshipToTenant,
      guaranteeMethod: data.guaranteeMethod,
      hasPropertyGuarantee: data.hasPropertyGuarantee,
      hasProperties: data.hasProperties,

      // Property guarantee fields
      propertyAddress: data.propertyAddress,
      propertyValue: data.propertyValue,
      propertyDeedNumber: data.propertyDeedNumber,
      propertyRegistry: data.propertyRegistry,
      propertyTaxAccount: data.propertyTaxAccount,
      propertyUnderLegalProceeding: data.propertyUnderLegalProceeding,

      // Employment fields
      employmentStatus: data.employmentStatus,
      position: data.position,
      employerAddress: data.employerAddress,
      incomeSource: data.incomeSource,

      // Marriage information
      maritalStatus: data.maritalStatus,
      spouseName: data.spouseName,
      spouseRfc: data.spouseRfc,
      spouseCurp: data.spouseCurp,
    };

    return this.saveActorData('jointObligor', jointObligorId, saveData as any, isPartial, skipValidation);
  }

  /**
   * Save employer address
   * Joint obligors may have an employer with its own address
   */
  async saveEmployerAddress(
    jointObligorId: string,
    addressData: any
  ): AsyncResult<string> {
    return this.executeDbOperation(async () => {
      const { id, createdAt, updatedAt, ...cleanAddress } = addressData;

      // Check if joint obligor already has an employer address
      const existingJointObligor = await this.prisma.jointObligor.findUnique({
        where: { id: jointObligorId },
        select: { employerAddressId: true }
      });

      const address = await this.prisma.propertyAddress.upsert({
        where: { id: existingJointObligor?.employerAddressId || '' },
        create: cleanAddress,
        update: cleanAddress
      });

      // Update joint obligor with new address ID
      await this.prisma.jointObligor.update({
        where: { id: jointObligorId },
        data: { employerAddressId: address.id }
      });

      this.log('info', 'Employer address saved', { jointObligorId, addressId: address.id });
      return address.id;
    }, 'saveEmployerAddress');
  }

  /**
   * Save guarantee property address
   * For joint obligors who provide property-based guarantees
   */
  async saveGuaranteePropertyAddress(
    jointObligorId: string,
    addressData: any
  ): AsyncResult<string> {
    return this.executeDbOperation(async () => {
      const { id, createdAt, updatedAt, ...cleanAddress } = addressData;

      // Check if joint obligor already has a guarantee property address
      const existingJointObligor = await this.prisma.jointObligor.findUnique({
        where: { id: jointObligorId },
        select: { guaranteePropertyAddressId: true }
      });

      const address = await this.prisma.propertyAddress.upsert({
        where: { id: existingJointObligor?.guaranteePropertyAddressId || '' },
        create: cleanAddress,
        update: cleanAddress
      });

      // Update joint obligor with new guarantee property address ID
      await this.prisma.jointObligor.update({
        where: { id: jointObligorId },
        data: { guaranteePropertyAddressId: address.id }
      });

      this.log('info', 'Guarantee property address saved', { jointObligorId, addressId: address.id });
      return address.id;
    }, 'saveGuaranteePropertyAddress');
  }

  /**
   * Save personal references
   * For individual joint obligors
   */
  async savePersonalReferences(jointObligorId: string, references: any[]): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Delete existing
      await this.prisma.personalReference.deleteMany({
        where: { jointObligorId }
      });

      // Create new
      if (references.length > 0) {
        await this.prisma.personalReference.createMany({
          data: references.map(ref => ({
            jointObligorId,
            name: ref.name,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
            address: ref.address || null,
          }))
        });
      }

      this.log('info', 'Personal references saved', {
        jointObligorId,
        count: references.length
      });
    }, 'savePersonalReferences');
  }

  /**
   * Save commercial references
   * For company joint obligors
   */
  async saveCommercialReferences(jointObligorId: string, references: any[]): AsyncResult<void> {
    return this.executeDbOperation(async () => {
      // Delete existing
      await this.prisma.commercialReference.deleteMany({
        where: { jointObligorId }
      });

      // Create new
      if (references.length > 0) {
        await this.prisma.commercialReference.createMany({
          data: references.map(ref => ({
            jointObligorId,
            companyName: ref.companyName,
            contactName: ref.contactName,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            yearsOfRelationship: ref.yearsOfRelationship || null,
          }))
        });
      }

      this.log('info', 'Commercial references saved', {
        jointObligorId,
        count: references.length
      });
    }, 'saveCommercialReferences');
  }

  /**
   * Get joint obligor by ID
   */
  async getJointObligorById(jointObligorId: string): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const jointObligor = await this.prisma.jointObligor.findUnique({
        where: { id: jointObligorId },
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          documents: true,
          references: true,
          commercialReferences: true,
        },
      });

      if (!jointObligor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Joint obligor not found',
          404
        );
      }

      return jointObligor;
    }, 'getJointObligorById');
  }

  /**
   * Get joint obligor by policy ID
   */
  async getJointObligorByPolicyId(policyId: string): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const jointObligor = await this.prisma.jointObligor.findFirst({
        where: { policyId },
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          documents: true,
          references: true,
          commercialReferences: true,
          policy: true,
        },
      });

      if (!jointObligor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Joint obligor not found for policy',
          404
        );
      }

      return jointObligor;
    }, 'getJointObligorByPolicyId');
  }

  /**
   * Upload joint obligor document
   */
  async uploadDocument(
    jointObligorId: string,
    documentType: string,
    fileName: string,
    fileUrl: string,
    category: string = 'IDENTITY'
  ): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const document = await this.prisma.actorDocument.create({
        data: {
          jointObligorId,
          category: category as any,
          documentType,
          fileName,
          originalName: fileName,
          fileSize: 0,
          mimeType: 'application/octet-stream',
          s3Key: fileUrl,
          s3Bucket: 'hestia-documents',
          uploadedBy: 'self',
        },
      });

      this.log('info', 'Document uploaded', {
        jointObligorId,
        documentType,
        fileName,
      });

      return document;
    }, 'uploadDocument');
  }

  /**
   * Check if joint obligor has required documents
   */
  async hasRequiredDocuments(jointObligorId: string): AsyncResult<boolean> {
    return this.executeDbOperation(async () => {
      const jointObligor = await this.prisma.jointObligor.findUnique({
        where: { id: jointObligorId },
        include: { documents: true },
      });

      if (!jointObligor) return false;

      // Required documents based on type and guarantee method
      let requiredDocs: string[] = [];

      if (jointObligor.isCompany) {
        requiredDocs = ['company_constitution', 'legal_powers', 'rfc_document'];
      } else {
        requiredDocs = ['ine'];
      }

      // Additional docs for property guarantee
      if (jointObligor.guaranteeMethod === 'property' || jointObligor.hasPropertyGuarantee) {
        requiredDocs.push('property_deed', 'property_tax_statement');
      }

      // Additional docs for income guarantee
      if (jointObligor.guaranteeMethod === 'income') {
        requiredDocs.push('proof_of_income', 'bank_statement');
      }

      const uploadedTypes = jointObligor.documents.map(d => d.documentType);
      return requiredDocs.every(docType => uploadedTypes.includes(docType));
    }, 'hasRequiredDocuments');
  }

  /**
   * Verify guarantee method is valid
   */
  async verifyGuaranteeMethod(jointObligorId: string): AsyncResult<boolean> {
    const jointObligorResult = await this.getJointObligorById(jointObligorId);
    if (!jointObligorResult.ok) {
      return Result.ok(false);
    }

    const jointObligor = jointObligorResult.value;

    // Check based on guarantee method
    if (jointObligor.guaranteeMethod === 'property') {
      // Verify property information is complete
      const hasPropertyInfo = !!(
        jointObligor.propertyAddress &&
        jointObligor.propertyValue &&
        jointObligor.propertyDeedNumber
      );
      return Result.ok(hasPropertyInfo);
    }

    if (jointObligor.guaranteeMethod === 'income') {
      // Verify income information is complete
      const hasIncomeInfo = !!(
        jointObligor.occupation &&
        jointObligor.employerName &&
        jointObligor.monthlyIncome
      );
      return Result.ok(hasIncomeInfo);
    }

    // No guarantee method specified
    return Result.ok(false);
  }

  /**
   * Check if joint obligor can submit information
   */
  async canSubmit(jointObligorId: string): AsyncResult<boolean> {
    const jointObligorResult = await this.getJointObligorById(jointObligorId);
    if (!jointObligorResult.ok) {
      return Result.ok(false);
    }

    const jointObligor = jointObligorResult.value;

    // Check if basic information is complete
    const hasBasicInfo = this.isInformationComplete(jointObligor as any);

    // Check if guarantee method is valid
    const guaranteeVerification = await this.verifyGuaranteeMethod(jointObligorId);
    const hasValidGuarantee = guaranteeVerification.ok ? guaranteeVerification.value : false;

    // Check if required documents are uploaded
    const docsResult = await this.hasRequiredDocuments(jointObligorId);
    const hasRequiredDocs = docsResult.ok ? docsResult.value : false;

    return Result.ok(hasBasicInfo && hasValidGuarantee && hasRequiredDocs);
  }

  /**
   * Validates and saves joint obligor information with token authentication
   * Handles both partial saves (PUT) and final submissions (POST)
   */
  async validateAndSave(
    token: string,
    data: any,
    isPartialSave: boolean = false
  ): Promise<Result<any>> {
    return this.executeTransaction(async (tx) => {
      // Validate token using actorTokenService
      const { validateJointObligorToken } = await import('@/lib/services/actorTokenService');
      const validation = await validateJointObligorToken(token);

      if (!validation.valid) {
        throw new ServiceError(
          ErrorCode.INVALID_TOKEN,
          validation.message || 'Token inválido',
          400
        );
      }

      const { jointObligor } = validation;

      // Check token expiry
      if (jointObligor.tokenExpiry && jointObligor.tokenExpiry < new Date()) {
        throw new ServiceError(
          ErrorCode.TOKEN_EXPIRED,
          'Token expirado',
          400
        );
      }

      // Check if already complete (only for final submission)
      if (jointObligor.informationComplete && !isPartialSave) {
        throw new ServiceError(
          ErrorCode.ALREADY_COMPLETE,
          'La información ya fue completada',
          400
        );
      }

      // Build update data
      const updateData: any = {
        // Type
        isCompany: data.isCompany,

        // Individual Information
        firstName: data.firstName || null,
        middleName: data.middleName || null,
        paternalLastName: data.paternalLastName || null,
        maternalLastName: data.maternalLastName || null,
        nationality: data.nationality,
        curp: data.curp || null,
        rfc: data.rfc || null,
        passport: data.passport || null,
        relationshipToTenant: data.relationshipToTenant || null, // REQUIRED for Joint Obligor

        // Company Information
        companyName: data.companyName || null,
        companyRfc: data.companyRfc || null,

        // Legal Representative Information
        legalRepFirstName: data.legalRepFirstName || null,
        legalRepMiddleName: data.legalRepMiddleName || null,
        legalRepPaternalLastName: data.legalRepPaternalLastName || null,
        legalRepMaternalLastName: data.legalRepMaternalLastName || null,
        legalRepPosition: data.legalRepPosition || null,
        legalRepRfc: data.legalRepRfc || null,
        legalRepPhone: data.legalRepPhone || null,
        legalRepEmail: data.legalRepEmail || null,

        // Contact Information
        email: data.email,
        phone: data.phone,
        workPhone: data.workPhone || null,
        personalEmail: data.personalEmail || null,
        workEmail: data.workEmail || null,

        // Address (legacy field)
        address: data.address || null,

        // Employment (for individuals)
        employmentStatus: data.employmentStatus || null,
        occupation: data.occupation || null,
        employerName: data.employerName || null,
        employerAddress: data.employerAddress || null,
        position: data.position || null,
        monthlyIncome: data.monthlyIncome || null,
        incomeSource: data.incomeSource || null,

        // Guarantee Method (UNIQUE to Joint Obligor)
        guaranteeMethod: data.guaranteeMethod || null, // 'income' or 'property'
        hasPropertyGuarantee: data.hasPropertyGuarantee ?? false,

        // Property Guarantee Information
        propertyAddress: data.propertyAddress || null,
        propertyValue: data.propertyValue || null,
        propertyDeedNumber: data.propertyDeedNumber || null,
        propertyRegistry: data.propertyRegistry || null,
        propertyTaxAccount: data.propertyTaxAccount || null,
        propertyUnderLegalProceeding: data.propertyUnderLegalProceeding || false,

        // Financial Information (income guarantee)
        bankName: data.bankName || null,
        accountHolder: data.accountHolder || null,
        hasProperties: data.hasProperties ?? false,

        // Marriage Information (for property guarantee)
        maritalStatus: data.maritalStatus || null,
        spouseName: data.spouseName || null,
        spouseRfc: data.spouseRfc || null,
        spouseCurp: data.spouseCurp || null,

        // Additional info
        additionalInfo: data.additionalInfo || null,
      };

      // Handle addresses using helper method
      // Current address
      if (data.addressDetails) {
        const addressResult = await this.upsertAddress(data.addressDetails, jointObligor.addressId);
        if (addressResult.ok) {
          updateData.addressId = addressResult.value;
        }
      }

      // Employer address
      if (data.employerAddressDetails) {
        const addressResult = await this.upsertAddress(data.employerAddressDetails, jointObligor.employerAddressId);
        if (addressResult.ok) {
          updateData.employerAddressId = addressResult.value;
        }
      }

      // Guarantee property address (for property-based guarantee)
      if (data.guaranteePropertyDetails) {
        const addressResult = await this.upsertAddress(data.guaranteePropertyDetails, jointObligor.guaranteePropertyAddressId);
        if (addressResult.ok) {
          updateData.guaranteePropertyAddressId = addressResult.value;
        }
      }

      // If final submission, mark as complete
      if (!isPartialSave) {
        updateData.informationComplete = true;
        updateData.completedAt = new Date();
      }

      // Update joint obligor
      const updatedJointObligor = await tx.jointObligor.update({
        where: { id: jointObligor.id },
        data: updateData
      });

      // Save references
      // Delete existing references first
      await tx.personalReference.deleteMany({
        where: { jointObligorId: jointObligor.id }
      });

      await tx.commercialReference.deleteMany({
        where: { jointObligorId: jointObligor.id }
      });

      // Create new personal references (for individuals)
      if (data.references && data.references.length > 0) {
        await tx.personalReference.createMany({
          data: data.references.map((ref: any) => ({
            jointObligorId: jointObligor.id,
            firstName: ref.firstName,
            paternalLastName: ref.paternalLastName,
            maternalLastName: ref.maternalLastName,
            middleName: ref.middleName,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
            address: ref.address || null,
          }))
        });
      }

      // Create new commercial references (for companies)
      if (data.commercialReferences && data.commercialReferences.length > 0) {
        await tx.commercialReference.createMany({
          data: data.commercialReferences.map((ref: any) => ({
            jointObligorId: jointObligor.id,
            companyName: ref.companyName,
            contactName: ref.contactName,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            yearsOfRelationship: ref.yearsOfRelationship || null,
          }))
        });
      }

      // Log activity if final submission
      if (!isPartialSave) {
        const { formatFullName } = await import('@/lib/utils/names');
        const actorName = data.isCompany
          ? data.companyName
          : formatFullName(
              data.firstName,
              data.paternalLastName,
              data.maternalLastName,
              data.middleName,
            );

        const { logPolicyActivity } = await import('@/lib/services/policyService');
        await logPolicyActivity({
          policyId: jointObligor.policyId,
          action: 'joint_obligor_info_completed',
          description: 'Joint obligor information completed',
          details: {
            jointObligorId: jointObligor.id,
            jointObligorName: actorName,
            guaranteeMethod: data.guaranteeMethod,
            completedAt: new Date()
          },
          performedByType: 'joint_obligor',
          ipAddress: 'unknown', // Will be passed from route
        });

        return {
          jointObligor: updatedJointObligor
        };
      }

      return updatedJointObligor;
    }, 'validateAndSave');
  }

  /**
   * Public save method for admin use
   * Wraps the internal saveJointObligorInformation method
   */
  public async save(
    obligorId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<JointObligorWithRelations> {
    return this.saveJointObligorInformation(obligorId, data, isPartial, skipValidation);
  }

  /**
   * Delete a joint obligor from the database
   * Admin only operation
   */
  public async delete(obligorId: string): AsyncResult<void> {
    return this.deleteActor(obligorId);
  }
}
