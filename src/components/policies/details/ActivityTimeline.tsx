import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
  performedBy?: {
    name?: string;
    email: string;
  };
  performedByType?: string;
}

interface ActivityTimelineProps {
  activities?: ActivityItem[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Actividad</CardTitle>
        <CardDescription>
          Registro de todas las acciones realizadas en esta protección
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b last:border-0"
              >
                <div className="p-2 bg-gray-100 rounded-full">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.performedBy?.name ||
                      activity.performedBy?.email ||
                      activity.performedByType ||
                      'Sistema'}{' '}
                    • {formatDateTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No hay actividad registrada</p>
        )}
      </CardContent>
    </Card>
  );
}
