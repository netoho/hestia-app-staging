import prisma from '@/lib/prisma';
import { validationService, ActorType, SectionType } from './validationService';
import { logPolicyActivity } from './policyService';
import { formatFullName } from '@/lib/utils/names';

export interface PolicyReviewData {
  policyId: string;
  policyNumber: string;
  status: string;
  propertyAddress: string;
  actors: ActorReviewInfo[];
  progress: {
    overall: number;
    totalValidations: number;
    completedValidations: number;
    pendingValidations: number;
    rejectedValidations: number;
  };
  notes: any[];
}

export interface ActorReviewInfo {
  actorType: ActorType;
  actorId: string;
  name: string;
  email?: string;
  isCompany: boolean;
  sections: SectionValidationInfo[];
  documents: DocumentValidationInfo[];
  progress: {
    overall: number;
    sectionsApproved: number;
    sectionsTotal: number;
    documentsApproved: number;
    documentsTotal: number;
  };
}

export interface SectionValidationInfo {
  section: SectionType;
  displayName: string;
  status: string;
  validatedBy?: string;
  validatorName?: string; // Added validator name
  validatedAt?: Date;
  rejectionReason?: string;
  fields: any; // The actual data fields for this section
}

export interface DocumentValidationInfo {
  documentId: string;
  fileName: string;
  documentType: string;
  category: string;
  createdAt: Date;
  status: string;
  validatedBy?: string;
  validatorName?: string; // Added validator name
  validatedAt?: Date;
  rejectionReason?: string;
  s3Key?: string;
}

class ReviewService {
  /**
   * Get complete review data for a policy
   */
  async getPolicyReviewData(policyId: string): Promise<PolicyReviewData> {
    // Get policy with all actors and documents
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        landlords: {
          include: {
            documents: true,
            addressDetails: true,
          }
        },
        tenant: {
          include: {
            documents: true,
            addressDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        },
        jointObligors: {
          include: {
            documents: true,
            addressDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        },
        avals: {
          include: {
            documents: true,
            addressDetails: true,
            personalReferences: true,
            commercialReferences: true
          }
        }
      }
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

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
      propertyAddress: policy.propertyAddress,
      actors,
      progress: {
        overall: progress.overallProgress,
        totalValidations: progress.totalSections + progress.totalDocuments,
        completedValidations: progress.approvedSections + progress.approvedDocuments,
        pendingValidations: (progress.totalSections - progress.approvedSections - progress.rejectedSections) +
                          (progress.totalDocuments - progress.approvedDocuments - progress.rejectedDocuments),
        rejectedValidations: progress.rejectedSections + progress.rejectedDocuments
      },
      notes
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
    // Get validation details
    const validationDetails = await validationService.getActorValidationDetails(actorType, actor.id);

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
      const validators = await prisma.user.findMany({
        where: { id: { in: Array.from(validatorIds) } },
        select: { id: true, name: true, email: true }
      });
      validators.forEach(v => {
        validatorMap.set(v.id, v.name || v.email);
      });
    }

    // Build section info with actual data and validator names
    const sections = await this.buildSectionInfo(actorType, actor, validationDetails.sections, validatorMap);

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
      isCompany: actor.isCompany || false,
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
   * Build section info with actual actor data
   */
  private async buildSectionInfo(
    actorType: ActorType,
    actor: any,
    validations: any[],
    validatorMap?: Map<string, string>
  ): Promise<SectionValidationInfo[]> {
    const sections: SectionValidationInfo[] = [];

    // Define sections and their fields based on actor type and isCompany
    const sectionDefinitions = this.getSectionDefinitions(actor.isCompany);

    for (const [sectionKey, sectionDef] of Object.entries(sectionDefinitions)) {
      const validation = validations.find(v => v.section === sectionKey);
      const sectionData = this.extractSectionData(actor, sectionKey as SectionType);

      sections.push({
        section: sectionKey as SectionType,
        displayName: sectionDef.displayName,
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
   * Define sections and their display names
   */
  private getSectionDefinitions(isCompany: boolean): Record<string, any> {
    const baseSections = {
      personal_info: {
        displayName: isCompany ? 'Información de la Empresa' : 'Información Personal'
      },
      address: {
        displayName: 'Dirección'
      },
      financial_info: {
        displayName: 'Información Financiera'
      }
    };

    if (!isCompany) {
      (baseSections as any).work_info = {
        displayName: 'Información Laboral'
      };
    }

    if (isCompany) {
      (baseSections as any).company_info = {
        displayName: 'Representante Legal'
      };
    }

    return baseSections;
  }

  /**
   * Extract section data from actor
   */
  private extractSectionData(actor: any, section: SectionType): any {
    switch (section) {
      case 'personal_info':
        if (actor.isCompany) {
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
            personalEmail: actor.personalEmail
          };
        }

      case 'work_info':
        return {
          occupation: actor.occupation,
          employerName: actor.employerName,
          monthlyIncome: actor.monthlyIncome,
          workEmail: actor.workEmail,
          workPhone: actor.workPhone
        };

      case 'financial_info':
        return {
          bankName: actor.bankName,
          accountNumber: actor.accountNumber,
          clabe: actor.clabe,
          accountHolder: actor.accountHolder
        };

      case 'address':
        // Get the primary address
        const address = actor.addresses?.[0];
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
          legalRepPhone: actor.legalRepPhone,
          legalRepEmail: actor.legalRepEmail
        };

      case 'references':
        return {
          personalReferences: actor.personalReferences?.map((ref: any) => ({
            name: ref.name,
            phone: ref.phone,
            relationship: ref.relationship
          })),
          commercialReferences: actor.commercialReferences?.map((ref: any) => ({
            companyName: ref.companyName,
            contactName: ref.contactName,
            phone: ref.phone
          }))
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
      prisma.actorSectionValidation.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      // Document validation stats
      prisma.documentValidation.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      // Recent validation activity
      prisma.policyActivity.findMany({
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

export const reviewService = new ReviewService();
