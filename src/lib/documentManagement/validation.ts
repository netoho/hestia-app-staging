import { ValidationResult, ValidationOptions } from './types';
import { getCategoryValidation, defaultValidationConfig } from '@/lib/constants/documentCategories';
import type { DocumentCategory } from '@/types/policy';

/**
 * Default maximum file size in bytes (derived from centralized config)
 */
export const DEFAULT_MAX_FILE_SIZE = defaultValidationConfig.maxSizeMB * 1024 * 1024;

/**
 * Allowed MIME types for document uploads (derived from centralized config)
 */
export const ALLOWED_MIME_TYPES = defaultValidationConfig.allowedMimeTypes;

/**
 * Allowed file extensions (derived from centralized config)
 */
export const ALLOWED_EXTENSIONS = defaultValidationConfig.allowedExtensions;

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB?: number): ValidationResult {
  const maxSize = maxSizeMB ? maxSizeMB * 1024 * 1024 : DEFAULT_MAX_FILE_SIZE;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${maxSizeMB || 10}MB. Tamaño actual: ${formatFileSize(file.size)}`,
    };
  }

  return { valid: true };
}

/**
 * Validate file type (MIME type)
 */
export function validateFileType(file: File, allowedTypes?: string[]): ValidationResult {
  const types = allowedTypes || [...ALLOWED_MIME_TYPES];

  if (!types.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Use PDF o imágenes (JPG, PNG, WEBP). Tipo actual: ${file.type}`,
    };
  }

  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(file: File, allowedExtensions?: string[]): ValidationResult {
  const extensions = allowedExtensions || [...ALLOWED_EXTENSIONS];
  const fileExt = getFileExtension(file.name);

  if (!fileExt) {
    return {
      valid: false,
      error: 'El archivo no tiene extensión',
    };
  }

  if (!extensions.includes(fileExt)) {
    return {
      valid: false,
      error: `Extensión de archivo no permitida. Use: ${extensions.join(', ')}. Extensión actual: ${fileExt}`,
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation
 * Uses centralized config for the category, with options as overrides
 */
export function validateFile(
  file: File,
  options: ValidationOptions = {},
  category?: DocumentCategory
): ValidationResult {
  // Get config for category (defaults if no category)
  const config = getCategoryValidation(category as any);

  // Merge options with config (options override config)
  const maxSizeMB = options.maxSizeMB ?? config.maxSizeMB;
  const allowedTypes = options.allowedTypes ?? [...config.allowedMimeTypes];
  const allowedExtensions = options.allowedExtensions ?? [...config.allowedExtensions];

  // Validate file size
  const sizeValidation = validateFileSize(file, maxSizeMB);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Validate MIME type
  const typeValidation = validateFileType(file, allowedTypes);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Validate extension
  const extValidation = validateFileExtension(file, allowedExtensions);
  if (!extValidation.valid) {
    return extValidation;
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[], options: ValidationOptions = {}): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  files.forEach((file, index) => {
    const validation = validateFile(file, options);
    if (!validation.valid && validation.error) {
      errors[`file-${index}-${file.name}`] = validation.error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}
