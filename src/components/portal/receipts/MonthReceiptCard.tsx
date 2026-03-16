'use client';

import { useState } from 'react';
import { ReceiptType, ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceiptOperation } from '@/hooks/useReceiptOperations';
import { RECEIPT_TYPE_ICONS } from './receiptTypeIcons';
import ReceiptSlot from './ReceiptSlot';
import OtherReceiptItem from './OtherReceiptItem';
import OtherReceiptUploadModal from './OtherReceiptUploadModal';
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
  otherCategory?: string | null;
  otherDescription?: string | null;
}

interface MonthReceiptCardProps {
  year: number;
  month: number;
  requiredTypes: ReceiptType[];
  receipts: ReceiptRecord[];
  onUpload?: (file: File, receiptType: ReceiptType, otherCategory?: string, otherDescription?: string) => void;
  onDelete?: (receiptId: string) => void;
  onDownload?: (receiptId: string) => void;
  onMarkNA?: (receiptType: ReceiptType, note?: string) => void;
  onUndoNA?: (receiptId: string) => void;
  getSlotOperation?: (receiptType: ReceiptType, otherCategory?: string) => ReceiptOperation | undefined;
  getReceiptOperation?: (receiptId: string) => ReceiptOperation | undefined;
}

// --- Component ---

export default function MonthReceiptCard({
  year,
  month,
  requiredTypes,
  receipts,
  onUpload,
  onDelete,
  onDownload,
  onMarkNA,
  onUndoNA,
  getSlotOperation,
  getReceiptOperation,
}: MonthReceiptCardProps) {
  const [showOtherModal, setShowOtherModal] = useState(false);

  const monthLabel = `${t.months[month] || month} ${year}`;

  // Separate RENT, standard types, and OTHER
  const hasRent = requiredTypes.includes(ReceiptType.RENT);
  const standardRequiredTypes = requiredTypes.filter(type => type !== ReceiptType.OTHER && type !== ReceiptType.RENT);
  const hasOtherConfig = requiredTypes.includes(ReceiptType.OTHER);

  // Build receipt map by type (for standard types only)
  const receiptMap = new Map<ReceiptType, ReceiptRecord>();
  const otherReceipts: ReceiptRecord[] = [];
  const extraReceipts: ReceiptRecord[] = []; // Receipts for types no longer in config

  receipts.forEach(r => {
    if (r.receiptType === ReceiptType.OTHER) {
      otherReceipts.push(r);
    } else if (r.receiptType === ReceiptType.RENT || standardRequiredTypes.includes(r.receiptType)) {
      receiptMap.set(r.receiptType, r);
    } else {
      extraReceipts.push(r);
    }
  });

  // Count completed (uploaded or N/A) for all required standard types (incl RENT)
  const allStandard = requiredTypes.filter(type => type !== ReceiptType.OTHER);
  const completedCount = allStandard.filter(type => receiptMap.has(type)).length;
  const totalCount = allStandard.length;
  const allDone = completedCount === totalCount;
  const noneStarted = completedCount === 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-headline text-primary">
            {monthLabel}
          </CardTitle>
          <Badge
            className={
              allDone
                ? 'bg-green-100 text-green-700 border-green-200'
                : noneStarted
                  ? 'bg-muted text-muted-foreground border-gray-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
            }
            variant="outline"
          >
            {t.portal.completionSummary(completedCount, totalCount)}
          </Badge>
        </div>
        {/* Completion progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RENT — full-width, prominent */}
        {hasRent && (
          <ReceiptSlot
            receiptType={ReceiptType.RENT}
            receipt={receiptMap.get(ReceiptType.RENT)}
            operation={getSlotOperation?.(ReceiptType.RENT)}
            receiptOperation={receiptMap.get(ReceiptType.RENT) ? getReceiptOperation?.(receiptMap.get(ReceiptType.RENT)!.id) : undefined}
            monthLabel={monthLabel}
            onUpload={file => onUpload?.(file, ReceiptType.RENT)}
            onDelete={onDelete}
            onDownload={onDownload}
            onMarkNA={(note) => onMarkNA?.(ReceiptType.RENT, note)}
            onUndoNA={onUndoNA}
          />
        )}

        {/* Standard required receipt slots (non-RENT) */}
        {standardRequiredTypes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardRequiredTypes.map(type => (
              <ReceiptSlot
                key={type}
                receiptType={type}
                receipt={receiptMap.get(type)}
                operation={getSlotOperation?.(type)}
                receiptOperation={receiptMap.get(type) ? getReceiptOperation?.(receiptMap.get(type)!.id) : undefined}
                monthLabel={monthLabel}
                onUpload={file => onUpload?.(file, type)}
                onDelete={onDelete}
                onDownload={onDownload}
                onMarkNA={(note) => onMarkNA?.(type, note)}
                onUndoNA={onUndoNA}
              />
            ))}
          </div>
        )}

        {/* Extra receipts (types no longer in config) */}
        {extraReceipts.length > 0 && (
          <div className="space-y-2">
            {extraReceipts.map(receipt => {
              const ExtraIcon = RECEIPT_TYPE_ICONS[receipt.receiptType] || FileText;
              return (
                <div
                  key={receipt.id}
                  className="border rounded-lg p-3 bg-muted/30 border-dashed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExtraIcon className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-sm text-muted-foreground">
                        {t.types[receipt.receiptType] || receipt.receiptType}
                      </span>
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground/60">
                        {t.config.noLongerRequired}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {receipt.status === ReceiptStatus.UPLOADED && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onDownload?.(receipt.id)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {t.slot.download}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* OTHER receipts section */}
        {hasOtherConfig && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {t.types.OTHER}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOtherModal(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t.otherUpload.addButton}
                </Button>
              </div>

              {otherReceipts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {otherReceipts.map(receipt => (
                    <OtherReceiptItem
                      key={receipt.id}
                      receipt={receipt}
                      onDownload={onDownload}
                      onDelete={onDelete}
                      operation={getSlotOperation?.(ReceiptType.OTHER, receipt.otherCategory ?? undefined)}
                      receiptOperation={getReceiptOperation?.(receipt.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 text-center py-3">
                  {t.portal.noReceipts}
                </p>
              )}

              <OtherReceiptUploadModal
                open={showOtherModal}
                onOpenChange={setShowOtherModal}
                onUpload={(file, otherCategory, otherDescription) => {
                  onUpload?.(file, ReceiptType.OTHER, otherCategory, otherDescription);
                }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
