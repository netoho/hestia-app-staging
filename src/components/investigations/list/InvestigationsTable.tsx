'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  getInvestigatedActorLabel,
  getVerdictLabel,
  getVerdictColorClasses,
  getRiskLevelLabel,
  getRiskLevelColorClasses,
  getInvestigationStatusLabel,
} from '@/lib/constants/investigationConfig';
import type { InvestigationListItem } from './types';

interface InvestigationsTableProps {
  investigations: InvestigationListItem[];
  policyId: string;
  onDelete: (investigation: InvestigationListItem) => void;
}

export default function InvestigationsTable({
  investigations,
  policyId,
  onDelete,
}: InvestigationsTableProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'STAFF';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const canEditInvestigation = (inv: InvestigationListItem) => {
    // Can edit if not approved/rejected
    return canEdit && inv.status === 'PENDING';
  };

  const canDeleteInvestigation = (inv: InvestigationListItem) => {
    // Can only delete drafts (PENDING and not submitted)
    return canEdit && inv.status === 'PENDING' && !inv.submittedAt;
  };

  return (
    <Card className="hidden lg:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Veredicto</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investigations.map((inv) => (
                <TableRow key={inv.id}>
                  {/* Actor Name */}
                  <TableCell className="font-medium">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/policies/${policyId}/investigations/${inv.id}`)
                      }
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {inv.actorName}
                    </button>
                  </TableCell>

                  {/* Actor Type */}
                  <TableCell>
                    <Badge variant="outline">
                      {getInvestigatedActorLabel(inv.actorType)}
                    </Badge>
                  </TableCell>

                  {/* Verdict */}
                  <TableCell>
                    {inv.verdict ? (
                      <Badge className={getVerdictColorClasses(inv.verdict)}>
                        {getVerdictLabel(inv.verdict)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Risk Level */}
                  <TableCell>
                    {inv.riskLevel ? (
                      <Badge className={getRiskLevelColorClasses(inv.riskLevel)}>
                        {getRiskLevelLabel(inv.riskLevel)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(inv.status)}>
                      {getInvestigationStatusLabel(inv.status)}
                    </Badge>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.submittedAt
                      ? format(new Date(inv.submittedAt), 'dd/MM/yyyy', { locale: es })
                      : format(new Date(inv.createdAt), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/policies/${policyId}/investigations/${inv.id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        {canEditInvestigation(inv) && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/policies/${policyId}/investigation/${inv.actorType}/${inv.actorId}/new?edit=${inv.id}`
                              )
                            }
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDeleteInvestigation(inv) && (
                          <DropdownMenuItem
                            onClick={() => onDelete(inv)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
