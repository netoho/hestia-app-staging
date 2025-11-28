import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Upload a document to the database
 */
export async function uploadDocument(data: {
  type: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  policyId: string;
  tenantId?: string;
  landlordId?: string;
  jointObligorId?: string;
  avalId?: string;
}) {
  return prisma.actorDocument.create({
    data: {
      type: data.type,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      policyId: data.policyId,
      tenantId: data.tenantId,
      landlordId: data.landlordId,
      jointObligorId: data.jointObligorId,
      avalId: data.avalId,
    }
  });
}

/**
 * Get documents by actor
 */
export async function getDocumentsByActor(actorId: string, actorType: string) {
  const whereClause: any = {};

  // Map actor type to database field
  switch(actorType) {
    case 'tenant':
      whereClause.tenantId = actorId;
      break;
    case 'landlord':
      whereClause.landlordId = actorId;
      break;
    case 'joint-obligor':
      whereClause.jointObligorId = actorId;
      break;
    case 'aval':
      whereClause.avalId = actorId;
      break;
    default:
      throw new Error(`Invalid actor type: ${actorType}`);
  }

  return prisma.actorDocument.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Get required document types for an actor type
 */
export function getRequiredDocumentTypes(actorType: string, isCompany: boolean = false) {
  const commonDocs = ['identification', 'proof_of_income', 'proof_of_address'];

  switch(actorType) {
    case 'tenant':
      return isCompany
        ? [...commonDocs, 'company_registration', 'legal_rep_id', 'tax_situation']
        : [...commonDocs, 'employment_letter'];

    case 'landlord':
      return ['identification', 'property_deed', 'tax_receipts', 'proof_of_address'];

    case 'joint-obligor':
      return isCompany
        ? [...commonDocs, 'company_registration', 'legal_rep_id', 'financial_statements']
        : [...commonDocs, 'employment_letter', 'bank_statements'];

    case 'aval':
      return isCompany
        ? [...commonDocs, 'company_registration', 'legal_rep_id', 'financial_statements', 'property_deed']
        : [...commonDocs, 'employment_letter', 'bank_statements', 'property_deed'];

    default:
      return commonDocs;
  }
}

/**
 * Check if actor has all required documents
 */
export async function hasRequiredDocuments(actorId: string, actorType: string, isCompany: boolean = false) {
  const requiredTypes = getRequiredDocumentTypes(actorType, isCompany);
  const documents = await getDocumentsByActor(actorId, actorType);

  const uploadedTypes = documents.map(doc => doc.type);
  const missingTypes = requiredTypes.filter(type => !uploadedTypes.includes(type));

  return {
    hasAll: missingTypes.length === 0,
    missing: missingTypes,
    uploaded: uploadedTypes
  };
}
