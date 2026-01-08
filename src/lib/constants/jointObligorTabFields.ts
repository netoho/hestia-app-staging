/**
 * Joint Obligor Tab Field Definitions
 * Maps which fields belong to each tab in the Joint Obligor form wizard
 *
 * Key features:
 * 1. Supports both INDIVIDUAL and COMPANY types
 * 2. Flexible guarantee method (income or property)
 * 3. Conditional fields based on guarantee selection
 */

import {
  JointObligorIndividualTab,
  JointObligorCompanyTab,
  JOINT_OBLIGOR_TABS,
} from '@/lib/schemas/joint-obligor';

// Fields for Individual Joint Obligor tabs
export const jointObligorIndividualTabFields: Record<JointObligorIndividualTab, string[]> = {
  personal: [
    'jointObligorType',
    'relationshipToTenant',
    'fullName',
    'birthDate',
    'birthPlace',
    'nationality',
    'curp',
    'rfc',
    'identificationNumber',
    'email',
    'phoneNumber',
    'alternatePhoneNumber',
    'addressDetails',
    'addressDetails.street',
    'addressDetails.exteriorNumber',
    'addressDetails.interiorNumber',
    'addressDetails.neighborhood',
    'addressDetails.municipality',
    'addressDetails.state',
    'addressDetails.postalCode',
    'addressDetails.country',
    'addressDetails.references',
  ],

  employment: [
    'employmentStatus',
    'occupation',
    'employerName',
    'position',
    'monthlyIncome',
    'incomeSource',
    'employerAddressDetails',
    'employerAddressDetails.street',
    'employerAddressDetails.exteriorNumber',
    'employerAddressDetails.interiorNumber',
    'employerAddressDetails.neighborhood',
    'employerAddressDetails.municipality',
    'employerAddressDetails.state',
    'employerAddressDetails.postalCode',
    'employerAddressDetails.country',
  ],

  guarantee: [
    'guaranteeMethod',
    'hasPropertyGuarantee',
    'hasProperties',
    // Income guarantee fields
    'bankName',
    'accountHolder',
    'monthlyIncome', // Also appears here for income guarantee validation
    // Property guarantee fields
    'guaranteePropertyDetails',
    'guaranteePropertyDetails.street',
    'guaranteePropertyDetails.exteriorNumber',
    'guaranteePropertyDetails.interiorNumber',
    'guaranteePropertyDetails.neighborhood',
    'guaranteePropertyDetails.municipality',
    'guaranteePropertyDetails.state',
    'guaranteePropertyDetails.postalCode',
    'guaranteePropertyDetails.country',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
    'propertyTaxAccount',
    'propertyUnderLegalProceeding',
    'maritalStatus',
    'spouseName',
    'spouseRfc',
    'spouseCurp',
  ],

  references: [
    'personalReferences',
    'personalReferences[0].name',
    'personalReferences[0].relationship',
    'personalReferences[0].phoneNumber',
    'personalReferences[0].email',
    'personalReferences[0].address',
    'personalReferences[0].yearsKnown',
    'personalReferences[1].name',
    'personalReferences[1].relationship',
    'personalReferences[1].phoneNumber',
    'personalReferences[1].email',
    'personalReferences[1].address',
    'personalReferences[1].yearsKnown',
    'personalReferences[2].name',
    'personalReferences[2].relationship',
    'personalReferences[2].phoneNumber',
    'personalReferences[2].email',
    'personalReferences[2].address',
    'personalReferences[2].yearsKnown',
  ],

  documents: [
    'additionalInfo',
    // Document fields are handled by file upload system
  ],
};

// Fields for Company Joint Obligor tabs
export const jointObligorCompanyTabFields: Record<JointObligorCompanyTab, string[]> = {
  personal: [
    'jointObligorType',
    'relationshipToTenant',
    'companyName',
    'rfc',
    'constitutionDate',
    'companyType',
    'industry',
    'commercialActivity',
    'taxId',
    'legalRepName',
    'legalRepRfc',
    'legalRepCurp',
    'legalRepEmail',
    'legalRepPhone',
    'email',
    'phoneNumber',
    'alternatePhoneNumber',
    'addressDetails',
    'addressDetails.street',
    'addressDetails.exteriorNumber',
    'addressDetails.interiorNumber',
    'addressDetails.neighborhood',
    'addressDetails.municipality',
    'addressDetails.state',
    'addressDetails.postalCode',
    'addressDetails.country',
    'addressDetails.references',
  ],

  guarantee: [
    'guaranteeMethod',
    'hasPropertyGuarantee',
    'hasProperties',
    // Income guarantee fields
    'bankName',
    'accountHolder',
    'monthlyIncome',
    // Property guarantee fields
    'guaranteePropertyDetails',
    'guaranteePropertyDetails.street',
    'guaranteePropertyDetails.exteriorNumber',
    'guaranteePropertyDetails.interiorNumber',
    'guaranteePropertyDetails.neighborhood',
    'guaranteePropertyDetails.municipality',
    'guaranteePropertyDetails.state',
    'guaranteePropertyDetails.postalCode',
    'guaranteePropertyDetails.country',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
    'propertyTaxAccount',
    'propertyUnderLegalProceeding',
    // Note: Company doesn't have marriage info fields
  ],

  references: [
    'commercialReferences',
    'commercialReferences[0].companyName',
    'commercialReferences[0].contactName',
    'commercialReferences[0].position',
    'commercialReferences[0].phoneNumber',
    'commercialReferences[0].email',
    'commercialReferences[0].relationship',
    'commercialReferences[0].yearsKnown',
    'commercialReferences[1].companyName',
    'commercialReferences[1].contactName',
    'commercialReferences[1].position',
    'commercialReferences[1].phoneNumber',
    'commercialReferences[1].email',
    'commercialReferences[1].relationship',
    'commercialReferences[1].yearsKnown',
    'commercialReferences[2].companyName',
    'commercialReferences[2].contactName',
    'commercialReferences[2].position',
    'commercialReferences[2].phoneNumber',
    'commercialReferences[2].email',
    'commercialReferences[2].relationship',
    'commercialReferences[2].yearsKnown',
  ],

  documents: [
    'additionalInfo',
    // Document fields are handled by file upload system
  ],
};

// Helper to get fields for a specific guarantee method
export function getGuaranteeFields(guaranteeMethod: 'income' | 'property'): string[] {
  if (guaranteeMethod === 'income') {
    return [
      'guaranteeMethod',
      'hasPropertyGuarantee',
      'hasProperties',
      'bankName',
      'accountHolder',
      'monthlyIncome',
    ];
  } else {
    return [
      'guaranteeMethod',
      'hasPropertyGuarantee',
      'guaranteePropertyDetails',
      'guaranteePropertyDetails.street',
      'guaranteePropertyDetails.exteriorNumber',
      'guaranteePropertyDetails.interiorNumber',
      'guaranteePropertyDetails.neighborhood',
      'guaranteePropertyDetails.municipality',
      'guaranteePropertyDetails.state',
      'guaranteePropertyDetails.postalCode',
      'guaranteePropertyDetails.country',
      'propertyValue',
      'propertyDeedNumber',
      'propertyRegistry',
      'propertyTaxAccount',
      'propertyUnderLegalProceeding',
      'maritalStatus',
      'spouseName',
      'spouseRfc',
      'spouseCurp',
    ];
  }
}

// Get tab fields based on Joint Obligor type
export function getJointObligorTabFields(
  tab: string,
  jointObligorType: 'INDIVIDUAL' | 'COMPANY'
): string[] {
  if (jointObligorType === 'COMPANY') {
    return jointObligorCompanyTabFields[tab as JointObligorCompanyTab] || [];
  }
  return jointObligorIndividualTabFields[tab as JointObligorIndividualTab] || [];
}

// Check if all fields in a tab have values
export function isTabComplete(
  tab: string,
  data: any,
  jointObligorType: 'INDIVIDUAL' | 'COMPANY',
  guaranteeMethod?: 'income' | 'property'
): boolean {
  const fields = getJointObligorTabFields(tab, jointObligorType);

  // Special handling for guarantee tab
  if (tab === 'guarantee' && guaranteeMethod) {
    const relevantFields = getGuaranteeFields(guaranteeMethod);
    return relevantFields.every(field => {
      const value = getNestedValue(data, field);
      return value !== null && value !== undefined && value !== '';
    });
  }

  // Check all fields in the tab
  return fields.every(field => {
    // Skip array index fields for references
    if (field.includes('[') && field.includes(']')) {
      return true; // Handled separately
    }

    const value = getNestedValue(data, field);
    // Allow false for boolean fields
    if (typeof value === 'boolean') return true;
    return value !== null && value !== undefined && value !== '';
  });
}

// Helper to get nested object values
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array notation
    if (part.includes('[') && part.includes(']')) {
      const [arrayName, indexStr] = part.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      current = current?.[arrayName]?.[index];
    } else {
      current = current?.[part];
    }

    if (current === undefined) return undefined;
  }

  return current;
}