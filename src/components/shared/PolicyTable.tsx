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
import { PolicyStatus } from '@prisma/client';
import { POLICY_STATUS_DISPLAY, POLICY_STATUS_COLORS } from '@/lib/types/policy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ResendInvitationDialog } from '@/components/dialogs/ResendInvitationDialog';

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
    totalPages: 0,
  });
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyWithRelations | null>(null);

  const { toast } = useToast();
  const { token } = useAuth();

  const fetchPolicies = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/policies?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch policies');
      }

      const data = await response.json();
      setPolicies(data.policies);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPolicies();
    }
  }, [pagination.page, pagination.limit, filters, refreshTrigger, token]);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressText = (currentStep: number, status: PolicyStatus) => {
    if (status === PolicyStatus.SUBMITTED || status === PolicyStatus.APPROVED || status === PolicyStatus.DENIED) {
      return 'Complete';
    }
    return `Step ${currentStep}/4`;
  };

  const handleResendInvitation = (policy: PolicyWithRelations) => {
    setSelectedPolicy(policy);
    setResendDialogOpen(true);
  };

  const handleResendSuccess = () => {
    // Optionally refresh the policy list
    // fetchPolicies();
  };

  const canResendInvitation = (status: PolicyStatus) => {
    const resendableStatuses: PolicyStatus[] = [PolicyStatus.DRAFT, PolicyStatus.SENT_TO_TENANT, PolicyStatus.IN_PROGRESS];
    return resendableStatuses.includes(status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Applications</CardTitle>
        <CardDescription>
          Manage and track policy applications from tenants
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by tenant email..."
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
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(POLICY_STATUS_DISPLAY).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading policies...</span>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Initiated By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No policies found
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
                            {POLICY_STATUS_DISPLAY[policy.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {getProgressText(policy.currentStep, policy.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {policy.initiatedByUser.name || policy.initiatedByUser.email}
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
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canResendInvitation(policy.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(policy)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend Invitation
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Documents
                              </DropdownMenuItem>
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
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} policies
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
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