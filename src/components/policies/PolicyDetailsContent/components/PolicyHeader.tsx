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
  FileText,
  FileSearch,
  Receipt,
} from 'lucide-react';
import { PolicyStatusBadge } from '@/components/shared/PolicyStatusIndicators';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { t } from '@/lib/i18n';

interface PolicyHeaderProps {
  policyNumber: string;
  propertyAddress: string;
  status: PolicyStatus;
  policyId: string;
  renewedToId?: string | null;
  permissions: {
    canEdit: boolean;
    canApprove: boolean;
    canSendInvitations: boolean;
    canVerifyDocuments: boolean;
  };
  isStaffOrAdmin: boolean;
  sending: string | null;
  downloadingPdf: boolean;
  downloadingDocx: boolean;
  isRefreshing?: boolean;
  allActorsComplete?: boolean;
  isApproving?: boolean;
  onSendInvitations: () => void;
  onApprove: () => void;
  onShareClick: () => void;
  onCancelClick: () => void;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
  onRefresh?: () => void;
}

export function PolicyHeader({
  policyNumber,
  propertyAddress,
  status,
  policyId,
  renewedToId,
  permissions,
  isStaffOrAdmin,
  sending,
  downloadingPdf,
  downloadingDocx,
  isRefreshing,
  allActorsComplete,
  isApproving,
  onSendInvitations,
  onApprove,
  onShareClick,
  onCancelClick,
  onDownloadPdf,
  onDownloadDocx,
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
        {/* Prominent Approve Button — staff/admin only, COLLECTING_INFO, all actors complete */}
        {isStaffOrAdmin && status === 'COLLECTING_INFO' && allActorsComplete && (
          <Button
            onClick={onApprove}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            {isApproving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {t.pages.policies.approvePolicy}
          </Button>
        )}

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
          {/* Approve Policy (transitions to ACTIVE) - Staff/Admin */}
          {permissions.canApprove &&
           status === 'PENDING_APPROVAL' && (
            <DropdownMenuItem onClick={onApprove} className="text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t.pages.policies.approvePolicy}
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
          {isStaffOrAdmin && (status === 'ACTIVE' || status === 'EXPIRED') && (
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

          {/* Download Cover Page (.docx) */}
          <DropdownMenuItem onClick={onDownloadDocx} disabled={downloadingDocx}>
            {downloadingDocx ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {t.pages.policies.details.downloadCover}
          </DropdownMenuItem>

          {/* Renovar - Staff/Admin, ACTIVE or EXPIRED, not already renewed */}
          {isStaffOrAdmin &&
            (status === 'ACTIVE' || status === 'EXPIRED') &&
            !renewedToId && (
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/policies/${policyId}/renew`)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t.pages.policyRenewal.cta}
              </DropdownMenuItem>
            )}

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
