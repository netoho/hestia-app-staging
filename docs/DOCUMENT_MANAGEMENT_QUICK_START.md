# Document Management - Quick Start

## Files Created

### Core Module
```
src/lib/documentManagement/
├── types.ts           # Shared types
├── validation.ts      # File validation
├── upload.ts         # Upload with progress
├── download.ts       # Download with progress
└── index.ts          # Barrel export
```

### Hook
```
src/hooks/
└── useDocumentOperations.ts  # Unified hook
```

### Components
```
src/components/documents/
├── DocumentProgress.tsx         # Progress bar
├── DocumentListItem.tsx         # Enhanced (updated)
├── DocumentUploader.tsx         # Upload control (3 variants)
├── DocumentList.tsx             # List renderer
├── InlineDocumentManager.tsx   # Replaces InlineDocumentUpload
└── DocumentManagerCard.tsx     # Replaces DocumentUploadCard
```

## Quick Usage

### Basic Upload with Progress

```tsx
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/types/policy';

function MyComponent() {
  const {
    documents,
    operations,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    getCategoryOperations,
  } = useDocumentOperations({
    token: 'abc123',
    actorType: 'tenant',
  });

  const idDocs = documents[DocumentCategory.IDENTIFICATION];
  const idOps = getCategoryOperations(DocumentCategory.IDENTIFICATION);

  return (
    <DocumentManagerCard
      category={DocumentCategory.IDENTIFICATION}
      title="Identificación Oficial"
      description="INE o Pasaporte"
      documentType="ine"
      documents={idDocs}
      operations={idOps}
      required={true}
      onUpload={(file) => uploadDocument(file, DocumentCategory.IDENTIFICATION, 'ine')}
      onDownload={downloadDocument}
      onDelete={deleteDocument}
    />
  );
}
```

### Inline Upload (Compact)

```tsx
import { InlineDocumentManager } from '@/components/documents/InlineDocumentManager';

<InlineDocumentManager
  label="Constancia Fiscal"
  documentType="rfc"
  documents={taxDocs}
  operations={taxOps}
  onUpload={(file) => uploadDocument(file, category, type)}
  onDownload={downloadDocument}
  onDelete={deleteDocument}
  allowMultiple={true}
/>
```

### Manual Validation

```tsx
import { validateFile } from '@/lib/documentManagement';

const handleFileSelect = (file: File) => {
  const validation = validateFile(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }
  uploadDocument(file, category, type);
};
```

## Progress Tracking

Progress is automatic! Just pass operations:

```tsx
const uploadOp = operations.find(op =>
  op.type === 'upload' &&
  op.category === category &&
  op.status === 'pending'
);

// Progress bar appears automatically
<DocumentUploader
  documentType="ine"
  onUpload={handleUpload}
  operation={uploadOp}  // Auto shows progress!
/>
```

## Features

✅ **Progress Bars** - Real-time percentage and bytes
✅ **Auto Disable** - Buttons disabled during operations
✅ **Error Display** - Automatic error messages
✅ **Type Safety** - Full TypeScript support
✅ **Validation** - Centralized (10MB, PDF/images)
✅ **Read-Only** - Built-in support
✅ **Multiple Files** - Per category

## Common Patterns

### Check if category is busy
```tsx
const isBusy = isCategoryBusy(DocumentCategory.IDENTIFICATION);
```

### Get document operation
```tsx
const operation = getDocumentOperation(documentId);
if (operation?.status === 'pending') {
  // Show loading state
}
```

### Multiple categories
```tsx
const categories = [
  DocumentCategory.IDENTIFICATION,
  DocumentCategory.INCOME_PROOF,
  DocumentCategory.ADDRESS_PROOF,
];

categories.map(category => {
  const docs = documents[category];
  const ops = getCategoryOperations(category);

  return (
    <DocumentManagerCard
      key={category}
      category={category}
      documents={docs}
      operations={ops}
      onUpload={(file) => uploadDocument(file, category, 'type')}
      {...otherProps}
    />
  );
});
```

## Variants

### DocumentUploader Variants

**Default** - Full control with label
```tsx
<DocumentUploader variant="default" label="Upload File" />
```

**Compact** - File input + button
```tsx
<DocumentUploader variant="compact" />
```

**Button-only** - Just trigger button
```tsx
<DocumentUploader variant="button-only" buttonText="Add" />
```

### DocumentProgress Variants

**Default** - Full progress bar
```tsx
<DocumentProgress variant="default" showBytes={true} />
```

**Compact** - Icon + percentage
```tsx
<DocumentProgress variant="compact" />
```

## Migration Path

1. ✅ Core modules created
2. ✅ Unified hook created
3. ✅ Components created
4. 🔄 **Next**: Migrate existing usages
5. ⏳ Test with real data
6. ⏳ Remove deprecated code

See `DOCUMENT_MANAGEMENT_MIGRATION.md` for full migration guide.
