'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  RefreshCw,
  Home,
  Mail,
  WifiOff,
  FileQuestion,
  ServerCrash,
  ShieldAlert
} from 'lucide-react';

interface PolicyErrorStateProps {
  error?: {
    code?: number;
    message?: string;
    type?: 'network' | 'not-found' | 'server' | 'unauthorized' | 'unknown';
  };
  onRetry?: () => void;
  onGoHome?: () => void;
  showContactSupport?: boolean;
}

export default function PolicyErrorState({
  error,
  onRetry,
  onGoHome,
  showContactSupport = true
}: PolicyErrorStateProps) {
  const getErrorConfig = () => {
    const type = error?.type || 'unknown';
    const code = error?.code;

    if (code === 404 || type === 'not-found') {
      return {
        icon: FileQuestion,
        title: 'Póliza no encontrada',
        description: 'La póliza que buscas no existe o no tienes permisos para verla.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }

    if (code === 401 || code === 403 || type === 'unauthorized') {
      return {
        icon: ShieldAlert,
        title: 'Acceso denegado',
        description: 'No tienes permisos para acceder a esta póliza.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (code === 500 || type === 'server') {
      return {
        icon: ServerCrash,
        title: 'Error del servidor',
        description: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (type === 'network') {
      return {
        icon: WifiOff,
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }

    return {
      icon: AlertCircle,
      title: 'Error inesperado',
      description: error?.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  return (
    <div className="container mx-auto p-6 max-w-2xl animate-in fade-in duration-300">
      <Card className={`${config.borderColor} border-2`}>
        <CardContent className="py-12">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className={`${config.bgColor} rounded-full p-6 inline-block`}>
              <Icon className={`h-16 w-16 ${config.color}`} />
            </div>

            {/* Title and Description */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
              <p className="text-gray-600">{config.description}</p>
            </div>

            {/* Error Code */}
            {error?.code && (
              <div className="text-sm text-gray-500">
                Código de error: {error.code}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="default"
                  size="lg"
                  className="transition-all hover:scale-105"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              )}

              {onGoHome && (
                <Button
                  onClick={onGoHome}
                  variant="outline"
                  size="lg"
                  className="transition-all hover:scale-105"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir al inicio
                </Button>
              )}
            </div>

            {/* Contact Support */}
            {showContactSupport && (
              <Alert className="mt-6">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Si el problema persiste, contacta a soporte técnico en{' '}
                  <a
                    href="mailto:soporte@hestia.com"
                    className="font-medium underline hover:text-blue-600 transition-colors"
                  >
                    soporte@hestia.com
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
