'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Plus } from 'lucide-react';
import { DocumentProgress } from './DocumentProgress';
import { DocumentOperation } from '@/lib/documentManagement/types';

interface DocumentUploaderProps {
  documentType: string;
  onUpload: (file: File) => void | Promise<void>;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
  operation?: DocumentOperation;
  variant?: 'default' | 'compact' | 'button-only';
  label?: string;
  buttonText?: string;
  showProgress?: boolean;
  /** Max file size in MB for hint display */
  maxSizeMB?: number;
  /** Formats label for hint display (e.g., "PDF, JPG, PNG") */
  formatsHint?: string;
  /** Whether to show the hint text */
  showHint?: boolean;
}

export function DocumentUploader({
  documentType,
  onUpload,
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
  disabled = false,
  uploading = false,
  operation,
  variant = 'default',
  label,
  buttonText,
  showProgress = true,
  maxSizeMB = 10,
  formatsHint = 'PDF, JPG, PNG, WEBP',
  showHint = true,
}: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isUploading = uploading || (operation?.status === 'pending' && operation.type === 'upload');
  const isDisabled = disabled || isUploading;

  // Button-only variant - just a button that triggers file input
  if (variant === 'button-only') {
    return (
      <div className="space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id={`upload-${documentType}`}
          disabled={isDisabled}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleButtonClick}
          disabled={isDisabled}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {buttonText || 'Cargando...'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              {buttonText || 'Agregar'}
            </>
          )}
        </Button>

        {showHint && !operation && (
          <p className="text-xs text-muted-foreground">
            Máx {maxSizeMB}MB. Formatos: {formatsHint}
          </p>
        )}

        {showProgress && operation && (operation.status === 'pending' || operation.status === 'error') && (
          <DocumentProgress
            progress={operation.progress}
            status={operation.status}
            error={operation.error}
            variant="compact"
          />
        )}
      </div>
    );
  }

  // Compact variant - file input + button inline
  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={isDisabled}
            className="flex-1"
            id={`upload-${documentType}`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isDisabled}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showHint && !operation && (
          <p className="text-xs text-muted-foreground">
            Máx {maxSizeMB}MB. Formatos: {formatsHint}
          </p>
        )}

        {showProgress && operation && (operation.status === 'pending' || operation.status === 'error') && (
          <DocumentProgress
            progress={operation.progress}
            status={operation.status}
            error={operation.error}
          />
        )}
      </div>
    );
  }

  // Default variant - full upload control with label
  return (
    <div className="space-y-3">
      {label && (
        <Label htmlFor={`upload-${documentType}`} className="text-sm font-medium">
          {label}
        </Label>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={isDisabled}
          className="flex-1"
          id={`upload-${documentType}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={isDisabled}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cargando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {buttonText || 'Subir'}
            </>
          )}
        </Button>
      </div>

      {showHint && !operation && (
        <p className="text-xs text-muted-foreground">
          Máx {maxSizeMB}MB. Formatos: {formatsHint}
        </p>
      )}

      {showProgress && operation && (
        <DocumentProgress
          progress={operation.progress}
          status={operation.status}
          error={operation.error}
        />
      )}
    </div>
  );
}
