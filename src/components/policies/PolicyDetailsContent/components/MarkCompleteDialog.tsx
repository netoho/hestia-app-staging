'use client';

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
import type { MissingField } from '@/lib/utils/trpcErrors';

interface MarkCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorType: ActorType | null;
  actorName: string | null;
  isPending: boolean;
  /** Null when no force is needed yet; populated after the first attempt
   *  rejects with `requiresForce: true`. Controls which step is shown. */
  forceState: { missingFields: MissingField[]; missingDocuments: string[] } | null;
  /** Initial click: tries skipValidation: false. */
  onMarkComplete: () => void;
  /** Confirm-force click: tries skipValidation: true. */
  onConfirmForce: () => void;
}

/**
 * Two-step single-button dialog:
 *   1. First open → "Marcar Completo" only. Backend tries the strict path.
 *   2. If backend rejects with requiresForce → swap to a force-confirm
 *      layout that lists missing fields + documents. One CTA to confirm,
 *      one to cancel.
 */
export function MarkCompleteDialog({
  open,
  onOpenChange,
  actorType,
  actorName,
  isPending,
  forceState,
  onMarkComplete,
  onConfirmForce,
}: MarkCompleteDialogProps) {
  const label = actorType ? getActorTypeLabel(actorType) : 'Actor';
  const lowerLabel = label.toLowerCase();

  if (forceState) {
    // Step 2: force-confirm with missing data laid out.
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Marcar como completo con información faltante?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actorName ?? `Este ${lowerLabel}`} aún tiene información
              faltante. Si confirmas, será marcado como completo y la falta de
              información quedará registrada en el historial de la protección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-3">
            {forceState.missingFields.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">
                    Campos faltantes ({forceState.missingFields.length})
                  </div>
                  <ul className="list-disc list-inside text-sm">
                    {forceState.missingFields.slice(0, 10).map((mf, idx) => (
                      <li key={idx}>
                        {mf.field ?? 'Campo'}
                        {mf.message ? `: ${mf.message}` : ''}
                      </li>
                    ))}
                    {forceState.missingFields.length > 10 && (
                      <li>… y {forceState.missingFields.length - 10} más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {forceState.missingDocuments.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">
                    Documentos faltantes ({forceState.missingDocuments.length})
                  </div>
                  <ul className="list-disc list-inside text-sm">
                    {forceState.missingDocuments.slice(0, 10).map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                    {forceState.missingDocuments.length > 10 && (
                      <li>… y {forceState.missingDocuments.length - 10} más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmForce} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar y Forzar Completo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Step 1: standard mark-as-complete prompt.
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar {label} como Completo</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marcará a {actorName ?? `el ${lowerLabel}`} como
            completo. Si la información o los documentos están incompletos,
            podrás confirmar y forzarlo en el siguiente paso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onMarkComplete} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Marcar Completo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MarkCompleteDialog;
