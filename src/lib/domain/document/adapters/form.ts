/**
 * Form adapter for the Document entity. Documents have no multi-tab form; the
 * only client-supplied shape is the upload request (category + file metadata).
 * Exposed via `.pick` on the canonical schema for recipe consistency.
 */

import { documentSchema } from '../schema';

/** Field names a client supplies when requesting an upload URL. */
export const documentUploadFields = documentSchema
  .pick({
    category: true,
    documentType: true,
    fileName: true,
    fileSize: true,
    mimeType: true,
  })
  .keyof().options;
