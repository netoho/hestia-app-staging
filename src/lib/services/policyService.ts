import prisma from '../prisma';
import { PolicyStatus, GuarantorType, PropertyType, TenantType } from '@prisma/client';

interface CreatePolicyData {
  propertyAddress: string;
  propertyType?: PropertyType;
  propertyDescription?: string;
  rentAmount: string | number;
  depositAmount?: string | number;
  contractLength?: number;
  startDate?: string;
  endDate?: string;
  guarantorType?: GuarantorType;
  packageId?: string;
  tenantPercentage?: number;
  landlordPercentage?: number;
  totalPrice?: number;
  createdById: string;
  landlord: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    rfc?: string;
  };
  tenant: {
    tenantType?: TenantType;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    rfc?: string;
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
  const date = new Date();
  const localDate = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const policyNumber = `POL-${localDate}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  // Create the policy with the new schema
  const policy = await prisma.policy.create({
    data: {
      policyNumber,
      propertyAddress: data.propertyAddress,
      propertyType: data.propertyType || 'APARTMENT',
      propertyDescription: data.propertyDescription,
      rentAmount: parseFloat(data.rentAmount.toString()),
      contractLength: data.contractLength || 12,
      totalPrice: data.totalPrice || parseFloat((data.depositAmount || data.rentAmount).toString()),
      tenantPercentage: data.tenantPercentage || 100,
      landlordPercentage: data.landlordPercentage || 0,
      guarantorType: data.guarantorType || 'NONE',
      packageId: data.packageId,
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
          tenantType: data.tenant.tenantType || 'INDIVIDUAL',
          fullName: data.tenant.tenantType === 'COMPANY'
            ? (data.tenant.companyName || '')
            : `${data.tenant.firstName || ''} ${data.tenant.lastName || ''}`.trim(),
          companyName: data.tenant.tenantType === 'COMPANY' ? data.tenant.companyName : undefined,
          email: data.tenant.email,
          phone: data.tenant.phone || '',
          rfc: data.tenant.rfc || '',
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
  createdById?: string;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params?.status && params.status !== 'all') {
    where.status = params.status;
  }

  if (params?.createdById) {
    where.createdById = params.createdById;
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
      landlord: {
        include: {
          documents: true,
        }
      },
      tenant: {
        include: {
          references: true,
          documents: true,
        }
      },
      jointObligors: {
        include: {
          references: true,
          documents: true,
        }
      },
      avals: {
        include: {
          references: true,
          documents: true,
        }
      },
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
      // reviewedAt: new Date(),
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

interface logPolicyActivityParams {
  policyId: string;
  action: string;
  description: string;
  details?: any;
  performedById?: string;
  performedByActor?: string;
  ipAddress?: string;
}

export async function logPolicyActivity(data: logPolicyActivityParams) {
  const {
    policyId,
    action,
    description,
    details,
    performedById,
    performedByActor,
    ipAddress
  } = data;
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
