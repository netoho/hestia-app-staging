import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineCardProps {
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  expiresAt?: string;
}

export default function TimelineCard({
  createdAt,
  submittedAt,
  approvedAt,
  activatedAt,
  expiresAt,
}: TimelineCardProps) {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de Tiempo del Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
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
  );
}
