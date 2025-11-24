import { Prisma } from '@prisma/client';
import {
  JointObligorComplete,
  JointObligorPartial
} from '@/lib/schemas/joint-obligor';

/**
 * Prepares Joint Obligor data for database insertion/update
 * Handles the transformation from UI schema to database schema
 *
 * Key transformations:
 * 1. Maps jointObligorType enum to database field
 * 2. Handles flexible guarantee method (income vs property)
 * 3. Extracts nested address objects to separate relations
 * 4. Ensures proper null handling for optional fields
 * 5. Maps UI field names to database column names
 */
export function prepareJointObligorForDB(
  data: JointObligorComplete | JointObligorPartial,
  policyId: string,
  actorId?: string
): Prisma.JointObligorCreateInput | Prisma.JointObligorUpdateInput {
  // Determine the type of Joint Obligor
  const jointObligorType = (data as any).jointObligorType || 'INDIVIDUAL';
  const isCompany = jointObligorType === 'COMPANY';
  const guaranteeMethod = (data as any).guaranteeMethod || 'income';

  // Start with base fields
  const dbData: any = {
    // Link to policy
    policy: {
      connect: { id: policyId }
    },

    // Actor ID if provided
    ...(actorId && { actorId }),

    // Joint Obligor type
    jointObligorType,

    // Relationship to tenant (required)
    relationshipToTenant: (data as any).relationshipToTenant || null,

    // Guarantee method
    guaranteeMethod,
    hasPropertyGuarantee: guaranteeMethod === 'property',
  };

  // Handle Individual-specific fields
  if (!isCompany) {
    dbData.fullName = (data as any).fullName || null;
    dbData.birthDate = (data as any).birthDate ? new Date((data as any).birthDate) : null;
    dbData.birthPlace = (data as any).birthPlace || null;
    dbData.nationality = (data as any).nationality || null;
    dbData.curp = (data as any).curp || null;
    dbData.rfc = (data as any).rfc || null;
    dbData.identificationNumber = (data as any).identificationNumber || null;

    // Employment fields (important for income guarantee)
    dbData.employmentStatus = (data as any).employmentStatus || null;
    dbData.occupation = (data as any).occupation || null;
    dbData.employerName = (data as any).employerName || null;
    dbData.position = (data as any).position || null;
    dbData.monthlyIncome = (data as any).monthlyIncome || null;
    dbData.incomeSource = (data as any).incomeSource || null;

    // Handle employer address if provided
    if ((data as any).employerAddressDetails) {
      const empAddr = (data as any).employerAddressDetails;
      dbData.employerAddressDetails = {
        create: {
          street: empAddr.street || null,
          exteriorNumber: empAddr.exteriorNumber || null,
          interiorNumber: empAddr.interiorNumber || null,
          neighborhood: empAddr.neighborhood || null,
          municipality: empAddr.municipality || null,
          state: empAddr.state || null,
          postalCode: empAddr.postalCode || null,
          country: empAddr.country || 'México',
        }
      };
    }
  }

  // Handle Company-specific fields
  if (isCompany) {
    dbData.companyName = (data as any).companyName || null;
    dbData.rfc = (data as any).rfc || null;
    dbData.constitutionDate = (data as any).constitutionDate ? new Date((data as any).constitutionDate) : null;
    dbData.companyType = (data as any).companyType || null;
    dbData.industry = (data as any).industry || null;
    dbData.commercialActivity = (data as any).commercialActivity || null;
    dbData.taxId = (data as any).taxId || null;

    // Legal representative
    dbData.legalRepName = (data as any).legalRepName || null;
    dbData.legalRepRfc = (data as any).legalRepRfc || null;
    dbData.legalRepCurp = (data as any).legalRepCurp || null;
    dbData.legalRepEmail = (data as any).legalRepEmail || null;
    dbData.legalRepPhone = (data as any).legalRepPhone || null;
  }

  // Contact information (common)
  dbData.email = (data as any).email || null;
  dbData.phoneNumber = (data as any).phoneNumber || null;
  dbData.alternatePhoneNumber = (data as any).alternatePhoneNumber || null;

  // Handle main address
  if ((data as any).addressDetails) {
    const addr = (data as any).addressDetails;
    dbData.addressDetails = {
      create: {
        street: addr.street || null,
        exteriorNumber: addr.exteriorNumber || null,
        interiorNumber: addr.interiorNumber || null,
        neighborhood: addr.neighborhood || null,
        municipality: addr.municipality || null,
        state: addr.state || null,
        postalCode: addr.postalCode || null,
        country: addr.country || 'México',
        references: addr.references || null,
      }
    };
  }

  // Handle Income Guarantee specific fields
  if (guaranteeMethod === 'income') {
    dbData.bankName = (data as any).bankName || null;
    dbData.accountHolder = (data as any).accountHolder || null;
    dbData.hasProperties = (data as any).hasProperties || false;

    // Ensure monthly income is set for income guarantee
    if (!dbData.monthlyIncome && (data as any).monthlyIncome) {
      dbData.monthlyIncome = (data as any).monthlyIncome;
    }
  }

  // Handle Property Guarantee specific fields
  if (guaranteeMethod === 'property') {
    dbData.propertyValue = (data as any).propertyValue || null;
    dbData.propertyDeedNumber = (data as any).propertyDeedNumber || null;
    dbData.propertyRegistry = (data as any).propertyRegistry || null;
    dbData.propertyTaxAccount = (data as any).propertyTaxAccount || null;
    dbData.propertyUnderLegalProceeding = (data as any).propertyUnderLegalProceeding || false;

    // Marriage information (for property guarantee)
    dbData.maritalStatus = (data as any).maritalStatus || null;
    dbData.spouseName = (data as any).spouseName || null;
    dbData.spouseRfc = (data as any).spouseRfc || null;
    dbData.spouseCurp = (data as any).spouseCurp || null;

    // Handle guarantee property address
    if ((data as any).guaranteePropertyDetails) {
      const propAddr = (data as any).guaranteePropertyDetails;
      dbData.guaranteePropertyDetails = {
        create: {
          street: propAddr.street || null,
          exteriorNumber: propAddr.exteriorNumber || null,
          interiorNumber: propAddr.interiorNumber || null,
          neighborhood: propAddr.neighborhood || null,
          municipality: propAddr.municipality || null,
          state: propAddr.state || null,
          postalCode: propAddr.postalCode || null,
          country: propAddr.country || 'México',
        }
      };
    }
  }

  // Handle References
  if ((data as any).personalReferences && Array.isArray((data as any).personalReferences)) {
    dbData.personalReferences = {
      deleteMany: {},  // Clear existing references
      create: (data as any).personalReferences.map((ref: any) => ({
        name: ref.name || null,
        relationship: ref.relationship || null,
        phoneNumber: ref.phoneNumber || null,
        email: ref.email || null,
        address: ref.address || null,
        yearsKnown: ref.yearsKnown || null,
      }))
    };
  }

  if ((data as any).commercialReferences && Array.isArray((data as any).commercialReferences)) {
    dbData.commercialReferences = {
      deleteMany: {},  // Clear existing references
      create: (data as any).commercialReferences.map((ref: any) => ({
        companyName: ref.companyName || null,
        contactName: ref.contactName || null,
        position: ref.position || null,
        phoneNumber: ref.phoneNumber || null,
        email: ref.email || null,
        relationship: ref.relationship || null,
        yearsKnown: ref.yearsKnown || null,
      }))
    };
  }

  // Additional info from documents tab
  if ((data as any).additionalInfo) {
    dbData.additionalInfo = (data as any).additionalInfo;
  }

  return dbData;
}

/**
 * Prepares Joint Obligor data for partial updates (admin mode)
 * Only includes fields that are actually present in the data
 */
export function prepareJointObligorForPartialUpdate(
  data: JointObligorPartial,
  existingData?: any
): Prisma.JointObligorUpdateInput {
  const dbData: any = {};
  const guaranteeMethod = data.guaranteeMethod || existingData?.guaranteeMethod || 'income';

  // Only update fields that are present in the input
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];

    // Skip undefined values and complex objects
    if (value === undefined) return;

    // Handle special cases
    switch (key) {
      case 'addressDetails':
      case 'employerAddressDetails':
      case 'guaranteePropertyDetails':
        // Handle address updates
        if (value && typeof value === 'object') {
          dbData[key] = {
            upsert: {
              create: value,
              update: value,
            }
          };
        }
        break;

      case 'personalReferences':
      case 'commercialReferences':
        // Handle reference arrays
        if (Array.isArray(value)) {
          dbData[key] = {
            deleteMany: {},
            create: value,
          };
        }
        break;

      case 'birthDate':
      case 'constitutionDate':
        // Handle date fields
        dbData[key] = value ? new Date(value) : null;
        break;

      case 'jointObligorType':
        // Map type enum
        dbData.jointObligorType = value;
        break;

      case 'guaranteeMethod':
        // Update guarantee method and related flag
        dbData.guaranteeMethod = value;
        dbData.hasPropertyGuarantee = value === 'property';
        break;

      default:
        // Direct mapping for simple fields
        if (typeof value !== 'object' || value === null) {
          dbData[key] = value;
        }
    }
  });

  return dbData;
}