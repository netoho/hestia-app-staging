/**
 * Unified Document Service
 * Centralized S3 operations and document management for:
 * - Actor Documents (tenant, landlord, jointObligor, aval)
 * - Investigation Documents
 * - Policy Documents
 * - Public uploads (avatars, etc.)
 */

import { BaseService } from './base/BaseService';
import { S3StorageProvider } from '@/lib/storage/providers/s3';
import { DocumentCategory, DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { v4 as uuidv4 } from 'uuid';
import { createSafeS3Key, getFileExtension } from '@/lib/utils/filename';
import { ServiceError, ErrorCode } from './types/errors';
import { getCategoryValidation, type CategoryValidationConfig } from '@/lib/constants/documentCategories';

// ============================================
// TYPES
// ============================================

export type ActorType = 'landlord' | 'tenant' | 'jointObligor' | 'aval';

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

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

export interface InvestigationUploadParams {
  policyNumber: string;
  investigationId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  category: DocumentCategory;
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
    category?: DocumentCategory;
    documentType?: string;
    fileSize: number;
    uploadedAt: Date;
  };
}

export interface FileUploadResult {
  success: boolean;
  s3Key?: string;
  documentId?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  config?: CategoryValidationConfig;
}

// ============================================
// SERVICE
// ============================================

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

  // ============================================
  // S3 KEY GENERATORS
  // ============================================

  /**
   * Generate S3 key for actor documents
   */
  generateActorS3Key(
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

  /**
   * Generate S3 key for investigation documents
   */
  generateInvestigationS3Key(
    policyNumber: string,
    investigationId: string,
    fileName: string
  ): string {
    const ext = getFileExtension(fileName) || 'pdf';
    const uniqueId = uuidv4().slice(0, 8);
    const safeFileName = createSafeS3Key(fileName);
    const nameWithoutExt = safeFileName.lastIndexOf('.') > 0
      ? safeFileName.substring(0, safeFileName.lastIndexOf('.'))
      : safeFileName;
    const fileNamePart = nameWithoutExt.substring(0, 50);

    return `policies/${policyNumber}/investigations/${investigationId}/${uniqueId}-${fileNamePart}.${ext}`;
  }

  /**
   * Generate S3 key for policy documents
   */
  generatePolicyS3Key(
    policyNumber: string,
    category: string,
    fileName: string
  ): string {
    const ext = getFileExtension(fileName) || 'pdf';
    const safeFileName = createSafeS3Key(fileName);
    const baseName = safeFileName.endsWith(`.${ext}`)
      ? safeFileName.slice(0, -ext.length - 1)
      : safeFileName;

    return `policies/${policyNumber}/documents/${category}/${uuidv4().slice(0, 8)}-${baseName}.${ext}`;
  }

  // ============================================
  // PURE S3 OPERATIONS (no DB coupling)
  // ============================================

  /**
   * Get presigned URL for upload (no DB record)
   */
  async getUploadUrl(s3Key: string, expiresInSeconds: number = 300): Promise<string> {
    const s3 = this.ensureS3Provider();
    return s3.getSignedUrl({
      path: s3Key,
      action: 'write',
      expiresInSeconds,
    });
  }

  /**
   * Get presigned URL for download
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
   * Get presigned URL for viewing (inline)
   */
  async getViewUrl(s3Key: string, expiresInSeconds: number = 300): Promise<string> {
    const s3 = this.ensureS3Provider();
    return s3.getSignedUrl({
      path: s3Key,
      action: 'read',
      expiresInSeconds,
      responseDisposition: 'inline',
    });
  }

  /**
   * Delete file from S3 (no DB)
   */
  async deleteFile(s3Key: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();
      await s3.delete(s3Key);
      return true;
    } catch (error) {
      this.log('error', 'S3 delete error', error);
      return false;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    const s3 = this.ensureS3Provider();
    return s3.exists(s3Key);
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(s3Key: string) {
    const s3 = this.ensureS3Provider();
    return s3.getMetadata(s3Key);
  }

  // ============================================
  // PUBLIC UPLOADS (avatars, etc.)
  // ============================================

  /**
   * Upload file to public bucket
   */
  async publicUpload(
    path: string,
    file: UploadedFile,
    contentType: string
  ): Promise<string> {
    const s3 = this.ensureS3Provider();
    await s3.publicUpload({
      path,
      file: {
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
      contentType,
    });
    return this.getPublicUrl(path);
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string {
    const s3 = this.ensureS3Provider();
    return s3.getPublicUrl(path);
  }

  /**
   * Delete file from public bucket
   */
  async deletePublic(path: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();
      await s3.delete(path);
      return true;
    } catch (error) {
      this.log('error', 'Public delete error', error);
      return false;
    }
  }

  /**
   * Get the underlying S3 provider (for advanced use cases)
   */
  getStorageProvider(): S3StorageProvider {
    return this.ensureS3Provider();
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

    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `File exceeds maximum size of ${config.maxSizeMB}MB`,
        config,
      };
    }

    if (!config.allowedMimeTypes.includes(contentType)) {
      return {
        valid: false,
        error: `File type not allowed. Use: ${config.formatsLabel}`,
        config,
      };
    }

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

  /**
   * Get validation config for a category
   */
  getValidationConfig(category: DocumentCategory): CategoryValidationConfig {
    return getCategoryValidation(category);
  }

  // ============================================
  // ACTOR DOCUMENTS
  // ============================================

  /**
   * Generate presigned URL for actor document upload and create pending record
   */
  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult> {
    const s3 = this.ensureS3Provider();

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

    const s3Key = this.generateActorS3Key(
      params.policyNumber,
      params.actorType,
      params.actorId,
      params.fileName
    );

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
        uploadStatus: DocumentUploadStatus.PENDING,
        ...(params.actorType === 'landlord' && { landlordId: params.actorId }),
        ...(params.actorType === 'tenant' && { tenantId: params.actorId }),
        ...(params.actorType === 'jointObligor' && { jointObligorId: params.actorId }),
        ...(params.actorType === 'aval' && { avalId: params.actorId }),
      },
    });

    const expiresIn = 60;
    const uploadUrl = await s3.getSignedUrl({
      path: s3Key,
      action: 'write',
      expiresInSeconds: expiresIn,
    });

    return { uploadUrl, documentId: document.id, s3Key, expiresIn };
  }

  /**
   * Confirm actor document upload - verify file exists and update status
   */
  async confirmUpload(documentId: string): Promise<ConfirmUploadResult> {
    const s3 = this.ensureS3Provider();

    const document = await this.prisma.actorDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Document not found', 404);
    }

    if (document.uploadStatus === DocumentUploadStatus.COMPLETE) {
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

    const exists = await s3.exists(document.s3Key);

    if (!exists) {
      await this.prisma.actorDocument.delete({ where: { id: documentId } });
      throw new ServiceError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        'File not found in storage. Upload may have failed.',
        400
      );
    }

    const updatedDoc = await this.prisma.actorDocument.update({
      where: { id: documentId },
      data: {
        uploadStatus: DocumentUploadStatus.COMPLETE,
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
   * Delete actor document from S3 and database
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();

      const document = await this.prisma.actorDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) return false;

      await s3.delete(document.s3Key);
      await this.prisma.actorDocument.delete({ where: { id: documentId } });

      return true;
    } catch (error) {
      this.log('error', 'Document deletion error', error);
      return false;
    }
  }

  /**
   * Get actor documents by actor
   */
  async getByActor(actorId: string, actorType: ActorType) {
    const actorField = actorType === 'jointObligor' ? 'jointObligorId' : `${actorType}Id`;

    return this.prisma.actorDocument.findMany({
      where: {
        [actorField]: actorId,
        uploadStatus: DocumentUploadStatus.COMPLETE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get actor document by ID
   */
  async getById(documentId: string) {
    return this.prisma.actorDocument.findUnique({ where: { id: documentId } });
  }

  /**
   * Get pending actor documents (for cleanup)
   */
  async getPendingDocuments(olderThanMinutes: number = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    return this.prisma.actorDocument.findMany({
      where: {
        uploadStatus: DocumentUploadStatus.PENDING,
        createdAt: { lt: cutoff },
      },
    });
  }

  /**
   * Cleanup pending actor documents
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
   * Direct upload for actor document (buffer-based)
   */
  async uploadActorDocument(
    file: UploadedFile,
    policyId: string,
    policyNumber: string,
    actorType: ActorType,
    actorId: string,
    category: DocumentCategory,
    documentType: string,
    uploadedBy?: string
  ): Promise<FileUploadResult> {
    try {
      const s3 = this.ensureS3Provider();
      const s3Key = this.generateActorS3Key(policyNumber, actorType, actorId, file.originalName);

      await s3.privateUpload({
        path: s3Key,
        file: {
          buffer: file.buffer,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        contentType: file.mimeType,
        metadata: {
          policyId,
          actorType,
          actorId,
          category,
          documentType,
          uploadedBy: uploadedBy || 'self',
        },
      });

      const document = await this.prisma.actorDocument.create({
        data: {
          category,
          documentType,
          fileName: file.originalName,
          originalName: file.originalName,
          fileSize: file.size,
          mimeType: file.mimeType,
          s3Key,
          s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
          s3Region: process.env.AWS_REGION || 'us-east-1',
          uploadedBy: uploadedBy || 'self',
          ...(actorType === 'landlord' && { landlordId: actorId }),
          ...(actorType === 'tenant' && { tenantId: actorId }),
          ...(actorType === 'jointObligor' && { jointObligorId: actorId }),
          ...(actorType === 'aval' && { avalId: actorId }),
        },
      });

      return { success: true, s3Key, documentId: document.id };
    } catch (error) {
      this.log('error', 'File upload error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  // ============================================
  // INVESTIGATION DOCUMENTS
  // ============================================

  /**
   * Generate presigned URL for investigation document upload
   */
  async generateInvestigationUploadUrl(params: InvestigationUploadParams): Promise<UploadUrlResult> {
    const s3 = this.ensureS3Provider();

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

    const s3Key = this.generateInvestigationS3Key(
      params.policyNumber,
      params.investigationId,
      params.fileName
    );

    const ext = '.' + (getFileExtension(params.fileName) || 'pdf');
    const uniqueId = uuidv4().slice(0, 8);
    const safeFileName = createSafeS3Key(params.fileName);
    const nameWithoutExt = safeFileName.lastIndexOf('.') > 0
      ? safeFileName.substring(0, safeFileName.lastIndexOf('.'))
      : safeFileName;
    const fileNamePart = nameWithoutExt.substring(0, 50);

    const document = await this.prisma.actorInvestigationDocument.create({
      data: {
        investigationId: params.investigationId,
        fileName: `${uniqueId}-${fileNamePart}${ext}`,
        originalName: params.fileName,
        fileSize: params.fileSize,
        mimeType: params.contentType,
        s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-files',
        uploadStatus: DocumentUploadStatus.PENDING,
      },
    });

    const expiresIn = 300;
    const uploadUrl = await s3.getSignedUrl({
      path: s3Key,
      action: 'write',
      expiresInSeconds: expiresIn,
    });

    return { uploadUrl, documentId: document.id, s3Key, expiresIn };
  }

  /**
   * Confirm investigation document upload
   */
  async confirmInvestigationUpload(documentId: string): Promise<ConfirmUploadResult> {
    const s3 = this.ensureS3Provider();

    const document = await this.prisma.actorInvestigationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Document not found', 404);
    }

    if (document.uploadStatus === DocumentUploadStatus.COMPLETE) {
      return {
        success: true,
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          uploadedAt: document.createdAt,
        },
      };
    }

    const exists = await s3.exists(document.s3Key);

    if (!exists) {
      await this.prisma.actorInvestigationDocument.delete({ where: { id: documentId } });
      throw new ServiceError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        'File not found in storage. Upload may have failed.',
        400
      );
    }

    const updatedDoc = await this.prisma.actorInvestigationDocument.update({
      where: { id: documentId },
      data: { uploadStatus: DocumentUploadStatus.COMPLETE },
    });

    return {
      success: true,
      document: {
        id: updatedDoc.id,
        fileName: updatedDoc.fileName,
        fileSize: updatedDoc.fileSize,
        uploadedAt: updatedDoc.createdAt,
      },
    };
  }

  /**
   * Delete investigation document from S3 and database
   */
  async deleteInvestigationDocument(documentId: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();

      const document = await this.prisma.actorInvestigationDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) return false;

      await s3.delete(document.s3Key);
      await this.prisma.actorInvestigationDocument.delete({ where: { id: documentId } });

      return true;
    } catch (error) {
      this.log('error', 'Investigation document deletion error', error);
      return false;
    }
  }

  /**
   * Get investigation document by ID
   */
  async getInvestigationDocument(documentId: string) {
    return this.prisma.actorInvestigationDocument.findUnique({ where: { id: documentId } });
  }

  /**
   * Get all documents for an investigation
   */
  async getInvestigationDocuments(investigationId: string) {
    return this.prisma.actorInvestigationDocument.findMany({
      where: { investigationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // POLICY DOCUMENTS
  // ============================================

  /**
   * Direct upload for policy document (buffer-based)
   */
  async uploadPolicyDocument(
    file: UploadedFile,
    policyId: string,
    policyNumber: string,
    category: string,
    uploadedBy: string,
    version?: number
  ): Promise<FileUploadResult> {
    try {
      const s3 = this.ensureS3Provider();
      const s3Key = this.generatePolicyS3Key(policyNumber, category, file.originalName);

      await s3.privateUpload({
        path: s3Key,
        file: {
          buffer: file.buffer,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        contentType: file.mimeType,
        metadata: {
          policyId,
          category,
          uploadedBy,
          version: version?.toString() || '1',
        },
      });

      const document = await this.prisma.policyDocument.create({
        data: {
          policyId,
          category,
          fileName: file.originalName,
          originalName: file.originalName,
          fileSize: file.size,
          mimeType: file.mimeType,
          s3Key,
          s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
          s3Region: process.env.AWS_REGION || 'us-east-1',
          uploadedBy,
          version: version || 1,
          isCurrent: true,
        },
      });

      if (version && version > 1) {
        await this.prisma.policyDocument.updateMany({
          where: { policyId, category, id: { not: document.id } },
          data: { isCurrent: false },
        });
      }

      return { success: true, s3Key, documentId: document.id };
    } catch (error) {
      this.log('error', 'Policy document upload error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  /**
   * Delete policy document from S3 and database
   */
  async deletePolicyDocument(documentId: string): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();

      const document = await this.prisma.policyDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) return false;

      await s3.delete(document.s3Key);
      await this.prisma.policyDocument.delete({ where: { id: documentId } });

      return true;
    } catch (error) {
      this.log('error', 'Policy document deletion error', error);
      return false;
    }
  }

  /**
   * Get policy documents
   */
  async getPolicyDocuments(policyId: string) {
    return this.prisma.policyDocument.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate policy documents completeness
   */
  async validatePolicyDocuments(
    policyId: string,
    requiredCategories: DocumentCategory[] = [
      DocumentCategory.IDENTIFICATION,
      DocumentCategory.INCOME_PROOF,
    ]
  ): Promise<{ valid: boolean; missing: DocumentCategory[] }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: {
          include: { documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } } },
        },
        jointObligors: {
          include: { documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } } },
        },
        avals: {
          include: { documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } } },
        },
        landlords: {
          include: { documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } } },
        },
      },
    });

    if (!policy) return { valid: false, missing: requiredCategories };

    const tenantDocs = policy.tenant?.documents || [];
    const tenantCategories = new Set(tenantDocs.map((d) => d.category));

    const missing: DocumentCategory[] = [];
    for (const category of requiredCategories) {
      if (!tenantCategories.has(category)) missing.push(category);
    }

    for (const jo of policy.jointObligors || []) {
      const joDocs = jo.documents || [];
      const joCategories = new Set(joDocs.map((d) => d.category));
      for (const category of requiredCategories) {
        if (!joCategories.has(category)) missing.push(category);
      }
    }

    for (const aval of policy.avals || []) {
      const avalDocs = aval.documents || [];
      const avalCategories = new Set(avalDocs.map((d) => d.category));
      const avalRequired = [...requiredCategories, DocumentCategory.PROPERTY_DEED];
      for (const category of avalRequired) {
        if (!avalCategories.has(category)) missing.push(category);
      }
    }

    return { valid: missing.length === 0, missing: [...new Set(missing)] };
  }
}

// Export singleton instance
export const documentService = new DocumentService();

// Export class for testing
export { DocumentService };

// Legacy exports for backwards compatibility (from fileUploadService)
export const uploadActorDocument = documentService.uploadActorDocument.bind(documentService);
export const uploadPolicyDocument = documentService.uploadPolicyDocument.bind(documentService);
export const getDocumentUrl = documentService.getViewUrl.bind(documentService);
export const getDocumentDownloadUrl = documentService.getDownloadUrl.bind(documentService);
export const deleteDocument = documentService.deleteDocument.bind(documentService);
export const verifyDocument = documentService.fileExists.bind(documentService);
export const getDocumentMetadata = documentService.getFileMetadata.bind(documentService);
export const getSignedDownloadUrl = documentService.getDownloadUrl.bind(documentService);
export const validatePolicyDocuments = documentService.validatePolicyDocuments.bind(documentService);
export const getPublicDownloadUrl = documentService.getPublicUrl.bind(documentService);
export const getCurrentStorageProvider = documentService.getStorageProvider.bind(documentService);
