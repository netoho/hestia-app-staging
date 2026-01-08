/**
 * Document Service
 * Handles document management for actors
 */

import { BaseService } from './base/BaseService';
import { buildActorWhereClause, type UrlActorType } from '@/lib/utils/actorMapping';

interface UploadDocumentData {
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
}

class DocumentService extends BaseService {
  /**
   * Upload a document to the database
   */
  async uploadDocument(data: UploadDocumentData) {
    return this.prisma.actorDocument.create({
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
  async getDocumentsByActor(actorId: string, actorType: UrlActorType) {
    const whereClause = buildActorWhereClause(actorType, actorId);

    return this.prisma.actorDocument.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get required document types for an actor type
   */
  getRequiredDocumentTypes(actorType: string, isCompany: boolean = false): string[] {
    const commonDocs = ['identification', 'proof_of_income', 'proof_of_address'];

    switch (actorType) {
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
  async hasRequiredDocuments(actorId: string, actorType: string, isCompany: boolean = false) {
    const requiredTypes = this.getRequiredDocumentTypes(actorType, isCompany);
    const documents = await this.getDocumentsByActor(actorId, actorType as UrlActorType);

    const uploadedTypes = documents.map(doc => doc.type);
    const missingTypes = requiredTypes.filter(type => !uploadedTypes.includes(type));

    return {
      hasAll: missingTypes.length === 0,
      missing: missingTypes,
      uploaded: uploadedTypes
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();

// Export legacy functions for backwards compatibility
export const uploadDocument = documentService.uploadDocument.bind(documentService);
export const getDocumentsByActor = documentService.getDocumentsByActor.bind(documentService);
export const getRequiredDocumentTypes = documentService.getRequiredDocumentTypes.bind(documentService);
export const hasRequiredDocuments = documentService.hasRequiredDocuments.bind(documentService);
