/**
 * Actor Document Requirements
 *
 * Centralized configuration for required documents per actor type.
 * Similar pattern to actorTabFields.ts - single source of truth.
 */

import { DocumentCategory } from '@/lib/enums';

export type ActorType = 'landlord' | 'tenant' | 'aval' | 'jointObligor';
export type NationalityType = 'MEXICAN' | 'FOREIGN';
export type GuaranteeMethod = 'property' | 'income';

export interface DocumentRequirement {
  category: DocumentCategory;
  required: boolean;
  /** Condition for when this document applies */
  condition?: 'foreign' | 'propertyGuarantee' | 'incomeGuarantee';
}

/**
 * Document requirements by actor type and entity type (individual/company)
 */
export const ACTOR_DOCUMENT_REQUIREMENTS = {
  tenant: {
    individual: [
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.INCOME_PROOF, required: true },
      { category: DocumentCategory.ADDRESS_PROOF, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.IMMIGRATION_DOCUMENT, required: true, condition: 'foreign' },
    ],
    company: [
      { category: DocumentCategory.COMPANY_CONSTITUTION, required: true },
      { category: DocumentCategory.LEGAL_POWERS, required: true },
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.ADDRESS_PROOF, required: false },
    ],
  },
  landlord: {
    individual: [
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: false },
      { category: DocumentCategory.PROPERTY_DEED, required: true },
      { category: DocumentCategory.PROPERTY_TAX_STATEMENT, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: false },
    ],
    company: [
      { category: DocumentCategory.COMPANY_CONSTITUTION, required: true },
      { category: DocumentCategory.LEGAL_POWERS, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: true },
      { category: DocumentCategory.PROPERTY_DEED, required: true },
      { category: DocumentCategory.PROPERTY_TAX_STATEMENT, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: false },
    ],
  },
  aval: {
    individual: [
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.INCOME_PROOF, required: true },
      { category: DocumentCategory.ADDRESS_PROOF, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.IMMIGRATION_DOCUMENT, required: true, condition: 'foreign' },
      { category: DocumentCategory.PROPERTY_REGISTRY, required: false },
    ],
    company: [
      { category: DocumentCategory.COMPANY_CONSTITUTION, required: true },
      { category: DocumentCategory.LEGAL_POWERS, required: true },
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.PROPERTY_REGISTRY, required: false },
    ],
  },
  jointObligor: {
    individual: [
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.ADDRESS_PROOF, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.IMMIGRATION_DOCUMENT, required: true, condition: 'foreign' },
      { category: DocumentCategory.INCOME_PROOF, required: true, condition: 'incomeGuarantee' },
      { category: DocumentCategory.PROPERTY_DEED, required: true, condition: 'propertyGuarantee' },
      { category: DocumentCategory.PROPERTY_TAX_STATEMENT, required: true, condition: 'propertyGuarantee' },
      { category: DocumentCategory.PROPERTY_REGISTRY, required: false, condition: 'propertyGuarantee' },
    ],
    company: [
      { category: DocumentCategory.COMPANY_CONSTITUTION, required: true },
      { category: DocumentCategory.LEGAL_POWERS, required: true },
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.INCOME_PROOF, required: true, condition: 'incomeGuarantee' },
      { category: DocumentCategory.PROPERTY_DEED, required: true, condition: 'propertyGuarantee' },
      { category: DocumentCategory.PROPERTY_TAX_STATEMENT, required: true, condition: 'propertyGuarantee' },
      { category: DocumentCategory.PROPERTY_REGISTRY, required: false, condition: 'propertyGuarantee' },
    ],
  },
} as const satisfies Record<ActorType, { individual: DocumentRequirement[]; company: DocumentRequirement[] }>;

export interface GetDocumentRequirementsOptions {
  nationality?: NationalityType;
  guaranteeMethod?: GuaranteeMethod;
}

/**
 * Get filtered document requirements for an actor type
 *
 * @param actorType - The type of actor
 * @param isCompany - Whether the actor is a company (vs individual)
 * @param options - Optional conditions (nationality, guaranteeMethod)
 * @returns Filtered array of document requirements
 */
export function getDocumentRequirements(
  actorType: ActorType,
  isCompany: boolean,
  options?: GetDocumentRequirementsOptions
): DocumentRequirement[] {
  const entityType = isCompany ? 'company' : 'individual';
  const requirements = ACTOR_DOCUMENT_REQUIREMENTS[actorType][entityType];

  return requirements.filter((req) => {
    // No condition = always include
    if (!req.condition) return true;

    // Check condition
    switch (req.condition) {
      case 'foreign':
        return options?.nationality === 'FOREIGN';
      case 'propertyGuarantee':
        return options?.guaranteeMethod === 'property';
      case 'incomeGuarantee':
        return options?.guaranteeMethod === 'income';
      default:
        return true;
    }
  });
}

/**
 * Get only the required documents (filtered by conditions)
 */
export function getRequiredDocuments(
  actorType: ActorType,
  isCompany: boolean,
  options?: GetDocumentRequirementsOptions
): DocumentRequirement[] {
  return getDocumentRequirements(actorType, isCompany, options).filter((req) => req.required);
}

/**
 * Get optional documents (filtered by conditions)
 */
export function getOptionalDocuments(
  actorType: ActorType,
  isCompany: boolean,
  options?: GetDocumentRequirementsOptions
): DocumentRequirement[] {
  return getDocumentRequirements(actorType, isCompany, options).filter((req) => !req.required);
}

/**
 * Check if all required documents are uploaded
 *
 * @param actorType - The type of actor
 * @param isCompany - Whether the actor is a company
 * @param uploadedCategories - Set or array of uploaded document categories
 * @param options - Optional conditions
 * @returns true if all required documents are uploaded
 */
export function areRequiredDocumentsUploaded(
  actorType: ActorType,
  isCompany: boolean,
  uploadedCategories: Set<DocumentCategory> | DocumentCategory[],
  options?: GetDocumentRequirementsOptions
): boolean {
  const uploadedSet =
    uploadedCategories instanceof Set ? uploadedCategories : new Set(uploadedCategories);

  const required = getRequiredDocuments(actorType, isCompany, options);

  return required.every((req) => uploadedSet.has(req.category));
}
