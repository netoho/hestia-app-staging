
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MoreHorizontal, Eye, Mail, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PolicyStatus } from '@prisma/client';
import { POLICY_STATUS_DISPLAY, POLICY_STATUS_COLORS } from '@/lib/types/policy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ResendInvitationDialog } from '@/components/dialogs/ResendInvitationDialog';
import { t } from '@/lib/i18n';
import { TablePagination } from './TablePagination';

interface PolicyWithRelations {
  id: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  status: PolicyStatus;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  initiatedByUser: {
    id: string;
    email: string;
    name: string | null;
  };
  reviewedByUser?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  documents: Array<{
    id: string;
    category: string;
    originalName: string;
    uploadedAt: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
}

interface PolicyTableProps {
  refreshTrigger?: number;
}

export function PolicyTable({ refreshTrigger }: PolicyTableProps) {
  const [policies, setPolicies] = useState<PolicyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyWithRelations | null>(null);

  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const fetchPolicies = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/policies?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t.pages.policies.errorFetching);
      }

      const data = await response.json();
      setPolicies(data.policies);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: t.misc.error,
        description: t.pages.policies.errorLoading,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPolicies();
    }
  }, [pagination.page, pagination.limit, filters, refreshTrigger, isAuthenticated]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadgeVariant = (status: PolicyStatus) => {
    const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gray: 'secondary',
      blue: 'default',
      yellow: 'outline',
      orange: 'outline',
      purple: 'default',
      green: 'default',
      red: 'destructive',
    };
    return colorMap[POLICY_STATUS_COLORS[status]] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressText = (currentStep: number, status: PolicyStatus) => {
    if (status === PolicyStatus.SUBMITTED || status === PolicyStatus.APPROVED || status === PolicyStatus.DENIED) {
      return t.pages.policies.progressComplete;
    }
    return t.pages.policies.progressStep(currentStep);
  };

  const handleViewDetails = (policy: PolicyWithRelations) => {
    router.push(`/dashboard/policies/${policy.id}`);
  };

  const handleResendInvitation = (policy: PolicyWithRelations) => {
    setSelectedPolicy(policy);
    setResendDialogOpen(true);
  };

  const handleResendSuccess = () => {
    // Optionally refresh the policy list
    fetchPolicies();
  };

  const canResendInvitation = (status: PolicyStatus) => {
    const resendableStatuses: PolicyStatus[] = [PolicyStatus.DRAFT, PolicyStatus.SENT_TO_TENANT, PolicyStatus.IN_PROGRESS];
    return resendableStatuses.includes(status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.pages.policies.table.title}</CardTitle>
        <CardDescription>
          {t.pages.policies.table.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t.pages.policies.table.searchPlaceholder}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t.pages.policies.table.filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.pages.policies.table.allStatuses}</SelectItem>
              {Object.entries(POLICY_STATUS_DISPLAY).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {(loading || isAuthLoading) ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">{t.pages.policies.table.loading}</span>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.pages.policies.table.headers.tenant}</TableHead>
                    <TableHead>{t.pages.policies.table.headers.status}</TableHead>
                    <TableHead>{t.pages.policies.table.headers.progress}</TableHead>
                    <TableHead>{t.pages.policies.table.headers.initiatedBy}</TableHead>
                    <TableHead>{t.pages.policies.table.headers.created}</TableHead>
                    <TableHead>{t.pages.policies.table.headers.documents}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t.pages.policies.table.noPoliciesFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{policy.tenantEmail}</div>
                            {policy.tenantPhone && (
                              <div className="text-sm text-muted-foreground">
                                {policy.tenantPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(policy.status)}>
                            {POLICY_STATUS_DISPLAY[policy.status as keyof typeof POLICY_STATUS_DISPLAY] || policy.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {getProgressText(policy.currentStep, policy.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {policy.initiatedByUser?.name || policy.initiatedByUser?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(policy.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{policy.documents.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(policy)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t.pages.policies.table.actions.viewDetails}
                              </DropdownMenuItem>
                              {canResendInvitation(policy.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(policy)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  {t.pages.policies.table.actions.resend}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {policies.length > 0 && pagination.totalPages > 1 && (
              <TablePagination
                pagination={pagination}
                onPageChange={(page) => setPagination(p => ({ ...p, page }))}
                onLimitChange={(limit) => setPagination({ page: 1, limit, total: 0, totalPages: 1 })}
                isLoading={loading}
              />
            )}
          </>
        )}
      </CardContent>
      
      {/* Resend Invitation Dialog */}
      {selectedPolicy && (
        <ResendInvitationDialog
          isOpen={resendDialogOpen}
          onClose={() => {
            setResendDialogOpen(false);
            setSelectedPolicy(null);
          }}
          policy={selectedPolicy}
          onSuccess={handleResendSuccess}
        />
      )}
    </Card>
  );
}
