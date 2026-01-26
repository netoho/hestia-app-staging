import prisma from '@/lib/prisma';
import { PolicyStatus, DocumentUploadStatus } from "@/prisma/generated/prisma-client/enums";
import { PropertyDetailsService } from '../PropertyDetailsService';
import { CreatePolicyData, logPolicyActivityParams } from './types';
import { validatePolicyNumberFormat } from "@/lib/utils/policy";


// Helper to sanitize empty objects to null
function sanitizeAddressDetails(details: any): any | null {
  if (!details) return null;
  if (typeof details === 'object' && Object.keys(details).length === 0) return null;
  return details;
}

export async function createPolicy(data: CreatePolicyData) {
  // Use provided policy number or generate a new one
  let policyNumber = data.policyNumber;
  if (!policyNumber) {
    const date = new Date();
    const localDate = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    policyNumber = `POL-${localDate}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  // Extract property details from data
  const { propertyDetails, ...policyData } = data;

  // Sanitize address details (convert {} to null)
  const sanitizedPropertyAddressDetails = sanitizeAddressDetails(policyData.propertyAddressDetails);
  const sanitizedContractSigningAddressDetails = sanitizeAddressDetails(policyData.contractSigningAddressDetails);

  // Create the policy with the new schema
  const policy = await prisma.policy.create({
    data: {
      policyNumber,
      internalCode: policyData.internalCode,
      rentAmount: parseFloat(policyData.rentAmount.toString()),
      contractLength: policyData.contractLength || 12,
      totalPrice: policyData.totalPrice || parseFloat((policyData.depositAmount || policyData.rentAmount).toString()),
      tenantPercentage: policyData.tenantPercentage || 100,
      landlordPercentage: policyData.landlordPercentage || 0,
      guarantorType: policyData.guarantorType || 'NONE',
      packageId: policyData.packageId,
      createdById: policyData.createdById,
      status: 'DRAFT',
      // Create related actors
      landlords: {
        create: {
          isPrimary: true, // First landlord is always primary
          isCompany: policyData.landlord.isCompany || false,
          // Personal fields
          firstName: policyData.landlord.firstName,
          middleName: policyData.landlord.middleName,
          paternalLastName: policyData.landlord.paternalLastName,
          maternalLastName: policyData.landlord.maternalLastName,
          // Company fields
          companyName: policyData.landlord.companyName,
          companyRfc: policyData.landlord.companyRfc,
          legalRepFirstName: policyData.landlord.legalRepFirstName,
          legalRepMiddleName: policyData.landlord.legalRepMiddleName,
          legalRepPaternalLastName: policyData.landlord.legalRepPaternalLastName,
          legalRepMaternalLastName: policyData.landlord.legalRepMaternalLastName,
          // Contact
          email: policyData.landlord.email,
          phone: policyData.landlord.phone || '',
          rfc: policyData.landlord.rfc || '',
          address: '', // Will be updated when landlord fills their info
        }
      },
      tenant: {
        create: {
          tenantType: policyData.tenant.tenantType || 'INDIVIDUAL',
          // Personal fields
          firstName: policyData.tenant.firstName,
          middleName: policyData.tenant.middleName,
          paternalLastName: policyData.tenant.paternalLastName,
          maternalLastName: policyData.tenant.maternalLastName,
          // Company fields
          companyName: policyData.tenant.tenantType === 'COMPANY' ? policyData.tenant.companyName : undefined,
          email: policyData.tenant.email,
          phone: policyData.tenant.phone || '',
          rfc: policyData.tenant.rfc || '',
        }
      }
    },
    include: {
      landlords: true,
      tenant: true,
    }
  });

  // Always upsert PropertyDetails (1:1 relationship with Policy)
  const propertyDetailsService = new PropertyDetailsService();
  const propertyDetailsData = {
    ...propertyDetails,
    propertyType: policyData.propertyType || 'APARTMENT',
    propertyDescription: policyData.propertyDescription,
    propertyAddressDetails: sanitizedPropertyAddressDetails,
    contractSigningAddressDetails: sanitizedContractSigningAddressDetails,
    // Property features
    parkingSpaces: policyData.parkingSpaces,
    parkingNumbers: policyData.parkingNumbers,
    isFurnished: policyData.isFurnished,
    hasPhone: policyData.hasPhone,
    hasElectricity: policyData.hasElectricity,
    hasWater: policyData.hasWater,
    hasGas: policyData.hasGas,
    hasCableTV: policyData.hasCableTV,
    hasInternet: policyData.hasInternet,
    utilitiesInLandlordName: policyData.utilitiesInLandlordName,
    hasInventory: policyData.hasInventory,
    hasRules: policyData.hasRules,
    rulesType: policyData.rulesType,
    petsAllowed: policyData.petsAllowed,
    propertyDeliveryDate: policyData.propertyDeliveryDate,
    contractSigningDate: policyData.contractSigningDate,
  };

  const detailsResult = await propertyDetailsService.upsert(policy.id, propertyDetailsData);
  if (!detailsResult.ok) {
    console.error('Failed to upsert property details:', detailsResult.error);
    // Note: We don't fail the policy creation if property details fail
    // but we log the error for investigation
  }

  // Create joint obligors if provided
  if (data.jointObligors && data.jointObligors.length > 0) {
    await prisma.jointObligor.createMany({
      data: data.jointObligors.map((jo) => ({
        policyId: policy.id,
        firstName: jo.firstName,
        middleName: jo.middleName || null,
        paternalLastName: jo.paternalLastName,
        maternalLastName: jo.maternalLastName,
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
        firstName: aval.firstName,
        middleName: aval.middleName || null,
        paternalLastName: aval.paternalLastName,
        maternalLastName: aval.maternalLastName,
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
      // Policy
      { policyNumber: { contains: params.search, mode: 'insensitive' } },
      { internalCode: { contains: params.search, mode: 'insensitive' } },
      // Property address (via PropertyDetails → PropertyAddress)
      { propertyDetails: { propertyAddressDetails: { formattedAddress: { contains: params.search, mode: 'insensitive' } } } },
      { propertyDetails: { propertyAddressDetails: { street: { contains: params.search, mode: 'insensitive' } } } },

      // Tenant - search across name fields
      { tenant: { firstName: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { paternalLastName: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { maternalLastName: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { companyName: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { email: { contains: params.search, mode: 'insensitive' } } },
      { tenant: { phone: { contains: params.search, mode: 'insensitive' } } },

      // Landlords - search across name fields
      { landlords: { some: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { landlords: { some: { paternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { landlords: { some: { maternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { landlords: { some: { companyName: { contains: params.search, mode: 'insensitive' } } } },
      { landlords: { some: { email: { contains: params.search, mode: 'insensitive' } } } },
      { landlords: { some: { phone: { contains: params.search, mode: 'insensitive' } } } },

      // Joint Obligors - search across name fields
      { jointObligors: { some: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { jointObligors: { some: { paternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { jointObligors: { some: { maternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { jointObligors: { some: { email: { contains: params.search, mode: 'insensitive' } } } },
      { jointObligors: { some: { phone: { contains: params.search, mode: 'insensitive' } } } },

      // Avals - search across name fields
      { avals: { some: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { avals: { some: { paternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { avals: { some: { maternalLastName: { contains: params.search, mode: 'insensitive' } } } },
      { avals: { some: { email: { contains: params.search, mode: 'insensitive' } } } },
      { avals: { some: { phone: { contains: params.search, mode: 'insensitive' } } } },

      // Creator
      { createdBy: { name: { contains: params.search, mode: 'insensitive' } } },
      { createdBy: { email: { contains: params.search, mode: 'insensitive' } } },
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
        landlords: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        },
        tenant: true,
        jointObligors: true,
        avals: true,
        propertyDetails: {
          include: {
            propertyAddressDetails: true,
          },
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
            performedByType: true,
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
      landlords: {
        include: {
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      },
      tenant: {
        include: {
          personalReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          previousRentalAddressDetails: true,
        }
      },
      jointObligors: {
        include: {
          personalReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
        }
      },
      avals: {
        include: {
          personalReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
        }
      },
      tenantHistory: {
        select: {
          id: true,
          tenantType: true,
          firstName: true,
          middleName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
          email: true,
          phone: true,
          replacedAt: true,
          replacementReason: true,
          verificationStatus: true,
        },
        orderBy: { replacedAt: 'desc' },
      },
      jointObligorHistory: {
        select: {
          id: true,
          jointObligorType: true,
          firstName: true,
          middleName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
          email: true,
          phone: true,
          replacedAt: true,
          replacementReason: true,
          verificationStatus: true,
        },
        orderBy: { replacedAt: 'desc' },
      },
      avalHistory: {
        select: {
          id: true,
          avalType: true,
          firstName: true,
          middleName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
          email: true,
          phone: true,
          replacedAt: true,
          replacementReason: true,
          verificationStatus: true,
        },
        orderBy: { replacedAt: 'desc' },
      },
      propertyDetails: {
        include: {
          propertyAddressDetails: true,
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
          performedByType: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      investigation: {
        select: {
          verdict: true,
        }
      },
      payments: {
        select: {
          id: true,
          status: true,
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


export async function logPolicyActivity(data: logPolicyActivityParams) {
  const {
    policyId,
    action,
    description,
    details,
    performedById,
    performedByType,
    ipAddress
  } = data;
  return prisma.policyActivity.create({
    data: {
      policyId,
      action,
      description,
      details,
      performedById: performedById || undefined,
      performedByType: performedByType || undefined,
      ipAddress,
    }
  });
}


/**
 * Checks if a policy number is unique in the database
 * @param policyNumber The policy number to check
 * @returns Promise<boolean> true if unique, false if already exists
 */
export async function checkPolicyNumberUnique(policyNumber: string): Promise<boolean> {
  try {

    const existingPolicy = await prisma.policy.findUnique({
      where: { policyNumber },
      select: { id: true },
    });

    return !existingPolicy;

  } catch (error) {
    console.error('Error checking policy number:', error);
    return false;
  }
}

/**
 * Validates a policy number (format and uniqueness)
 * @param policyNumber The policy number to validate
 * @returns Promise with validation result
 */
export async function validatePolicyNumber(policyNumber: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // Check format
  if (!validatePolicyNumberFormat(policyNumber)) {
    return {
      isValid: false,
      error: 'Formato inválido. Use: POL-YYYYMMDD-XXX',
    };
  }

  // Check uniqueness
  const isUnique = await checkPolicyNumberUnique(policyNumber);
  if (!isUnique) {
    return {
      isValid: false,
      error: 'Este número de póliza ya existe',
    };
  }

  return { isValid: true };
}

/**
 * Get complete policy data for PDF generation
 * Includes all nested relations with full data
 */
export async function getPolicyForPDF(id: string) {
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
      landlords: {
        include: {
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      },
      tenant: {
        include: {
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          previousRentalAddressDetails: true,
        }
      },
      jointObligors: {
        include: {
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
        }
      },
      avals: {
        include: {
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
        }
      },
      propertyDetails: {
        include: {
          propertyAddressDetails: true,
          contractSigningAddressDetails: true,
        }
      },
      documents: {
        orderBy: {
          createdAt: 'desc'
        }
      },
      investigation: true,
      payments: {
        orderBy: {
          createdAt: 'desc'
        }
      },
      activities: {
        select: {
          id: true,
          action: true,
          description: true,
          performedByType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
    }
  });
}
