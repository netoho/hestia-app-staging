import { getStorageProvider, StorageFile } from '../storage';
import { isDemoMode } from '../env-check';
import prisma from '../prisma';
import { PolicyDocument } from '@/lib/prisma-types';
import crypto from 'crypto';

// Type definitions
export interface FileUploadOptions {
  policyId: string;
  category: 'identification' | 'income' | 'optional';
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  uploadedBy: string; // 'tenant' or user ID
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Configuration
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Validation functions
export const validateFile = (file: FileUploadOptions['file']): FileValidationResult => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload PDF or image files only.'
    };
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(file.originalName))) {
    return {
      valid: false,
      error: 'Suspicious file type detected.'
    };
  }

  return { valid: true };
};

// Generate safe file name
const generateSafeFileName = (originalName: string, policyId: string, category: string): string => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'unknown';
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  return `${policyId}/${category}/${timestamp}-${randomStr}.${ext}`;
};

// Upload file to storage
export const uploadFile = async (options: FileUploadOptions): Promise<PolicyDocument> => {
  // Validate file
  const validation = validateFile(options.file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileName = generateSafeFileName(options.file.originalName, options.policyId, options.category);
  const storage = getStorageProvider();

  try {
    // Convert to StorageFile format
    const storageFile: StorageFile = {
      buffer: options.file.buffer,
      originalName: options.file.originalName,
      mimeType: options.file.mimeType,
      size: options.file.size,
    };

    // Upload file using storage abstraction
    await storage.upload({
      path: fileName,
      file: storageFile,
      metadata: {
        policyId: options.policyId,
        category: options.category,
        uploadedBy: options.uploadedBy,
      },
      contentType: options.file.mimeType,
    });

    // Generate a signed URL for the file (valid for 1 year for database storage)
    const storageUrl = await storage.getSignedUrl({
      path: fileName,
      action: 'read',
      expiresInSeconds: 365 * 24 * 60 * 60, // 1 year for DB storage
    });

    // Create document record in database
    if (isDemoMode()) {
      // For demo mode, return mock document
      return {
        id: `mock-doc-${Date.now()}`,
        policyId: options.policyId,
        category: options.category,
        fileName: fileName,
        originalName: options.file.originalName,
        fileSize: options.file.size,
        mimeType: options.file.mimeType,
        storageUrl: storageUrl,
        uploadedAt: new Date(),
        uploadedBy: options.uploadedBy
      } as PolicyDocument;
    } else {
      // Create document record in database
      const document = await prisma.policyDocument.create({
        data: {
          policyId: options.policyId,
          category: options.category,
          fileName: fileName,
          originalName: options.file.originalName,
          fileSize: options.file.size,
          mimeType: options.file.mimeType,
          storageUrl: storageUrl,
          uploadedBy: options.uploadedBy
        }
      });

      return document;
    }
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
};

// Get file URL with fresh signed URL
export const getFileUrl = async (documentId: string): Promise<string | null> => {
  if (isDemoMode()) {
    // For demo mode, just return a mock URL
    return `http://localhost:3000/api/storage/mock/${documentId}`;
  }

  const document = await prisma.policyDocument.findUnique({
    where: { id: documentId }
  });
  
  if (!document) return null;

  const storage = getStorageProvider();

  try {
    // Check if file exists in storage
    const exists = await storage.exists(document.fileName);
    if (!exists) return null;

    // Generate a new signed URL with 7-day expiration for general access
    const signedUrl = await storage.getSignedUrl({
      path: document.fileName,
      action: 'read',
      expiresInSeconds: 7 * 24 * 60 * 60, // 7 days
    });

    // Update the URL in database
    await prisma.policyDocument.update({
      where: { id: documentId },
      data: { storageUrl: signedUrl }
    });

    return signedUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return document.storageUrl; // Return existing URL as fallback
  }
};

// Delete file
export const deleteFile = async (documentId: string): Promise<boolean> => {
  try {
    if (isDemoMode()) {
      console.log('Demo mode: Mock deleting file');
      return true;
    }

    // Get document from database
    const document = await prisma.policyDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) return false;

    const storage = getStorageProvider();

    // Delete from storage
    try {
      await storage.delete(document.fileName);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }

    // Delete from database
    await prisma.policyDocument.delete({
      where: { id: documentId }
    });

    return true;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
};

// Get all documents for a policy
export const getPolicyDocuments = async (policyId: string): Promise<PolicyDocument[]> => {
  if (isDemoMode()) {
    // Return empty array for demo mode
    return [];
  }

  return prisma.policyDocument.findMany({
    where: { policyId },
    orderBy: { uploadedAt: 'desc' }
  });
};

// Generate a signed download URL for a file (with short expiration for security)
export const getSignedDownloadUrl = async (fileName: string, expiresInSeconds: number = 10): Promise<string> => {
  const storage = getStorageProvider();

  try {
    // Check if file exists
    const exists = await storage.exists(fileName);
    if (!exists) {
      throw new Error('File not found in storage');
    }

    // Generate signed URL with short expiration for security
    const signedUrl = await storage.getSignedUrl({
      path: fileName,
      action: 'read',
      expiresInSeconds: expiresInSeconds, // Default 10 seconds for security
      responseDisposition: 'attachment', // Force download
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

// Validate all required documents are uploaded
export const validatePolicyDocuments = async (policyId: string): Promise<{
  valid: boolean;
  missing: string[];
}> => {
  const documents = await getPolicyDocuments(policyId);
  
  const hasIdentification = documents.some(doc => doc.category === 'identification');
  const hasIncome = documents.some(doc => doc.category === 'income');
  
  const missing: string[] = [];
  if (!hasIdentification) missing.push('identification');
  if (!hasIncome) missing.push('income');
  
  return {
    valid: missing.length === 0,
    missing
  };
};