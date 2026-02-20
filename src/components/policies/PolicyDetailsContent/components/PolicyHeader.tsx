'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  RefreshCw,
  Share2,
  XCircle,
  MoreVertical,
  Download,
  FileSearch,
  Receipt,
} from 'lucide-react';
import { PolicyStatusBadge } from '@/components/shared/PolicyStatusIndicators';
import { PolicyStatusType } from '@/lib/prisma-types';
import { t } from '@/lib/i18n';

interface PolicyHeaderProps {
  policyNumber: string;
  propertyAddress: string;
  status: PolicyStatusType;
  policyId: string;
  permissions: {
    canEdit: boolean;
    canApprove: boolean;
    canSendInvitations: boolean;
    canVerifyDocuments: boolean;
  };
  isStaffOrAdmin: boolean;
  sending: string | null;
  downloadingPdf: boolean;
  isRefreshing?: boolean;
  isActivating?: boolean;
  isDeactivating?: boolean;
  activatedAt?: Date | string | null;
  onSendInvitations: () => void;
  onApprove: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onShareClick: () => void;
  onCancelClick: () => void;
  onDownloadPdf: () => void;
  onRefresh?: () => void;
}

export function PolicyHeader({
  policyNumber,
  propertyAddress,
  status,
  policyId,
  permissions,
  isStaffOrAdmin,
  sending,
  downloadingPdf,
  isRefreshing,
  isActivating,
  isDeactivating,
  activatedAt,
  onSendInvitations,
  onApprove,
  onActivate,
  onDeactivate,
  onShareClick,
  onCancelClick,
  onDownloadPdf,
  onRefresh,
}: PolicyHeaderProps) {
  const router = useRouter();

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
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {propertyAddress}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="shrink-0"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Actions Dropdown */}
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Approve Policy - Staff/Admin */}
          {permissions.canApprove &&
           status === 'PENDING_APPROVAL' && (
            <DropdownMenuItem onClick={onApprove} className="text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t.pages.policies.approvePolicy}
            </DropdownMenuItem>
          )}

          {/* Activate Policy - Staff/Admin, APPROVED + not yet activated */}
          {isStaffOrAdmin && status === 'APPROVED' && !activatedAt && (
            <DropdownMenuItem onClick={onActivate} disabled={isActivating} className="text-green-600">
              {isActivating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.activatePolicy}
            </DropdownMenuItem>
          )}

          {/* Deactivate Policy - Staff/Admin, APPROVED + currently activated */}
          {isStaffOrAdmin && status === 'APPROVED' && !!activatedAt && (
            <DropdownMenuItem onClick={onDeactivate} disabled={isDeactivating} className="text-orange-600">
              {isDeactivating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.deactivatePolicy}
            </DropdownMenuItem>
          )}

          {/* Send Invitations */}
          {permissions.canSendInvitations && status === 'COLLECTING_INFO' && (
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
              {t.pages.policies.shareLinks}
            </DropdownMenuItem>
          )}

          {/* Investigations */}
          {isStaffOrAdmin && (
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/policies/${policyId}/investigations`)}
            >
              <FileSearch className="mr-2 h-4 w-4" />
              Investigaciones
            </DropdownMenuItem>
          )}

          {/* Receipts */}
          {isStaffOrAdmin && status === 'APPROVED' && (
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/policies/${policyId}/receipts`)}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Comprobantes
            </DropdownMenuItem>
          )}

          {/* Download PDF */}
          <DropdownMenuItem onClick={onDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t.pages.policies.details.downloadPDF}
          </DropdownMenuItem>

          {/* Cancel Policy - Staff/Admin only */}
          {isStaffOrAdmin && status !== 'CANCELLED' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onCancelClick}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t.pages.policies.cancelPolicy}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
}

export default PolicyHeader;
