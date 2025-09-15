import { S3StorageProvider } from '@/lib/storage/providers/s3';
import { DocumentCategory } from '@/types/policy';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { isDemoMode } from '@/lib/env-check';

// Initialize S3 provider only if credentials are available
let s3Provider: S3StorageProvider | null = null;

if (!isDemoMode() && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Provider = new S3StorageProvider({
    bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_S3_ENDPOINT, // Optional for local testing with MinIO
  });
}

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

/**
 * Generate S3 key for actor documents
 */
function generateS3Key(
  policyNumber: string,
  actorType: string,
  actorId: string,
  fileName: string
): string {
  const ext = fileName.split('.').pop() || 'pdf';
  const uniqueId = uuidv4().slice(0, 8);
  return `policies/${policyNumber}/${actorType}/${actorId}/${uniqueId}.${ext}`;
}

/**
 * Upload actor document to S3 and save metadata
 */
export async function uploadActorDocument(
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
    // Generate S3 key
    const s3Key = generateS3Key(policyNumber, actorType, actorId, file.originalName);

    // Upload to S3
    const uploadPath = await s3Provider.upload({
      path: s3Key,
      file: {
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
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

    // Save document metadata to database
    const document = await prisma.actorDocument.create({
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
        // Connect to the appropriate actor
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
    console.error('File upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload policy document (contracts, reports, etc.)
 */
export async function uploadPolicyDocument(
  file: UploadedFile,
  policyId: string,
  policyNumber: string,
  category: string,
  uploadedBy: string,
  version?: number
): Promise<FileUploadResult> {
  try {
    const s3Key = `policies/${policyNumber}/documents/${category}/${uuidv4().slice(0, 8)}_${file.originalName}`;

    // Upload to S3
    await s3Provider.upload({
      path: s3Key,
      file: {
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
      },
      contentType: file.mimeType,
      metadata: {
        policyId,
        category,
        uploadedBy,
        version: version?.toString(),
      },
    });

    // Save to database
    const document = await prisma.policyDocument.create({
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

    // If this is a new version, mark previous versions as not current
    if (version && version > 1) {
      await prisma.policyDocument.updateMany({
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
    console.error('Policy document upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get signed URL for document download
 */
export async function getDocumentUrl(
  s3Key: string,
  fileName?: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  return s3Provider.getSignedUrl({
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
export async function getDocumentDownloadUrl(
  s3Key: string,
  fileName?: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  return s3Provider.getSignedUrl({
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
export async function deleteDocument(documentId: string, isActorDocument: boolean = true): Promise<boolean> {
  try {
    if (isActorDocument) {
      // Get document info
      const document = await prisma.actorDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return false;
      }

      // Delete from S3
      await s3Provider.delete(document.s3Key);

      // Delete from database
      await prisma.actorDocument.delete({
        where: { id: documentId },
      });
    } else {
      // Policy document
      const document = await prisma.policyDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return false;
      }

      // Delete from S3
      await s3Provider.delete(document.s3Key);

      // Delete from database
      await prisma.policyDocument.delete({
        where: { id: documentId },
      });
    }

    return true;
  } catch (error) {
    console.error('Document deletion error:', error);
    return false;
  }
}

/**
 * Verify document exists in S3
 */
export async function verifyDocument(s3Key: string): Promise<boolean> {
  return s3Provider.exists(s3Key);
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(s3Key: string) {
  return s3Provider.getMetadata(s3Key);
}

/**
 * Validate file for upload
 */
export function validateFile(
  file: File | UploadedFile,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize || 10 * 1024 * 1024; // Default 10MB
  const allowedTypes = options.allowedTypes || [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Check file size
  const fileSize = 'size' in file ? file.size : file.buffer.length;
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  const mimeType = 'type' in file ? file.type : file.mimeType;
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Upload a single file (simplified wrapper)
 */
export async function uploadFile(
  file: UploadedFile,
  path: string,
  metadata?: Record<string, string>
): Promise<string> {
  return s3Provider.upload({
    path,
    file: {
      buffer: file.buffer,
      originalName: file.originalName,
      mimeType: file.mimeType,
    },
    contentType: file.mimeType,
    metadata,
  });
}

/**
 * Get signed download URL (alias for getDocumentDownloadUrl)
 */
export async function getSignedDownloadUrl(
  s3Key: string,
  fileName?: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  return getDocumentDownloadUrl(s3Key, fileName, expiresInSeconds);
}

/**
 * Validate policy documents completeness
 */
export async function validatePolicyDocuments(
  policyId: string,
  requiredCategories: DocumentCategory[] = [
    DocumentCategory.IDENTIFICATION,
    DocumentCategory.INCOME_PROOF,
  ]
): Promise<{ valid: boolean; missing: DocumentCategory[] }> {
  if (!prisma) {
    // Demo mode
    return { valid: true, missing: [] };
  }

  // Get all actor documents for this policy
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      tenant: {
        include: {
          documents: true,
        },
      },
      jointObligors: {
        include: {
          documents: true,
        },
      },
      avals: {
        include: {
          documents: true,
        },
      },
      landlord: {
        include: {
          documents: true,
        },
      },
    },
  });

  if (!policy) {
    return { valid: false, missing: requiredCategories };
  }

  // Check tenant documents
  const tenantDocs = policy.tenant?.documents || [];
  const tenantCategories = new Set(tenantDocs.map(d => d.category));

  const missing: DocumentCategory[] = [];
  for (const category of requiredCategories) {
    if (!tenantCategories.has(category)) {
      missing.push(category);
    }
  }

  // Check joint obligors
  for (const jo of policy.jointObligors || []) {
    const joDocs = jo.documents || [];
    const joCategories = new Set(joDocs.map(d => d.category));
    for (const category of requiredCategories) {
      if (!joCategories.has(category)) {
        missing.push(category);
      }
    }
  }

  // Check avals (they need property documents too)
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
    missing: [...new Set(missing)], // Remove duplicates
  };
}