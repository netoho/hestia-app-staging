import { validationService } from './validationService';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { BaseService } from './base/BaseService';
import { logPolicyActivity } from './policyService';
import { formatFullName } from '@/lib/utils/names';
import {
  getSectionsForActor,
  getSectionDisplayName,
} from '@/lib/constants/actorSectionConfig';
import type {
  ActorType,
  SectionType,
  PolicyReviewData,
  ActorReviewInfo,
  SectionValidationInfo,
  DocumentValidationInfo,
  SectionFields,
} from './reviewService.types';
import { ServiceError, ErrorCode } from './types/errors';

// Re-export types for backwards compatibility
export type {
  ActorType,
  SectionType,
  PolicyReviewData,
  ActorReviewInfo,
  SectionValidationInfo,
  DocumentValidationInfo,
  SectionFields,
  ReviewNote,
} from './reviewService.types';

class ReviewService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get complete review data for a policy
   */
  async getPolicyReviewData(policyId: string): Promise<PolicyReviewData> {
    // Get policy with all actors and documents
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        landlords: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
            addressDetails: true,
          }
        },
        tenant: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
            addressDetails: true,
            employerAddressDetails: true,
            previousRentalAddressDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        },
        jointObligors: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        },
        avals: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        }
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Get investigation verdict
    const investigation = await this.prisma.investigation.findUnique({
      where: { policyId },
      select: { verdict: true }
    });

    // Get validation progress
    const progress = await validationService.getValidationProgress(policyId);

    // Get review notes
    const notes = await validationService.getReviewNotes(policyId);

    // Build actor review info
    const actors: ActorReviewInfo[] = [];

    // Process landlords
    for (const landlord of policy.landlords || []) {
      actors.push(await this.buildActorReviewInfo('landlord', landlord, policy));
    }

    // Process tenant
    if (policy.tenant) {
      actors.push(await this.buildActorReviewInfo('tenant', policy.tenant, policy));
    }

    // Process joint obligors
    for (const jo of policy.jointObligors || []) {
      actors.push(await this.buildActorReviewInfo('jointObligor', jo, policy));
    }

    // Process avals
    for (const aval of policy.avals || []) {
      actors.push(await this.buildActorReviewInfo('aval', aval, policy));
    }

    return {
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      propertyAddress: policy.propertyDetails?.propertyAddressDetails,
      rentAmount: policy.rentAmount,
      actors,
      progress: {
        overall: progress.overallProgress,
        totalValidations: progress.totalSections + progress.totalDocuments,
        completedValidations: progress.approvedSections + progress.approvedDocuments,
        pendingValidations: (progress.totalSections - progress.approvedSections - progress.rejectedSections) +
                          (progress.totalDocuments - progress.approvedDocuments - progress.rejectedDocuments),
        rejectedValidations: progress.rejectedSections + progress.rejectedDocuments
      },
      notes,
      investigationVerdict: investigation?.verdict || null
    };
  }

  /**
   * Build review info for a single actor
   */
  private async buildActorReviewInfo(
    actorType: ActorType,
    actor: any,
    policy: any
  ): Promise<ActorReviewInfo> {
    // Determine if actor is a company
    const isCompany = this.getActorIsCompany(actorType, actor);

    // Get validation details (pass isCompany to get correct sections)
    const validationDetails = await validationService.getActorValidationDetails(actorType, actor.id, isCompany);

    // Get all unique validator IDs
    const validatorIds = new Set<string>();
    validationDetails.sections.forEach(s => {
      if (s.validatedBy) validatorIds.add(s.validatedBy);
    });
    validationDetails.documents.forEach(d => {
      if (d.validatedBy) validatorIds.add(d.validatedBy);
    });

    // Fetch user names for validators
    const validatorMap = new Map<string, string>();
    if (validatorIds.size > 0) {
      const validators = await this.prisma.user.findMany({
        where: { id: { in: Array.from(validatorIds) } },
        select: { id: true, name: true, email: true }
      });
      validators.forEach(v => {
        validatorMap.set(v.id, v.name || v.email);
      });
    }

    // Build section info with actual data and validator names
    const sections = await this.buildSectionInfo(actorType, actor, validationDetails.sections, validatorMap, isCompany);

    // Build document info with validator names
    const documents = validationDetails.documents.map(doc => ({
      documentId: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType,
      category: doc.category,
      createdAt: doc.createdAt,
      status: doc.validationStatus || 'PENDING',
      validatedBy: doc.validatedBy,
      validatorName: doc.validatedBy ? validatorMap.get(doc.validatedBy) : undefined,
      validatedAt: doc.validatedAt,
      rejectionReason: doc.rejectionReason,
      s3Key: doc.s3Key
    }));

    // Calculate progress
    const sectionsApproved = sections.filter(s => s.status === 'APPROVED').length;
    const documentsApproved = documents.filter(d => d.status === 'APPROVED').length;
    const totalItems = sections.length + documents.length;
    const approvedItems = sectionsApproved + documentsApproved;

    return {
      actorType,
      actorId: actor.id,
      name: actor.companyName ||
        (actor.firstName ? formatFullName(
          actor.firstName,
          actor.paternalLastName || '',
          actor.maternalLastName || '',
          actor.middleName || undefined
        ) : 'Sin nombre'),
      email: actor.email,
      isCompany,
      monthlyIncome: actor.monthlyIncome || undefined,
      sections,
      documents,
      progress: {
        overall: totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0,
        sectionsApproved,
        sectionsTotal: sections.length,
        documentsApproved,
        documentsTotal: documents.length
      }
    };
  }

  /**
   * Determine if an actor is a company based on actor data
   */
  private getActorIsCompany(actorType: ActorType, actor: any): boolean {
    if (actorType === 'landlord') {
      return actor.isCompany === true;
    }
    if (actorType === 'tenant') {
      return actor.tenantType === 'COMPANY';
    }
    if (actorType === 'aval') {
      return actor.avalType === 'COMPANY';
    }
    if (actorType === 'jointObligor') {
      return actor.jointObligorType === 'COMPANY';
    }
    return false;
  }

  /**
   * Build section info with actual actor data
   */
  private async buildSectionInfo(
    actorType: ActorType,
    actor: any,
    validations: any[],
    validatorMap?: Map<string, string>,
    isCompany?: boolean
  ): Promise<SectionValidationInfo[]> {
    const sections: SectionValidationInfo[] = [];

    // Get sections from centralized config
    const actorIsCompany = isCompany ?? this.getActorIsCompany(actorType, actor);
    const sectionTypes = getSectionsForActor(actorType, actorIsCompany);

    for (const sectionType of sectionTypes) {
      const validation = validations.find(v => v.section === sectionType);
      const sectionData = this.extractSectionData(actor, sectionType, actorIsCompany);

      sections.push({
        section: sectionType,
        displayName: getSectionDisplayName(sectionType, actorIsCompany),
        status: validation?.status || 'PENDING',
        validatedBy: validation?.validatedBy,
        validatorName: validation?.validatedBy && validatorMap ? validatorMap.get(validation.validatedBy) : undefined,
        validatedAt: validation?.validatedAt,
        rejectionReason: validation?.rejectionReason,
        fields: sectionData
      });
    }

    return sections;
  }

  /**
   * Extract section data from actor
   */
  private extractSectionData(actor: any, section: SectionType, isCompany?: boolean): SectionFields {
    const actorIsCompany = isCompany ?? (actor.isCompany || actor.tenantType === 'COMPANY' || actor.avalType === 'COMPANY' || actor.jointObligorType === 'COMPANY');

    switch (section) {
      case 'personal_info':
        if (actorIsCompany) {
          return {
            companyName: actor.companyName,
            companyRfc: actor.companyRfc,
            email: actor.email,
            phone: actor.phone,
            workEmail: actor.workEmail,
            workPhone: actor.workPhone
          };
        } else {
          return {
            fullName: actor.firstName ? formatFullName(
              actor.firstName,
              actor.paternalLastName || '',
              actor.maternalLastName || '',
              actor.middleName || undefined
            ) : '',
            rfc: actor.rfc,
            curp: actor.curp,
            nationality: actor.nationality,
            passport: actor.passport,
            email: actor.email,
            phone: actor.phone,
            personalEmail: actor.personalEmail,
            workPhone: actor.workPhone,
            workEmail: actor.workEmail
          };
        }

      case 'work_info':
        return {
          employmentStatus: actor.employmentStatus,
          occupation: actor.occupation,
          employerName: actor.employerName,
          position: actor.position,
          monthlyIncome: actor.monthlyIncome,
          incomeSource: actor.incomeSource,
          yearsAtJob: actor.yearsAtJob,
          hasAdditionalIncome: actor.hasAdditionalIncome,
          additionalIncomeSource: actor.additionalIncomeSource,
          additionalIncomeAmount: actor.additionalIncomeAmount,
          workEmail: actor.workEmail,
          workPhone: actor.workPhone,
          employerAddress: actor.employerAddressDetails
        };

      case 'financial_info':
        return {
          bankName: actor.bankName,
          accountNumber: actor.accountNumber,
          clabe: actor.clabe,
          accountHolder: actor.accountHolder
        };

      case 'address':
        // Use addressDetails (singular relation) not addresses array
        const address = actor.addressDetails;
        return address ? {
          street: address.street,
          exteriorNumber: address.exteriorNumber,
          interiorNumber: address.interiorNumber,
          neighborhood: address.neighborhood,
          municipality: address.municipality,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country
        } : null;

      case 'company_info':
        return {
          legalRepName: actor.legalRepFirstName ? formatFullName(
            actor.legalRepFirstName,
            actor.legalRepPaternalLastName || '',
            actor.legalRepMaternalLastName || '',
            actor.legalRepMiddleName || undefined
          ) : '',
          legalRepPosition: actor.legalRepPosition,
          legalRepRfc: actor.legalRepRfc,
          legalRepCurp: actor.legalRepCurp,
          legalRepPhone: actor.legalRepPhone,
          legalRepEmail: actor.legalRepEmail
        };

      case 'references':
        // Combined view with clear type labels
        return {
          personalReferences: actor.personalReferences?.map((ref: any) => ({
            type: 'Personal',
            name: ref.name,
            phone: ref.phone,
            relationship: ref.relationship
          })) || [],
          commercialReferences: actor.commercialReferences?.map((ref: any) => ({
            type: 'Comercial',
            companyName: ref.companyName,
            contactName: ref.contactName,
            phone: ref.phone
          })) || []
        };

      case 'rental_history':
        return {
          previousLandlordName: actor.previousLandlordName,
          previousLandlordPhone: actor.previousLandlordPhone,
          previousLandlordEmail: actor.previousLandlordEmail,
          previousRentAmount: actor.previousRentAmount,
          rentalHistoryYears: actor.rentalHistoryYears,
          reasonForMoving: actor.reasonForMoving,
          numberOfOccupants: actor.numberOfOccupants,
          hasPets: actor.hasPets,
          petDescription: actor.petDescription,
          previousRentalAddress: actor.previousRentalAddressDetails
        };

      case 'property_guarantee':
        return {
          guaranteeMethod: actor.guaranteeMethod,
          hasPropertyGuarantee: actor.hasPropertyGuarantee,
          propertyValue: actor.propertyValue,
          propertyDeedNumber: actor.propertyDeedNumber,
          propertyRegistryFolio: actor.propertyRegistryFolio,
          propertyOwnershipStatus: actor.propertyOwnershipStatus,
          propertyType: actor.propertyType,
          propertyAddress: actor.guaranteePropertyDetails || actor.propertyAddress
        };

      default:
        return null;
    }
  }

  /**
   * Batch validate multiple sections
   */
  async batchValidateSections(
    policyId: string,
    validations: Array<{
      actorType: ActorType;
      actorId: string;
      section: SectionType;
      status: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
    }>,
    validatedBy: string,
    ipAddress?: string
  ) {
    const results = [];

    for (const validation of validations) {
      const result = await validationService.validateSection({
        policyId,
        ...validation,
        validatedBy,
        ipAddress
      });
      results.push(result);
    }

    // Log batch activity
    await logPolicyActivity({
      policyId,
      action: 'batch_sections_validated',
      description: `${validations.length} sections validated in batch`,
      details: {
        validations: validations.map(v => ({
          actorType: v.actorType,
          section: v.section,
          status: v.status
        }))
      },
      performedById: validatedBy,
      performedByType: 'user',
      ipAddress
    });

    return results;
  }

  /**
   * Batch validate multiple documents
   */
  async batchValidateDocuments(
    policyId: string,
    validations: Array<{
      documentId: string;
      status: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
    }>,
    validatedBy: string,
    ipAddress?: string
  ) {
    const results = [];

    for (const validation of validations) {
      const result = await validationService.validateDocument({
        policyId,
        ...validation,
        validatedBy,
        ipAddress
      });
      results.push(result);
    }

    // Log batch activity
    await logPolicyActivity({
      policyId,
      action: 'batch_documents_validated',
      description: `${validations.length} documents validated in batch`,
      details: {
        documentIds: validations.map(v => v.documentId),
        statuses: validations.map(v => v.status)
      },
      performedById: validatedBy,
      performedByType: 'user',
      ipAddress
    });

    return results;
  }

  /**
   * Check if all validations are complete for a policy
   */
  async checkPolicyValidationComplete(policyId: string): Promise<boolean> {
    const progress = await validationService.getValidationProgress(policyId);
    return progress.isComplete;
  }

  /**
   * Get review statistics for dashboard
   */
  async getReviewStatistics(userId?: string) {
    const where = userId ? { validatedBy: userId } : {};

    const [sectionStats, documentStats, recentActivity] = await Promise.all([
      // Section validation stats
      this.prisma.actorSectionValidation.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      // Document validation stats
      this.prisma.documentValidation.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      // Recent validation activity
      this.prisma.policyActivity.findMany({
        where: {
          action: {
            in: ['section_approved', 'section_rejected', 'document_approved', 'document_rejected']
          },
          ...(userId ? { performedById: userId } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      sections: {
        total: sectionStats.reduce((sum, s) => sum + s._count, 0),
        byStatus: Object.fromEntries(sectionStats.map(s => [s.status, s._count]))
      },
      documents: {
        total: documentStats.reduce((sum, s) => sum + s._count, 0),
        byStatus: Object.fromEntries(documentStats.map(s => [s.status, s._count]))
      },
      recentActivity
    };
  }
}

// Singleton instance
export const reviewService = new ReviewService();

// Bound legacy function exports for backwards compatibility
export const getPolicyReviewData = reviewService.getPolicyReviewData.bind(reviewService);
export const batchValidateSections = reviewService.batchValidateSections.bind(reviewService);
export const batchValidateDocuments = reviewService.batchValidateDocuments.bind(reviewService);
export const checkPolicyValidationComplete = reviewService.checkPolicyValidationComplete.bind(reviewService);
export const getReviewStatistics = reviewService.getReviewStatistics.bind(reviewService);
