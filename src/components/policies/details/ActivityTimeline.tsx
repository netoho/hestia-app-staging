import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
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

type DateBucket = 'today' | 'thisWeek' | 'thisMonth' | 'older';

const BUCKET_LABELS: Record<DateBucket, string> = {
  today: 'Hoy',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mes',
  older: 'Anteriores',
};

function getDateBucket(dateString: string): DateBucket {
  const date = new Date(dateString);
  if (isToday(date)) return 'today';
  if (isThisWeek(date, { locale: es })) return 'thisWeek';
  if (isThisMonth(date)) return 'thisMonth';
  return 'older';
}

function groupActivities(activities: ActivityItem[]) {
  const groups: Record<DateBucket, ActivityItem[]> = {
    today: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  for (const activity of activities) {
    groups[getDateBucket(activity.createdAt)].push(activity);
  }

  return groups;
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  const groups = activities?.length ? groupActivities(activities) : null;
  const bucketOrder: DateBucket[] = ['today', 'thisWeek', 'thisMonth', 'older'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Actividad</CardTitle>
        <CardDescription>
          Registro de todas las acciones realizadas en esta protección
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups ? (
          <div className="space-y-6">
            {bucketOrder.map((bucket) => {
              const items = groups[bucket];
              if (items.length === 0) return null;

              return (
                <div key={bucket}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {BUCKET_LABELS[bucket]}
                  </h3>
                  <div className="space-y-4">
                    {items.map((activity) => (
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
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No hay actividad registrada</p>
        )}
      </CardContent>
    </Card>
  );
}
