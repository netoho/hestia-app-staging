'use client';

import { ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import { formatDateTime } from '@/lib/utils/formatting';
import type { ReceiptOperation } from '@/hooks/useReceiptOperations';

interface OtherReceiptRecord {
  id: string;
  status: ReceiptStatus;
  originalName?: string | null;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  otherCategory?: string | null;
  otherDescription?: string | null;
}

interface OtherReceiptItemProps {
  receipt: OtherReceiptRecord;
  onDownload?: (receiptId: string) => void;
  onDelete?: (receiptId: string) => void;
  operation?: ReceiptOperation;
}

function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return t.types.OTHER;
  if (category.startsWith('other_')) return t.otherCategories.other || 'Otro';
  return t.otherCategories[category] || category;
}

export default function OtherReceiptItem({
  receipt,
  onDownload,
  onDelete,
  operation,
}: OtherReceiptItemProps) {
  const isDeleting = operation?.type === 'delete' && operation.status === 'pending';
  const categoryLabel = getCategoryLabel(receipt.otherCategory);

  return (
    <div className="border rounded-lg p-3 border-l-4 border-l-green-500 bg-green-50/50">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          <Badge variant="outline" className="text-sm bg-green-100 text-green-700 border-green-200">
            {categoryLabel}
          </Badge>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>
      </div>

      {receipt.otherDescription && (
        <p className="text-sm text-muted-foreground mb-1.5 italic">
          {receipt.otherDescription}
        </p>
      )}

      <div className="text-sm text-muted-foreground mb-2 truncate">
        {receipt.originalName || receipt.fileName}
        {receipt.uploadedAt && (
          <span className="ml-1">— {t.slot.uploadedOn} {formatDateTime(receipt.uploadedAt)}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onDownload?.(receipt.id)}
        >
          <Download className="mr-1 h-3 w-3" />
          {t.slot.download}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete?.(receipt.id)}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
          {t.slot.delete}
        </Button>
      </div>
    </div>
  );
}
