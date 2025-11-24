import { useState } from 'react';
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface Actor {
  id: string;
  fullName?: string;
  isPrimary: boolean;
  companyName?: string;
  informationComplete: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
}

interface ActorVerificationCardProps {
  policy: {
    id: string;
    landlords?: Actor[];
    tenant?: Actor;
    jointObligors?: Actor[];
    avals?: Actor[];
  };
  onApprove: (actorType: string, actorId: string) => Promise<void>;
  onReject: (actorType: string, actorId: string, reason: string) => Promise<void>;
}

export default function ActorVerificationCard({
  policy,
  onApprove,
  onReject,
}: ActorVerificationCardProps) {
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    actorType: string;
    actorId: string;
    actorName: string;
  }>({ open: false, actorType: '', actorId: '', actorName: '' });
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleApprove = async (actorType: string, actorId: string) => {
    setApproving(actorId);
    try {
      await onApprove(actorType, actorId);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón de rechazo');
      return;
    }

    setApproving(rejectDialog.actorId);
    try {
      await onReject(rejectDialog.actorType, rejectDialog.actorId, rejectionReason);
      setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
      setRejectionReason('');
    } finally {
      setApproving(null);
    }
  };

  const renderActorVerification = (
    actor: Actor | undefined,
    actorType: string,
    icon: ReactNode,
    label: string
  ) => {
    if (!actor) return null;

    const displayName = actor.fullName || actor.companyName || 'Sin nombre';

    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">
              {label}: {displayName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getVerificationBadge(actor.verificationStatus)}
            {actor.informationComplete && actor.verificationStatus === 'PENDING' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-600"
                  onClick={() => handleApprove(actorType, actor.id)}
                  disabled={approving === actor.id}
                >
                  {approving === actor.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t.pages.policies.actorVerification.approve}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600"
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
        </div>
        {actor.rejectionReason && (
          <Alert className="mt-2 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Razón de rechazo</AlertTitle>
            <AlertDescription>{actor.rejectionReason}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.pages.policies.actorVerification.title}</CardTitle>
          <CardDescription>{t.pages.policies.actorVerification.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policy.landlords?.map((landlord, index) =>
            renderActorVerification(
              landlord,
              'landlord',
              <Building className="h-5 w-5" />,
              landlord.isPrimary ? 'Arrendador Principal' : `Co-propietario ${index}`
            )
          )}

          {renderActorVerification(
            policy.tenant,
            'tenant',
            <User className="h-5 w-5" />,
            'Inquilino'
          )}

          {policy.jointObligors?.map((jo) =>
            renderActorVerification(
              jo,
              'jointObligor',
              <Users className="h-5 w-5" />,
              'Obligado Solidario'
            )
          )}

          {policy.avals?.map((aval) =>
            renderActorVerification(
              aval,
              'aval',
              <Shield className="h-5 w-5" />,
              'Aval'
            )
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
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
              <Label>Actor: {rejectDialog.actorName}</Label>
            </div>
            <div>
              <Label htmlFor="reason">
                {t.pages.policies.actorVerification.rejectionReason}
              </Label>
              <Textarea
                id="reason"
                placeholder={t.pages.policies.actorVerification.rejectionReasonPlaceholder}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
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
              disabled={!rejectionReason.trim() || approving === rejectDialog.actorId}
            >
              {approving === rejectDialog.actorId ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.actorVerification.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
