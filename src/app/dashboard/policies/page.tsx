
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

const MOCK_POLICIES: Policy[] = [
  {
    id: 'POL-001',
    applicant: { name: 'Carlos Sánchez', email: 'carlos.s@example.com' },
    property: { address: 'Av. Siempre Viva 742' },
    status: 'pending',
    createdAt: '2024-06-20',
    premium: 4500,
  },
  {
    id: 'POL-002',
    applicant: { name: 'Ana García', email: 'ana.g@example.com' },
    property: { address: 'Calle Falsa 123' },
    status: 'approved',
    createdAt: '2024-06-18',
    premium: 5200,
  },
  {
    id: 'POL-003',
    applicant: { name: 'Luis Fernández', email: 'luis.f@example.com' },
    property: { address: 'Blvd. de los Sueños Rotos 5' },
    status: 'active',
    createdAt: '2024-05-15',
    premium: 6000,
  },
  {
    id: 'POL-004',
    applicant: { name: 'Mariana Torres', email: 'mariana.t@example.com' },
    property: { address: 'Paseo de la Reforma 222' },
    status: 'rejected',
    createdAt: '2024-06-19',
    premium: 4800,
  },
  {
    id: 'POL-005',
    applicant: { name: 'Jorge Martínez', email: 'jorge.m@example.com' },
    property: { address: 'Insurgentes Sur 1000' },
    status: 'expired',
    createdAt: '2023-06-21',
    premium: 4300,
  },
];

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
}

export default function PoliciesPage() {
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
            <CardDescription>{t.pages.policies.cardDescription(MOCK_POLICIES.length)}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/policies/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.pages.policies.newPolicy}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
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
              {MOCK_POLICIES.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.id}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
