// ============================================
// POLICY TYPES & INTERFACES
// ============================================

// Import and re-export enums from centralized generated file
// These enums are generated from Prisma schema
export {
  UserRole,
  TenantType,
  GuarantorType,
  PropertyType,
  PolicyStatus,
  DocumentCategory,
  NationalityType
} from '@/lib/enums';

// Custom enums not in Prisma schema
export enum ActorType {
  LANDLORD = 'LANDLORD',
  TENANT = 'TENANT',
  JOINT_OBLIGOR = 'JOINT_OBLIGOR',
  AVAL = 'AVAL'
}

export enum InvestigationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  CANCELLED = 'CANCELLED'
}

// ============================================
// ACTOR INTERFACES
// ============================================

export interface LandlordData {
  id?: string;
  isCompany: boolean;

  // Personal Information (for individuals)
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  rfc?: string;
  email: string;
  phone: string;
  address: string;

  // Company Information (for companies)
  companyName?: string;
  companyRfc?: string;

  // Legal Representative Information (for companies)
  legalRepFirstName?: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Bank Information
  bankName?: string;
  accountNumber?: string;
  clabe?: string;

  // Work Information (if individual)
  occupation?: string;
  employerName?: string;
  monthlyIncome?: number;

  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface TenantData {
  id?: string;
  tenantType: TenantType;

  // Individual Information
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  nationality?: NationalityType;
  curp?: string;
  passport?: string;
  rfc?: string;

  // Company Information
  companyName?: string;
  companyRfc?: string;
  companyAddress?: string;

  // Legal Representative Information (for companies)
  legalRepFirstName?: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string;
  legalRepId?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Common
  email: string;
  phone: string;

  // Employment (for individuals)
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  position?: string;
  monthlyIncome?: number;
  incomeSource?: string;

  references?: PersonalReference[];
  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface JointObligorData {
  id?: string;
  isCompany?: boolean;

  // Personal Information (for individuals)
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  nationality?: NationalityType;
  curp?: string;
  passport?: string;
  rfc?: string;

  // Company Information (for companies)
  companyName?: string;
  companyRfc?: string;

  // Legal Representative Information (for companies)
  legalRepFirstName?: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Common
  email: string;
  phone: string;
  address?: string;

  // Employment (for individuals)
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  position?: string;
  monthlyIncome: number;
  incomeSource: string;

  references?: PersonalReference[];
  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface AvalData {
  id?: string;
  isCompany?: boolean;

  // Personal Information (for individuals)
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  nationality?: NationalityType;
  curp?: string;
  passport?: string;
  rfc?: string;

  // Company Information (for companies)
  companyName?: string;
  companyRfc?: string;

  // Legal Representative Information (for companies)
  legalRepFirstName?: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;

  // Common
  email: string;
  phone: string;
  address?: string;

  // Employment (for individuals)
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;
  position?: string;
  monthlyIncome?: number;
  incomeSource?: string;

  // Property Guarantee
  propertyAddress: string;
  propertyValue: number;
  propertyDeedNumber?: string;
  propertyRegistry?: string;

  references?: PersonalReference[];
  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface PersonalReference {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  occupation?: string;
}

export interface ActorDocument {
  id?: string;
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;

  // S3 Information
  s3Key: string;
  s3Bucket: string;
  s3Region?: string;

  // Metadata
  uploadedBy?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// POLICY INTERFACES
// ============================================

export interface PolicyCreateData {
  // Internal Code
  internalCode?: string;

  // Property Information
  propertyAddress: string;
  propertyType: PropertyType;
  propertyDescription?: string;
  rentAmount: number;
  contractLength: number;

  // Guarantor Configuration
  guarantorType: GuarantorType;

  // Package/Plan
  packageId?: string;

  // Pricing Configuration
  totalPrice: number;
  tenantPercentage: number;
  landlordPercentage: number;

  // Initial Actor Data (to send invitations)
  landlord?: Partial<LandlordData>;
  tenant?: {
    email: string;
    phone?: string;
    name?: string;
  };
  jointObligors?: Array<{
    email: string;
    phone?: string;
    name?: string;
  }>;
  avals?: Array<{
    email: string;
    phone?: string;
    name?: string;
  }>;
}

export interface PolicyData {
  id: string;
  policyNumber: string;
  internalCode?: string;

  // Property Information
  propertyAddress: string;
  propertyType: PropertyType;
  propertyDescription?: string;
  rentAmount: number;
  contractLength: number;

  // Guarantor Configuration
  guarantorType: GuarantorType;

  // Package/Plan
  packageId?: string;
  package?: any;

  // Pricing
  totalPrice: number;
  tenantPercentage: number;
  landlordPercentage: number;

  // User Management
  createdById: string;
  createdBy?: any;
  managedById?: string;
  managedBy?: any;

  // Status
  status: PolicyStatus;
  currentStep: string;

  // Dates
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  activatedAt?: Date;
  expiresAt?: Date;

  // Actors
  landlord?: LandlordData;
  tenant?: TenantData;
  jointObligors?: JointObligorData[];
  avals?: AvalData[];

  // Related Data
  documents?: any[];
  activities?: any[];
  payments?: any[];
  investigation?: any;
  contracts?: any[];
  incidents?: any[];

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FORM INTERFACES
// ============================================

export interface ActorFormData {
  actorType: 'tenant' | 'joint_obligor' | 'aval';
  token: string;

  // Common Fields
  personalInfo: {
    firstName: string;
    middleName?: string;
    paternalLastName: string;
    maternalLastName: string;
    email: string;
    phone: string;
    nationality: NationalityType;
    curp?: string;
    passport?: string;
    address?: string;
  };

  employmentInfo: {
    employmentStatus: string;
    occupation: string;
    companyName: string;
    position: string;
    monthlyIncome: number;
    incomeSource: string;
  };

  // References (3 required)
  references: PersonalReference[];

  // Documents
  documents: File[];

  // Additional for Aval
  propertyGuarantee?: {
    propertyAddress: string;
    propertyValue: number;
    propertyDeedNumber?: string;
    propertyRegistry?: string;
  };

  // Additional for Company Tenant
  companyInfo?: {
    companyName: string;
    companyRfc: string;
    legalRepFirstName: string;
    legalRepMiddleName?: string;
    legalRepPaternalLastName: string;
    legalRepMaternalLastName: string;
    legalRepId: string;
    companyAddress: string;
  };
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// ============================================
// ACTIVITY TYPES
// ============================================

export interface PolicyActivity {
  id: string;
  policyId: string;
  action: PolicyAction;
  description: string;
  details?: any;
  performedById?: string;
  performedBy?: any;
  performedByType?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export enum PolicyAction {
  // Policy Actions
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_UPDATED = 'POLICY_UPDATED',
  POLICY_CANCELLED = 'POLICY_CANCELLED',

  // Actor Actions
  ACTOR_INVITED = 'ACTOR_INVITED',
  ACTOR_REMINDED = 'ACTOR_REMINDED',
  ACTOR_INFO_SUBMITTED = 'ACTOR_INFO_SUBMITTED',
  ACTOR_INFO_UPDATED = 'ACTOR_INFO_UPDATED',
  ACTOR_DOCUMENT_UPLOADED = 'ACTOR_DOCUMENT_UPLOADED',

  // Investigation Actions
  INVESTIGATION_STARTED = 'INVESTIGATION_STARTED',
  INVESTIGATION_COMPLETED = 'INVESTIGATION_COMPLETED',
  INVESTIGATION_REJECTED = 'INVESTIGATION_REJECTED',

  // Approval Actions
  POLICY_APPROVED = 'POLICY_APPROVED',
  POLICY_REJECTED = 'POLICY_REJECTED',

  // Contract Actions
  CONTRACT_UPLOADED = 'CONTRACT_UPLOADED',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',

  // Payment Actions
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Incident Actions
  INCIDENT_REPORTED = 'INCIDENT_REPORTED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED'
}