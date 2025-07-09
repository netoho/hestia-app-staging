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


const statusVariantMap: Record<PolicyStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  active: 'default',
  rejected: 'destructive',
  expired: 'outline',
};

const statusColorMap: Record<PolicyStatus, string> = {
    pending: 'bg-yellow-500',
    approved: 'bg-blue-500',
    active: 'bg-green-500',
    rejected: 'bg-red-500',
    expired: 'bg-gray-500',
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
                        <TableCell><TableCell /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}


export default function PoliciesPage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPolicies() {
            try {
                const response = await fetch('/api/policies');
                if (!response.ok) {
                    throw new Error('Failed to fetch policies');
                }
                const data = await response.json();
                setPolicies(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        }
        fetchPolicies();
    }, []);

  return (
    <div>
      <PageTitle
        title={t.pages.policies.title}
        subtitle={t.pages.policies.subtitle}
      />
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.pages.policies.cardTitle}</CardTitle>
            <CardDescription>{!isLoading && !error && t.pages.policies.cardDescription(policies.length)}</CardDescription>
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
                        <TableCell>{policy.applicant.name}</TableCell>
                        <TableCell>{policy.property.address}</TableCell>
                        <TableCell>
                            <Badge variant={statusVariantMap[policy.status]} className="capitalize flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${statusColorMap[policy.status]}`}></span>
                                {t.policyStatus[policy.status]}
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
        </CardContent>
      </Card>
    </div>
  );
}
