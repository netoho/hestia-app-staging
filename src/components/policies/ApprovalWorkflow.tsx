'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { t } from '@/lib/i18n';
import { ActorVerificationRow } from './approval/ActorVerificationRow';
import { useApprovalWorkflow } from './approval/useApprovalWorkflow';

interface Actor {
  id: string;
  fullName?: string;
  companyName?: string;
  informationComplete: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  documents?: any[];
  isPrimary?: boolean;
}

interface PolicyData {
  id: string;
  status: string;
  landlords?: Actor[];
  tenant?: Actor;
  jointObligors?: Actor[];
  avals?: Actor[];
}

interface ApprovalWorkflowProps {
  policy: PolicyData;
  onApprove: (actorType: string, actorId: string) => Promise<void>;
  onReject: (actorType: string, actorId: string, reason: string) => Promise<void>;
  onApprovePolicy: () => Promise<void>;
  canApprovePolicy: boolean;
}

export default function ApprovalWorkflow({
  policy,
  onApprove,
  onReject,
  onApprovePolicy,
  canApprovePolicy,
}: ApprovalWorkflowProps) {
  const {
    processing,
    actorsList,
    allActorsApproved,
    selectedActors,
    approveDialog,
    rejectDialog,
    rejectionReason,
    approvePolicyDialog,
    updateChecklist,
    handleApprove,
    handleReject,
    handleApprovePolicy,
    toggleActorSelection,
    openApproveDialog,
    openRejectDialog,
    closeApproveDialog,
    closeRejectDialog,
    setRejectionReason,
    setApprovePolicyDialog,
  } = useApprovalWorkflow({
    policy,
    onApprove,
    onReject,
    onApprovePolicy,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.pages.policies.actorVerification.title}</CardTitle>
              <CardDescription>{t.pages.policies.actorVerification.subtitle}</CardDescription>
            </div>
            {selectedActors.size > 0 && (
              <Badge variant="outline">
                {selectedActors.size} seleccionado(s)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Alert */}
          {allActorsApproved ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {t.pages.policies.actorVerification.allActorsApproved}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-orange-50 border-orange-200">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                {t.pages.policies.actorVerification.pendingActorApprovals}
              </AlertDescription>
            </Alert>
          )}

          {/* Actor List */}
          <div className="space-y-3">
            {actorsList.map((actorData) => (
              <ActorVerificationRow
                key={actorData.actor.id}
                actor={actorData.actor}
                actorType={actorData.actorType}
                displayName={actorData.displayName}
                icon={actorData.icon}
                checklist={actorData.checklist}
                isSelected={selectedActors.has(actorData.actor.id)}
                isProcessing={processing === actorData.actor.id}
                onToggleSelection={() => toggleActorSelection(actorData.actor.id)}
                onUpdateChecklist={(field, value) => updateChecklist(actorData.actor.id, field, value)}
                onApprove={() => openApproveDialog(actorData.actorType, actorData.actor.id, actorData.displayName)}
                onReject={() => openRejectDialog(actorData.actorType, actorData.actor.id, actorData.displayName)}
              />
            ))}
          </div>

          {/* Final Policy Approval */}
          {allActorsApproved && canApprovePolicy && policy.status === 'UNDER_INVESTIGATION' && (
            <div className="pt-4 border-t">
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Listo para aprobación final</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Todos los actores han sido verificados y aprobados. Puedes proceder con la aprobación final de la protección.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setApprovePolicyDialog(true)}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={processing === 'policy'}
              >
                {processing === 'policy' ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t.pages.policies.approvePolicy}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => !open && closeApproveDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar la información de <strong>{approveDialog.actorName}</strong>?
              Esta acción quedará registrada en el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing === approveDialog.actorId}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing === approveDialog.actorId ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar Aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.pages.policies.actorVerification.rejectDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.pages.policies.actorVerification.rejectDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-medium">Actor: {rejectDialog.actorName}</Label>
            </div>
            <div>
              <Label htmlFor="reason" required>
                {t.pages.policies.actorVerification.rejectionReason}
              </Label>
              <Textarea
                id="reason"
                placeholder={t.pages.policies.actorVerification.rejectionReasonPlaceholder}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Esta razón será enviada al actor para que pueda corregir la información.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog}>
              {t.pages.policies.actorVerification.cancelReject}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing === rejectDialog.actorId}
            >
              {processing === rejectDialog.actorId ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.actorVerification.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Policy Dialog */}
      <AlertDialog open={approvePolicyDialog} onOpenChange={setApprovePolicyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar Protección</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar esta protección? Todos los actores han sido verificados
              y la protección avanzará al siguiente estado en el proceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprovePolicy}
              disabled={processing === 'policy'}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing === 'policy' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Aprobar Protección
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
