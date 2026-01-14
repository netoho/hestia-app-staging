'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Shield,
  RefreshCw,
  Eye,
  Share2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { PolicyStatusBadge } from '@/components/shared/PolicyStatusIndicators';
import { PolicyStatusType } from '@/lib/prisma-types';
import { t } from '@/lib/i18n';

interface PolicyHeaderProps {
  policyNumber: string;
  propertyAddress: string;
  status: PolicyStatusType;
  investigationVerdict?: string | null;
  policyId: string;
  permissions: {
    canEdit: boolean;
    canApprove: boolean;
    canSendInvitations: boolean;
    canVerifyDocuments: boolean;
  };
  isStaffOrAdmin: boolean;
  allActorsApproved: boolean;
  progressOverall?: number;
  sending: string | null;
  onSendInvitations: () => void;
  onApprove: () => void;
  onShareClick: () => void;
  onCancelClick: () => void;
}

export function PolicyHeader({
  policyNumber,
  propertyAddress,
  status,
  investigationVerdict,
  policyId,
  permissions,
  isStaffOrAdmin,
  allActorsApproved,
  progressOverall,
  sending,
  onSendInvitations,
  onApprove,
  onShareClick,
  onCancelClick,
}: PolicyHeaderProps) {
  const router = useRouter();

  // Only show investigation badge when status is UNDER_INVESTIGATION
  // to avoid double badge confusion when policy is APPROVED
  const showInvestigationBadge =
    investigationVerdict === 'APPROVED' &&
    status === 'UNDER_INVESTIGATION';

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/policies')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              Protección {policyNumber}
            </h1>
            <PolicyStatusBadge status={status} size="sm" />
            {showInvestigationBadge && (
              <Badge className="bg-blue-500 hover:bg-blue-600 shrink-0">
                <Shield className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Investigación </span>Aprobada
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {propertyAddress}
          </p>
        </div>
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Review Information - Staff/Admin */}
          {(permissions.canApprove || permissions.canVerifyDocuments) &&
           status === 'UNDER_INVESTIGATION' &&
           investigationVerdict !== 'APPROVED' && (
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/policies/${policyId}/review`)}
              disabled={progressOverall !== undefined && progressOverall < 100}
            >
              <Eye className="mr-2 h-4 w-4" />
              Revisar Información
            </DropdownMenuItem>
          )}

          {/* Approve Policy - Staff/Admin */}
          {permissions.canApprove &&
           allActorsApproved &&
           investigationVerdict === 'APPROVED' &&
           (status === 'UNDER_INVESTIGATION' || status === 'PENDING_APPROVAL') && (
            <DropdownMenuItem onClick={onApprove} className="text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t.pages.policies.approvePolicy}
            </DropdownMenuItem>
          )}

          {/* Send Invitations */}
          {permissions.canSendInvitations && (status === 'DRAFT' || status === 'COLLECTING_INFO') && (
            <DropdownMenuItem
              onClick={onSendInvitations}
              disabled={sending === 'all'}
            >
              {sending === 'all' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.sendInvitations}
            </DropdownMenuItem>
          )}

          {/* Share Links */}
          {permissions.canSendInvitations && (
            <DropdownMenuItem onClick={onShareClick}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartir Enlaces
            </DropdownMenuItem>
          )}

          {/* Cancel Policy - Staff/Admin only */}
          {isStaffOrAdmin && status !== 'CANCELLED' && status !== 'EXPIRED' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onCancelClick}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Protección
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default PolicyHeader;
