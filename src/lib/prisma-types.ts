// This file provides type exports that work in both demo and production modes
// In demo mode, we avoid importing from @prisma/client to prevent OpenSSL dependency

import { isDemoMode } from './env-check';

// Define types that match Prisma schema
export type UserRole = 'admin' | 'staff' | 'owner' | 'renter';
export type PolicyStatusType = 'DRAFT' | 'SENT_TO_TENANT' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED';
export type DocumentCategory = 'identification' | 'income_proof' | 'employment_letter' | 'bank_statements' | 'references' | 'other';

// PolicyStatus will be defined later after checking for Prisma client

// Define base types that match Prisma models
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string | null;
  role: string;
  phone?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Package {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  features: string;
  price: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsurancePolicy {
  id: string;
  policyNumber: string;
  holderName: string;
  holderEmail: string;
  startDate: Date;
  endDate: Date;
  premium: number;
  coverageAmount: number;
  propertyAddress: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Policy {
  id: string;
  propertyId?: string | null;
  initiatedBy: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  status: PolicyStatusType;
  currentStep: number;
  profileData?: any;
  employmentData?: any;
  referencesData?: any;
  documentsData?: any;
  accessToken: string;
  tokenExpiry: Date;
  submittedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  reviewReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  documents?: PolicyDocument[];
  activities?: PolicyActivity[];
  initiatedByUser?: User;
  reviewedByUser?: User;
}

export interface PolicyDocument {
  id: string;
  policyId: string;
  category: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  policy?: Policy;
}

export interface PolicyActivity {
  id: string;
  policyId: string;
  action: string;
  details?: any;
  performedBy?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  policy?: Policy;
}

// Re-export actual Prisma types if not in demo mode
let PrismaExports: any = {};

if (!isDemoMode()) {
  try {
    PrismaExports = require('@prisma/client');
  } catch (e) {
    // Prisma not available, use our mock types
  }
}

// Export either real Prisma types or our mock types
export const Prisma = PrismaExports.Prisma || {
  PolicyWhereInput: {} as any,
  PolicyOrderByWithRelationInput: {} as any,
  UserWhereInput: {} as any,
  UserOrderByWithRelationInput: {} as any,
};

// PolicyStatus enum object for accessing values like PolicyStatus.DRAFT
export const PolicyStatus = PrismaExports.PolicyStatus || {
  DRAFT: 'DRAFT' as PolicyStatusType,
  SENT_TO_TENANT: 'SENT_TO_TENANT' as PolicyStatusType,
  IN_PROGRESS: 'IN_PROGRESS' as PolicyStatusType,
  SUBMITTED: 'SUBMITTED' as PolicyStatusType,
  UNDER_REVIEW: 'UNDER_REVIEW' as PolicyStatusType,
  APPROVED: 'APPROVED' as PolicyStatusType,
  DENIED: 'DENIED' as PolicyStatusType,
} as const;

// For components that import specific types, provide them from either source
// Note: These exports are for runtime type checking when available