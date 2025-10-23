// ============================================
// POLICY TYPES & INTERFACES
// ============================================

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  BROKER = 'BROKER'
}

export enum TenantType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY'
}

export enum GuarantorType {
  NONE = 'NONE',
  JOINT_OBLIGOR = 'JOINT_OBLIGOR',
  AVAL = 'AVAL',
  BOTH = 'BOTH'
}

export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  COMMERCIAL = 'COMMERCIAL',
  OFFICE = 'OFFICE',
  WAREHOUSE = 'WAREHOUSE',
  OTHER = 'OTHER'
}

export enum PolicyStatus {
  DRAFT = 'DRAFT',
  COLLECTING_INFO = 'COLLECTING_INFO',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  INVESTIGATION_REJECTED = 'INVESTIGATION_REJECTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  CONTRACT_PENDING = 'CONTRACT_PENDING',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum DocumentCategory {
  IDENTIFICATION = 'IDENTIFICATION',
  INCOME_PROOF = 'INCOME_PROOF',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  BANK_STATEMENT = 'BANK_STATEMENT',
  PROPERTY_DEED = 'PROPERTY_DEED',
  TAX_RETURN = 'TAX_RETURN',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  PROPERTY_TAX_STATEMENT = 'PROPERTY_TAX_STATEMENT',  // Boleta predial
  MARRIAGE_CERTIFICATE = 'MARRIAGE_CERTIFICATE',
  COMPANY_CONSTITUTION = 'COMPANY_CONSTITUTION',    // Escritura constitutiva
  LEGAL_POWERS = 'LEGAL_POWERS',           // Poderes notariales
  TAX_STATUS_CERTIFICATE = 'TAX_STATUS_CERTIFICATE', // Constancia de situación fiscal
  CREDIT_REPORT = 'CREDIT_REPORT',         // Buró de crédito
  PROPERTY_REGISTRY = 'PROPERTY_REGISTRY',     // Folio real del registro público
  PROPERTY_APPRAISAL = 'PROPERTY_APPRAISAL',    // Avalúo de propiedad
  PASSPORT = 'PASSPORT',
  IMMIGRATION_DOCUMENT = 'IMMIGRATION_DOCUMENT',
  UTILITY_BILL = 'UTILITY_BILL',
  PAYROLL_RECEIPT = 'PAYROLL_RECEIPT',       // Recibo de nómina
  OTHER = 'OTHER'
}

export enum NationalityType {
  MEXICAN = 'MEXICAN',
  FOREIGN = 'FOREIGN'
}

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
  fullName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;

  // Bank Information
  bankName?: string;
  accountNumber?: string;
  clabe?: string;

  // Work Information (if individual)
  occupation?: string;
  companyName?: string;
  monthlyIncome?: number;

  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface TenantData {
  id?: string;
  tenantType: TenantType;

  // Individual Information
  fullName?: string;
  nationality?: NationalityType;
  curp?: string;
  passport?: string;

  // Company Information
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepId?: string;
  companyAddress?: string;

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
  fullName: string;
  email: string;
  phone: string;
  nationality: NationalityType;
  curp?: string;
  passport?: string;
  address?: string;

  // Employment
  employmentStatus: string;
  occupation: string;
  companyName: string;
  position: string;
  monthlyIncome: number;
  incomeSource: string;

  references?: PersonalReference[];
  documents?: ActorDocument[];
  informationComplete?: boolean;
  completedAt?: Date;
}

export interface AvalData {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: NationalityType;
  curp?: string;
  passport?: string;
  address?: string;

  // Employment
  employmentStatus: string;
  occupation: string;
  companyName: string;
  position: string;
  monthlyIncome: number;
  incomeSource: string;

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
    fullName: string;
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
    legalRepName: string;
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