/**
 * JointObligor-specific service
 * Handles all joint obligor-related business logic and data operations
 */

import {Prisma, PrismaClient} from '@prisma/client';
import {BaseActorService} from './BaseActorService';
import {AsyncResult, Result} from '../types/result';
import {ErrorCode, ServiceError} from '../types/errors';
import {ActorData, CompanyActorData, PersonActorData} from '@/lib/types/actor';
import type {JointObligorWithRelations} from './types';
import {
  jointObligorStrictSchema,
  jointObligorPartialSchema,
  jointObligorAdminSchema,
  validateJointObligorTab,
  getJointObligorTabSchema,
  JointObligorComplete,
  JointObligorPartial,
} from '@/lib/schemas/joint-obligor';
import { prepareJointObligorForDB, prepareJointObligorForPartialUpdate } from '@/lib/utils/joint-obligor/prepareForDB';

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
      personalReferences: true,
      commercialReferences: true,
      policy: true
    };
  }

  /**
   * Validate person joint obligor data using new schemas
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const schema = isPartial ? jointObligorPartialSchema : jointObligorStrictSchema;
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
   * Validate company joint obligor data using new schemas
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const schema = isPartial ? jointObligorPartialSchema : jointObligorStrictSchema;
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
   * Validate data for a specific tab
   */
  validateTabData(
    tab: string,
    data: any,
    jointObligorType: 'INDIVIDUAL' | 'COMPANY',
    guaranteeMethod?: 'income' | 'property',
    isPartial: boolean = false
  ): Result<any> {
    const validation = validateJointObligorTab(tab, data, jointObligorType, guaranteeMethod, isPartial);

    if (!validation.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid data for ${tab} tab`,
          400,
          { errors: validation.errors }
        )
      );
    }

    return Result.ok(data);
  }

  /**
   * Save joint obligor information using new prepareForDB utility
   */
  async saveJointObligorInformation(
    jointObligorId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<JointObligorWithRelations> {
    return this.executeTransaction(async (tx) => {
      // Fetch existing joint obligor to get policyId
      const existingJointObligor = await tx.jointObligor.findUnique({
        where: { id: jointObligorId },
        select: { policyId: true }
      });

      if (!existingJointObligor) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Joint Obligor not found',
          404
        );
      }

      // Validate data if not skipping validation
      if (!skipValidation) {
        const validation = isPartial
          ? this.validateTabData(tabName || 'personal', data, data.jointObligorType || 'INDIVIDUAL', data.guaranteeMethod, true)
          : this.validatePersonData(data, false);

        if (!validation.ok) {
          throw validation.error;
        }
      }

      // Prepare data for database using utility
      const dbData = isPartial
        ? prepareJointObligorForPartialUpdate(data as JointObligorPartial, existingJointObligor)
        : prepareJointObligorForDB(data as JointObligorComplete, existingJointObligor.policyId, existingJointObligor.actorId);

      // Update joint obligor
      const updatedJointObligor = await tx.jointObligor.update({
        where: { id: jointObligorId },
        data: dbData as any,
        include: this.getIncludes()
      });

      this.log('info', 'Joint obligor information saved', {
        jointObligorId,
        isPartial,
        tabName
      });

      return updatedJointObligor as JointObligorWithRelations;
    }, 'saveJointObligorInformation');
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
          personalReferences: true,
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
          personalReferences: true,
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
   * Get all joint obligors by policy ID
   * Note: Currently usually one per policy, but method name aligns with other services
   */
  async getAllByPolicyId(policyId: string): AsyncResult<any[]> {
    return this.executeDbOperation(async () => {
      return await this.prisma.jointObligor.findMany({
        where: {policyId},
        include: this.getIncludes()
      });
    }, 'getAllByPolicyId');
  }

  /**
   * Create a new joint obligor
   */
  async create(data: any): AsyncResult<JointObligorWithRelations> {
    return this.executeTransaction(async (tx) => {
      const jointObligor = await tx.jointObligor.create({
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

      return jointObligor as JointObligorWithRelations;
    });
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
   * Public save method for admin use
   * Wraps the internal saveJointObligorInformation method
   */
  public async save(
    obligorId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<JointObligorWithRelations> {
    return this.saveJointObligorInformation(obligorId, data, isPartial, skipValidation, tabName);
  }

  /**
   * Delete a joint obligor from the database
   * Admin only operation
   */
  public async delete(obligorId: string): AsyncResult<void> {
    return this.deleteActor(obligorId);
  }

  /**
   * Validate joint obligor completeness for submission
   * Implements abstract method from BaseActorService
   */
  protected validateCompleteness(jointObligor: JointObligorWithRelations): Result<boolean> {
    const errors: string[] = [];

    if (jointObligor.jointObligorType === 'INDIVIDUAL') {
      // Person validation
      if (!jointObligor.firstName) errors.push('Nombre requerido');
      if (!jointObligor.paternalLastName) errors.push('Apellido paterno requerido');
      if (!jointObligor.maternalLastName) errors.push('Apellido materno requerido');
      if (!jointObligor.occupation) errors.push('Ocupación requerida');
      if (!jointObligor.employerName) errors.push('Nombre del empleador requerido');
      if (!jointObligor.monthlyIncome) errors.push('Ingreso mensual requerido');
    } else {
      // Company validation
      if (!jointObligor.companyName) errors.push('Razón social requerida');
      if (!jointObligor.companyRfc) errors.push('RFC de empresa requerido');
      if (!jointObligor.legalRepFirstName) errors.push('Nombre del representante requerido');
      if (!jointObligor.legalRepPaternalLastName) errors.push('Apellido paterno del representante requerido');
      if (!jointObligor.legalRepMaternalLastName) errors.push('Apellido materno del representante requerido');
    }

    // Common required fields
    if (!jointObligor.email) errors.push('Email requerido');
    if (!jointObligor.phone) errors.push('Teléfono requerido');
    if (!jointObligor.addressDetails) errors.push('Dirección requerida');

    // Joint obligor specific - must have guarantee method
    if (!jointObligor.guaranteeMethod) errors.push('Método de garantía requerido');

    if (jointObligor.guaranteeMethod === 'property') {
      // Property guarantee validation
      if (!jointObligor.hasPropertyGuarantee) errors.push('Garantía de propiedad requerida');
      if (!jointObligor.guaranteePropertyDeedNumber) errors.push('Número de escritura de garantía requerido');
      if (!jointObligor.guaranteePropertyRegistryFolio) errors.push('Folio de registro de garantía requerido');
      if (!jointObligor.guaranteePropertyValue) errors.push('Valor de propiedad de garantía requerido');
    } else if (jointObligor.guaranteeMethod === 'income') {
      // Income guarantee validation
      if (!jointObligor.monthlyIncome) errors.push('Ingreso mensual requerido para garantía por ingresos');
      const minIncome = 10000; // Example minimum income requirement
      if (jointObligor.monthlyIncome && jointObligor.monthlyIncome < minIncome) {
        errors.push(`Ingreso mínimo de $${minIncome} requerido para garantía por ingresos`);
      }
    }

    // Check references (minimum 3 for joint obligor with addresses)
    const referenceCount = jointObligor.personalReferences?.length ?? 0;
    if (referenceCount < 3) {
      errors.push('Mínimo 3 referencias requeridas con dirección');
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
  protected async validateRequiredDocuments(obligorId: string): AsyncResult<boolean> {
    const obligor = await this.getById(obligorId);
    if (!obligor.ok) return obligor;

    let requiredDocs: any[] = obligor.value.isCompany
      ? ['IDENTIFICACION', 'COMPROBANTE_DOMICILIO', 'COMPROBANTE_INGRESOS', 'ACTA_CONSTITUTIVA']
      : ['IDENTIFICACION', 'COMPROBANTE_DOMICILIO', 'COMPROBANTE_INGRESOS'];

    // Add property documents if using property guarantee
    if (obligor.value.guaranteeMethod === 'property') {
      requiredDocs = requiredDocs.concat(['ESCRITURA_GARANTIA', 'PREDIAL_GARANTIA']);
    }

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        jointObligorId: obligorId,
        category: { in: requiredDocs }
      },
      select: { category: true }
    });

    const uploadedCategories = new Set(uploadedDocs.map(d => d.category));
    const missingDocs = requiredDocs.filter((doc: any) => !uploadedCategories.has(doc));

    if (missingDocs.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Faltan documentos requeridos',
          400,
          { missingDocuments: missingDocs }
        )
      );
    }

    return Result.ok(true);
  }
}
