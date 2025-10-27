/**
 * Filename utilities for handling non-ASCII characters in file uploads
 */

/**
 * Sanitize filename for S3 metadata (ASCII-only)
 * Replaces non-ASCII characters with underscores while preserving extension
 */
export function sanitizeForS3Metadata(filename: string): string {
  // Split filename and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1;

  let name = hasExtension ? filename.substring(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.substring(lastDotIndex) : '';

  // Replace non-printable and non-ASCII characters with underscores
  // Allows all printable ASCII characters (0x20-0x7E)
  name = name.replace(/[^\x20-\x7E]/g, '_');

  // Clean up multiple underscores
  name = name.replace(/_+/g, '_');

  // Trim underscores from start and end
  name = name.replace(/^_+|_+$/g, '');

  // If name is empty after sanitization, use a default
  if (!name) {
    name = 'file';
  }

  return name + extension;
}

/**
 * URL-encode filename for safe use in Content-Disposition headers
 * This preserves the original filename including non-ASCII characters
 */
export function encodeFilenameForHeaders(filename: string): string {
  // Use RFC 5987 encoding for non-ASCII filenames
  // This allows proper display of original filenames in downloads
  if (/[^\x20-\x7E]/.test(filename)) {
    // Contains non-ASCII characters, use UTF-8 encoding
    return `UTF-8''${encodeURIComponent(filename)}`;
  }

  // ASCII-only, just escape quotes
  return filename.replace(/"/g, '\\"');
}

/**
 * Create a safe S3 key from a filename
 * Preserves readability while ensuring S3 compatibility
 */
export function createSafeS3Key(filename: string): string {
  // Split filename and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1;

  let name = hasExtension ? filename.substring(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.substring(lastDotIndex) : '';

  // Convert to lowercase and replace problematic characters
  name = name.toLowerCase();

  // Replace spaces and non-alphanumeric characters with hyphens
  name = name.replace(/[^a-z0-9]/g, '-');

  // Clean up multiple hyphens
  name = name.replace(/-+/g, '-');

  // Trim hyphens from start and end
  name = name.replace(/^-+|-+$/g, '');

  // If name is empty after sanitization, use a default
  if (!name) {
    name = 'file';
  }

  // Limit length to prevent excessively long keys
  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  return name + extension;
}

/**
 * Check if a filename contains non-ASCII characters
 */
export function hasNonASCII(filename: string): boolean {
  return /[^\x00-\x7F]/.test(filename);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
    return filename.substring(lastDotIndex + 1).toLowerCase();
  }
  return '';
}