# Document Management Migration Guide

## Overview

This guide explains how to migrate from the old document management components to the new unified system.

## What's New

### Core Module: `src/lib/documentManagement/`

**Centralized validation** - No more duplicate validation logic:
```ts
import { validateFile } from '@/lib/documentManagement';
const validation = validateFile(file);
```

**Progress tracking** - XMLHttpRequest for uploads, Fetch for downloads:
```ts
import { uploadWithProgress } from '@/lib/documentManagement';
await uploadWithProgress({
  file,
  endpoint,
  category,
  documentType,
  onProgress: (progress) => console.log(progress.percentage),
});
```

### Unified Hook: `useDocumentOperations`

**Before** - 3 different hooks:
```ts
// Old way
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
```

**After** - Single unified hook:
```ts
// New way
import { useDocumentOperations } from '@/hooks/useDocumentOperations';

const {
  documents,              // Grouped by category
  operations,             // All active operations with progress
  uploadDocument,         // With progress tracking
  downloadDocument,       // With progress tracking
  deleteDocument,         // With status tracking
  loading,
  getDocumentOperation,   // Get operation for a document
  getCategoryOperations,  // Get all operations for a category
  isCategoryBusy,        // Check if category has pending ops
} = useDocumentOperations({
  token,
  actorType: 'tenant',
  isAdminEdit: false,
});
```

### New Components

#### 1. DocumentProgress

Shows upload/download progress with percentage and bytes:
```tsx
<DocumentProgress
  progress={operation.progress}
  status={operation.status}
  error={operation.error}
  variant="compact"
  showBytes={true}
/>
```

#### 2. DocumentUploader

Three variants for different use cases:
```tsx
// Default - full upload control
<DocumentUploader
  documentType="identification"
  onUpload={handleUpload}
  operation={uploadOperation}
  variant="default"
/>

// Compact - file input + button
<DocumentUploader
  documentType="identification"
  onUpload={handleUpload}
  variant="compact"
/>

// Button-only - just a trigger button
<DocumentUploader
  documentType="identification"
  onUpload={handleUpload}
  variant="button-only"
  buttonText="Upload"
/>
```

#### 3. DocumentList

Renders documents with progress indicators:
```tsx
<DocumentList
  documents={documents}
  onDownload={downloadDocument}
  onDelete={deleteDocument}
  operations={operations}
  readOnly={false}
/>
```

#### 4. InlineDocumentManager

Replaces `InlineDocumentUpload`:
```tsx
// Old
<InlineDocumentUpload
  label="Tax Certificate"
  documentType="rfc_document"
  documents={documents}
  onUpload={uploadDocument}
  onDelete={deleteDocument}
  onDownload={downloadDocument}
  uploading={uploading}
  deletingDocumentId={deletingId}
/>

// New
<InlineDocumentManager
  label="Tax Certificate"
  documentType="rfc_document"
  documents={documents}
  onUpload={uploadDocument}
  onDelete={deleteDocument}
  onDownload={downloadDocument}
  operations={operations}
/>
```

#### 5. DocumentManagerCard

Replaces `DocumentUploadCard`:
```tsx
// Old
<DocumentUploadCard
  category={DocumentCategory.IDENTIFICATION}
  title="ID Document"
  description="Upload your ID"
  documentType="ine"
  documents={documents}
  onUpload={uploadDocument}
  uploading={uploading}
  uploadError={error}
/>

// New
<DocumentManagerCard
  category={DocumentCategory.IDENTIFICATION}
  title="ID Document"
  description="Upload your ID"
  documentType="ine"
  documents={documents}
  onUpload={uploadDocument}
  operations={operations}
/>
```

## Migration Steps

### Step 1: Replace Hook Import

```tsx
// Before
import { useDocumentManagement } from '@/hooks/useDocumentManagement';

const {
  documents,
  uploadingFiles,
  uploadErrors,
  deletingFiles,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} = useDocumentManagement({ token, actorType: 'tenant' });

// After
import { useDocumentOperations } from '@/hooks/useDocumentOperations';

const {
  documents,
  operations,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  getCategoryOperations,
} = useDocumentOperations({ token, actorType: 'tenant' });
```

### Step 2: Update Component Usage

```tsx
// Before
const uploadKey = `${category}-upload`;
const isUploading = uploadingFiles[uploadKey];
const error = uploadErrors[uploadKey];

<DocumentUploadCard
  uploading={isUploading}
  uploadError={error}
  deletingDocumentId={Object.keys(deletingFiles).find(id =>
    docs.some(doc => doc.id === id && deletingFiles[id])
  )}
/>

// After
const categoryOps = getCategoryOperations(category);

<DocumentManagerCard
  operations={categoryOps}
/>
```

### Step 3: Progress Display

Progress is now automatic - no manual state management needed:

```tsx
// Before - manual loading states
{uploading && <Loader2 className="animate-spin" />}

// After - automatic progress
// Progress bars appear automatically during upload/download
// No manual state management required!
```

## Key Differences

| Feature | Old System | New System |
|---------|-----------|------------|
| Hooks | 3 separate hooks | 1 unified hook |
| Progress | Boolean flags | Percentage + bytes |
| Validation | 3 locations | 1 centralized module |
| State Management | Per-category booleans | Per-operation objects |
| Progress Display | Manual | Automatic |
| Type Safety | Partial | Full TypeScript |

## Benefits

1. **Visual Progress** - Real progress bars with percentages
2. **Less Code** - No manual state management for loading states
3. **Type Safety** - Full TypeScript coverage
4. **Reusability** - Composable components
5. **Maintainability** - Single source of truth for validation
6. **Better UX** - Disabled buttons, loading states, error messages

## Testing Checklist

- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Download file
- [ ] Delete file
- [ ] Cancel upload (future feature)
- [ ] Progress bar displays correctly
- [ ] Buttons disabled during operations
- [ ] Error messages display correctly
- [ ] Read-only mode works
- [ ] Required field validation

## Troubleshooting

**Progress not showing?**
- Ensure you're passing `operations` prop to components
- Check that operations are from `getCategoryOperations` or include the document

**TypeScript errors?**
- Make sure you're importing from `@/lib/documentManagement`
- Check that all props match the new interfaces

**Upload not working?**
- Verify endpoint is correct
- Check file validation (10MB, PDF/images only)
- Look for console errors

## Next Steps

After migrating a component:
1. Test all operations (upload, download, delete)
2. Verify progress bars work
3. Check error handling
4. Test read-only mode
5. Remove old imports
