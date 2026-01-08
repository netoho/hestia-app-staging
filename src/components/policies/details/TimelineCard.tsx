import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineCardProps {
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
}

export default function TimelineCard({
  createdAt,
  submittedAt,
  approvedAt,
  activatedAt,
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
              <p className="text-sm text-gray-600">{formatDateTime(createdAt)}</p>
            </div>
          </div>
          {submittedAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Enviada para Investigación</p>
                <p className="text-sm text-gray-600">{formatDateTime(submittedAt)}</p>
              </div>
            </div>
          )}
          {approvedAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Protección Aprobada</p>
                <p className="text-sm text-gray-600">{formatDateTime(approvedAt)}</p>
              </div>
            </div>
          )}
          {activatedAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Protección Activada</p>
                <p className="text-sm text-gray-600">{formatDateTime(activatedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
