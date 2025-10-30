// Type definitions for Policy tenant data

export interface PolicyProfileData {
  nationality: 'mexican' | 'foreign';
  curp?: string;
  passport?: string;
}

export interface PolicyEmploymentData {
  employmentStatus: string;
  industry: string;
  occupation: string;
  companyName: string;
  position: string;
  companyWebsite?: string;
  workAddress?: string;
  incomeSource: string;
  monthlyIncome: number;
  creditCheckConsent: boolean;
}

export interface PolicyReferencesData {
  personalReferenceName: string;
  personalReferencePhone: string;
  workReferenceName?: string;
  workReferencePhone?: string;
  landlordReferenceName?: string;
  landlordReferencePhone?: string;
}

export interface PolicyDocumentsData {
  identificationCount: number;
  incomeCount: number;
  optionalCount: number;
  incomeDocsHavePassword: 'yes' | 'no';
}

// Combined type for all tenant data
export interface PolicyTenantData {
  profile?: PolicyProfileData;
  employment?: PolicyEmploymentData;
  references?: PolicyReferencesData;
  documents?: PolicyDocumentsData;
}

// Step names for the wizard
export const POLICY_STEPS = {
  PROFILE: 1,
  EMPLOYMENT: 2,
  REFERENCES: 3,
  DOCUMENTS: 4,
  PAYMENT: 5,
  REVIEW: 6
} as const;

export const POLICY_STEP_NAMES = {
  1: 'profile',
  2: 'employment',
  3: 'references',
  4: 'documents',
  5: 'payment',
  6: 'review'
} as const;

// Status display helpers
export const POLICY_STATUS_DISPLAY: Record<string, string> = {
  DRAFT: 'Draft',
  COLLECTING_INFO: 'Collecting Information',
  UNDER_INVESTIGATION: 'Under Investigation',
  INVESTIGATION_REJECTED: 'Investigation Rejected',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  CONTRACT_PENDING: 'Contract Pending',
  CONTRACT_UPLOADED: 'Contract Uploaded',
  CONTRACT_SIGNED: 'Contract Signed',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
};

export const POLICY_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  COLLECTING_INFO: 'blue',
  UNDER_INVESTIGATION: 'yellow',
  INVESTIGATION_REJECTED: 'red',
  PENDING_APPROVAL: 'green',
  APPROVED: 'green',
  CONTRACT_PENDING: 'orange',
  CONTRACT_UPLOADED: 'purple',
  CONTRACT_SIGNED: 'blue',
  ACTIVE: 'green',
  EXPIRED: 'gray',
  CANCELLED: 'red'
};