'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Loader2, AlertTriangle } from 'lucide-react';
import { getActorTypeLabel, ActorType } from '@/lib/utils/actor';

interface MarkCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorType: ActorType | null;
  actorName: string | null;
  isPending: boolean;
  onMarkComplete: (skipValidation: boolean) => void;
}

export function MarkCompleteDialog({
  open,
  onOpenChange,
  actorType,
  actorName,
  isPending,
  onMarkComplete,
}: MarkCompleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Marcar {actorType ? getActorTypeLabel(actorType) : 'Actor'} como Completo
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará a {actorName} como completo.
            Si faltan documentos requeridos, puede elegir continuar de todas formas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Si hay documentos faltantes, se mostrará un error. Use &quot;Forzar Completo&quot; para omitir la validación.
            </AlertDescription>
          </Alert>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => onMarkComplete(true)}
            disabled={isPending}
          >
            Forzar Completo
          </Button>
          <AlertDialogAction
            onClick={() => onMarkComplete(false)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Marcar Completo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MarkCompleteDialog;
