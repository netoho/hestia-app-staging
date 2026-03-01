'use client';

import { useRef, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateFile } from '@/lib/documentManagement/validation';
import { ReceiptOperation } from '@/hooks/useReceiptOperations';
import { receipts as t } from '@/lib/i18n/pages/receipts';

interface ReceiptUploaderProps {
  onFileSelect: (file: File) => void;
  operation?: ReceiptOperation;
  disabled?: boolean;
}

const ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp';

export default function ReceiptUploader({
  onFileSelect,
  operation,
  disabled = false,
}: ReceiptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleFile = useCallback((file: File) => {
    setValidationError('');
    const result = validateFile(file);
    if (!result.valid) {
      setValidationError(result.error || 'Archivo inválido');
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isUploading = operation?.type === 'upload' && operation.status === 'pending';
  const isSuccess = operation?.type === 'upload' && operation.status === 'success';
  const isError = operation?.type === 'upload' && operation.status === 'error';

  // Show progress bar during upload
  if (isUploading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t.upload.uploading}</span>
          <span>{operation.progress?.percentage ?? 0}%</span>
        </div>
        <Progress value={operation.progress?.percentage ?? 0} className="h-2" />
      </div>
    );
  }

  // Brief success indicator
  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>{t.upload.success}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-muted/50'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">{t.upload.dragDrop}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{t.upload.maxSize}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {(validationError || isError) && (
        <Alert className="border-red-200 bg-red-50 py-2">
          <AlertCircle className="h-3 w-3 text-red-600" />
          <AlertDescription className="text-red-700 text-xs">
            {validationError || operation?.error || t.upload.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
