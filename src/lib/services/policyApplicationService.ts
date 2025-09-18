import prisma from '../prisma';
import { Policy, PolicyStatus, PolicyStatusType, PolicyDocument, PolicyActivity, Prisma } from '@/lib/prisma-types';
import { randomUUID } from 'crypto';
import { generateSecureToken, generateTokenExpiry } from '../utils/tokenUtils';
import { MockDataService } from './mockDataService';

// Type definitions
export interface CreatePolicyData {
  propertyId?: string;
  propertyAddress?: string;
  createdById: string;
  tenantType?: 'individual' | 'company';
  tenantEmail: string;
  tenantPhone?: string;
  tenantName?: string;
  companyName?: string;
  companyRfc?: string;
  legalRepresentativeName?: string;
  legalRepresentativeId?: string;
  companyAddress?: string;
  packageId?: string;
  packageName?: string;
  price?: number;
  investigationFee?: number;
  tenantPaymentPercent?: number;
  landlordPaymentPercent?: number;
  contractLength?: number;
}

export interface PolicyWithRelations extends Omit<Policy, 'createdBy' | 'managedBy'> {
  documents: PolicyDocument[];
  activities: PolicyActivity[];
  createdBy: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  managedBy?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  price?: number; // For backward compatibility
}

interface GetPoliciesOptions {
  status?: PolicyStatusType | 'all';
  paymentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

interface GetPoliciesResult {
  policies: PolicyWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}


// Helper functions (now using imported utilities)

// Service functions
export const createPolicy = async (data: CreatePolicyData): Promise<PolicyWithRelations> => {
  console.log('Real DB mode: Creating policy');
  const newPolicy = await prisma.policy.create({
    data: {
      propertyId: data.propertyId,
      propertyAddress: data.propertyAddress,
      createdById: data.initiatedBy,
      tenantType: data.tenantType || 'individual',
      tenantEmail: data.tenantEmail,
      tenantPhone: data.tenantPhone,
      tenantName: data.tenantName,
      companyName: data.companyName,
      companyRfc: data.companyRfc,
      legalRepresentativeName: data.legalRepresentativeName,
      legalRepresentativeId: data.legalRepresentativeId,
      companyAddress: data.companyAddress,
      packageId: data.packageId,
      packageName: data.packageName,
      totalPrice: data.price || 0,
      investigationFee: data.investigationFee || 200,
      tenantPaymentPercent: data.tenantPaymentPercent || 100,
      landlordPaymentPercent: data.landlordPaymentPercent || 0,
      contractLength: data.contractLength || 12,
      accessToken: generateSecureToken(),
      tokenExpiry: generateTokenExpiry(),
      activities: {
        create: {
          action: 'created',
          performedBy: data.initiatedBy
        }
      }
    },
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return newPolicy;
};

export const getPolicies = async (options: GetPoliciesOptions = {}): Promise<GetPoliciesResult> => {
  const { status, paymentStatus, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  console.log('Real DB mode: Fetching policies');

  const where: prisma.PolicyWhereInput = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus as any;
  }

  if (search && search.trim()) {
    where.tenantEmail = {
      contains: search.trim(),
      mode: 'insensitive'
    };
  }

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        managedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        landlord: true,
        tenant: true,
        jointObligors: true,
        avals: true
      }
    }),
    prisma.policy.count({ where })
  ]);

  return {
    policies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getPolicyById = async (id: string): Promise<PolicyWithRelations | null> => {
  console.log(`Real DB mode: Fetching policy ${id}`);
  return prisma.policy.findUnique({
    where: { id },
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
};

export const getPolicyByToken = async (token: string): Promise<PolicyWithRelations | null> => {
  console.log(`Real DB mode: Fetching policy by token`);
  const policy = await prisma.policy.findUnique({
    where: { accessToken: token },
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      // Include structured data models for both individual and company
      profileData: true,
      companyProfileData: {
        include: {
          legalRepresentative: true
        }
      },
      employmentData: true,
      companyFinancialData: true,
      referencesData: true,
      companyReferencesData: true,
      documentsData: true,
      guarantorData: true
    }
  });

  // Check token expiry
  if (policy && policy.tokenExpiry < new Date()) {
    return null; // Token expired
  }

  return policy;
};

export const updatePolicyStatus = async (
  id: string,
  status: PolicyStatusType,
  performedBy: string,
  additionalData?: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PolicyWithRelations | null> => {
  console.log(`Real DB mode: Updating policy ${id} status to ${status}`);

  const updatedPolicy = await prisma.policy.update({
    where: { id },
    data: {
      status,
      ...(additionalData && Object.fromEntries(
        Object.entries(additionalData).filter(([key]) => key !== 'initiatedBy')
      ))
    },
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  // Add activity separately
  await prisma.policyActivity.create({
    data: {
      policyId: id,
      action: `status_changed_to_${status.toLowerCase()}`,
      performedBy
    }
  });

  // Fetch updated activities
  const finalPolicy = await prisma.policy.findUnique({
    where: { id },
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return finalPolicy;
};

export const addPolicyActivity = async (
  policyId: string,
  action: string,
  performedBy?: string,
  details?: any,
  ipAddress?: string
): Promise<PolicyActivity | null> => {
  console.log(`Real DB mode: Adding activity to policy ${policyId}`);

  return prisma.policyActivity.create({
    data: {
      policyId,
      action,
      details,
      performedBy,
      ipAddress
    }
  });
};

export const updatePolicyData = async (
  token: string,
  step: number,
  stepData: any
): Promise<PolicyWithRelations | null> => {
  console.log(`Real DB mode: Updating policy step ${step} data`);

  const policy = await prisma.policy.findUnique({
    where: { accessToken: token }
  });

  if (!policy) return null;

  // Update step data based on step number
  const updateData: any = { currentStep: Math.max(policy.currentStep, step) };

  switch (step) {
    case 1:
      updateData.profileData = stepData;
      break;
    case 2:
      updateData.employmentData = stepData;
      break;
    case 3:
      updateData.referencesData = stepData;
      break;
    case 4:
      updateData.documentsData = stepData;
      break;
    case 5:
      // Payment step - no form data to save
      break;
    case 6:
      updateData.guarantorData = stepData;
      break;
  }

  return await prisma.policy.update({
    where: { id: policy.id },
    data: updateData,
    include: {
      documents: true,
      activities: {
        orderBy: { createdAt: 'desc' }
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
};
