import prisma from '@/lib/prisma';
import { Prisma } from '@/prisma/generated/prisma-client';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { logPolicyActivity } from '@/lib/services/policyService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';
import { formatFullName } from '@/lib/utils/names';
import {
  getSectionsForActor,
  type SectionType as ConfigSectionType,
  type ActorType as ConfigActorType,
} from '@/lib/constants/actorSectionConfig';
import { ServiceError, ErrorCode } from './types/errors';
import { getActorDelegate, type ActorTableName } from '@/lib/utils/prismaActorDelegate';

export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';

// Re-export types from config for backward compatibility
export type ActorType = ConfigActorType;
export type SectionType = ConfigSectionType;

export interface ValidateSectionParams {
  policyId: string;
  actorType: ActorType;
  actorId: string;
  section: SectionType;
  status: ValidationStatus;
  rejectionReason?: string;
  validatedBy: string;
  ipAddress?: string;
}

export interface ValidateDocumentParams {
  policyId: string;
  documentId: string;
  status: ValidationStatus;
  rejectionReason?: string;
  validatedBy: string;
  actorType?: ActorType;
  actorId?: string;
  ipAddress?: string;
}

export interface AddReviewNoteParams {
  policyId: string;
  note: string;
  createdBy: string;
  actorType?: string;
  actorId?: string;
  documentId?: string;
}

class ValidationService {
  /**
   * Validate a section of actor information
   */
  async validateSection(params: ValidateSectionParams) {
    const {
      policyId,
      actorType,
      actorId,
      section,
      status,
      rejectionReason,
      validatedBy,
      ipAddress
    } = params;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for existing validation to log status changes
      const existing = await tx.actorSectionValidation.findUnique({
        where: {
          actorType_actorId_section: {
            actorType,
            actorId,
            section
          }
        }
      });

      // Log validation change if status is changing
      if (existing && existing.status !== status) {
        await logPolicyActivity({
          policyId,
          action: 'validation_changed',
          description: `${section} changed from ${existing.status} to ${status} for ${actorType}`,
          details: {
            section,
            previousStatus: existing.status,
            newStatus: status,
            previousReason: existing.rejectionReason,
            newReason: rejectionReason,
            actorType,
            actorId,
          },
          performedById: validatedBy,
          performedByType: 'user',
          ipAddress
        });
      }

      // Upsert the section validation record
      const validation = await tx.actorSectionValidation.upsert({
        where: {
          actorType_actorId_section: {
            actorType,
            actorId,
            section
          }
        },
        update: {
          status,
          validatedBy,
          validatedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          updatedAt: new Date()
        },
        create: {
          actorType,
          actorId,
          section,
          status,
          validatedBy,
          validatedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null
        }
      });

      // Log the activity
      await logPolicyActivity({
        policyId,
        action: `section_${status.toLowerCase()}`,
        description: `${section} ${status.toLowerCase()} for ${actorType}`,
        details: {
          section,
          status,
          actorType,
          actorId,
          rejectionReason
        },
        performedById: validatedBy,
        performedByType: 'user',
        ipAddress
      });

      return validation;
    });

    // Check if we should update the actor's overall status
    await this.checkActorValidationComplete(policyId, actorType, actorId);

    return result;
  }

  /**
   * Validate an individual document
   */
  async validateDocument(params: ValidateDocumentParams) {
    const {
      policyId,
      documentId,
      status,
      rejectionReason,
      validatedBy,
      actorType,
      actorId,
      ipAddress
    } = params;

    // Get document info first
    const document = await prisma.actorDocument.findUnique({
      where: { id: documentId },
      select: {
        fileName: true,
        documentType: true,
        category: true,
        landlordId: true,
        tenantId: true,
        jointObligorId: true,
        avalId: true
      }
    });

    if (!document) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Document not found', 404, { documentId });
    }

    // Determine actor type and ID from document if not provided
    const finalActorType = actorType || this.getActorTypeFromDocument(document);
    const finalActorId = actorId || this.getActorIdFromDocument(document);

    const result = await prisma.$transaction(async (tx) => {
      // Check for existing validation to log status changes
      const existingValidation = await tx.documentValidation.findUnique({
        where: { documentId }
      });

      // Log validation change if status is changing
      if (existingValidation && existingValidation.status !== status) {
        await logPolicyActivity({
          policyId,
          action: 'document_validation_changed',
          description: `Document ${document.fileName} changed from ${existingValidation.status} to ${status}`,
          details: {
            documentId,
            documentName: document.fileName,
            previousStatus: existingValidation.status,
            newStatus: status,
            previousReason: existingValidation.rejectionReason,
            newReason: rejectionReason,
            actorType: finalActorType,
            actorId: finalActorId,
          },
          performedById: validatedBy,
          performedByType: 'user',
          ipAddress
        });
      }

      // Upsert document validation
      const validation = await tx.documentValidation.upsert({
        where: {
          documentId
        },
        update: {
          status,
          validatedBy,
          validatedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          updatedAt: new Date()
        },
        create: {
          documentId,
          status,
          validatedBy,
          validatedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null
        }
      });

      // Update the document's verification fields
      await tx.actorDocument.update({
        where: { id: documentId },
        data: {
          verifiedAt: status === 'APPROVED' ? new Date() : null,
          verifiedBy: status === 'APPROVED' ? validatedBy : null,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null
        }
      });

      // Log the activity
      await logPolicyActivity({
        policyId,
        action: `document_${status.toLowerCase()}`,
        description: `Document ${document.fileName} ${status.toLowerCase()}`,
        details: {
          documentId,
          documentType: document.documentType,
          category: document.category,
          status,
          actorType: finalActorType,
          actorId: finalActorId,
          rejectionReason
        },
        performedById: validatedBy,
        performedByType: 'user',
        ipAddress
      });

      return validation;
    });

    // Check if we should update the actor's overall status
    if (finalActorType && finalActorId) {
      await this.checkActorValidationComplete(policyId, finalActorType, finalActorId);
    }

    return result;
  }

  /**
   * Add a review note
   */
  async addReviewNote(params: AddReviewNoteParams) {
    const { policyId, note, createdBy, actorType, actorId, documentId } = params;

    const reviewNote = await prisma.reviewNote.create({
      data: {
        policyId,
        note,
        createdBy,
        actorType,
        actorId,
        documentId
      }
    });

    // Log the activity
    await logPolicyActivity({
      policyId,
      action: 'review_note_added',
      description: 'Review note added',
      details: {
        noteId: reviewNote.id,
        actorType,
        actorId,
        documentId,
        notePreview: note.substring(0, 100)
      },
      performedById: createdBy,
      performedByType: 'user'
    });

    return reviewNote;
  }

  /**
   * Get all review notes for a policy
   */
  async getReviewNotes(policyId: string, filters?: {
    actorType?: string;
    actorId?: string;
    documentId?: string;
  }) {
    const where: Prisma.ReviewNoteWhereInput = { policyId };

    if (filters?.actorType) where.actorType = filters.actorType;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.documentId) where.documentId = filters.documentId;

    const notes = await prisma.reviewNote.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        // Join with user to get reviewer name
        // Note: Since we don't have FK, we'll need to fetch separately
      }
    });

    // Fetch user names separately
    const userIds = [...new Set(notes.map(n => n.createdBy))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return notes.map(note => ({
      ...note,
      createdByUser: userMap.get(note.createdBy) || { name: 'Unknown', email: '' }
    }));
  }

  /**
   * Get validation progress for a policy
   */
  async getValidationProgress(policyId: string) {
    // Get the policy with all actors and documents
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        landlords: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } }
          }
        },
        tenant: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } }
          }
        },
        jointObligors: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } }
          }
        },
        avals: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } }
          }
        }
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Get all section validations
    const sectionValidations = await prisma.actorSectionValidation.findMany({
      where: {
        OR: [
          ...(policy.landlords?.map(l => ({ actorType: 'landlord', actorId: l.id })) || []),
          ...(policy.tenant ? [{ actorType: 'tenant', actorId: policy.tenant.id }] : []),
          ...(policy.jointObligors?.map(jo => ({ actorType: 'jointObligor', actorId: jo.id })) || []),
          ...(policy.avals?.map(a => ({ actorType: 'aval', actorId: a.id })) || [])
        ]
      }
    });

    // Get all document validations
    const allDocumentIds = [
      ...(policy.landlords?.flatMap(l => l.documents.map(d => d.id)) || []),
      ...(policy.tenant?.documents.map(d => d.id) || []),
      ...(policy.jointObligors?.flatMap(jo => jo.documents.map(d => d.id)) || []),
      ...(policy.avals?.flatMap(a => a.documents.map(d => d.id)) || [])
    ];

    const documentValidations = await prisma.documentValidation.findMany({
      where: {
        documentId: { in: allDocumentIds }
      }
    });

    // Calculate progress
    const actorProgress = this.calculateActorProgress(
      policy,
      sectionValidations,
      documentValidations
    );

    // Calculate totals
    const totalSections = actorProgress.reduce((sum, ap) => sum + ap.totalSections, 0);
    const approvedSections = actorProgress.reduce((sum, ap) => sum + ap.approvedSections, 0);
    const totalDocuments = allDocumentIds.length;
    const approvedDocuments = documentValidations.filter(dv => dv.status === 'APPROVED').length;

    const overallProgress = totalSections + totalDocuments > 0
      ? Math.round(((approvedSections + approvedDocuments) / (totalSections + totalDocuments)) * 100)
      : 0;

    return {
      totalSections,
      approvedSections,
      rejectedSections: sectionValidations.filter(sv => sv.status === 'REJECTED').length,
      totalDocuments,
      approvedDocuments,
      rejectedDocuments: documentValidations.filter(dv => dv.status === 'REJECTED').length,
      overallProgress,
      actorProgress,
      isComplete: approvedSections === totalSections && approvedDocuments === totalDocuments
    };
  }

  /**
   * Get validation details for a specific actor
   */
  async getActorValidationDetails(actorType: ActorType, actorId: string, isCompany?: boolean) {
    // If isCompany not provided, fetch the actor to determine it
    let actorIsCompany = isCompany;
    if (actorIsCompany === undefined) {
      actorIsCompany = await this.getActorIsCompany(actorType, actorId);
    }

    const [sectionValidations, documents] = await Promise.all([
      prisma.actorSectionValidation.findMany({
        where: { actorType, actorId }
      }),
      this.getActorDocuments(actorType, actorId)
    ]);

    const documentIds = documents.map(d => d.id);
    const documentValidations = await prisma.documentValidation.findMany({
      where: { documentId: { in: documentIds } }
    });

    const docValidationMap = new Map(documentValidations.map(dv => [dv.documentId, dv]));

    return {
      sections: this.getSectionsForActorType(actorType, actorIsCompany).map(section => {
        const validation = sectionValidations.find(sv => sv.section === section);
        return {
          section,
          status: validation?.status || 'PENDING',
          validatedBy: validation?.validatedBy,
          validatedAt: validation?.validatedAt,
          rejectionReason: validation?.rejectionReason
        };
      }),
      documents: documents.map(doc => {
        const validation = docValidationMap.get(doc.id);
        return {
          ...doc,
          validationStatus: validation?.status || 'PENDING',
          validatedBy: validation?.validatedBy,
          validatedAt: validation?.validatedAt,
          rejectionReason: validation?.rejectionReason
        };
      })
    };
  }

  // Helper methods
  private getActorTypeFromDocument(document: { landlordId?: string; tenantId?: string; jointObligorId?: string; avalId?: string }): ActorType | undefined {
    if (document.landlordId) return 'landlord';
    if (document.tenantId) return 'tenant';
    if (document.jointObligorId) return 'jointObligor';
    if (document.avalId) return 'aval';
    return undefined;
  }

  private getActorIdFromDocument(document: { landlordId?: string; tenantId?: string; jointObligorId?: string; avalId?: string }): string | undefined {
    return document.landlordId ||
           document.tenantId ||
           document.jointObligorId ||
           document.avalId;
  }

  private async getActorDocuments(actorType: ActorType, actorId: string) {
    const whereClause: Prisma.ActorDocumentWhereInput = {
      [`${actorType}Id`]: actorId
    } as Prisma.ActorDocumentWhereInput;

    return prisma.actorDocument.findMany({
      where: {
        ...whereClause,
        uploadStatus: DocumentUploadStatus.COMPLETE,
      }
    });
  }

  /**
   * Determine if an actor is a company
   */
  private async getActorIsCompany(actorType: ActorType, actorId: string): Promise<boolean> {
    const delegate = getActorDelegate(prisma, actorType as ActorTableName);
    const actor = await delegate.findUnique({
      where: { id: actorId },
      select: actorType === 'landlord'
        ? { isCompany: true }
        : actorType === 'tenant'
        ? { tenantType: true }
        : actorType === 'aval'
        ? { avalType: true }
        : { jointObligorType: true }
    });

    if (!actor) return false;

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
   * Get sections for an actor type from centralized config
   */
  private getSectionsForActorType(actorType: ActorType, isCompany: boolean): SectionType[] {
    return getSectionsForActor(actorType, isCompany);
  }

  private calculateActorProgress(
    policy: any,
    sectionValidations: any[],
    documentValidations: any[]
  ) {
    const actorProgress: any[] = [];

    // Helper to determine if actor is company based on actor data
    const isActorCompany = (actor: any, actorType: ActorType): boolean => {
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
    };

    // Helper to calculate progress for an actor
    const calculateForActor = (actor: any, actorType: ActorType) => {
      if (!actor) return null;

      const isCompany = isActorCompany(actor, actorType);
      const actorSections = this.getSectionsForActorType(actorType, isCompany);
      const actorSectionValidations = sectionValidations.filter(
        sv => sv.actorType === actorType && sv.actorId === actor.id
      );

      const actorDocIds = actor.documents?.map((d: any) => d.id) || [];
      const actorDocValidations = documentValidations.filter(
        dv => actorDocIds.includes(dv.documentId)
      );

      return {
        actorType,
        actorId: actor.id,
        actorName: actor.companyName ||
          (actor.firstName ? formatFullName(
            actor.firstName,
            actor.paternalLastName || '',
            actor.maternalLastName || '',
            actor.middleName || undefined
          ) : 'Sin nombre'),
        isCompany,
        totalSections: actorSections.length,
        approvedSections: actorSectionValidations.filter(sv => sv.status === 'APPROVED').length,
        rejectedSections: actorSectionValidations.filter(sv => sv.status === 'REJECTED').length,
        totalDocuments: actorDocIds.length,
        approvedDocuments: actorDocValidations.filter(dv => dv.status === 'APPROVED').length,
        rejectedDocuments: actorDocValidations.filter(dv => dv.status === 'REJECTED').length,
        overallProgress: this.calculatePercentage(
          actorSectionValidations.filter(sv => sv.status === 'APPROVED').length +
          actorDocValidations.filter(dv => dv.status === 'APPROVED').length,
          actorSections.length + actorDocIds.length
        )
      };
    };

    // Process each actor type
    policy.landlords?.forEach((landlord: any) => {
      const progress = calculateForActor(landlord, 'landlord');
      if (progress) actorProgress.push(progress);
    });

    if (policy.tenant) {
      const progress = calculateForActor(policy.tenant, 'tenant');
      if (progress) actorProgress.push(progress);
    }

    policy.jointObligors?.forEach((jo: any) => {
      const progress = calculateForActor(jo, 'jointObligor');
      if (progress) actorProgress.push(progress);
    });

    policy.avals?.forEach((aval: any) => {
      const progress = calculateForActor(aval, 'aval');
      if (progress) actorProgress.push(progress);
    });

    return actorProgress;
  }

  private calculatePercentage(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  private async checkActorValidationComplete(
    policyId: string,
    actorType: ActorType,
    actorId: string
  ) {
    // Get all validations for this actor
    const details = await this.getActorValidationDetails(actorType, actorId);

    // Check for any items still IN_REVIEW - block approval if so
    const hasSectionsInReview = details.sections.some(s => s.status === 'IN_REVIEW');
    const hasDocsInReview = details.documents.some(d => d.validationStatus === 'IN_REVIEW');
    if (hasSectionsInReview || hasDocsInReview) {
      return; // Items still being reviewed, don't auto-approve
    }

    // Check sections: must have all required sections AND all must be APPROVED
    // Note: details.sections already contains only the required sections for this actor type
    // Empty array means actor has no required sections (allowed per user decision)
    const allSectionsApproved = details.sections.length === 0 ||
      details.sections.every(s => s.status === 'APPROVED');

    // Check documents: if actor has documents, all must be APPROVED
    // Empty documents array is allowed (actor may not have uploaded any yet, or none required)
    const allDocumentsApproved = details.documents.length === 0 ||
      details.documents.every(d => d.validationStatus === 'APPROVED');

    if (allSectionsApproved && allDocumentsApproved) {
      // Update actor verification status to APPROVED
      const delegate = getActorDelegate(prisma, actorType as ActorTableName);
      await delegate.update({
        where: { id: actorId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date()
        }
      });

      // Log the automatic approval
      await logPolicyActivity({
        policyId,
        action: 'actor_auto_approved',
        description: `${actorType} automatically approved after all validations completed`,
        details: {
          actorType,
          actorId,
          sectionsCount: details.sections.length,
          documentsCount: details.documents.length
        },
        performedByType: 'system'
      });

      // Check if all actors are now approved and transition policy
      await this.checkAndTransitionPolicyStatus(policyId);
    }
  }

  /**
   * Check if policy should transition to PENDING_APPROVAL
   * Called after an actor is auto-approved
   */
  private async checkAndTransitionPolicyStatus(policyId: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { status: true }
    });

    if (!policy || policy.status !== 'UNDER_INVESTIGATION') return;

    // Use transitionPolicyStatus for proper validation
    await transitionPolicyStatus(
      policyId,
      'PENDING_APPROVAL',
      'system',
      'All actors verification completed'
    );
  }

  private getActorModel(actorType: ActorType): string {
    const modelMap = {
      landlord: 'landlord',
      tenant: 'tenant',
      jointObligor: 'jointObligor',
      aval: 'aval'
    };
    return modelMap[actorType];
  }
}

export const validationService = new ValidationService();
