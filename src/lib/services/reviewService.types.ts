/**
 * Review Service Types
 *
 * Client-safe type definitions for the review system.
 * These can be imported by client components without pulling in Prisma.
 */

import type { ActorType, SectionType } from '@/lib/constants/actorSectionConfig';

export type { ActorType, SectionType };

export interface PolicyReviewData {
  policyId: string;
  policyNumber: string;
  status: string;
  propertyAddress: string;
  rentAmount: number;
  actors: ActorReviewInfo[];
  progress: {
    overall: number;
    totalValidations: number;
    completedValidations: number;
    pendingValidations: number;
    rejectedValidations: number;
  };
  notes: any[];
  investigationVerdict: string | null;
}

export interface ActorReviewInfo {
  actorType: ActorType;
  actorId: string;
  name: string;
  email?: string;
  isCompany: boolean;
  monthlyIncome?: number;
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
  validatorName?: string;
  validatedAt?: Date;
  rejectionReason?: string;
  fields: any;
}

export interface DocumentValidationInfo {
  documentId: string;
  fileName: string;
  documentType: string;
  category: string;
  createdAt: Date;
  status: string;
  validatedBy?: string;
  validatorName?: string;
  validatedAt?: Date;
  rejectionReason?: string;
  s3Key?: string;
}
