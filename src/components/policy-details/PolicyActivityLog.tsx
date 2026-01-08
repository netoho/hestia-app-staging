'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { t } from '@/lib/i18n';

interface Activity {
  id: string;
  action: string;
  details?: any;
  performedBy?: string;
  ipAddress?: string;
  createdAt: string;
}

interface PolicyActivityLogProps {
  activities: Activity[];
}

export function PolicyActivityLog({ activities }: PolicyActivityLogProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
      case 'initiated':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'sent':
      case 'resent':
        return <User className="h-4 w-4 text-orange-500" />;
      case 'step_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'document_uploaded':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'document_downloaded':
        return <Download className="h-4 w-4 text-blue-500" />;
      case 'payment_initiated':
      case 'payment_completed':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'payment_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'submitted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-700" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.action) {
      case 'created':
        return 'Solicitud de protección creada';
      case 'sent':
        return 'Invitación enviada al inquilino';
      case 'resent':
        return 'Invitación reenviada al inquilino';
      case 'step_completed':
        return `Paso ${activity.details?.step || ''} completado`;
      case 'document_uploaded':
        return `Documento subido: ${activity.details?.fileName || 'archivo'}`;
      case 'document_downloaded':
        return `Documento descargado: ${activity.details?.fileName || 'archivo'}`;
      case 'payment_initiated':
        return `Pago iniciado: ${activity.details?.amount ? `$${activity.details.amount} ${activity.details.currency || 'MXN'}` : 'monto no especificado'}`;
      case 'payment_completed':
        return `Pago completado: ${activity.details?.amount ? `$${activity.details.amount} ${activity.details.currency || 'MXN'}` : 'monto no especificado'}`;
      case 'payment_failed':
        return `Pago fallido: ${activity.details?.reason || 'razón no especificada'}`;
      case 'submitted':
        return 'Solicitud enviada para revisión';
      case 'approved':
        return 'Solicitud aprobada';
      case 'denied':
        return 'Solicitud denegada';
      default:
        return activity.action;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.pages.policies.details.activity.title}</CardTitle>
        <CardDescription>
          {t.pages.policies.details.activity.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                {getActivityIcon(activity.action)}
                {index < activities.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{getActivityDescription(activity)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.performedBy === 'tenant' ? t.pages.policies.details.activity.performedBy.tenant :
                   activity.performedBy === 'system' ? t.pages.policies.details.activity.performedBy.system :
                   activity.performedBy ? t.pages.policies.details.activity.performedBy.staff : t.pages.policies.details.activity.performedBy.system}
                </p>
                {activity.details && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(activity.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
