
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText } from 'lucide-react';
import { t } from '@/lib/i18n';

interface DocumentsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  identification: File[];
  proofOfIncome: File[];
  optional: File[];
}

const FileList = ({ files, title }: { files: File[], title: string }) => {
  if (files.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li key={index} className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-xs">{file.name}</span>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
};


export function DocumentsSummaryModal({ isOpen, onClose, onSubmit, identification, proofOfIncome, optional }: DocumentsSummaryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{t.pages.newPolicy.documents.summary.title}</DialogTitle>
          <DialogDescription>
            {t.pages.newPolicy.documents.summary.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <FileList files={identification} title={t.pages.newPolicy.documents.id.title} />
          <FileList files={proofOfIncome} title={t.pages.newPolicy.documents.income.title} />
          <FileList files={optional} title={t.pages.newPolicy.documents.optional.title} />
        </div>

        <DialogFooter className="flex-col gap-2 pt-4 sm:flex-col sm:space-x-0">
          <Button type="button" onClick={onSubmit} className="w-full bg-primary hover:bg-primary/90">
            {t.pages.newPolicy.documents.summary.submit}
          </Button>
          <Button type="button" variant="link" onClick={onClose} className="text-primary">
            {t.pages.newPolicy.documents.summary.uploadMore}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
