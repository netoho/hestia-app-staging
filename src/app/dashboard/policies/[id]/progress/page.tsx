'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Send,
  RefreshCw,
  User,
  Users,
  Building,
  FileText,
  Mail,
  X,
  ExternalLink,
  Edit
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ActorProgress {
  id: string;
  type: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  name: string;
  email: string;
  phone: string;
  informationComplete: boolean;
  completedAt?: string;
  tokenExpiry?: string;
  documentsCount: number;
  requiredDocuments: number;
  lastActivity?: string;
}

interface PolicyProgress {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  status: string;
  guarantorType: string;
  createdAt: string;
  overallProgress: number;
  actors: ActorProgress[];
  activities: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    performedBy?: string;
    performedByActor?: string;
  }>;
}

export default function PolicyProgressPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [policyId, setPolicyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [policyProgress, setPolicyProgress] = useState<PolicyProgress | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  // Fetch progress data
  useEffect(() => {
    if (policyId) {
      fetchProgressData();
    }
  }, [policyId]);

  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');

      const data = await response.json();
      setPolicyProgress(data.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (actorType: string, actorId: string) => {
    setSending(actorId);
    try {
      const response = await fetch(`/api/policies/${policyId}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actors: [actorType],
          resend: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      alert('Invitación enviada exitosamente');
      await fetchProgressData(); // Refresh data
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Error al enviar la invitación');
    } finally {
      setSending(null);
    }
  };

  const getActorIcon = (type: string) => {
    switch (type) {
      case 'landlord':
        return Building;
      case 'tenant':
        return User;
      case 'jointObligor':
      case 'aval':
        return Users;
      default:
        return User;
    }
  };

  const getActorTypeLabel = (type: string) => {
    switch (type) {
      case 'landlord':
        return 'Arrendador';
      case 'tenant':
        return 'Inquilino';
      case 'jointObligor':
        return 'Obligado Solidario';
      case 'aval':
        return 'Aval';
      default:
        return type;
    }
  };

  const getStatusColor = (complete: boolean) => {
    return complete ? 'text-green-600' : 'text-orange-500';
  };

  const getStatusIcon = (complete: boolean) => {
    return complete ? CheckCircle2 : Clock;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isTokenExpired = (expiry?: string) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando progreso...</p>
        </div>
      </div>
    );
  }

  if (!policyProgress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar el progreso de la protección.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push(`/dashboard/policies/${policyId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a la protección
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Progreso de la protección</h1>
        <p className="text-gray-600 mt-2">
          Protección: {policyProgress.policyNumber} • {policyProgress.propertyAddress}
        </p>
      </div>

      {/* Overall Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
          <CardDescription>
            Estado de completitud de la información de todos los actores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso Total</span>
                <span className="font-medium">{policyProgress.overallProgress}%</span>
              </div>
              <Progress value={policyProgress.overallProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{policyProgress.actors.length}</div>
                <div className="text-sm text-gray-600">Actores Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {policyProgress.actors.filter(a => a.informationComplete).length}
                </div>
                <div className="text-sm text-gray-600">Completados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {policyProgress.actors.filter(a => !a.informationComplete).length}
                </div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {policyProgress.actors.reduce((sum, a) => sum + a.documentsCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Documentos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="actors">Actores</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Status for Each Actor */}
          <div className="grid gap-4">
            {policyProgress.actors.map((actor) => {
              const Icon = getActorIcon(actor.type);
              const StatusIcon = getStatusIcon(actor.informationComplete);

              return (
                <Card key={actor.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{getActorTypeLabel(actor.type)}</p>
                        <p className="text-sm text-gray-600">{actor.name || 'Sin nombre'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`h-5 w-5 ${getStatusColor(actor.informationComplete)}`} />
                          <span className={`text-sm font-medium ${getStatusColor(actor.informationComplete)}`}>
                            {actor.informationComplete ? 'Completo' : 'Pendiente'}
                          </span>
                        </div>
                        {actor.completedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(actor.completedAt)}
                          </p>
                        )}
                      </div>

                      {actor.type !== 'landlord' && !actor.informationComplete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendInvitation(actor.type, actor.id)}
                          disabled={sending === actor.id}
                        >
                          {sending === actor.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {actor.type === 'landlord' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="actors" className="space-y-4">
          {policyProgress.actors.map((actor) => {
            const Icon = getActorIcon(actor.type);
            const StatusIcon = getStatusIcon(actor.informationComplete);

            return (
              <Card key={actor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{getActorTypeLabel(actor.type)}</CardTitle>
                        <CardDescription>{actor.name || 'Información pendiente'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={actor.informationComplete ? 'success' : 'secondary'}>
                      {actor.informationComplete ? 'Completo' : 'Pendiente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{actor.email || 'No proporcionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium">{actor.phone || 'No proporcionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Documentos</p>
                      <p className="font-medium">
                        {actor.documentsCount} / {actor.requiredDocuments}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(actor.informationComplete)}`} />
                        <span className={`font-medium ${getStatusColor(actor.informationComplete)}`}>
                          {actor.informationComplete ? 'Información Completa' : 'Información Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {actor.type !== 'landlord' && actor.tokenExpiry && (
                    <Alert className={`mt-4 ${isTokenExpired(actor.tokenExpiry) ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {isTokenExpired(actor.tokenExpiry) ? (
                          <span className="text-red-700">
                            El token de acceso expiró el {formatDate(actor.tokenExpiry)}
                          </span>
                        ) : (
                          <span className="text-blue-700">
                            El token de acceso expira el {formatDate(actor.tokenExpiry)}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!actor.informationComplete && (
                    <div className="flex gap-2 mt-4">
                      {actor.type === 'landlord' ? (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Completar Información
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendInvitation(actor.type, actor.id)}
                            disabled={sending === actor.id}
                          >
                            {sending === actor.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Mail className="h-4 w-4 mr-2" />
                                {isTokenExpired(actor.tokenExpiry) ? 'Reenviar' : 'Enviar'} Invitación
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Actividad</CardTitle>
              <CardDescription>
                Historial de acciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policyProgress.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Circle className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.performedBy || activity.performedByActor || 'Sistema'} •{' '}
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {policyProgress.activities.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No hay actividad registrada aún
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
