// This file provides type exports that work in both demo and production modes
// In demo mode, we avoid importing from @prisma/client to prevent OpenSSL dependency

import { isDemoMode } from './env-check';

// Define types that match Prisma schema
export type UserRole = 'admin' | 'staff' | 'owner' | 'renter';
export type PolicyStatusType = 'DRAFT' | 'INVESTIGATION_PENDING' | 'INVESTIGATION_IN_PROGRESS' | 'INVESTIGATION_REJECTED' | 'INVESTIGATION_APPROVED' | 'CONTRACT_PENDING' | 'CONTRACT_UPLOADED' | 'CONTRACT_SIGNED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type DocumentCategory = 'identification' | 'income_proof' | 'employment_letter' | 'bank_statements' | 'references' | 'other';
export type PaymentMethodType = 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'STRIPE' | 'MANUAL';
export type PaymentStatusType = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
export type NationalityType = 'MEXICAN' | 'FOREIGN';
export type DocPasswordStatusType = 'YES' | 'NO';

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
  price: number;
  description: string;
  features: string;
  ctaText: string;
  ctaLink: string;
  highlight: boolean;
  percentage?: number | null;
  minAmount?: number | null;
  shortDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsurancePolicy {
  id: string;
  brokerId: string;
  tenantId?: string | null;
  landlordId?: string | null;
  propertyAddress: string;
  propertyType: string;
  status: string;
  premium: number;
  startDate: Date;
  endDate: Date;
  payer: string;
  propertyData?: string | null;
  coverageData?: string | null;
  createdAt: Date;
  updatedAt: Date;
  broker?: User;
  tenant?: User | null;
  landlord?: User | null;
}

export interface Policy {
  id: string;
  propertyId?: string | null;
  propertyAddress?: string | null;
  initiatedBy: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  tenantName?: string | null;
  status: PolicyStatusType;
  currentStep: number;
  accessToken: string;
  tokenExpiry: Date;
  submittedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  reviewReason?: string | null;
  
  // Payment configuration
  packageId?: string | null;
  packageName?: string | null;
  totalPrice: number;
  investigationFee: number;
  tenantPaymentPercent: number;
  landlordPaymentPercent: number;
  paymentStatus?: PaymentStatusType;
  
  // Lifecycle dates
  investigationStartedAt?: Date | null;
  investigationCompletedAt?: Date | null;
  contractUploadedAt?: Date | null;
  contractSignedAt?: Date | null;
  policyActivatedAt?: Date | null;
  contractLength: number;
  policyExpiresAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations to structured data models
  profileData?: TenantProfile | null;
  employmentData?: TenantEmployment | null;
  referencesData?: TenantReferences | null;
  documentsData?: TenantDocuments | null;
  guarantorData?: TenantGuarantor | null;
  
  // Other relations
  documents?: PolicyDocument[];
  activities?: PolicyActivity[];
  investigation?: Investigation;
  contracts?: Contract[];
  incidents?: Incident[];
  payments?: Payment[];
  initiatedByUser?: User;
  reviewedByUser?: User;
}

// Tenant Profile Information
export interface TenantProfile {
  id: string;
  policyId: string;
  nationality: NationalityType;
  curp?: string | null;      // For Mexican nationals
  passport?: string | null;  // For foreign nationals
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

// Tenant Employment Information
export interface TenantEmployment {
  id: string;
  policyId: string;
  employmentStatus: string;  // employed, self-employed, unemployed, student, retired
  industry: string;
  occupation: string;
  companyName: string;
  position: string;
  companyWebsite?: string | null;
  workAddress?: string | null;
  incomeSource: string;      // salary, business, freelance, benefits, other
  monthlyIncome: number;
  creditCheckConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

// Tenant References Information
export interface TenantReferences {
  id: string;
  policyId: string;
  personalReferenceName: string;
  personalReferencePhone: string;
  workReferenceName?: string | null;
  workReferencePhone?: string | null;
  landlordReferenceName?: string | null;
  landlordReferencePhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

// Tenant Documents Information
export interface TenantDocuments {
  id: string;
  policyId: string;
  identificationCount: number;
  incomeCount: number;
  optionalCount: number;
  incomeDocsHavePassword: DocPasswordStatusType;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

// Tenant Guarantor Information
export interface TenantGuarantor {
  id: string;
  policyId: string;
  name: string;
  phone: string;
  email?: string | null;
  relationship: string;      // parent, sibling, friend, colleague, other
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
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

export interface Investigation {
  id: string;
  policyId: string;
  verdict?: string | null;
  riskLevel?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  landlordDecision?: string | null;
  landlordOverride: boolean;
  landlordNotes?: string | null;
  assignedTo?: string | null;
  completedBy?: string | null;
  completedAt?: Date | null;
  responseTimeHours?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

export interface Contract {
  id: string;
  policyId: string;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isCurrent: boolean;
  uploadedBy: string;
  uploadedAt: Date;
  policy?: Policy;
}

export interface Incident {
  id: string;
  policyId: string;
  reportedBy: string;
  reporterName: string;
  reporterContact: string;
  description: string;
  resolution?: string | null;
  requiresPayment: boolean;
  paymentAmount?: number | null;
  isCoveredByPolicy: boolean;
  status: string;
  assignedTo?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

export interface Payment {
  id: string;
  policyId: string;
  amount: number;
  currency: string;
  status: PaymentStatusType;
  method?: PaymentMethodType | null;
  type: string;
  paidBy: string;
  stripeIntentId?: string | null;
  stripeSessionId?: string | null;
  stripeCustomerId?: string | null;
  isManual: boolean;
  reference?: string | null;
  receiptUrl?: string | null;
  description?: string | null;
  metadata?: any;
  errorMessage?: string | null;
  paidAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  createdAt: Date;
  updatedAt: Date;
  policy?: Policy;
}

export interface SystemConfig {
  id: string;
  investigationFee: number;
  createdAt: Date;
  updatedAt: Date;
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
  INVESTIGATION_PENDING: 'INVESTIGATION_PENDING' as PolicyStatusType,
  INVESTIGATION_IN_PROGRESS: 'INVESTIGATION_IN_PROGRESS' as PolicyStatusType,
  INVESTIGATION_REJECTED: 'INVESTIGATION_REJECTED' as PolicyStatusType,
  INVESTIGATION_APPROVED: 'INVESTIGATION_APPROVED' as PolicyStatusType,
  CONTRACT_PENDING: 'CONTRACT_PENDING' as PolicyStatusType,
  CONTRACT_UPLOADED: 'CONTRACT_UPLOADED' as PolicyStatusType,
  CONTRACT_SIGNED: 'CONTRACT_SIGNED' as PolicyStatusType,
  ACTIVE: 'ACTIVE' as PolicyStatusType,
  EXPIRED: 'EXPIRED' as PolicyStatusType,
  CANCELLED: 'CANCELLED' as PolicyStatusType,
} as const;

// PaymentMethod enum object for accessing values like PaymentMethod.CARD
export const PaymentMethod = PrismaExports.PaymentMethod || {
  CARD: 'CARD' as PaymentMethodType,
  BANK_TRANSFER: 'BANK_TRANSFER' as PaymentMethodType,
  CASH: 'CASH' as PaymentMethodType,
  STRIPE: 'STRIPE' as PaymentMethodType,
  MANUAL: 'MANUAL' as PaymentMethodType,
} as const;

// PaymentStatus enum object
export const PaymentStatus = PrismaExports.PaymentStatus || {
  PENDING: 'PENDING' as PaymentStatusType,
  PROCESSING: 'PROCESSING' as PaymentStatusType,
  COMPLETED: 'COMPLETED' as PaymentStatusType,
  FAILED: 'FAILED' as PaymentStatusType,
  REFUNDED: 'REFUNDED' as PaymentStatusType,
  PARTIAL: 'PARTIAL' as PaymentStatusType,
} as const;

// NationalityType enum object for accessing values like NationalityType.MEXICAN
export const NationalityType = PrismaExports.NationalityType || {
  MEXICAN: 'MEXICAN' as NationalityType,
  FOREIGN: 'FOREIGN' as NationalityType,
} as const;

// DocPasswordStatus enum object for accessing values like DocPasswordStatus.YES
export const DocPasswordStatus = PrismaExports.DocPasswordStatus || {
  YES: 'YES' as DocPasswordStatusType,
  NO: 'NO' as DocPasswordStatusType,
} as const;

// For components that import specific types, provide them from either source
// Note: These exports are for runtime type checking when available