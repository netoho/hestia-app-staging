'use client';

import {useMemo} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Activity, CheckCircle, Edit, FileText, Mail, Upload, User, UserPlus, XCircle,} from 'lucide-react';
import {format} from 'date-fns';
import {es} from 'date-fns/locale';

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  performedBy?: {
    name?: string;
    email: string;
  };
  performedByType?: string;
  details?: any;
}

interface ActorActivityTimelineProps {
  activities?: ActivityItem[];
  actorId?: string;
  actorType?: string;
  actorName?: string;
}

export default function ActorActivityTimeline({
  activities = [],
  actorId,
  actorType,
  actorName,
}: ActorActivityTimelineProps) {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'ACTOR_INFO_UPDATED':
      case 'INFO_UPDATED':
        return <Edit className="h-4 w-4" />;
      case 'DOCUMENT_UPLOADED':
        return <Upload className="h-4 w-4" />;
      case 'ACTOR_APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ACTOR_REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'INVITATION_SENT':
        return <Mail className="h-4 w-4" />;
      case 'ACTOR_CREATED':
        return <UserPlus className="h-4 w-4" />;
      case 'DOCUMENT_VERIFIED':
        return <FileText className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, { label: string; className: string }> = {
      ACTOR_INFO_UPDATED: { label: 'Información', className: 'bg-blue-500' },
      INFO_UPDATED: { label: 'Actualizado', className: 'bg-blue-500' },
      DOCUMENT_UPLOADED: { label: 'Documento', className: 'bg-purple-500' },
      ACTOR_APPROVED: { label: 'Aprobado', className: 'bg-green-500' },
      ACTOR_REJECTED: { label: 'Rechazado', className: 'bg-red-500' },
      INVITATION_SENT: { label: 'Invitación', className: 'bg-orange-500' },
      ACTOR_CREATED: { label: 'Creado', className: 'bg-indigo-500' },
      DOCUMENT_VERIFIED: { label: 'Verificado', className: 'bg-green-500' },
    };

    const badgeConfig = config[action] || { label: action, className: 'bg-gray-500' };

    return (
      <Badge className={`${badgeConfig.className} text-white text-xs`}>
        {badgeConfig.label}
      </Badge>
    );
  };

  // Filter activities by actor if actorId or actorType is provided
  const filteredActivities = useMemo(() => {
    if (!actorId && !actorType) {
      return activities;
    }

    return activities.filter((activity) => {
      // Match by actorId if available
      if (actorId && activity.details?.actorId === actorId) {
        return true;
      }

      // Match by actorType in description or details
      if (actorType) {
        return activity.description.toLowerCase().includes(actorType.toLowerCase()) ||
          activity.details?.actorType === actorType;
      }

      // Check if activity mentions this actor in performedByType
      if (actorName && activity.performedByType === actorName) {
        return true;
      }

      return false;
    });
  }, [activities, actorId, actorType, actorName]);

  const getTitle = () => {
    if (actorName) {
      return `Actividad de ${actorName}`;
    }
    if (actorType) {
      const typeLabels: Record<string, string> = {
        tenant: 'Inquilino',
        landlord: 'Arrendador',
        aval: 'Aval',
        jointObligor: 'Obligado Solidario',
      };
      return `Actividad del ${typeLabels[actorType] || actorType}`;
    }
    return 'Historial de Actividad';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>
          {actorId || actorType
            ? 'Registro de acciones realizadas por este actor'
            : 'Registro de todas las acciones realizadas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredActivities && filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b last:border-0"
              >
                <div className="p-2 bg-gray-100 rounded-full mt-1">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">{activity.description}</p>
                    {getActionBadge(activity.action)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {activity.performedBy?.name ||
                      activity.performedBy?.email ||
                      activity.performedByType ||
                      'Sistema'}{' '}
                    • {formatDateTime(activity.createdAt)}
                  </p>
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      {activity.details.reason && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Razón:</span> {activity.details.reason}
                        </p>
                      )}
                      {activity.details.documentType && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Documento:</span> {activity.details.documentType}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {actorId || actorType
                ? 'No hay actividad registrada para este actor'
                : 'No hay actividad registrada'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
