import { isEmulator } from '../env-check';
import prisma from '../prisma';
import { Policy, PolicyStatus, PolicyDocument, PolicyActivity, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// Type definitions
export interface CreatePolicyData {
  propertyId?: string;
  initiatedBy: string;
  tenantEmail: string;
  tenantPhone?: string;
}

export interface PolicyWithRelations extends Policy {
  documents: PolicyDocument[];
  activities: PolicyActivity[];
  initiatedByUser: {
    id: string;
    email: string;
    name: string | null;
  };
  reviewedByUser?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface GetPoliciesOptions {
  status?: PolicyStatus | 'all';
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

// Mock data for emulator
const mockPolicies: PolicyWithRelations[] = [
  {
    id: 'mock-policy-1',
    propertyId: 'property-1',
    initiatedBy: 'mock-user-1',
    tenantEmail: 'tenant1@example.com',
    tenantPhone: '+1234567890',
    status: PolicyStatus.SUBMITTED,
    currentStep: 4,
    profileData: {
      nationality: 'mexican',
      curp: 'ABCD123456HDFGTH01'
    },
    employmentData: {
      employmentStatus: 'employed',
      industry: 'technology',
      occupation: 'Software Engineer',
      companyName: 'Tech Corp',
      position: 'Senior Developer',
      monthlyIncome: 50000
    },
    referencesData: {
      personalReferenceName: 'John Doe',
      personalReferencePhone: '+1234567890'
    },
    documentsData: {
      identificationCount: 2,
      incomeCount: 3,
      optionalCount: 1
    },
    accessToken: 'mock-token-1',
    tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    submittedAt: new Date(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    reviewReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
    activities: [],
    initiatedByUser: {
      id: 'mock-user-1',
      email: 'staff@example.com',
      name: 'Staff User'
    },
    reviewedByUser: null
  },
  {
    id: 'mock-policy-2',
    propertyId: null,
    initiatedBy: 'mock-user-1',
    tenantEmail: 'tenant2@example.com',
    tenantPhone: null,
    status: PolicyStatus.IN_PROGRESS,
    currentStep: 2,
    profileData: {
      nationality: 'foreign',
      passport: 'AB123456'
    },
    employmentData: null,
    referencesData: null,
    documentsData: null,
    accessToken: 'mock-token-2',
    tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    submittedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    reviewReason: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(),
    documents: [],
    activities: [],
    initiatedByUser: {
      id: 'mock-user-1',
      email: 'staff@example.com',
      name: 'Staff User'
    },
    reviewedByUser: null
  }
];

let mockNextId = 3;

// Helper functions
const generateAccessToken = (): string => {
  return randomUUID();
};

const generateTokenExpiry = (): Date => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
};

// Service functions
export const createPolicy = async (data: CreatePolicyData): Promise<PolicyWithRelations> => {
  if (isEmulator()) {
    console.log('Emulator mode: Creating mock policy');
    const newPolicy: PolicyWithRelations = {
      id: `mock-policy-${mockNextId++}`,
      propertyId: data.propertyId || null,
      initiatedBy: data.initiatedBy,
      tenantEmail: data.tenantEmail,
      tenantPhone: data.tenantPhone || null,
      status: PolicyStatus.DRAFT,
      currentStep: 1,
      profileData: null,
      employmentData: null,
      referencesData: null,
      documentsData: null,
      accessToken: generateAccessToken(),
      tokenExpiry: generateTokenExpiry(),
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      reviewReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      documents: [],
      activities: [{
        id: `mock-activity-${mockNextId}`,
        policyId: `mock-policy-${mockNextId - 1}`,
        action: 'created',
        details: null,
        performedBy: data.initiatedBy,
        ipAddress: null,
        createdAt: new Date()
      }],
      initiatedByUser: {
        id: data.initiatedBy,
        email: 'staff@example.com',
        name: 'Staff User'
      },
      reviewedByUser: null
    };
    
    mockPolicies.push(newPolicy);
    return newPolicy;
  } else {
    console.log('Real DB mode: Creating policy');
    
    const newPolicy = await prisma.policy.create({
      data: {
        propertyId: data.propertyId,
        initiatedBy: data.initiatedBy,
        tenantEmail: data.tenantEmail,
        tenantPhone: data.tenantPhone,
        accessToken: generateAccessToken(),
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
        initiatedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        reviewedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    return newPolicy;
  }
};

export const getPolicies = async (options: GetPoliciesOptions = {}): Promise<GetPoliciesResult> => {
  const { status, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  if (isEmulator()) {
    console.log('Emulator mode: Fetching mock policies');
    
    let filteredPolicies = [...mockPolicies];
    
    // Filter by status
    if (status && status !== 'all') {
      filteredPolicies = filteredPolicies.filter(p => p.status === status);
    }
    
    // Filter by search (email)
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredPolicies = filteredPolicies.filter(p =>
        p.tenantEmail.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by createdAt desc
    filteredPolicies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const total = filteredPolicies.length;
    const paginatedPolicies = filteredPolicies.slice(skip, skip + limit);
    
    return {
      policies: paginatedPolicies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } else {
    console.log('Real DB mode: Fetching policies');
    
    const where: Prisma.PolicyWhereInput = {};
    
    if (status && status !== 'all') {
      where.status = status;
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
          initiatedByUser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          reviewedByUser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
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
  }
};

export const getPolicyById = async (id: string): Promise<PolicyWithRelations | null> => {
  if (isEmulator()) {
    console.log(`Emulator mode: Fetching mock policy ${id}`);
    return mockPolicies.find(p => p.id === id) || null;
  } else {
    console.log(`Real DB mode: Fetching policy ${id}`);
    return prisma.policy.findUnique({
      where: { id },
      include: {
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' }
        },
        initiatedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        reviewedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
  }
};

export const getPolicyByToken = async (token: string): Promise<PolicyWithRelations | null> => {
  if (isEmulator()) {
    console.log(`Emulator mode: Fetching mock policy by token`);
    const policy = mockPolicies.find(p => p.accessToken === token);
    
    // Check token expiry
    if (policy && policy.tokenExpiry < new Date()) {
      return null; // Token expired
    }
    
    return policy || null;
  } else {
    console.log(`Real DB mode: Fetching policy by token`);
    const policy = await prisma.policy.findUnique({
      where: { accessToken: token },
      include: {
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' }
        },
        initiatedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        reviewedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    // Check token expiry
    if (policy && policy.tokenExpiry < new Date()) {
      return null; // Token expired
    }
    
    return policy;
  }
};

export const updatePolicyStatus = async (
  id: string,
  status: PolicyStatus,
  performedBy: string,
  additionalData?: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PolicyWithRelations | null> => {
  if (isEmulator()) {
    console.log(`Emulator mode: Updating policy ${id} status to ${status}`);
    const index = mockPolicies.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    const updatedPolicy = {
      ...mockPolicies[index],
      status,
      ...additionalData,
      updatedAt: new Date()
    };
    
    // Add activity
    updatedPolicy.activities.push({
      id: `mock-activity-${mockNextId++}`,
      policyId: id,
      action: `status_changed_to_${status.toLowerCase()}`,
      details: null,
      performedBy,
      ipAddress: null,
      createdAt: new Date()
    });
    
    mockPolicies[index] = updatedPolicy;
    return updatedPolicy;
  } else {
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
        initiatedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        reviewedByUser: {
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
        initiatedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        reviewedByUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return finalPolicy;
  }
};

export const addPolicyActivity = async (
  policyId: string,
  action: string,
  performedBy?: string,
  details?: any,
  ipAddress?: string
): Promise<PolicyActivity | null> => {
  if (isEmulator()) {
    console.log(`Emulator mode: Adding activity to policy ${policyId}`);
    const policy = mockPolicies.find(p => p.id === policyId);
    
    if (!policy) return null;
    
    const activity: PolicyActivity = {
      id: `mock-activity-${mockNextId++}`,
      policyId,
      action,
      details,
      performedBy: performedBy || null,
      ipAddress: ipAddress || null,
      createdAt: new Date()
    };
    
    policy.activities.push(activity);
    return activity;
  } else {
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
  }
};