'use client';

import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc/client';

interface Investigation {
  id: string;
  actorName: string;
  actorType: string;
}

interface DeleteInvestigationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investigation: Investigation | null;
  onSuccess: () => void;
}

export default function DeleteInvestigationDialog({
  open,
  onOpenChange,
  investigation,
  onSuccess,
}: DeleteInvestigationDialogProps) {
  const deleteMutation = trpc.investigation.delete.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
  });

  const error = deleteMutation.error?.message;
  const isPending = deleteMutation.isPending;

  useEffect(() => {
    if (open) {
      deleteMutation.reset();
    }
  }, [open]);

  const handleDelete = async () => {
    if (!investigation) return;
    await deleteMutation.mutateAsync({ id: investigation.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Investigación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar la investigación de{' '}
            <strong>{investigation?.actorName}</strong>?
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
