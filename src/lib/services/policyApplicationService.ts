import { isMockEnabled, isDemoMode } from '../env-check';
import { DemoORM } from './demoDatabase';
import prisma from '../prisma';
import { Policy, PolicyStatus, PolicyStatusType, PolicyDocument, PolicyActivity, Prisma } from '@/lib/prisma-types';
import { randomUUID } from 'crypto';
import { generateSecureToken, generateTokenExpiry } from '../utils/tokenUtils';
import { MockDataService } from './mockDataService';

// Type definitions
export interface CreatePolicyData {
  propertyId?: string;
  initiatedBy: string;
  tenantEmail: string;
  tenantPhone?: string;
  packageId?: string;
  packageName?: string;
  price?: number;
  investigationFee?: number;
  tenantPaymentPercent?: number;
  landlordPaymentPercent?: number;
  contractLength?: number;
}

export interface PolicyWithRelations extends Omit<Policy, 'initiatedByUser' | 'reviewedByUser'> {
  documents: PolicyDocument[];
  activities: PolicyActivity[];
  initiatedByUser: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  reviewedByUser?: {
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

// Mock data for emulator
const mockPolicies: PolicyWithRelations[] = [
  {
    id: 'mock-policy-1',
    propertyId: 'property-1',
    initiatedBy: 'mock-user-1',
    tenantEmail: 'tenant1@example.com',
    tenantPhone: '+1234567890',
    status: PolicyStatus.ACTIVE,
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
    tenantName: 'John Tenant',
    propertyAddress: '123 Mock Street, Demo City',
    guarantorData: null,
    
    // Payment configuration
    packageId: 'premium',
    packageName: 'Escudo Premium',
    totalPrice: 5500,
    investigationFee: 200,
    tenantPaymentPercent: 100,
    landlordPaymentPercent: 0,
    paymentStatus: 'COMPLETED' as any,
    
    // Lifecycle dates
    investigationStartedAt: new Date(),
    investigationCompletedAt: new Date(),
    contractUploadedAt: new Date(),
    contractSignedAt: new Date(),
    policyActivatedAt: new Date(),
    contractLength: 12,
    policyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    
    price: 5500, // For backward compatibility
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
    activities: [],
    initiatedByUser: {
      id: 'mock-user-1',
      email: 'staff@example.com',
      name: 'Staff User',
      role: 'staff',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    reviewedByUser: null
  },
  {
    id: 'mock-policy-2',
    propertyId: null,
    initiatedBy: 'mock-user-1',
    tenantEmail: 'tenant2@example.com',
    tenantPhone: null,
    status: PolicyStatus.INVESTIGATION_IN_PROGRESS,
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
    tenantName: 'Jane Tenant',
    propertyAddress: '456 Another Street, Demo City',
    guarantorData: null,
    
    // Payment configuration
    packageId: 'basic',
    packageName: 'Escudo Básico',
    totalPrice: 2900,
    investigationFee: 200,
    tenantPaymentPercent: 100,
    landlordPaymentPercent: 0,
    paymentStatus: 'PENDING' as any,
    
    // Lifecycle dates
    investigationStartedAt: new Date(),
    investigationCompletedAt: null,
    contractUploadedAt: null,
    contractSignedAt: null,
    policyActivatedAt: null,
    contractLength: 12,
    policyExpiresAt: null,
    
    price: 2900, // For backward compatibility
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(),
    documents: [],
    activities: [],
    initiatedByUser: {
      id: 'mock-user-1',
      email: 'staff@example.com',
      name: 'Staff User',
      role: 'staff',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    reviewedByUser: null
  }
];

let mockNextId = 3;

// Helper functions (now using imported utilities)

// Service functions
export const createPolicy = async (data: CreatePolicyData): Promise<PolicyWithRelations> => {
  if (isMockEnabled()) {
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
      accessToken: generateSecureToken(),
      tokenExpiry: generateTokenExpiry(),
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      reviewReason: null,
      tenantName: data.tenantName || null,
      propertyAddress: data.propertyAddress || null,
      guarantorData: null,
      packageId: data.packageId || null,
      packageName: data.packageName || null,
      price: data.price || 0,
      totalPrice: data.price || 0,
      investigationFee: data.investigationFee || 200,
      tenantPaymentPercent: data.tenantPaymentPercent || 100,
      landlordPaymentPercent: data.landlordPaymentPercent || 0,
      contractLength: data.contractLength || 12,
      paymentStatus: 'PENDING' as any, // Will be properly typed after regenerating types
      
      // Lifecycle dates
      investigationStartedAt: null,
      investigationCompletedAt: null,
      contractUploadedAt: null,
      contractSignedAt: null,
      policyActivatedAt: null,
      policyExpiresAt: null,
      
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
        name: 'Staff User',
        role: 'staff',
        createdAt: new Date(),
        updatedAt: new Date()
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
  const { status, paymentStatus, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  if (isMockEnabled()) {
    console.log('Mock mode: Fetching mock policies from seed data');
    
    // Get mock policies from centralized service
    const mockPoliciesData = await MockDataService.getPolicies();
    let filteredPolicies = [...mockPoliciesData];
    
    // Filter by status
    if (status && status !== 'all') {
      filteredPolicies = filteredPolicies.filter(p => p.status === status);
    }
    
    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'all') {
      filteredPolicies = filteredPolicies.filter(p => (p as any).paymentStatus === paymentStatus);
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
  if (isMockEnabled()) {
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
  if (isMockEnabled()) {
    console.log(`Demo mode: Fetching policy by token`);
    return await DemoORM.findUniquePolicy(
      { accessToken: token },
      {
        include: {
          initiatedByUser: true,
          reviewedByUser: true,
          documents: true,
          activities: true,
        }
      }
    );
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
        },
        // Include new structured data models
        profileData: true,
        employmentData: true,
        referencesData: true,
        documentsData: true,
        guarantorData: true
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
  status: PolicyStatusType,
  performedBy: string,
  additionalData?: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PolicyWithRelations | null> => {
  if (isMockEnabled()) {
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
  if (isMockEnabled()) {
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

export const updatePolicyData = async (
  token: string,
  step: number,
  stepData: any
): Promise<PolicyWithRelations | null> => {
  if (isDemoMode()) {
    console.log(`Demo mode: Updating policy step ${step} data`);
    
    const policy = await DemoORM.findUniquePolicy(
      { accessToken: token },
      {
        include: {
          initiatedByUser: true,
          reviewedByUser: true,
          documents: true,
          activities: true
        }
      }
    );
    
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
    
    return await DemoORM.updatePolicy({ id: policy.id }, updateData, {
      include: {
        initiatedByUser: true,
        reviewedByUser: true,
        documents: true,
        activities: true
      }
    });
  } else {
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