'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { receipts as t } from '@/lib/i18n/pages/receipts';

interface NotApplicableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptTypeLabel: string;
  monthLabel: string;
  onConfirm: (note?: string) => void;
  loading?: boolean;
}

export default function NotApplicableModal({
  open,
  onOpenChange,
  receiptTypeLabel,
  monthLabel,
  onConfirm,
  loading = false,
}: NotApplicableModalProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote('');
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setNote('');
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.notApplicableModal.title}</DialogTitle>
          <DialogDescription>
            {t.notApplicableModal.description(receiptTypeLabel, monthLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="na-note">{t.notApplicableModal.noteLabel}</Label>
          <Textarea
            id="na-note"
            placeholder={t.notApplicableModal.notePlaceholder}
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {t.notApplicableModal.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.notApplicableModal.confirm}
              </>
            ) : (
              t.notApplicableModal.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
