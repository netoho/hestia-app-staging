'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CalendarClock, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { AssignBrokerModal } from '@/components/policies/AssignBrokerModal';

interface TimelineCardManagedBy {
  id: string;
  name: string | null;
}

interface TimelineCardProps {
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  expiresAt?: string;
  policyId?: string;
  managedBy?: TimelineCardManagedBy | null;
}

export default function TimelineCard({
  createdAt,
  submittedAt,
  approvedAt,
  activatedAt,
  expiresAt,
  policyId,
  managedBy,
}: TimelineCardProps) {
  const { data: session } = useSession();
  const [assignOpen, setAssignOpen] = useState(false);
  const isStaffOrAdmin =
    session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF';

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Línea de Tiempo del Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Broker (managedBy) row — admin/staff can reassign via the picker */}
            {policyId && (
              <div className="flex items-center gap-3 pb-3 border-b">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Broker</p>
                  <p className="font-medium">
                    {managedBy?.name ?? 'Sin asignar (CS)'}
                  </p>
                </div>
                {isStaffOrAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                    Cambiar
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Protección Creada</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(createdAt)}</p>
              </div>
            </div>
            {submittedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Enviada para Investigación</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(submittedAt)}</p>
                </div>
              </div>
            )}
            {approvedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Protección Aprobada</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(approvedAt)}</p>
                </div>
              </div>
            )}
            {activatedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Protección Activada</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(activatedAt)}</p>
                </div>
              </div>
            )}
            {expiresAt && (() => {
              const isExpired = new Date(expiresAt) < new Date();
              return (
                <div className="flex items-center gap-3">
                  <CalendarClock className={`h-5 w-5 ${isExpired ? 'text-red-500' : 'text-orange-500'}`} />
                  <div>
                    <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                      {isExpired ? 'Expirada' : 'Expira'}
                      {' el '}
                      {formatDateTime(expiresAt)}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {policyId && isStaffOrAdmin && (
        <AssignBrokerModal
          open={assignOpen}
          onOpenChange={setAssignOpen}
          policyId={policyId}
          currentBroker={managedBy ?? null}
        />
      )}
    </>
  );
}
