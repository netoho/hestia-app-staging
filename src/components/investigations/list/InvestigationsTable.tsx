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
import { MoreHorizontal, Eye, Pencil, Archive } from 'lucide-react';
import {
  getInvestigatedActorLabel,
  getInvestigationStatusLabel,
  getApproverTypeLabel,
} from '@/lib/constants/investigationConfig';
import type { InvestigationListItem } from './types';
import { ActorInvestigationStatus } from "@/prisma/generated/prisma-client/enums";

interface InvestigationsTableProps {
  investigations: InvestigationListItem[];
  policyId: string;
  onArchive: (investigation: InvestigationListItem) => void;
}

export default function InvestigationsTable({
  investigations,
  policyId,
  onArchive,
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
      case 'ARCHIVED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const canEditInvestigation = (inv: InvestigationListItem) => {
    // Can edit if PENDING and not yet submitted
    return canEdit && inv.status === 'PENDING' && !inv.submittedAt;
  };

  const canArchiveInvestigation = (inv: InvestigationListItem) => {
    // Can archive any non-archived investigation
    return canEdit && inv.status !== ActorInvestigationStatus.ARCHIVED;
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
                <TableHead>Estado</TableHead>
                <TableHead>Resolución</TableHead>
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

                  {/* Status */}
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(inv.status)}>
                      {getInvestigationStatusLabel(inv.status)}
                    </Badge>
                  </TableCell>

                  {/* Resolution */}
                  <TableCell>
                    {inv.approvedByType ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {getApproverTypeLabel(inv.approvedByType)}
                        </span>
                        {inv.approvedAt && (
                          <span className="text-muted-foreground ml-1">
                            · {format(new Date(inv.approvedAt), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        )}
                        {inv.rejectionReason && (
                          <p className="text-xs text-destructive truncate max-w-[200px]" title={inv.rejectionReason}>
                            {inv.rejectionReason}
                          </p>
                        )}
                        {inv.approvalNotes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={inv.approvalNotes}>
                            {inv.approvalNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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
                        {canArchiveInvestigation(inv) && (
                          <DropdownMenuItem onClick={() => onArchive(inv)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archivar
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
