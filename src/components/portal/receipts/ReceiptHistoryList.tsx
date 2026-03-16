'use client';

import { useState } from 'react';
import { ReceiptType, ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReceiptOperation } from '@/hooks/useReceiptOperations';
import MonthReceiptCard from './MonthReceiptCard';
import { receipts as t } from '@/lib/i18n/pages/receipts';

// --- Types ---

interface ReceiptRecord {
  id: string;
  year: number;
  month: number;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  originalName?: string | null;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  notApplicableNote?: string | null;
  markedNotApplicableAt?: Date | string | null;
  otherCategory?: string | null;
  otherDescription?: string | null;
}

interface MonthEntry {
  year: number;
  month: number;
}

interface ReceiptHistoryListProps {
  months: MonthEntry[];
  getRequiredTypes: (year: number, month: number) => ReceiptType[];
  receipts: ReceiptRecord[];
  onUpload?: (file: File, year: number, month: number, receiptType: ReceiptType, otherCategory?: string, otherDescription?: string) => void;
  onDelete?: (receiptId: string) => void;
  onDownload?: (receiptId: string) => void;
  onMarkNA?: (year: number, month: number, receiptType: ReceiptType, note?: string) => void;
  onUndoNA?: (receiptId: string) => void;
  getSlotOperation?: (year: number, month: number, receiptType: ReceiptType, otherCategory?: string) => ReceiptOperation | undefined;
  getReceiptOperation?: (receiptId: string) => ReceiptOperation | undefined;
}

// --- Component ---

export default function ReceiptHistoryList({
  months,
  getRequiredTypes,
  receipts,
  onUpload,
  onDelete,
  onDownload,
  onMarkNA,
  onUndoNA,
  getSlotOperation,
  getReceiptOperation,
}: ReceiptHistoryListProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  if (months.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t.portal.noReceipts}
      </p>
    );
  }

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group receipts by year-month
  const receiptsByMonth = new Map<string, ReceiptRecord[]>();
  receipts.forEach(r => {
    const key = `${r.year}-${r.month}`;
    if (!receiptsByMonth.has(key)) receiptsByMonth.set(key, []);
    receiptsByMonth.get(key)!.push(r);
  });

  return (
    <div className="space-y-2">
      {months.map(({ year, month }) => {
        const key = `${year}-${month}`;
        const isExpanded = expandedMonths.has(key);
        const monthReceipts = receiptsByMonth.get(key) || [];
        const requiredTypes = getRequiredTypes(year, month);
        const standardRequired = requiredTypes.filter(t => t !== ReceiptType.OTHER);
        const completedCount = standardRequired.filter(type =>
          monthReceipts.some(r => r.receiptType === type)
        ).length;
        const allDone = completedCount === standardRequired.length;
        const monthLabel = `${t.months[month] || month} ${year}`;

        return (
          <div key={key} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toggleMonth(key)}
            >
              <div className="flex items-center gap-2">
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
                <span className="text-sm font-medium text-primary">
                  {monthLabel}
                </span>
              </div>
              <Badge
                className={
                  allDone
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : completedCount === 0
                      ? 'bg-muted text-muted-foreground border-gray-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                }
                variant="outline"
              >
                {t.portal.completionSummary(completedCount, standardRequired.length)}
              </Badge>
            </button>

            {isExpanded && (
              <div className="px-2 pb-2">
                <MonthReceiptCard
                  year={year}
                  month={month}
                  requiredTypes={requiredTypes}
                  receipts={monthReceipts}
                  onUpload={(file, type, otherCat, otherDesc) => onUpload?.(file, year, month, type, otherCat, otherDesc)}
                  onDelete={onDelete}
                  onDownload={onDownload}
                  onMarkNA={(type, note) => onMarkNA?.(year, month, type, note)}
                  onUndoNA={onUndoNA}
                  getSlotOperation={(type, otherCat) => getSlotOperation?.(year, month, type, otherCat)}
                  getReceiptOperation={getReceiptOperation}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
