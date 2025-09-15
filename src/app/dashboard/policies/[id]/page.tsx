'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, FileText, CheckCircle, XCircle, Clock, Download, Upload, User } from 'lucide-react';
import { PolicyStatus, InvestigationStatus, ContractStatus } from '@/types/policy';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PolicyDetailsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investigation, setInvestigation] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchPolicyDetails();
      fetchInvestigation();
      fetchContract();
    }
  }, [params.id]);

  const fetchPolicyDetails = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}`);
      const data = await response.json();
      setPolicy(data);
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestigation = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}/investigation`);
      const data = await response.json();
      if (data.success) {
        setInvestigation(data.data.investigation);
      }
    } catch (error) {
      console.error('Error fetching investigation:', error);
    }
  };

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}/contract`);
      const data = await response.json();
      if (data.success) {
        setContract(data.data.contract);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    }
  };

  const handleSendInvitations = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}/send-invitations`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        alert('Invitaciones enviadas exitosamente');
        fetchPolicyDetails();
      } else {
        alert('Error al enviar invitaciones');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Error al enviar invitaciones');
    }
  };

  const handleStartInvestigation = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}/investigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'NORMAL' }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Investigación iniciada');
        fetchInvestigation();
        fetchPolicyDetails();
      } else {
        alert('Error al iniciar investigación');
      }
    } catch (error) {
      console.error('Error starting investigation:', error);
      alert('Error al iniciar investigación');
    }
  };

  const handleGenerateContract = async () => {
    try {
      const response = await fetch(`/api/policies/${params.id}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'standard' }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Contrato generado exitosamente');
        fetchContract();
        fetchPolicyDetails();
      } else {
        alert('Error al generar contrato');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Error al generar contrato');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="container mx-auto p-6">
        <p>Póliza no encontrada</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/policies')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Póliza {policy.policyNumber}</h1>
        <Badge>{policy.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Propiedad</dt>
                <dd className="text-sm">{policy.propertyAddress}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Renta Mensual</dt>
                <dd className="text-sm">${policy.rentAmount?.toLocaleString('es-MX')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Depósito</dt>
                <dd className="text-sm">${policy.depositAmount?.toLocaleString('es-MX')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vigencia</dt>
                <dd className="text-sm">
                  {policy.startDate && format(new Date(policy.startDate), 'dd/MM/yyyy', { locale: es })} -
                  {policy.endDate && format(new Date(policy.endDate), 'dd/MM/yyyy', { locale: es })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            {investigation ? (
              <div className="space-y-2">
                <Badge>{investigation.status}</Badge>
                <div className="space-y-1 mt-4">
                  <div className="flex items-center gap-2">
                    {investigation.tenantVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Inquilino verificado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {investigation.documentsVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Documentos verificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {investigation.incomeVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Ingresos verificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {investigation.referencesVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Referencias verificadas</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">No se ha iniciado investigación</p>
                {policy.status === PolicyStatus.UNDER_INVESTIGATION && (
                  <Button onClick={handleStartInvestigation} size="sm">
                    Iniciar Investigación
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            {contract ? (
              <div className="space-y-2">
                <Badge>{contract.status}</Badge>
                <div className="space-y-2 mt-4">
                  <p className="text-sm">
                    <span className="font-medium">Número:</span> {contract.contractNumber}
                  </p>
                  {contract.generatedAt && (
                    <p className="text-sm">
                      <span className="font-medium">Generado:</span> {format(new Date(contract.generatedAt), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  )}
                  {contract.contractUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={contract.contractUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Contrato
                      </a>
                    </Button>
                  )}
                  {contract.signedContractUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={contract.signedContractUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Contrato Firmado
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">No se ha generado contrato</p>
                {policy.status === PolicyStatus.APPROVED && (
                  <Button onClick={handleGenerateContract} size="sm">
                    Generar Contrato
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actors" className="w-full">
        <TabsList>
          <TabsTrigger value="actors">Actores</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
        </TabsList>

        <TabsContent value="actors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Landlord Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Arrendador
                </CardTitle>
              </CardHeader>
              <CardContent>
                {policy.landlord ? (
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                      <dd className="text-sm">{policy.landlord.firstName} {policy.landlord.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm">{policy.landlord.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                      <dd className="text-sm">{policy.landlord.phone || '-'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Tenant Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Inquilino
                  {policy.tenant?.informationCompletedAt && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {policy.tenant ? (
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                      <dd className="text-sm">{policy.tenant.firstName} {policy.tenant.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm">{policy.tenant.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                      <dd className="text-sm">{policy.tenant.phone || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Información completada</dt>
                      <dd className="text-sm">
                        {policy.tenant.informationCompletedAt
                          ? format(new Date(policy.tenant.informationCompletedAt), 'dd/MM/yyyy HH:mm', { locale: es })
                          : 'Pendiente'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Joint Obligors */}
            {policy.jointObligors && policy.jointObligors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Obligados Solidarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {policy.jointObligors.map((jo: any, index: number) => (
                      <div key={jo.id} className="border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{jo.firstName} {jo.lastName}</span>
                          {jo.informationCompletedAt && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{jo.email}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Avals */}
            {policy.avals && policy.avals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Avales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {policy.avals.map((aval: any, index: number) => (
                      <div key={aval.id} className="border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{aval.firstName} {aval.lastName}</span>
                          {aval.informationCompletedAt && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{aval.email}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {policy.status === PolicyStatus.DRAFT && (
            <div className="mt-6 flex justify-center">
              <Button onClick={handleSendInvitations}>
                <Send className="mr-2 h-4 w-4" />
                Enviar Invitaciones a Actores
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de la Póliza</CardTitle>
            </CardHeader>
            <CardContent>
              {policy.documents && policy.documents.length > 0 ? (
                <div className="space-y-2">
                  {policy.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{doc.originalName}</p>
                        <p className="text-sm text-gray-500">
                          {doc.category} - {format(new Date(doc.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay documentos cargados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Actividad de la Póliza</CardTitle>
            </CardHeader>
            <CardContent>
              {policy.activities && policy.activities.length > 0 ? (
                <div className="space-y-4">
                  {policy.activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        {activity.details && (
                          <p className="text-sm text-gray-500">{JSON.stringify(activity.details)}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {format(new Date(activity.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay actividad registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}