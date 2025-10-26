import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';

export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';

export type ActorType = 'landlord' | 'tenant' | 'jointObligor' | 'aval';

export type SectionType =
  | 'personal_info'
  | 'work_info'
  | 'financial_info'
  | 'references'
  | 'address'
  | 'company_info';

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
      throw new Error('Document not found');
    }

    // Determine actor type and ID from document if not provided
    const finalActorType = actorType || this.getActorTypeFromDocument(document);
    const finalActorId = actorId || this.getActorIdFromDocument(document);

    const result = await prisma.$transaction(async (tx) => {
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
    const where: any = { policyId };

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
            documents: true
          }
        },
        tenant: {
          include: {
            documents: true
          }
        },
        jointObligors: {
          include: {
            documents: true
          }
        },
        avals: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!policy) {
      throw new Error('Policy not found');
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
  async getActorValidationDetails(actorType: ActorType, actorId: string) {
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
      sections: this.getSectionsForActorType(actorType).map(section => {
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
  private getActorTypeFromDocument(document: any): ActorType | undefined {
    if (document.landlordId) return 'landlord';
    if (document.tenantId) return 'tenant';
    if (document.jointObligorId) return 'jointObligor';
    if (document.avalId) return 'aval';
    return undefined;
  }

  private getActorIdFromDocument(document: any): string | undefined {
    return document.landlordId ||
           document.tenantId ||
           document.jointObligorId ||
           document.avalId;
  }

  private async getActorDocuments(actorType: ActorType, actorId: string) {
    const whereClause = {
      [`${actorType}Id`]: actorId
    };

    return prisma.actorDocument.findMany({
      where: whereClause as any
    });
  }

  private getSectionsForActorType(actorType: ActorType): SectionType[] {
    // Define which sections apply to each actor type
    const baseSections: SectionType[] = ['personal_info', 'address', 'financial_info'];

    // All actor types can be companies, so company_info is conditional
    // Work info is for individuals
    return baseSections;
  }

  private calculateActorProgress(
    policy: any,
    sectionValidations: any[],
    documentValidations: any[]
  ) {
    const actorProgress: any[] = [];

    // Helper to calculate progress for an actor
    const calculateForActor = (actor: any, actorType: ActorType) => {
      if (!actor) return null;

      const actorSections = this.getSectionsForActorType(actorType);
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
        actorName: actor.fullName || actor.companyName || 'Unknown',
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

    // Check if all sections and documents are approved
    const allSectionsApproved = details.sections.every(s => s.status === 'APPROVED');
    const allDocumentsApproved = details.documents.every(d => d.validationStatus === 'APPROVED');

    if (allSectionsApproved && allDocumentsApproved) {
      // Update actor verification status to APPROVED
      const model = this.getActorModel(actorType);
      await (prisma as any)[model].update({
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
          actorId
        },
        performedByType: 'system'
      });
    }
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