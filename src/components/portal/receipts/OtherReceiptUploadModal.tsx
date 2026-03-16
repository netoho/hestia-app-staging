'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';
import ReceiptUploader from './ReceiptUploader';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import type { ReceiptOperation } from '@/hooks/useReceiptOperations';

interface OtherReceiptUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, otherCategory: string, otherDescription?: string) => void;
  operation?: ReceiptOperation;
}

export default function OtherReceiptUploadModal({
  open,
  onOpenChange,
  onUpload,
  operation,
}: OtherReceiptUploadModalProps) {
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isCustom = category === 'other';
  const effectiveCategory = isCustom ? `other_${Date.now()}` : category;
  const canSubmit = category && (!isCustom || customCategory.trim()) && selectedFile;

  const handleSubmit = () => {
    if (!canSubmit || !selectedFile) return;
    const desc = isCustom
      ? `${customCategory.trim()}${description ? ` - ${description}` : ''}`
      : description || undefined;
    onUpload(selectedFile, effectiveCategory, desc);
    handleClose();
  };

  const handleClose = () => {
    setCategory('');
    setCustomCategory('');
    setDescription('');
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.otherUpload.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>{t.otherUpload.categoryLabel}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t.otherUpload.categoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.otherCategories).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom category name */}
          {isCustom && (
            <div className="space-y-2">
              <Label>{t.otherUpload.customCategoryLabel}</Label>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t.otherUpload.customCategoryPlaceholder}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>{t.otherUpload.descriptionLabel}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.otherUpload.descriptionPlaceholder}
              rows={2}
            />
          </div>

          {/* File */}
          {!selectedFile ? (
            <ReceiptUploader
              onFileSelect={(file) => setSelectedFile(file)}
              operation={operation}
            />
          ) : (
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="truncate">{selectedFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                Cambiar
              </Button>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t.otherUpload.upload}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
