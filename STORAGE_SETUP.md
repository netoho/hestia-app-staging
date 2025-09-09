# Storage Configuration Guide

## Overview
Hestia uses an abstracted storage layer that supports multiple providers for secure document storage. All files are stored privately and accessed only through signed URLs with short expiration times for maximum security.

## Supported Storage Providers

### 1. AWS S3 (Recommended for Production)
- **Private bucket storage** with signed URLs
- **10-second default expiration** for download links
- Supports S3-compatible services (MinIO, DigitalOcean Spaces, etc.)

### 2. Firebase Storage
- Google Cloud Storage integration
- Compatible with existing Firebase setup
- Signed URLs with configurable expiration

### 3. Local Storage (Development/Demo)
- In-memory storage for testing
- No external dependencies
- Automatic cleanup on restart

## Configuration

### AWS S3 Setup

1. **Create an S3 Bucket**
```bash
# Using AWS CLI
aws s3api create-bucket \
  --bucket your-bucket-name \
  --region us-east-1 \
  --acl private
```

2. **Configure Bucket Policy** (ensure private access only)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

3. **Create IAM User with S3 Permissions**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

4. **Set Environment Variables**
```env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Firebase Storage Setup

1. **Enable Firebase Storage** in Firebase Console
2. **Set Storage Rules** (private by default)
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. **Set Environment Variables**
```env
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Local Storage Setup (Development)

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=/tmp/hestia-storage
```

## Security Features

### Signed URLs
- All file access requires signed URLs
- Default expiration: **10 seconds** for downloads
- Configurable expiration times per request
- URLs cannot be shared or reused after expiration

### Private Storage
- Files are never publicly accessible
- All buckets/containers configured as private
- Access controlled through application logic

### File Validation
- Maximum file size: 15MB
- Allowed types: PDF, JPEG, PNG, GIF, WebP
- Filename sanitization
- Suspicious file detection

## API Usage

### Upload File
```typescript
import { getStorageProvider } from '@/lib/storage';

const storage = getStorageProvider();
await storage.upload({
  path: 'policies/123/document.pdf',
  file: {
    buffer: fileBuffer,
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024000
  },
  metadata: {
    policyId: '123',
    uploadedBy: 'user-456'
  }
});
```

### Generate Signed URL (10-second expiration)
```typescript
const signedUrl = await storage.getSignedUrl({
  path: 'policies/123/document.pdf',
  action: 'read',
  expiresInSeconds: 10, // Security: Short expiration
  responseDisposition: 'attachment'
});
```

### Delete File
```typescript
await storage.delete('policies/123/document.pdf');
```

## Migration from Firebase to S3

1. **Export existing files** from Firebase Storage
2. **Upload to S3** using AWS CLI or migration script
3. **Update environment variables** to use S3
4. **Update database** with new file paths if needed
5. **Test** file upload/download functionality

## Monitoring & Logging

- All storage operations are logged
- Failed uploads logged with error details
- Signed URL generation tracked
- File deletion operations audited

## Troubleshooting

### S3 Access Denied
- Verify IAM user permissions
- Check bucket policy
- Ensure bucket name is correct
- Verify AWS credentials

### Signed URLs Not Working
- Check expiration time (default 10 seconds)
- Verify storage provider configuration
- Check file exists in storage
- Review CORS settings if browser issues

### Large File Uploads Failing
- Check MAX_FILE_SIZE setting (15MB default)
- Verify network timeouts
- Check S3 multipart upload settings
- Review application memory limits

## Best Practices

1. **Use S3 for production** - Better performance and reliability
2. **Keep expiration times short** - 10 seconds for downloads
3. **Monitor storage costs** - Set up billing alerts
4. **Regular backups** - Implement backup strategy
5. **Encrypt sensitive files** - Use S3 server-side encryption
6. **Audit access logs** - Enable S3 access logging
7. **Use lifecycle policies** - Auto-delete old files
8. **Implement rate limiting** - Prevent abuse