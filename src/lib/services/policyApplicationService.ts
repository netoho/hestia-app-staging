import prisma from '../prisma';
import { Policy, PolicyDocument, PolicyActivity, PolicyStatus, Prisma } from '@prisma/client';

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
  status?: PolicyStatus | 'all';
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
  const newPolicy = await prisma.policy.create({
    data: {
      propertyAddress: data.propertyAddress || 'TBD',
      propertyType: 'APARTMENT', // Default, should be passed in data
      rentAmount: 0, // Required field, should be passed in data
      guarantorType: 'NONE', // Default, should be passed in data
      totalPrice: data.price || 0,
      tenantPercentage: data.tenantPaymentPercent || 100,
      landlordPercentage: data.landlordPaymentPercent || 0,
      contractLength: data.contractLength || 12,
      packageId: data.packageId,
      createdById: data.createdById,
      activities: {
        create: {
          action: 'created',
          description: 'Policy created',
          performedById: data.createdById
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
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  return newPolicy;
};

export const getPolicies = async (options: GetPoliciesOptions = {}): Promise<GetPoliciesResult> => {
  const { status, paymentStatus, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.PolicyWhereInput = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== 'all') {
    where.payments = {
      some: {
        status: paymentStatus as any
      }
    };
  }

  if (search && search.trim()) {
    where.OR = [
      {
        tenant: {
          email: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      },
      {
        landlord: {
          email: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      }
    ];
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
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        managedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true
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
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });
};


export const updatePolicyStatus = async (
  id: string,
  status: PolicyStatus,
  performedBy: string,
  additionalData?: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PolicyWithRelations | null> => {
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
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  // Add activity separately
  await prisma.policyActivity.create({
    data: {
      policyId: id,
      action: `status_changed_to_${status.toLowerCase()}`,
      description: `Status changed to ${status}`,
      performedById: performedBy
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
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
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
  return prisma.policyActivity.create({
    data: {
      policyId,
      action,
      description: action,
      details,
      performedById: performedBy,
      ipAddress
    }
  });
};

