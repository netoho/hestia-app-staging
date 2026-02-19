'use client';

import { ReceiptType, ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReceiptOperation } from '@/hooks/useReceiptOperations';
import ReceiptSlot from './ReceiptSlot';
import { receipts as t } from '@/lib/i18n/pages/receipts';

// --- Types ---

interface ReceiptRecord {
  id: string;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  originalName?: string | null;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  notApplicableNote?: string | null;
  markedNotApplicableAt?: Date | string | null;
}

interface MonthReceiptCardProps {
  year: number;
  month: number;
  requiredTypes: ReceiptType[];
  receipts: ReceiptRecord[];
  readOnly?: boolean;
  onUpload?: (file: File, receiptType: ReceiptType) => void;
  onDelete?: (receiptId: string) => void;
  onDownload?: (receiptId: string) => void;
  onMarkNA?: (receiptType: ReceiptType, note?: string) => void;
  onUndoNA?: (receiptId: string) => void;
  getSlotOperation?: (receiptType: ReceiptType) => ReceiptOperation | undefined;
}

// --- Component ---

export default function MonthReceiptCard({
  year,
  month,
  requiredTypes,
  receipts,
  readOnly = false,
  onUpload,
  onDelete,
  onDownload,
  onMarkNA,
  onUndoNA,
  getSlotOperation,
}: MonthReceiptCardProps) {
  const monthLabel = `${t.months[month] || month} ${year}`;

  // Build receipt map by type
  const receiptMap = new Map<ReceiptType, ReceiptRecord>();
  receipts.forEach(r => receiptMap.set(r.receiptType, r));

  // Count completed (uploaded or N/A)
  const completedCount = requiredTypes.filter(type => receiptMap.has(type)).length;
  const totalCount = requiredTypes.length;
  const allDone = completedCount === totalCount;
  const noneStarted = completedCount === 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-headline" style={{ color: '#173459' }}>
            {monthLabel}
          </CardTitle>
          <Badge
            className={
              allDone
                ? 'bg-green-100 text-green-700 border-green-200'
                : noneStarted
                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
            }
            variant="outline"
          >
            {t.portal.completionSummary(completedCount, totalCount)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredTypes.map(type => (
            <ReceiptSlot
              key={type}
              receiptType={type}
              receipt={receiptMap.get(type)}
              readOnly={readOnly}
              operation={getSlotOperation?.(type)}
              monthLabel={monthLabel}
              onUpload={file => onUpload?.(file, type)}
              onDelete={onDelete}
              onDownload={onDownload}
              onMarkNA={(note) => onMarkNA?.(type, note)}
              onUndoNA={onUndoNA}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
