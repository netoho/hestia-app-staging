import { BaseService } from './base/BaseService';
import { S3StorageProvider } from '@/lib/storage/providers/s3';
import { DocumentCategory } from '@/types/policy';
import { v4 as uuidv4 } from 'uuid';
import { createSafeS3Key, getFileExtension } from '@/lib/utils/filename';
import { ServiceError, ErrorCode } from './types/errors';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface FileUploadResult {
  success: boolean;
  s3Key?: string;
  documentId?: string;
  error?: string;
}

class FileUploadService extends BaseService {
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
      throw new ServiceError(ErrorCode.STORAGE_UPLOAD_FAILED, 'Storage provider not configured. Please check AWS credentials.', 500);
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

  /**
   * Upload actor document to S3 and save metadata
   */
  async uploadActorDocument(
    file: UploadedFile,
    policyId: string,
    policyNumber: string,
    actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval',
    actorId: string,
    category: DocumentCategory,
    documentType: string,
    uploadedBy?: string
  ): Promise<FileUploadResult> {
    try {
      const s3 = this.ensureS3Provider();

      const s3Key = this.generateS3Key(policyNumber, actorType, actorId, file.originalName);

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

      return {
        success: true,
        s3Key,
        documentId: document.id,
      };
    } catch (error) {
      this.log('error', 'File upload error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload policy document (contracts, reports, etc.)
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

      const safeFileName = createSafeS3Key(file.originalName);
      const ext = getFileExtension(file.originalName);
      const baseName = safeFileName.endsWith(`.${ext}`) ? safeFileName.slice(0, -ext.length - 1) : safeFileName;
      const s3Key = `policies/${policyNumber}/documents/${category}/${uuidv4().slice(0, 8)}-${baseName}.${ext}`;

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
          version: version!.toString(),
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
          where: {
            policyId,
            category,
            id: { not: document.id },
          },
          data: {
            isCurrent: false,
          },
        });
      }

      return {
        success: true,
        s3Key,
        documentId: document.id,
      };
    } catch (error) {
      this.log('error', 'Policy document upload error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get signed URL for document download
   */
  async getDocumentUrl(
    s3Key: string,
    fileName?: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const s3 = this.ensureS3Provider();

    return s3.getSignedUrl({
      path: s3Key,
      action: 'read',
      expiresInSeconds,
      fileName,
      responseDisposition: 'inline',
    });
  }

  /**
   * Get signed URL for document download (force download)
   */
  async getDocumentDownloadUrl(
    s3Key: string,
    fileName?: string,
    expiresInSeconds: number = 3600
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
   * Delete document from S3 and database
   */
  async deleteDocument(documentId: string, isActorDocument: boolean = true): Promise<boolean> {
    try {
      const s3 = this.ensureS3Provider();

      if (isActorDocument) {
        const document = await this.prisma.actorDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          return false;
        }

        await s3.delete(document.s3Key);

        await this.prisma.actorDocument.delete({
          where: { id: documentId },
        });
      } else {
        const document = await this.prisma.policyDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          return false;
        }

        await s3.delete(document.s3Key);

        await this.prisma.policyDocument.delete({
          where: { id: documentId },
        });
      }

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

  /**
   * Get document metadata
   */
  async getDocumentMetadata(s3Key: string) {
    const s3 = this.ensureS3Provider();
    return s3.getMetadata(s3Key);
  }

  /**
   * Get signed download URL (alias for getDocumentDownloadUrl)
   */
  async getSignedDownloadUrl(
    s3Key: string,
    fileName?: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    return this.getDocumentDownloadUrl(s3Key, fileName, expiresInSeconds);
  }

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
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          },
        },
        jointObligors: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          },
        },
        avals: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          },
        },
        landlords: {
          include: {
            documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
          },
        },
      },
    });

    if (!policy) {
      return { valid: false, missing: requiredCategories };
    }

    const tenantDocs = policy.tenant?.documents || [];
    const tenantCategories = new Set(tenantDocs.map(d => d.category));

    const missing: DocumentCategory[] = [];
    for (const category of requiredCategories) {
      if (!tenantCategories.has(category)) {
        missing.push(category);
      }
    }

    for (const jo of policy.jointObligors || []) {
      const joDocs = jo.documents || [];
      const joCategories = new Set(joDocs.map(d => d.category));
      for (const category of requiredCategories) {
        if (!joCategories.has(category)) {
          missing.push(category);
        }
      }
    }

    for (const aval of policy.avals || []) {
      const avalDocs = aval.documents || [];
      const avalCategories = new Set(avalDocs.map(d => d.category));
      const avalRequired = [...requiredCategories, DocumentCategory.PROPERTY_DEED];
      for (const category of avalRequired) {
        if (!avalCategories.has(category)) {
          missing.push(category);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing: [...new Set(missing)],
    };
  }

  /**
   * Get public URL for a file stored in public storage
   */
  getPublicDownloadUrl(path: string): string {
    const s3 = this.ensureS3Provider();
    return s3.getPublicUrl(path);
  }

  /**
   * Get the current storage provider, or throw if not configured.
   */
  getCurrentStorageProvider(): S3StorageProvider {
    return this.ensureS3Provider();
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Export legacy functions for backwards compatibility
export const uploadActorDocument = fileUploadService.uploadActorDocument.bind(fileUploadService);
export const uploadPolicyDocument = fileUploadService.uploadPolicyDocument.bind(fileUploadService);
export const getDocumentUrl = fileUploadService.getDocumentUrl.bind(fileUploadService);
export const getDocumentDownloadUrl = fileUploadService.getDocumentDownloadUrl.bind(fileUploadService);
export const deleteDocument = fileUploadService.deleteDocument.bind(fileUploadService);
export const verifyDocument = fileUploadService.verifyDocument.bind(fileUploadService);
export const getDocumentMetadata = fileUploadService.getDocumentMetadata.bind(fileUploadService);
export const getSignedDownloadUrl = fileUploadService.getSignedDownloadUrl.bind(fileUploadService);
export const validatePolicyDocuments = fileUploadService.validatePolicyDocuments.bind(fileUploadService);
export const getPublicDownloadUrl = fileUploadService.getPublicDownloadUrl.bind(fileUploadService);
export const getCurrentStorageProvider = fileUploadService.getCurrentStorageProvider.bind(fileUploadService);
