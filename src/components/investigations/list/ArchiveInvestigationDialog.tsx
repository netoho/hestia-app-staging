'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Archive, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc/client';
import {
  ARCHIVE_REASONS,
  InvestigationArchiveReason,
  INVESTIGATION_FORM_LIMITS,
} from '@/lib/constants/investigationConfig';

interface Investigation {
  id: string;
  actorName: string;
  actorType: string;
}

interface ArchiveInvestigationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investigation: Investigation | null;
  onSuccess: () => void;
}

export default function ArchiveInvestigationDialog({
  open,
  onOpenChange,
  investigation,
  onSuccess,
}: ArchiveInvestigationDialogProps) {
  const [reason, setReason] = useState<InvestigationArchiveReason | ''>('');
  const [comment, setComment] = useState('');

  const utils = trpc.useUtils();

  const archiveMutation = trpc.investigation.archive.useMutation({
    onSuccess: () => {
      utils.investigation.getByPolicy.invalidate();
      utils.investigation.getById.invalidate();
      onSuccess();
      onOpenChange(false);
    },
  });

  const error = archiveMutation.error?.message;
  const isPending = archiveMutation.isPending;

  useEffect(() => {
    if (open) {
      archiveMutation.reset();
      setReason('');
      setComment('');
    }
  }, [open]);

  const handleArchive = async () => {
    if (!investigation || !reason) return;
    await archiveMutation.mutateAsync({
      id: investigation.id,
      reason,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archivar Investigación
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas archivar la investigación de{' '}
            <strong>{investigation?.actorName}</strong>?
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              Las investigaciones archivadas no se eliminan y pueden consultarse posteriormente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="archive-reason">Razón *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as InvestigationArchiveReason)}
            >
              <SelectTrigger id="archive-reason">
                <SelectValue placeholder="Selecciona una razón" />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="archive-comment">Comentario (opcional)</Label>
            <Textarea
              id="archive-comment"
              placeholder="Agrega un comentario adicional..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={INVESTIGATION_FORM_LIMITS.archiveComment.max}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/{INVESTIGATION_FORM_LIMITS.archiveComment.max}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleArchive}
            disabled={isPending || !reason}
            variant="outline"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Archive className="mr-2 h-4 w-4" />
            Archivar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
