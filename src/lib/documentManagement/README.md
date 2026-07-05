# documentManagement

Client-side helpers for the presigned-URL document flow (browser ↔ S3 directly —
files never route through Vercel). The server side lives in
`documentService` + the `document.*` tRPC router; this module is what components
call.

## Modules

| File | Exports | Purpose |
|---|---|---|
| `upload.ts` | `uploadToS3WithProgress`, `uploadWithProgress`, `batchUpload`, `batchUploadParallel` | PUT the file to the presigned URL with progress callbacks |
| `download.ts` | `downloadWithProgress`, `downloadFile`, `batchDownload` | Fetch signed download URLs and stream to the user |
| `validation.ts` | `DEFAULT_MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES`, `ALLOWED_EXTENSIONS`, `getFileExtension`, … | Client-side pre-checks; all values derive from `src/lib/constants/documentCategories.ts` (10MB default, per-category overrides) |
| `types.ts` | `UploadConfig`, `DownloadConfig`, … | Shared types |
| `index.ts` | barrel re-export | |

## The flow

```
component → trpc document.getUploadUrl → presigned URL
         → uploadWithProgress(PUT to S3)
         → trpc document.confirmUpload → ActorDocument row
```

Validation rules shown in the UI come from `getCategoryValidation(category)` —
see `src/lib/constants/README.md`. Actor-document requirements per type live in
`src/lib/constants/actorDocumentRequirements.ts`.
