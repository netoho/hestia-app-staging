import prisma from '../prisma';
import { PolicyStatus, GuarantorType, PropertyType } from '@prisma/client';

interface CreatePolicyData {
  propertyAddress: string;
  propertyType?: PropertyType;
  rentAmount: string | number;
  depositAmount?: string | number;
  guarantorType?: GuarantorType;
  createdById: string;
  landlord: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    rfc?: string;
  };
  tenant: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  jointObligors?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }>;
  avals?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }>;
}

export async function createPolicy(data: CreatePolicyData) {
  const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create the policy with the new schema
  const policy = await prisma.policy.create({
    data: {
      policyNumber,
      propertyAddress: data.propertyAddress,
      propertyType: data.propertyType || 'APARTMENT',
      rentAmount: parseFloat(data.rentAmount.toString()),
      totalPrice: parseFloat((data.depositAmount || data.rentAmount).toString()),
      guarantorType: data.guarantorType || 'NONE',
      createdById: data.createdById,
      status: 'DRAFT',
      // Create related actors
      landlord: {
        create: {
          fullName: `${data.landlord.firstName} ${data.landlord.lastName}`,
          email: data.landlord.email,
          phone: data.landlord.phone || '',
          rfc: data.landlord.rfc || '',
          address: data.propertyAddress, // Use property address as default
        }
      },
      tenant: {
        create: {
          fullName: `${data.tenant.firstName} ${data.tenant.lastName}`,
          email: data.tenant.email,
          phone: data.tenant.phone || '',
        }
      }
    },
    include: {
      landlord: true,
      tenant: true,
    }
  });

  // Create joint obligors if provided
  if (data.jointObligors && data.jointObligors.length > 0) {
    await prisma.jointObligor.createMany({
      data: data.jointObligors.map((jo) => ({
        policyId: policy.id,
        fullName: `${jo.firstName} ${jo.lastName}`,
        email: jo.email,
        phone: jo.phone || '',
        nationality: 'MEXICAN',
        employmentStatus: 'employed',
        occupation: '',
        companyName: '',
        position: '',
        monthlyIncome: 0,
        incomeSource: 'salary',
      }))
    });
  }

  // Create avals if provided
  if (data.avals && data.avals.length > 0) {
    await prisma.aval.createMany({
      data: data.avals.map((aval) => ({
        policyId: policy.id,
        fullName: `${aval.firstName} ${aval.lastName}`,
        email: aval.email,
        phone: aval.phone || '',
        nationality: 'MEXICAN',
        employmentStatus: 'employed',
        occupation: '',
        companyName: '',
        position: '',
        monthlyIncome: 0,
        incomeSource: 'salary',
        propertyAddress: '',
        propertyValue: 0,
      }))
    });
  }

  return policy;
}

export async function getPolicies(params?: {
  status?: PolicyStatus | 'all';
  paymentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params?.status && params.status !== 'all') {
    where.status = params.status;
  }

  if (params?.search) {
    where.OR = [
      { policyNumber: { contains: params.search, mode: 'insensitive' } },
      { propertyAddress: { contains: params.search, mode: 'insensitive' } },
      { tenant: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { email: { contains: params.search, mode: 'insensitive' } } },
      { landlord: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { landlord: { email: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      skip,
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
        managedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
        landlord: true,
        tenant: true,
        jointObligors: true,
        avals: true,
        documents: {
          select: {
            id: true,
            category: true,
            originalName: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        activities: {
          select: {
            id: true,
            action: true,
            description: true,
            details: true,
            performedById: true,
            performedBy: {
              select: {
                id: true,
                email: true,
                name: true,
              }
            },
            performedByActor: true,
            ipAddress: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Limit activities to last 10
        }
      },
      orderBy: {
        createdAt: 'desc'
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

export async function getPolicyById(id: string) {
  return prisma.policy.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      landlord: true,
      tenant: true,
      jointObligors: true,
      avals: true,
      documents: {
        select: {
          id: true,
          category: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      activities: {
        select: {
          id: true,
          action: true,
          description: true,
          details: true,
          performedById: true,
          performedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          performedByActor: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });
}

export async function updatePolicyStatus(
  id: string,
  status: PolicyStatus,
  userId: string,
  reviewNotes?: string,
  reviewReason?: string
) {
  return prisma.policy.update({
    where: { id },
    data: {
      status,
      managedById: userId,
      reviewedAt: new Date(),
      ...(reviewNotes && { reviewNotes }),
      ...(reviewReason && { rejectionReason: reviewReason }),
    },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      managedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      }
    }
  });
}

export async function logPolicyActivity(
  policyId: string,
  action: string,
  description: string,
  details?: any,
  performedById?: string,
  performedByActor?: string,
  ipAddress?: string
) {
  return prisma.policyActivity.create({
    data: {
      policyId,
      action,
      description,
      details,
      performedById,
      performedByActor,
      ipAddress,
    }
  });
}