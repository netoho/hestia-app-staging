import { useState, useCallback } from 'react';

export type AvatarUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface AvatarUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseAvatarUploadOptions {
  onSuccess?: (avatarUrl: string) => void;
  onError?: (error: string) => void;
  /** Onboarding token for auth during onboarding flow */
  token?: string;
}

export interface UseAvatarUploadResult {
  uploadAvatar: (file: File) => Promise<string | null>;
  deleteAvatar: () => Promise<boolean>;
  status: AvatarUploadStatus;
  progress: AvatarUploadProgress | null;
  error: string | null;
  isUploading: boolean;
  reset: () => void;
}

// Validation constants
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Hook for uploading user avatars with progress tracking
 */
export function useAvatarUpload(options: UseAvatarUploadOptions = {}): UseAvatarUploadResult {
  const { onSuccess, onError, token } = options;

  const [status, setStatus] = useState<AvatarUploadStatus>('idle');
  const [progress, setProgress] = useState<AvatarUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setError(null);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo es muy grande. El tamaño máximo es 20MB';
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipo de archivo inválido. Solo se permiten JPEG, PNG, HEIC y WebP';
    }
    return null;
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    // Validate file first
    const validationError = validateFile(file);
    if (validationError) {
      setStatus('error');
      setError(validationError);
      onError?.(validationError);
      return null;
    }

    setStatus('uploading');
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    setError(null);

    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              setStatus('success');
              setProgress({ loaded: file.size, total: file.size, percentage: 100 });
              onSuccess?.(result.avatarUrl);
              resolve(result.avatarUrl);
            } else {
              const errorMsg = result.error || 'Error al subir el avatar';
              setStatus('error');
              setError(errorMsg);
              onError?.(errorMsg);
              resolve(null);
            }
          } catch {
            const errorMsg = 'Error al procesar la respuesta del servidor';
            setStatus('error');
            setError(errorMsg);
            onError?.(errorMsg);
            resolve(null);
          }
        } else {
          const errorMsg = `Error del servidor: ${xhr.status}`;
          setStatus('error');
          setError(errorMsg);
          onError?.(errorMsg);
          resolve(null);
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        const errorMsg = 'Error de conexión al subir el archivo';
        setStatus('error');
        setError(errorMsg);
        onError?.(errorMsg);
        resolve(null);
      });

      // Build endpoint with token if provided
      let endpoint = '/api/user/avatar';
      if (token) {
        endpoint += `?token=${encodeURIComponent(token)}`;
      }

      xhr.open('POST', endpoint);
      xhr.send(formData);
    });
  }, [validateFile, onSuccess, onError, token]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    setStatus('uploading');
    setError(null);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        return true;
      } else {
        const errorMsg = result.error || 'Error al eliminar el avatar';
        setStatus('error');
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }
    } catch {
      const errorMsg = 'Error de conexión al eliminar el avatar';
      setStatus('error');
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  return {
    uploadAvatar,
    deleteAvatar,
    status,
    progress,
    error,
    isUploading: status === 'uploading',
    reset,
  };
}
