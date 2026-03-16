'use client';

import { useState } from 'react';
import { ReceiptType, ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download, Trash2, RotateCcw, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { ReceiptOperation } from '@/hooks/useReceiptOperations';
import ReceiptUploader from './ReceiptUploader';
import NotApplicableModal from './NotApplicableModal';
import { RECEIPT_TYPE_ICONS } from './receiptTypeIcons';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import { formatDateTime } from '@/lib/utils/formatting';

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

interface ReceiptSlotProps {
  receiptType: ReceiptType;
  receipt?: ReceiptRecord;
  operation?: ReceiptOperation;
  monthLabel: string;
  onUpload?: (file: File) => void;
  onDelete?: (receiptId: string) => void;
  onDownload?: (receiptId: string) => void;
  onMarkNA?: (note?: string) => void;
  onUndoNA?: (receiptId: string) => void;
}

// --- Component ---

export default function ReceiptSlot({
  receiptType,
  receipt,
  operation,
  monthLabel,
  onUpload,
  onDelete,
  onDownload,
  onMarkNA,
  onUndoNA,
}: ReceiptSlotProps) {
  const [showNAModal, setShowNAModal] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const Icon = RECEIPT_TYPE_ICONS[receiptType] || FileText;
  const typeLabel = t.types[receiptType] || receiptType;
  const isRent = receiptType === ReceiptType.RENT;

  const isUploaded = receipt?.status === ReceiptStatus.UPLOADED;
  const isNA = receipt?.status === ReceiptStatus.NOT_APPLICABLE;
  const isPending = !receipt;

  const isDeleting = operation?.type === 'delete' && operation.status === 'pending';
  const isMarkingNA = operation?.type === 'markNA' && operation.status === 'pending';
  const isUndoingNA = operation?.type === 'undoNA' && operation.status === 'pending';

  // Handle file selection — if already uploaded, show replace confirmation
  const handleFileSelect = (file: File) => {
    if (isUploaded) {
      setPendingFile(file);
      setShowReplaceConfirm(true);
    } else {
      onUpload?.(file);
    }
  };

  const confirmReplace = () => {
    if (pendingFile) onUpload?.(pendingFile);
    setShowReplaceConfirm(false);
    setPendingFile(null);
  };

  // --- Pending state ---
  if (isPending) {
    return (
      <div className={
        isRent
          ? 'border border-primary/20 bg-primary/5 rounded-lg p-4'
          : 'border-2 border-dashed border-gray-200 rounded-lg p-4'
      }>
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`flex items-center justify-center rounded-full ${
            isRent ? 'h-9 w-9 bg-primary/10' : 'h-8 w-8 bg-muted'
          }`}>
            <Icon className={`h-4 w-4 ${isRent ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <span className={`font-medium ${isRent ? 'text-base text-primary' : 'text-base text-foreground'}`}>
            {typeLabel}
          </span>
        </div>

        <ReceiptUploader onFileSelect={handleFileSelect} operation={operation} />
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs text-muted-foreground/60 hover:text-muted-foreground"
          onClick={() => setShowNAModal(true)}
        >
          {t.slot.markNotApplicable}
        </Button>
        <NotApplicableModal
          open={showNAModal}
          onOpenChange={setShowNAModal}
          receiptTypeLabel={typeLabel}
          monthLabel={monthLabel}
          onConfirm={(note) => {
            onMarkNA?.(note);
            setShowNAModal(false);
          }}
          loading={isMarkingNA}
        />
      </div>
    );
  }

  // --- Uploaded state ---
  if (isUploaded) {
    return (
      <div className={`border rounded-lg p-4 border-l-4 border-l-green-500 ${
        isRent ? 'bg-green-50/70' : 'bg-green-50/50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center rounded-full ${
              isRent ? 'h-9 w-9 bg-green-100' : 'h-8 w-8 bg-green-100'
            }`}>
              <Icon className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <span className={`font-medium ${isRent ? 'text-base' : 'text-base'} text-foreground`}>
                {typeLabel}
              </span>
              <CheckCircle2 className="inline-block ml-1.5 h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-2 truncate">
          {receipt.originalName || receipt.fileName}
          {receipt.uploadedAt && (
            <span className="ml-1">— {t.slot.uploadedOn} {formatDateTime(receipt.uploadedAt)}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload?.(receipt.id)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t.slot.download}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`replace-${receipt.id}`)?.click()}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t.slot.replace}
          </Button>
          <input
            id={`replace-${receipt.id}`}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
            {t.slot.delete}
          </Button>
        </div>

        {/* Upload progress overlay for replace */}
        {operation?.type === 'upload' && operation.status === 'pending' && (
          <div className="mt-2">
            <ReceiptUploader onFileSelect={() => {}} operation={operation} />
          </div>
        )}

        {/* Replace confirmation dialog */}
        <Dialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.slot.replace}</DialogTitle>
              <DialogDescription>
                Ya tienes un comprobante subido para {typeLabel}. ¿Deseas reemplazarlo?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowReplaceConfirm(false); setPendingFile(null); }}>
                {t.notApplicableModal.cancel}
              </Button>
              <Button onClick={confirmReplace}>
                {t.slot.replace}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.slot.deleteConfirmTitle}</DialogTitle>
              <DialogDescription>
                {t.slot.deleteConfirmDescription(typeLabel)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {t.notApplicableModal.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => { onDelete?.(receipt.id); setShowDeleteConfirm(false); }}
              >
                {t.slot.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- Not Applicable state ---
  if (isNA) {
    return (
      <div className={`border rounded-lg p-4 ${isRent ? 'bg-muted/60' : 'bg-muted/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center rounded-full ${
              isRent ? 'h-9 w-9 bg-muted' : 'h-8 w-8 bg-muted'
            }`}>
              <Icon className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div>
              <span className="text-base font-medium text-muted-foreground/60">{typeLabel}</span>
              <XCircle className="inline-block ml-1.5 h-4 w-4 text-muted-foreground/60" />
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {t.status.notApplicable}
          </span>
        </div>

        {receipt.notApplicableNote && (
          <p className="text-sm text-muted-foreground/60 mt-2 italic">{receipt.notApplicableNote}</p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs text-blue-500 hover:text-blue-700"
          onClick={() => onUndoNA?.(receipt.id)}
          disabled={isUndoingNA}
        >
          {isUndoingNA ? t.upload.uploading : t.slot.undoNotApplicable}
        </Button>
      </div>
    );
  }

  return null;
}
