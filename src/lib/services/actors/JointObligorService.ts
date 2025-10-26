/**
 * JointObligor-specific service
 * Handles all joint obligor-related business logic and data operations
 */

import { PrismaClient } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import { PersonActorData, CompanyActorData } from '@/lib/types/actor';
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

export class JointObligorService extends BaseActorService {
  constructor(prisma?: PrismaClient) {
    super('jointObligor', prisma);
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
    data: any,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<any> {
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
}
