
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import type { Policy, PolicyStatus } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { TableFilters, FilterOption } from '@/components/shared/TableFilters';
import { TablePagination } from '@/components/shared/TablePagination';
import { useTableState } from '@/hooks/use-table-state';
import { useAuth } from '@/hooks/use-auth';

const statusVariantMap: Record<PolicyStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  active: 'default',
  expired: 'outline',
  cancelled: 'destructive',
};

const statusColorMap: Record<PolicyStatus, string> = {
    pending: 'bg-yellow-500',
    active: 'bg-green-500',
    expired: 'bg-gray-500',
    cancelled: 'bg-red-500',
};

function PoliciesSkeleton() {
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.policies.tableHeaders.policyId}</TableHead>
                <TableHead>{t.pages.policies.tableHeaders.applicant}</TableHead>
                <TableHead>{t.pages.policies.tableHeaders.property}</TableHead>
                <TableHead>{t.pages.policies.tableHeaders.status}</TableHead>
                <TableHead>{t.pages.policies.tableHeaders.premium}</TableHead>
                <TableHead>{t.pages.policies.tableHeaders.createdAt}</TableHead>
                <TableHead>
                  <span className="sr-only">{t.pages.policies.tableHeaders.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell />
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}


export default function PoliciesPage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();
    
    const tableState = useTableState({
        initialState: { limit: 10 },
    });

    const statusOptions: FilterOption[] = [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const fetchPolicies = async (queryString: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/policies?${queryString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch policies');
            }
            const data = await response.json();
            setPolicies(data.policies || []);
            setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchPolicies(tableState.queryString);
        }
    }, [token, tableState.queryString]);

  return (
    <div>
      <PageTitle
        title={t.pages.policies.title}
        subtitle={t.pages.policies.subtitle}
      />
      <TableFilters
        searchPlaceholder="Search by address or tenant..."
        searchValue={tableState.state.search}
        onSearchChange={tableState.setSearch}
        selectFilters={[
            {
                key: 'status',
                label: 'Status',
                placeholder: 'Filter by status',
                options: statusOptions,
                value: tableState.state.filters.status || 'all',
                onChange: (value) => tableState.setFilter('status', value),
            },
        ]}
        onClear={tableState.clearFilters}
      />
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.pages.policies.cardTitle}</CardTitle>
            <CardDescription>{!isLoading && !error && t.pages.policies.cardDescription(pagination.total)}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/policies/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.pages.policies.newPolicy}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <PoliciesSkeleton />
            ) : error ? (
                 <div className="text-center py-10 text-destructive">
                    <p>{t.pages.policies.errorLoading}</p>
                    <p className="text-sm">{error}</p>
                 </div>
            ) : policies.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <p>{t.pages.policies.noPoliciesFound}</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t.pages.policies.tableHeaders.policyId}</TableHead>
                        <TableHead>{t.pages.policies.tableHeaders.applicant}</TableHead>
                        <TableHead>{t.pages.policies.tableHeaders.property}</TableHead>
                        <TableHead>{t.pages.policies.tableHeaders.status}</TableHead>
                        <TableHead>{t.pages.policies.tableHeaders.premium}</TableHead>
                        <TableHead>{t.pages.policies.tableHeaders.createdAt}</TableHead>
                        <TableHead>
                        <span className="sr-only">{t.pages.policies.tableHeaders.actions}</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {policies.map((policy) => (
                        <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.id.substring(0, 8)}...</TableCell>
                        <TableCell>{policy.tenant?.name || 'N/A'}</TableCell>
                        <TableCell>{policy.property.address}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariantMap[policy.status] || 'default'} className="capitalize flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${statusColorMap[policy.status] || 'bg-gray-500'}`}></span>
                                {t.policyStatus[policy.status] || policy.status}
                            </Badge>
                        </TableCell>
                        <TableCell>${policy.premium.toLocaleString('es-MX')}</TableCell>
                        <TableCell>{new Date(policy.createdAt).toLocaleDateString('es-MX')}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t.pages.policies.toggleMenu}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t.pages.policies.actions.label}</DropdownMenuLabel>
                                <DropdownMenuItem>{t.pages.policies.actions.view}</DropdownMenuItem>
                                <DropdownMenuItem>{t.pages.policies.actions.edit}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">{t.pages.policies.actions.cancel}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
            {!isLoading && !error && policies.length > 0 && (
                <TablePagination
                    pagination={pagination}
                    onPageChange={tableState.setPage}
                    onLimitChange={tableState.setLimit}
                    isLoading={isLoading}
                />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
