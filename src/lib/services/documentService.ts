/**
 * Unified Document Service
 * Handles S3 operations (presigned URLs, uploads, downloads)
 * and database operations for ActorDocuments
 */

import { BaseService } from './base/BaseService';
import { S3StorageProvider } from '@/lib/storage/providers/s3';
import { DocumentCategory } from '@/prisma/generated/prisma-client/enums';
import { v4 as uuidv4 } from 'uuid';
import { createSafeS3Key, getFileExtension } from '@/lib/utils/filename';
import { ServiceError, ErrorCode } from './types/errors';
import { getCategoryValidation, type CategoryValidationConfig } from '@/lib/constants/documentCategories';

export type ActorType = 'landlord' | 'tenant' | 'jointObligor' | 'aval';

export interface GenerateUploadUrlParams {
  policyNumber: string;
  policyId: string;
  actorType: ActorType;
  actorId: string;
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy?: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  documentId: string;
  s3Key: string;
  expiresIn: number;
}

export interface ConfirmUploadResult {
  success: boolean;
  document: {
    id: string;
    fileName: string;
    category: DocumentCategory;
    documentType: string;
    fileSize: number;
    uploadedAt: Date;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  config?: CategoryValidationConfig;
}

class DocumentService extends BaseService {
  private s3Provider: S3StorageProvider | null = null;

  constructor() {
    super();
    this.initS3Provider();
  }

  private initS3Provider(): void {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Provider = new S3StorageProvider({
        bucket: process.env.AWS_S3_BUCKET || 'hestia-files',
        publicBucket: process.env.AWS_PUBLIC_S3_BUCKET || 'public-hestia-files',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        endpoint: process.env.AWS_S3_ENDPOINT,
      });
    }
  }

  private ensureS3Provider(): S3StorageProvider {
    if (!this.s3Provider) {
      throw new ServiceError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        'Storage provider not configured. Please check AWS credentials.',
        500
      );
    }
    return this.s3Provider;
  }

  /**
   * Generate S3 key for actor documents
   */
  private generateS3Key(
    policyNumber: string,
    actorType: string,
    actorId: string,
    fileName: string
  ): string {
    const ext = getFileExtension(fileName) || 'pdf';
    const uniqueId = uuidv4().slice(0, 8);

    const safeFileName = createSafeS3Key(fileName);
    const nameWithoutExt = safeFileName.lastIndexOf('.') > 0
      ? safeFileName.substring(0, safeFileName.lastIndexOf('.'))
      : safeFileName;

    const fileNamePart = nameWithoutExt.substring(0, 50);

    return `policies/${policyNumber}/${actorType}/${actorId}/${uniqueId}-${fileNamePart}.${ext}`;
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate file before upload
   */
  validateFile(
    category: DocumentCategory,
    contentType: string,
    fileSize: number,
    fileName: string
  ): ValidationResult {
    const config = getCategoryValidation(category);
    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

    // Validate file size
    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `File exceeds maximum size of ${config.maxSizeMB}MB`,
        config,
      };
    }

    // Validate MIME type
    if (!config.allowedMimeTypes.includes(contentType)) {
      return {
        valid: false,
        error: `File type not allowed. Use: ${config.formatsLabel}`,
        config,
      };
    }

    // Validate file extension
    const ext = '.' + (getFileExtension(fileName) || '');
    if (!config.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension not allowed. Use: ${config.allowedExtensions.join(', ')}`,
        config,
      };
    }

    return { valid: true, config };
  }

  // ============================================
  // S3 OPERATIONS
  // ============================================

  /**
   * Generate presigned URL for upload and create pending document record
   */
  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult> {
    const s3 = this.ensureS3Provider();

    // Validate file
    const validation = this.validateFile(
      params.category,
      params.contentType,
      params.fileSize,
      params.fileName
    );

    if (!validation.valid) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        validation.error || 'Invalid file',
        400
      );
    }

    // Generate S3 key
    const s3Key = this.generateS3Key(
      params.policyNumber,
      params.actorType,
      params.actorId,
      params.fileName
    );

    // Create pending document record
    const document = await this.prisma.actorDocument.create({
      data: {
        category: params.category,
        documentType: params.documentType,
        fileName: params.fileName,
        originalName: params.fileName,
        fileSize: params.fileSize,
        mimeType: params.contentType,
        s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
        s3Region: process.env.AWS_REGION || 'us-east-1',
        uploadedBy: params.uploadedBy || 'self',
        uploadStatus: 'pending',
        ...(params.actorType === 'landlord' && { landlordId: params.actorId }),
        ...(params.actorType === 'tenant' && { tenantId: params.actorId }),
        ...(params.actorType === 'jointObligor' && { jointObligorId: params.actorId }),
        ...(params.actorType === 'aval' && { avalId: params.actorId }),
      },
    });

    // Generate presigned PUT URL (60 seconds expiry)
    const expiresIn = 60;
    const uploadUrl = await s3.getSignedUrl({
      path: s3Key,
      action: 'write',
      expiresInSeconds: expiresIn,
    });

    return {
      uploadUrl,
      documentId: document.id,
      s3Key,
      expiresIn,
    };
  }

  /**
   * Confirm upload completed - verify file exists in S3 and update status
   */
  async confirmUpload(documentId: string): Promise<ConfirmUploadResult> {
    const s3 = this.ensureS3Provider();

    // Get document record
    const document = await this.prisma.actorDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Document not found', 404);
    }

    if (document.uploadStatus === 'complete') {
      return {
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          category: document.category,
          documentType: document.documentType,
          fileSize: document.fileSize,
          uploadedAt: document.uploadedAt || new Date(),
        },
      };
    }

    // Verify file exists in S3
    const exists = await s3.exists(document.s3Key);

    if (!exists) {
      // Delete pending record since upload failed
      await this.prisma.actorDocument.delete({
        where: { id: documentId },
      });

      throw new ServiceError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        'File not found in storage. Upload may have failed.',
        400
      );
    }

    // Update document status to complete
    const updatedDoc = await this.prisma.actorDocument.update({
      where: { id: documentId },
      data: {
        uploadStatus: 'complete',
        uploadedAt: new Date(),
      },
    });

    return {
      success: true,
      document: {
        id: updatedDoc.id,
        fileName: updatedDoc.fileName,
        category: updatedDoc.category,
        documentType: updatedDoc.documentType,
        fileSize: updatedDoc.fileSize,
        uploadedAt: updatedDoc.uploadedAt || new Date(),
      },
    };
  }

  /**
   * Get signed URL for document download
   */
  async getDownloadUrl(
    s3Key: string,
    fileName?: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const s3 = this.ensureS3Provider();

    return s3.getSignedUrl({
      path: s3Key,
      action: 'read',
      expiresInSeconds,
      fileName,
      responseDisposition: 'attachment',
    });
  }

  /**
   * Get signed URL for document viewing (inline)
   */
  async getViewUrl(
    s3Key: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const s3 = this.ensureS3Provider();

    return s3.getSignedUrl({
      path: s3Key,
      action: 'read',
      expiresInSeconds,
      responseDisposition: 'inline',
    });
  }

  /**
   * Delete document from S3 and database
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();

      const document = await this.prisma.actorDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return false;
      }

      // Delete from S3
      await s3.delete(document.s3Key);

      // Delete from database
      await this.prisma.actorDocument.delete({
        where: { id: documentId },
      });

      return true;
    } catch (error) {
      this.log('error', 'Document deletion error', error);
      return false;
    }
  }

  /**
   * Verify document exists in S3
   */
  async verifyDocument(s3Key: string): Promise<boolean> {
    const s3 = this.ensureS3Provider();
    return s3.exists(s3Key);
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  /**
   * Get documents by actor
   */
  async getByActor(actorId: string, actorType: ActorType) {
    const actorField = actorType === 'jointObligor' ? 'jointObligorId' : `${actorType}Id`;

    return this.prisma.actorDocument.findMany({
      where: {
        [actorField]: actorId,
        uploadStatus: 'complete', // Only return completed uploads
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get document by ID
   */
  async getById(documentId: string) {
    return this.prisma.actorDocument.findUnique({
      where: { id: documentId },
    });
  }

  /**
   * Get pending documents (for cleanup)
   */
  async getPendingDocuments(olderThanMinutes: number = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    return this.prisma.actorDocument.findMany({
      where: {
        uploadStatus: 'pending',
        createdAt: { lt: cutoff },
      },
    });
  }

  /**
   * Delete pending documents (cleanup)
   */
  async cleanupPendingDocuments(olderThanMinutes: number = 60): Promise<number> {
    const pending = await this.getPendingDocuments(olderThanMinutes);

    let deleted = 0;
    for (const doc of pending) {
      const success = await this.deleteDocument(doc.id);
      if (success) deleted++;
    }

    return deleted;
  }

  /**
   * Get validation config for a category
   */
  getValidationConfig(category: DocumentCategory): CategoryValidationConfig {
    return getCategoryValidation(category);
  }
}

// Export singleton instance
export const documentService = new DocumentService();

// Export class for testing
export { DocumentService };
