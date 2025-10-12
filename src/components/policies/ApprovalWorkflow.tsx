'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building,
  User,
  Users,
  Shield,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface Actor {
  id: string;
  fullName?: string;
  companyName?: string;
  informationComplete: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  documents?: any[];
}

interface PolicyData {
  id: string;
  status: string;
  landlord?: Actor;
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

interface VerificationChecklist {
  infoComplete: boolean;
  docsVerified: boolean;
  referencesChecked: boolean;
}

interface ActorWithChecklist {
  actor: Actor;
  actorType: string;
  displayName: string;
  icon: any;
  checklist: VerificationChecklist;
}

export default function ApprovalWorkflow({
  policy,
  onApprove,
  onReject,
  onApprovePolicy,
  canApprovePolicy,
}: ApprovalWorkflowProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    actorType: string;
    actorId: string;
    actorName: string;
  }>({ open: false, actorType: '', actorId: '', actorName: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    actorType: string;
    actorId: string;
    actorName: string;
  }>({ open: false, actorType: '', actorId: '', actorName: '' });
  const [approvePolicyDialog, setApprovePolicyDialog] = useState(false);
  const [selectedActors, setSelectedActors] = useState<Set<string>>(new Set());
  const [checklists, setChecklists] = useState<Record<string, VerificationChecklist>>({});

  // Get verification badge
  const getVerificationBadge = (status?: string) => {
    const config = {
      PENDING: {
        label: t.pages.policies.actorVerification.pending,
        color: 'bg-gray-500',
        icon: Clock,
      },
      APPROVED: {
        label: t.pages.policies.actorVerification.approved,
        color: 'bg-green-500',
        icon: CheckCircle2,
      },
      REJECTED: {
        label: t.pages.policies.actorVerification.rejected,
        color: 'bg-red-500',
        icon: XCircle,
      },
      IN_REVIEW: {
        label: t.pages.policies.actorVerification.inReview,
        color: 'bg-yellow-500',
        icon: Eye,
      },
    };

    const badgeConfig = config[status as keyof typeof config] || config.PENDING;
    const Icon = badgeConfig.icon;

    return (
      <Badge className={`${badgeConfig.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badgeConfig.label}
      </Badge>
    );
  };

  // Build actor list with metadata
  const buildActorsList = (): ActorWithChecklist[] => {
    const actors: ActorWithChecklist[] = [];

    if (policy.landlord) {
      actors.push({
        actor: policy.landlord,
        actorType: 'landlord',
        displayName: policy.landlord.fullName || policy.landlord.companyName || 'Arrendador',
        icon: Building,
        checklist: checklists[policy.landlord.id] || {
          infoComplete: policy.landlord.informationComplete || false,
          docsVerified: false,
          referencesChecked: false,
        },
      });
    }

    if (policy.tenant) {
      actors.push({
        actor: policy.tenant,
        actorType: 'tenant',
        displayName: policy.tenant.fullName || policy.tenant.companyName || 'Inquilino',
        icon: User,
        checklist: checklists[policy.tenant.id] || {
          infoComplete: policy.tenant.informationComplete || false,
          docsVerified: false,
          referencesChecked: false,
        },
      });
    }

    policy.jointObligors?.forEach((jo) => {
      actors.push({
        actor: jo,
        actorType: 'jointObligor',
        displayName: jo.fullName || jo.companyName || 'Obligado Solidario',
        icon: Users,
        checklist: checklists[jo.id] || {
          infoComplete: jo.informationComplete || false,
          docsVerified: false,
          referencesChecked: false,
        },
      });
    });

    policy.avals?.forEach((aval) => {
      actors.push({
        actor: aval,
        actorType: 'aval',
        displayName: aval.fullName || aval.companyName || 'Aval',
        icon: Shield,
        checklist: checklists[aval.id] || {
          infoComplete: aval.informationComplete || false,
          docsVerified: false,
          referencesChecked: false,
        },
      });
    });

    return actors;
  };

  const actorsList = buildActorsList();

  // Check if all actors are approved
  const allActorsApproved = actorsList.every(
    ({ actor }) => actor.verificationStatus === 'APPROVED'
  );

  // Update checklist
  const updateChecklist = (actorId: string, field: keyof VerificationChecklist, value: boolean) => {
    setChecklists((prev) => ({
      ...prev,
      [actorId]: {
        ...(prev[actorId] || { infoComplete: false, docsVerified: false, referencesChecked: false }),
        [field]: value,
      },
    }));
  };

  // Handle approval
  const handleApprove = async () => {
    if (!approveDialog.actorId) return;

    setProcessing(approveDialog.actorId);
    try {
      await onApprove(approveDialog.actorType, approveDialog.actorId);
      setApproveDialog({ open: false, actorType: '', actorId: '', actorName: '' });
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón de rechazo');
      return;
    }

    setProcessing(rejectDialog.actorId);
    try {
      await onReject(rejectDialog.actorType, rejectDialog.actorId, rejectionReason);
      setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
      setRejectionReason('');
    } finally {
      setProcessing(null);
    }
  };

  // Handle policy approval
  const handleApprovePolicy = async () => {
    setProcessing('policy');
    try {
      await onApprovePolicy();
      setApprovePolicyDialog(false);
    } finally {
      setProcessing(null);
    }
  };

  // Toggle actor selection for batch operations
  const toggleActorSelection = (actorId: string) => {
    setSelectedActors((prev) => {
      const next = new Set(prev);
      if (next.has(actorId)) {
        next.delete(actorId);
      } else {
        next.add(actorId);
      }
      return next;
    });
  };

  // Render actor verification row
  const renderActorRow = ({ actor, actorType, displayName, icon: Icon, checklist }: ActorWithChecklist) => {
    const isPending = actor.verificationStatus === 'PENDING' && actor.informationComplete;
    const isApproved = actor.verificationStatus === 'APPROVED';
    const isRejected = actor.verificationStatus === 'REJECTED';

    return (
      <div key={actor.id} className="border rounded-lg p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedActors.has(actor.id)}
                onCheckedChange={() => toggleActorSelection(actor.id)}
                disabled={!isPending}
              />
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-gray-500">{actorType === 'landlord' ? 'Arrendador' : actorType === 'tenant' ? 'Inquilino' : actorType === 'jointObligor' ? 'Obligado Solidario' : 'Aval'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getVerificationBadge(actor.verificationStatus)}
          </div>
        </div>

        {/* Verification Checklist */}
        {isPending && (
          <div className="bg-gray-50 p-3 rounded space-y-2">
            <p className="text-sm font-medium text-gray-700">Verificación:</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checklist.infoComplete}
                  onCheckedChange={(checked) =>
                    updateChecklist(actor.id, 'infoComplete', checked as boolean)
                  }
                />
                <span>Información completa</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checklist.docsVerified}
                  onCheckedChange={(checked) =>
                    updateChecklist(actor.id, 'docsVerified', checked as boolean)
                  }
                />
                <span>Documentos verificados</span>
                {actor.documents && actor.documents.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {actor.documents.length} docs
                  </Badge>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checklist.referencesChecked}
                  onCheckedChange={(checked) =>
                    updateChecklist(actor.id, 'referencesChecked', checked as boolean)
                  }
                />
                <span>Referencias verificadas</span>
              </label>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {isRejected && actor.rejectionReason && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Razón de rechazo</AlertTitle>
            <AlertDescription className="text-red-700">{actor.rejectionReason}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() =>
                setApproveDialog({
                  open: true,
                  actorType,
                  actorId: actor.id,
                  actorName: displayName,
                })
              }
              disabled={processing === actor.id}
            >
              {processing === actor.id ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t.pages.policies.actorVerification.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() =>
                setRejectDialog({
                  open: true,
                  actorType,
                  actorId: actor.id,
                  actorName: displayName,
                })
              }
            >
              <X className="h-4 w-4" />
              {t.pages.policies.actorVerification.reject}
            </Button>
          </div>
        )}
      </div>
    );
  };

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
            {actorsList.map((actorData) => renderActorRow(actorData))}
          </div>

          {/* Final Policy Approval */}
          {allActorsApproved && canApprovePolicy && policy.status === 'UNDER_INVESTIGATION' && (
            <div className="pt-4 border-t">
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Listo para aprobación final</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Todos los actores han sido verificados y aprobados. Puedes proceder con la aprobación final de la póliza.
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
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApproveDialog({ open: false, actorType: '', actorId: '', actorName: '' });
        }
      }}>
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
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
            setRejectionReason('');
          }
        }}
      >
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
              <Label htmlFor="reason" className="text-red-600">
                {t.pages.policies.actorVerification.rejectionReason} *
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
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
                setRejectionReason('');
              }}
            >
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
            <AlertDialogTitle>Aprobar Póliza</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar esta póliza? Todos los actores han sido verificados
              y la póliza avanzará al siguiente estado en el proceso.
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
              Aprobar Póliza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
