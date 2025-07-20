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
  SENT_TO_TENANT: 'Sent to Tenant',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  DENIED: 'Denied'
};

export const POLICY_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SENT_TO_TENANT: 'blue',
  IN_PROGRESS: 'yellow',
  SUBMITTED: 'orange',
  UNDER_REVIEW: 'purple',
  APPROVED: 'green',
  DENIED: 'red'
};