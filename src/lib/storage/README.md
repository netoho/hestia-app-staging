# Storage Abstraction Layer

**Status**: ✅ Production-Ready Multi-Provider Storage
**Last Updated**: December 2024
**Files**: 4 core files + 3 provider implementations

---

## Purpose

Provider-agnostic file storage abstraction supporting AWS S3, Firebase Storage, and local filesystem. Enables switching storage backends without changing application code, facilitates testing with local storage, and provides consistent API across all providers.

---

## Architecture

### Provider Pattern

```
StorageProvider (interface)
  ├─> S3StorageProvider (AWS S3)
  ├─> FirebaseStorageProvider (Firebase Storage)
  └─> LocalStorageProvider (Local filesystem)

getStorageProvider() → Configured provider (singleton)
```

### Factory Pattern

```typescript
// Singleton instance
let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    const config = getStorageConfig();
    storageInstance = createStorageProvider(config);
  }
  return storageInstance;
}
```

---

## Files

- **index.ts** (61 lines) - Factory and exports
- **types.ts** (110 lines) - Interfaces and types
- **config.ts** (53 lines) - Configuration helper
- **providers/s3.ts** (221 lines) - AWS S3 implementation
- **providers/firebase.ts** (155 lines) - Firebase Storage
- **providers/local.ts** (128 lines) - Local filesystem

---

## Exports

### Factory Functions

```typescript
export function getStorageProvider(): StorageProvider;
export function createStorageProvider(config: StorageConfig): StorageProvider;
export function resetStorageInstance(): void; // Testing only
```

### Configuration Helpers

```typescript
export function getStorageConfig(): StorageConfig;
export function isUsingS3(): boolean;
export function isUsingFirebase(): boolean;
export function isUsingLocalStorage(): boolean;
```

### Types

```typescript
export interface StorageProvider { ... }
export interface StorageFile { ... }
export interface StorageUploadOptions { ... }
export interface SignedUrlOptions { ... }
export interface StorageFileMetadata { ... }
export type StorageProviderType = 's3' | 'firebase' | 'local';
```

---

## StorageProvider Interface

**File**: `types.ts:41-87`

### Methods

```typescript
interface StorageProvider {
  // Upload operations
  upload(options: StorageUploadOptions, isPrivate: boolean): Promise<string>;
  publicUpload(options: StorageUploadOptions): Promise<string>;
  privateUpload(options: StorageUploadOptions): Promise<string>;

  // Download operations
  download(path: string): Promise<Buffer>;
  getSignedUrl(options: SignedUrlOptions): Promise<string>;
  getPublicUrl(path: string): string;

  // File management
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<StorageFileMetadata | null>;
  list(prefix: string): Promise<string[]>;
}
```

---

## Types

### StorageFile

```typescript
export interface StorageFile {
  buffer: Buffer;          // File contents
  originalName: string;    // Original filename
  mimeType: string;        // MIME type (e.g., 'image/png')
  size: number;            // File size in bytes
}
```

### StorageUploadOptions

```typescript
export interface StorageUploadOptions {
  path: string;                        // Storage path/key
  file: StorageFile;                   // File to upload
  metadata?: Record<string, string>;   // Custom metadata
  contentType?: string;                // Override MIME type
}
```

### SignedUrlOptions

```typescript
export interface SignedUrlOptions {
  path: string;                     // Storage path/key
  action: 'read' | 'write' | 'delete';
  expiresInSeconds?: number;        // Default: 3600 (1 hour)
  responseDisposition?: 'inline' | 'attachment';
  fileName?: string;                // For downloads
}
```

### StorageFileMetadata

```typescript
export interface StorageFileMetadata {
  size: number;
  contentType?: string;
  created: Date;
  updated: Date;
  metadata?: Record<string, string>;
}
```

---

## Configuration

### Environment Variables

**AWS S3** (Production):
```bash
STORAGE_PROVIDER=s3
AWS_S3_BUCKET_NAME=hestia-private-docs
AWS_S3_PUBLIC_BUCKET_NAME=hestia-public-assets
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=AKIAxxxxx
AWS_S3_SECRET_ACCESS_KEY=xxxxx
```

**Firebase Storage**:
```bash
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=hestia-app.appspot.com
FIREBASE_PROJECT_ID=hestia-app
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Local Storage** (Development):
```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
```

### config.ts

**File**: `config.ts:1-53`

```typescript
export function getStorageConfig(): StorageConfig {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 's3':
      return {
        provider: 's3',
        s3: {
          bucket: process.env.AWS_S3_BUCKET_NAME!,
          publicBucket: process.env.AWS_S3_PUBLIC_BUCKET_NAME!,
          region: process.env.AWS_S3_REGION!,
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
        }
      };

    case 'firebase':
      return {
        provider: 'firebase',
        firebase: {
          bucketName: process.env.FIREBASE_STORAGE_BUCKET!,
          projectId: process.env.FIREBASE_PROJECT_ID!,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        }
      };

    case 'local':
    default:
      return {
        provider: 'local',
        local: {
          basePath: process.env.LOCAL_STORAGE_PATH || './uploads'
        }
      };
  }
}
```

---

## Usage

### Basic Upload/Download

```typescript
// File: src/lib/services/documentService.ts:45-70
import { getStorageProvider } from '@/lib/storage';

const storage = getStorageProvider();

// Upload file (private)
const path = await storage.privateUpload({
  path: `documents/policy-${policyId}/${Date.now()}-${file.originalname}`,
  file: {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  },
  metadata: {
    policyId,
    uploadedBy: userId,
    category: DocumentCategory.IDENTIFICATION
  }
});

// Download file
const fileBuffer = await storage.download(path);

// Get signed URL for temporary access (1 hour)
const url = await storage.getSignedUrl({
  path,
  action: 'read',
  expiresInSeconds: 3600,
  responseDisposition: 'attachment',
  fileName: 'document.pdf'
});
```

### Public vs Private Uploads

```typescript
// Private upload (requires signed URL to access)
const privatePath = await storage.privateUpload({
  path: 'documents/sensitive-doc.pdf',
  file: documentFile
});

// Public upload (accessible via public URL)
const publicPath = await storage.publicUpload({
  path: 'assets/logo.png',
  file: logoFile
});

// Get public URL (no expiration)
const publicUrl = storage.getPublicUrl(publicPath);
// Returns: https://bucket-name.s3.amazonaws.com/assets/logo.png
```

### File Operations

```typescript
// Check if file exists
const exists = await storage.exists('documents/file.pdf');

// Get file metadata
const metadata = await storage.getMetadata('documents/file.pdf');
console.log(metadata.size, metadata.contentType, metadata.created);

// List files in directory
const files = await storage.list('documents/policy-123/');
// Returns: ['documents/policy-123/file1.pdf', 'documents/policy-123/file2.pdf']

// Delete file
const deleted = await storage.delete('documents/old-file.pdf');
```

---

## Providers

### S3StorageProvider

**File**: `providers/s3.ts:1-221`

**Features**:
- Separate public/private buckets
- Signed URLs for private access
- Multipart upload support (large files)
- Server-side encryption (AES256)
- Metadata preservation

**Configuration**:
```typescript
{
  provider: 's3',
  s3: {
    bucket: 'hestia-private-docs',         // Private documents
    publicBucket: 'hestia-public-assets',  // Public assets
    region: 'us-east-1',
    accessKeyId: 'AKIAxxxxx',
    secretAccessKey: 'xxxxx',
    endpoint: undefined // Optional for S3-compatible services
  }
}
```

**Example Usage**:
```typescript
const s3Provider = new S3StorageProvider({
  bucket: 'my-private-bucket',
  publicBucket: 'my-public-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
});

await s3Provider.privateUpload({ path: 'docs/file.pdf', file });
```

---

### FirebaseStorageProvider

**File**: `providers/firebase.ts:1-155`

**Features**:
- Firebase Admin SDK integration
- Token-based access control
- Custom metadata support
- Download tokens

**Configuration**:
```typescript
{
  provider: 'firebase',
  firebase: {
    bucketName: 'hestia-app.appspot.com',
    projectId: 'hestia-app',
    keyFilename: '/path/to/service-account.json'
  }
}
```

**Example Usage**:
```typescript
const firebaseProvider = new FirebaseStorageProvider({
  bucketName: 'my-app.appspot.com',
  projectId: 'my-app',
  keyFilename: './service-account.json'
});

await firebaseProvider.upload({ path: 'uploads/file.pdf', file }, true);
```

---

### LocalStorageProvider

**File**: `providers/local.ts:1-128`

**Features**:
- Local filesystem storage
- Perfect for development/testing
- Directory auto-creation
- File metadata via fs.stat

**Configuration**:
```typescript
{
  provider: 'local',
  local: {
    basePath: './uploads' // Relative or absolute path
  }
}
```

**Example Usage**:
```typescript
const localProvider = new LocalStorageProvider({
  basePath: './test-uploads'
});

await localProvider.upload({ path: 'test/file.pdf', file }, false);
// File saved to: ./test-uploads/test/file.pdf
```

**Note**: Not suitable for production (no redundancy, scaling issues)

---

## Real-World Examples

### Example 1: Document Upload Service

```typescript
// File: src/lib/services/documentService.ts:85-120
import { getStorageProvider } from '@/lib/storage';
import { generateUniqueFilename, sanitizeFilename } from '@/lib/utils/filename';

export class DocumentService extends BaseService {
  async uploadDocument(data: DocumentUploadData): AsyncResult<Document> {
    const storage = getStorageProvider();

    // Generate safe, unique path
    const sanitizedName = sanitizeFilename(data.file.originalName);
    const uniqueName = generateUniqueFilename(sanitizedName, data.category);
    const storagePath = `documents/policy-${data.policyId}/${uniqueName}`;

    try {
      // Upload to storage
      const path = await storage.privateUpload({
        path: storagePath,
        file: {
          buffer: data.file.buffer,
          originalName: data.file.originalName,
          mimeType: data.file.mimeType,
          size: data.file.size
        },
        metadata: {
          policyId: data.policyId,
          actorId: data.actorId,
          actorType: data.actorType,
          category: data.category,
          uploadedBy: data.uploadedBy,
          uploadedAt: new Date().toISOString()
        }
      });

      // Save document record to database
      return this.executeDbOperation(
        async () => await this.prisma.document.create({
          data: {
            category: data.category,
            documentType: data.documentType,
            fileName: uniqueName,
            originalName: data.file.originalName,
            fileSize: data.file.size,
            mimeType: data.file.mimeType,
            s3Key: path,
            s3Bucket: isUsingS3() ? process.env.AWS_S3_BUCKET_NAME! : 'local',
            policyId: data.policyId,
            actorId: data.actorId,
            uploadedBy: data.uploadedBy
          }
        }),
        'uploadDocument'
      );
    } catch (error: any) {
      this.log('error', 'Failed to upload document', error);
      return Result.error(
        new ServiceError(
          ErrorCode.STORAGE_UPLOAD_FAILED,
          'Failed to upload document',
          500,
          { error: error.message }
        )
      );
    }
  }

  async getDownloadUrl(documentId: string): AsyncResult<string> {
    const storage = getStorageProvider();

    const docResult = await this.findById(documentId);
    if (!docResult.ok) return Result.error(docResult.error);

    const document = docResult.value;

    try {
      const url = await storage.getSignedUrl({
        path: document.s3Key,
        action: 'read',
        expiresInSeconds: 3600, // 1 hour
        responseDisposition: 'attachment',
        fileName: document.originalName
      });

      return Result.ok(url);
    } catch (error: any) {
      return Result.error(
        new ServiceError(
          ErrorCode.STORAGE_UPLOAD_FAILED,
          'Failed to generate download URL',
          500,
          { error: error.message }
        )
      );
    }
  }
}
```

---

### Example 2: API Route for Document Download

```typescript
// File: src/app/api/documents/[id]/download/route.ts:15-40
import { getStorageProvider } from '@/lib/storage';
import { DocumentService } from '@/lib/services/documentService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const documentService = new DocumentService();

  // Get document from database
  const docResult = await documentService.findById(id);
  if (!docResult.ok) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  const document = docResult.value;
  const storage = getStorageProvider();

  // Generate signed URL
  const url = await storage.getSignedUrl({
    path: document.s3Key,
    action: 'read',
    expiresInSeconds: 300, // 5 minutes
    responseDisposition: 'attachment',
    fileName: document.originalName
  });

  // Redirect to signed URL
  return NextResponse.redirect(url);
}
```

---

### Example 3: Multi-File Upload

```typescript
// File: src/app/api/actors/[type]/[identifier]/documents/route.ts:50-85
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  const storage = getStorageProvider();
  const uploadResults = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const path = await storage.privateUpload({
        path: `documents/${actorId}/${file.name}`,
        file: {
          buffer,
          originalName: file.name,
          mimeType: file.type,
          size: file.size
        }
      });

      uploadResults.push({
        success: true,
        fileName: file.name,
        path
      });
    } catch (error: any) {
      uploadResults.push({
        success: false,
        fileName: file.name,
        error: error.message
      });
    }
  }

  return NextResponse.json({ results: uploadResults });
}
```

---

## Switching Providers

### Development → Production

**Development** (.env.local):
```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
```

**Production** (.env.production):
```bash
STORAGE_PROVIDER=s3
AWS_S3_BUCKET_NAME=hestia-prod-docs
AWS_S3_PUBLIC_BUCKET_NAME=hestia-prod-assets
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=AKIAxxxxx
AWS_S3_SECRET_ACCESS_KEY=xxxxx
```

**No code changes required!** Factory automatically creates correct provider.

---

## Testing

### Unit Test with Mock Provider

```typescript
import { createStorageProvider } from '@/lib/storage';

describe('DocumentService', () => {
  const mockStorage: StorageProvider = {
    upload: jest.fn().mockResolvedValue('mock-path'),
    publicUpload: jest.fn().mockResolvedValue('mock-path'),
    privateUpload: jest.fn().mockResolvedValue('mock-path'),
    download: jest.fn().mockResolvedValue(Buffer.from('test')),
    delete: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(true),
    getMetadata: jest.fn().mockResolvedValue({
      size: 1024,
      created: new Date(),
      updated: new Date()
    }),
    getSignedUrl: jest.fn().mockResolvedValue('https://mock-url.com'),
    getPublicUrl: jest.fn().mockReturnValue('https://public-url.com'),
    list: jest.fn().mockResolvedValue([])
  };

  it('should upload document', async () => {
    const service = new DocumentService();
    // Inject mock storage...
  });
});
```

### Integration Test with Local Provider

```typescript
import { LocalStorageProvider } from '@/lib/storage/providers/local';
import fs from 'fs/promises';

describe('Storage Integration', () => {
  const testPath = './test-uploads';
  const storage = new LocalStorageProvider({ basePath: testPath });

  beforeAll(async () => {
    await fs.mkdir(testPath, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testPath, { recursive: true, force: true });
  });

  it('should upload and download file', async () => {
    const file = {
      buffer: Buffer.from('test content'),
      originalName: 'test.txt',
      mimeType: 'text/plain',
      size: 12
    };

    const path = await storage.upload({ path: 'test/file.txt', file }, false);
    expect(path).toBe('test/file.txt');

    const downloaded = await storage.download(path);
    expect(downloaded.toString()).toBe('test content');
  });
});
```

---

## Best Practices

### DO ✅

- **Use factory function** to get provider
  ```typescript
  const storage = getStorageProvider();
  ```

- **Use private uploads** for sensitive documents
  ```typescript
  await storage.privateUpload({ path, file });
  ```

- **Generate unique filenames** to prevent collisions
  ```typescript
  const uniqueName = `${Date.now()}-${sanitizedName}`;
  ```

- **Set proper content types**
  ```typescript
  await storage.upload({ path, file, contentType: 'application/pdf' });
  ```

- **Use signed URLs** with reasonable expiration
  ```typescript
  const url = await storage.getSignedUrl({
    path,
    action: 'read',
    expiresInSeconds: 3600 // 1 hour
  });
  ```

- **Store metadata** for audit trails
  ```typescript
  metadata: {
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    category: 'IDENTIFICATION'
  }
  ```

### DON'T ❌

- **Don't hardcode provider**
  ```typescript
  // ❌ WRONG
  const storage = new S3StorageProvider(config);

  // ✅ RIGHT
  const storage = getStorageProvider();
  ```

- **Don't expose private files publicly**
  ```typescript
  // ❌ WRONG
  const url = storage.getPublicUrl(privatePath); // Won't work for private!

  // ✅ RIGHT
  const url = await storage.getSignedUrl({ path: privatePath, action: 'read' });
  ```

- **Don't use long expiration for sensitive files**
  ```typescript
  // ❌ WRONG
  expiresInSeconds: 86400 * 30 // 30 days!

  // ✅ RIGHT
  expiresInSeconds: 3600 // 1 hour
  ```

- **Don't upload without validation**
  ```typescript
  // ❌ WRONG
  await storage.upload({ path: userProvidedPath, file }); // Injection risk!

  // ✅ RIGHT
  const safePath = sanitizeFilename(userProvidedPath);
  await storage.upload({ path: safePath, file });
  ```

---

## Migration Guide

### From Direct S3 to Abstraction

**Before**:
```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: { ... }
});

await s3.putObject({
  Bucket: 'my-bucket',
  Key: 'path/to/file',
  Body: buffer
}).promise();
```

**After**:
```typescript
import { getStorageProvider } from '@/lib/storage';

const storage = getStorageProvider();

await storage.upload({
  path: 'path/to/file',
  file: {
    buffer,
    originalName: 'file.pdf',
    mimeType: 'application/pdf',
    size: buffer.length
  }
}, true);
```

**Benefits**:
- Provider-agnostic (easy to switch)
- Simpler API
- Automatic error handling
- Consistent across codebase

---

## Related Modules

- **[/src/lib/services/documentService.ts](../services/README.md)** - Uses storage for document management
- **[/src/lib/documentManagement/](../documentManagement/README.md)** - Document upload/download utilities
- **[/src/lib/utils/filename.ts](../utils/README.md)** - Filename utilities
- **[DEVELOPER_GUIDE.md](../../../docs/DEVELOPER_GUIDE.md)** - Main developer guide

---

**Last Verified**: November 2024
**Production Status**: ✅ S3 in Production, Local in Development
