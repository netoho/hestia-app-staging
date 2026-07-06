/**
 * JointObligor-specific service
 * Handles all joint obligor-related business logic and data operations
 */

import {Prisma, PrismaClient} from "@/prisma/generated/prisma-client/enums";
import { getRequiredDocuments } from '@/lib/constants/actorDocumentRequirements';
import { DocumentCategory, DocumentUploadStatus } from "@/prisma/generated/prisma-client/enums";
import {BaseActorService} from './BaseActorService';
import {AsyncResult, Result} from '../types/result';
import {ErrorCode, ServiceError} from '../types/errors';
import {ActorData, AddressWithMetadata, CompanyActorData, PersonActorData} from '@/lib/types/actor';
import type {JointObligorWithRelations} from './types';
import {
  jointObligorStrictSchema,
  jointObligorPartialSchema,
  jointObligorAdminSchema,
  validateJointObligorTab,
  getJointObligorTabSchema,
  type JointObligorTypeEnum,
  type GuaranteeMethodEnum,
} from '@/lib/schemas/joint-obligor';
import { jointObligorSelect } from '@/lib/domain/joint-obligor/select';
import { toDb as jointObligorToDb } from '@/lib/domain/joint-obligor/adapters/db';

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
    // Single source of truth for joint-obligor relations — see
    // `@/lib/domain/joint-obligor/select`.
    return jointObligorSelect;
  }

  /**
   * Validate person joint obligor data using new schemas
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const schema = isPartial ? jointObligorPartialSchema : jointObligorStrictSchema;
    const result = schema.safeParse(data);
    return this.wrapZodValidation(result, 'Invalid person joint obligor data') as Result<PersonActorData>;
  }

  /**
   * Validate company joint obligor data using new schemas
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const schema = isPartial ? jointObligorPartialSchema : jointObligorStrictSchema;
    const result = schema.safeParse(data);
    return this.wrapZodValidation(result, 'Invalid company joint obligor data') as Result<CompanyActorData>;
  }

  /**
   * Validate data for a specific tab
   */
  validateTabData(
    tab: string,
    data: any,
    jointObligorType: 'INDIVIDUAL' | 'COMPANY',
    guaranteeMethod?: 'INCOME' | 'PROPERTY',
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
   * Save joint obligor information via the canonical domain db adapter (toDb).
   */
  async saveJointObligorInformation(
    jointObligorId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<JointObligorWithRelations> {
    return this.executeTransaction(async (tx) => {
      // Fetch existing joint obligor to resolve address relations.
      const existingJointObligor = await tx.jointObligor.findUnique({
        where: { id: jointObligorId },
        select: {
          addressId: true,
          employerAddressId: true,
          guaranteePropertyAddressId: true,
          jointObligorType: true,
          guaranteeMethod: true,
        },
      });

      if (!existingJointObligor) {
        throw new ServiceError(ErrorCode.NOT_FOUND, 'Joint Obligor not found', 404);
      }

      const typed = data as {
        jointObligorType?: JointObligorTypeEnum;
        guaranteeMethod?: GuaranteeMethodEnum;
      };
      // Tab payloads only carry the discriminators on the tabs whose schema
      // includes them (zodResolver strips the rest) — the fallback must be
      // the ROW's truth, never a hardcoded INDIVIDUAL, or a COMPANY JO gets
      // validated (and previously rewritten) as INDIVIDUAL on every
      // guarantee/references/documents save.
      const jointObligorType =
        typed.jointObligorType ?? existingJointObligor.jointObligorType ?? 'INDIVIDUAL';
      const guaranteeMethod =
        typed.guaranteeMethod ?? existingJointObligor.guaranteeMethod ?? undefined;

      // Validate (raw input) unless explicitly skipped.
      if (!skipValidation) {
        const validation = isPartial
          ? this.validateTabData(tabName || 'personal', data, jointObligorType, guaranteeMethod, true)
          : this.validatePersonData(data, false);

        if (!validation.ok) {
          throw validation.error;
        }
      }

      // Build the Prisma payload via the canonical domain db adapter.
      const preparedResult = jointObligorToDb(data, {
        jointObligorType,
        guaranteeMethod,
        isPartial,
        tabName,
      });
      if (!preparedResult.ok) {
        throw preparedResult.error;
      }
      const preparedData = preparedResult.value;

      // Upsert the address relations the adapter left as nested objects.
      let addressId: string | undefined;
      let employerAddressId: string | undefined;
      let guaranteePropertyAddressId: string | undefined;

      if (preparedData.addressDetails) {
        const result = await this.upsertAddress(
          preparedData.addressDetails as AddressWithMetadata,
          existingJointObligor.addressId,
        );
        if (!result.ok) throw result.error;
        addressId = result.value;
      }
      if (preparedData.employerAddressDetails) {
        const result = await this.upsertAddress(
          preparedData.employerAddressDetails as AddressWithMetadata,
          existingJointObligor.employerAddressId,
        );
        if (!result.ok) throw result.error;
        employerAddressId = result.value;
      }
      if (preparedData.guaranteePropertyDetails) {
        const result = await this.upsertAddress(
          preparedData.guaranteePropertyDetails as AddressWithMetadata,
          existingJointObligor.guaranteePropertyAddressId,
        );
        if (!result.ok) throw result.error;
        guaranteePropertyAddressId = result.value;
      }

      const updateData = this.buildJointObligorUpdateData(
        preparedData,
        addressId,
        employerAddressId,
        guaranteePropertyAddressId,
      );

      const updatedJointObligor = await tx.jointObligor.update({
        where: { id: jointObligorId },
        data: updateData,
        include: this.getIncludes(),
      });

      this.log('info', 'Joint obligor information saved', { jointObligorId, isPartial, tabName });

      return updatedJointObligor as JointObligorWithRelations;
    }, 'saveJointObligorInformation');
  }

  /**
   * Build the Prisma update payload from the adapter output. Base actor fields
   * (name/company/legalRep/contact/bank/occupation/income) come from
   * `buildUpdateData`; this adds the joint-obligor-specific scalars + the
   * upserted address FKs. References are saved separately by the router.
   */
  private buildJointObligorUpdateData(
    data: Record<string, unknown>,
    addressId?: string,
    employerAddressId?: string,
    guaranteePropertyAddressId?: string,
  ): Record<string, unknown> {
    const updateData = this.buildUpdateData(data as Partial<ActorData>);

    // Identity + relationship.
    if (data.jointObligorType !== undefined) updateData.jointObligorType = data.jointObligorType;
    if (data.relationshipToTenant !== undefined) updateData.relationshipToTenant = data.relationshipToTenant || null;
    if (data.nationality !== undefined) updateData.nationality = data.nationality || null;
    if (data.passport !== undefined) updateData.passport = data.passport || null;
    if (addressId) updateData.addressId = addressId;

    // Employment (income guarantee, individuals).
    if (data.employmentStatus !== undefined) updateData.employmentStatus = data.employmentStatus || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.incomeSource !== undefined) updateData.incomeSource = data.incomeSource || null;
    if (data.hasProperties !== undefined) updateData.hasProperties = data.hasProperties;
    if (employerAddressId) updateData.employerAddressId = employerAddressId;

    // Guarantee method + flag.
    if (data.guaranteeMethod !== undefined) updateData.guaranteeMethod = data.guaranteeMethod || null;
    if (data.hasPropertyGuarantee !== undefined) updateData.hasPropertyGuarantee = data.hasPropertyGuarantee;

    // Property guarantee.
    if (data.propertyValue !== undefined) updateData.propertyValue = data.propertyValue || null;
    if (data.propertyDeedNumber !== undefined) updateData.propertyDeedNumber = data.propertyDeedNumber || null;
    if (data.propertyRegistry !== undefined) updateData.propertyRegistry = data.propertyRegistry || null;
    if (data.propertyTaxAccount !== undefined) updateData.propertyTaxAccount = data.propertyTaxAccount || null;
    if (data.propertyUnderLegalProceeding !== undefined) {
      updateData.propertyUnderLegalProceeding = data.propertyUnderLegalProceeding || false;
    }
    if (guaranteePropertyAddressId) updateData.guaranteePropertyAddressId = guaranteePropertyAddressId;

    // Marriage information (property guarantee).
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus || null;
    if (data.spouseName !== undefined) updateData.spouseName = data.spouseName || null;
    if (data.spouseRfc !== undefined) updateData.spouseRfc = data.spouseRfc || null;
    if (data.spouseCurp !== undefined) updateData.spouseCurp = data.spouseCurp || null;

    return updateData;
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
            firstName: ref.firstName,
            maternalLastName: ref.maternalLastName,
            middleName: ref.middleName,
            paternalLastName: ref.paternalLastName,
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
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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
        include: { documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } } },
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
      if (jointObligor.guaranteeMethod === 'PROPERTY' || jointObligor.hasPropertyGuarantee) {
        requiredDocs.push('property_deed', 'property_tax_statement');
      }

      // Additional docs for income guarantee
      if (jointObligor.guaranteeMethod === 'INCOME') {
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
    if (jointObligor.guaranteeMethod === 'PROPERTY') {
      // Verify property information is complete
      const hasPropertyInfo = !!(
        jointObligor.propertyAddress &&
        jointObligor.propertyValue &&
        jointObligor.propertyDeedNumber
      );
      return Result.ok(hasPropertyInfo);
    }

    if (jointObligor.guaranteeMethod === 'INCOME') {
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
      // maternalLastName is optional in schema
      if (!jointObligor.curp) errors.push('CURP requerido');
      if (!jointObligor.rfc) errors.push('RFC requerido');
      // Employment fields: occupation required only when employmentStatus is set, monthlyIncome only for income guarantee
      if (jointObligor.employmentStatus && !jointObligor.occupation) {
        errors.push('Ocupación requerida');
      }
    } else {
      // Company validation
      if (!jointObligor.companyName) errors.push('Razón social requerida');
      if (!jointObligor.companyRfc) errors.push('RFC de empresa requerido');
      if (!jointObligor.legalRepFirstName) errors.push('Nombre del representante requerido');
      if (!jointObligor.legalRepPaternalLastName) errors.push('Apellido paterno del representante requerido');
      // legalRepMaternalLastName is optional in schema
    }

    // Common required fields
    if (!jointObligor.email) errors.push('Email requerido');
    if (!jointObligor.phone) errors.push('Teléfono requerido');
    if (!jointObligor.addressDetails) errors.push('Dirección requerida');
    if (!jointObligor.relationshipToTenant) errors.push('Relación con el inquilino requerida');

    // Joint obligor specific - must have guarantee method
    if (!jointObligor.guaranteeMethod) errors.push('Método de garantía requerido');

    if (jointObligor.guaranteeMethod === 'PROPERTY') {
      // Property guarantee validation
      if (!jointObligor.hasPropertyGuarantee) errors.push('Garantía de propiedad requerida');
      if (!jointObligor.propertyDeedNumber) errors.push('Número de escritura de garantía requerido');
      if (!jointObligor.propertyRegistry) errors.push('Folio de registro de garantía requerido');
      if (!jointObligor.propertyValue) errors.push('Valor de propiedad de garantía requerido');
    } else if (jointObligor.guaranteeMethod === 'INCOME') {
      // Income guarantee validation
      if (!jointObligor.monthlyIncome) errors.push('Ingreso mensual requerido para garantía por ingresos');
      // TODO: Validate minimum income rule with business before enabling
      // const minIncome = 10000;
      // if (jointObligor.monthlyIncome && jointObligor.monthlyIncome < minIncome) {
      //   errors.push(`Ingreso mínimo de $${minIncome} requerido para garantía por ingresos`);
      // }
    }

    // Check references (minimum 3; companies provide COMMERCIAL references —
    // counting personalReferences unconditionally made company-JO submission
    // structurally impossible, since the company references tab only collects
    // commercial ones).
    const referenceCount =
      jointObligor.jointObligorType === 'COMPANY'
        ? jointObligor.commercialReferences?.length ?? 0
        : jointObligor.personalReferences?.length ?? 0;
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
  protected async validateRequiredDocuments(obligorId: string): AsyncResult<boolean> {
    const obligor = await this.getById(obligorId);
    if (!obligor.ok) return obligor;

    const isCompany = obligor.value.jointObligorType === 'COMPANY';
    const guaranteeMethod = obligor.value.guaranteeMethod as 'INCOME' | 'PROPERTY' | undefined;
    const nationality = obligor.value.nationality;

    const requiredDocs = getRequiredDocuments('jointObligor', isCompany, {
      nationality: nationality as 'MEXICAN' | 'FOREIGN' | undefined,
      guaranteeMethod,
    });

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        jointObligorId: obligorId,
        category: { in: requiredDocs.map(d => d.category) },
        uploadStatus: DocumentUploadStatus.COMPLETE,
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
}
