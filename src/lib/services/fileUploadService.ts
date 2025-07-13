import { storage } from '../firebase-admin';
import { isEmulator } from '../env-check';
import prisma from '../prisma';
import { PolicyDocument } from '@prisma/client';
import { Readable } from 'stream';
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

// Mock storage for emulator
const mockFiles = new Map<string, {
  policyDocument: PolicyDocument;
  buffer: Buffer;
}>();

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

  if (isEmulator()) {
    console.log('Emulator mode: Mock uploading file');
    
    // Create mock document record
    const mockDocument: PolicyDocument = {
      id: `mock-doc-${Date.now()}`,
      policyId: options.policyId,
      category: options.category,
      fileName: fileName,
      originalName: options.file.originalName,
      fileSize: options.file.size,
      mimeType: options.file.mimeType,
      storageUrl: `mock://storage/${fileName}`,
      uploadedAt: new Date(),
      uploadedBy: options.uploadedBy
    };

    // Store in mock storage
    mockFiles.set(mockDocument.id, {
      policyDocument: mockDocument,
      buffer: options.file.buffer
    });

    return mockDocument;
  } else {
    console.log('Real mode: Uploading file to Firebase Storage');
    
    try {
      // Get a reference to the file in Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(fileName);

      // Create a stream from the buffer
      const stream = Readable.from(options.file.buffer);

      // Upload the file
      await new Promise((resolve, reject) => {
        stream
          .pipe(file.createWriteStream({
            metadata: {
              contentType: options.file.mimeType,
              metadata: {
                originalName: options.file.originalName,
                policyId: options.policyId,
                category: options.category,
                uploadedBy: options.uploadedBy
              }
            }
          }))
          .on('error', reject)
          .on('finish', resolve);
      });

      // Make the file publicly accessible (or use signed URLs for security)
      // For now, we'll use signed URLs
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
      });

      // Create document record in database
      const document = await prisma.policyDocument.create({
        data: {
          policyId: options.policyId,
          category: options.category,
          fileName: fileName,
          originalName: options.file.originalName,
          fileSize: options.file.size,
          mimeType: options.file.mimeType,
          storageUrl: signedUrl,
          uploadedBy: options.uploadedBy
        }
      });

      return document;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }
};

// Get file URL
export const getFileUrl = async (documentId: string): Promise<string | null> => {
  if (isEmulator()) {
    const mockFile = mockFiles.get(documentId);
    return mockFile ? mockFile.policyDocument.storageUrl : null;
  } else {
    const document = await prisma.policyDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document) return null;

    // If the URL is expired, generate a new one
    try {
      const bucket = storage.bucket();
      const file = bucket.file(document.fileName);
      
      const [exists] = await file.exists();
      if (!exists) return null;

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
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
  }
};

// Delete file
export const deleteFile = async (documentId: string): Promise<boolean> => {
  try {
    if (isEmulator()) {
      console.log('Emulator mode: Mock deleting file');
      mockFiles.delete(documentId);
      return true;
    } else {
      // Get document from database
      const document = await prisma.policyDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) return false;

      // Delete from Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(document.fileName);
      
      try {
        await file.delete();
      } catch (error) {
        console.error('Error deleting file from storage:', error);
      }

      // Delete from database
      await prisma.policyDocument.delete({
        where: { id: documentId }
      });

      return true;
    }
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
};

// Get all documents for a policy
export const getPolicyDocuments = async (policyId: string): Promise<PolicyDocument[]> => {
  if (isEmulator()) {
    const documents: PolicyDocument[] = [];
    mockFiles.forEach((file) => {
      if (file.policyDocument.policyId === policyId) {
        documents.push(file.policyDocument);
      }
    });
    return documents;
  } else {
    return prisma.policyDocument.findMany({
      where: { policyId },
      orderBy: { uploadedAt: 'desc' }
    });
  }
};

// Generate a signed download URL for a file
export const getSignedDownloadUrl = async (fileName: string, expiresInSeconds: number = 300): Promise<string> => {
  if (isEmulator()) {
    // For emulator, return a mock URL
    return `http://localhost:9199/v0/b/demo-bucket/o/${encodeURIComponent(fileName)}?alt=media&token=mock-token`;
  } else {
    try {
      const bucket = storage.bucket();
      const file = bucket.file(fileName);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('File not found in storage');
      }

      // Generate signed URL with short expiration
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (expiresInSeconds * 1000),
        responseDisposition: 'attachment', // Force download
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed download URL:', error);
      throw new Error('Failed to generate download URL');
    }
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
