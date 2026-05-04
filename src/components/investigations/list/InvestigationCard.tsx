'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Pencil, Archive, FileText } from 'lucide-react';
import {
  getInvestigatedActorLabel,
  getInvestigationStatusLabel,
} from '@/lib/constants/investigationConfig';
import type { InvestigationListItem } from './types';

interface InvestigationCardProps {
  investigation: InvestigationListItem;
  policyId: string;
  onArchive: (investigation: InvestigationListItem) => void;
}

export default function InvestigationCard({
  investigation: inv,
  policyId,
  onArchive,
}: InvestigationCardProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'STAFF';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'ARCHIVED':
        return 'outline';
      default:
        return 'warning';
    }
  };

  const canEditInvestigation = canEdit && inv.status === 'PENDING' && !inv.submittedAt;
  const canArchiveInvestigation = canEdit && inv.status !== 'ARCHIVED';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{inv.actorName}</h3>
            <Badge variant="outline" className="mt-1">
              {getInvestigatedActorLabel(inv.actorType)}
            </Badge>
          </div>
          <Badge variant={getStatusBadgeVariant(inv.status)}>
            {getInvestigationStatusLabel(inv.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Documents */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            {inv.submittedAt
              ? format(new Date(inv.submittedAt), 'dd/MM/yyyy', { locale: es })
              : format(new Date(inv.createdAt), 'dd/MM/yyyy', { locale: es })}
          </span>
          {inv.documentsCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {inv.documentsCount} doc{inv.documentsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              router.push(`/dashboard/policies/${policyId}/investigations/${inv.id}`)
            }
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          {canEditInvestigation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/policies/${policyId}/investigation/${inv.actorType}/${inv.actorId}/new?edit=${inv.id}`
                )
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canArchiveInvestigation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onArchive(inv)}
              title="Archivar"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
