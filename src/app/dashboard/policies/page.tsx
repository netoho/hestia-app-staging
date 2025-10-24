'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, Send, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PolicyStatus } from '@/types/policy';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;
  guarantorType?: string;
  totalPrice?: number;
  packageId?: string;
  package?: {
    name: string;
    price: number;
  };
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  activatedAt?: string;
  tenant?: {
    id: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    informationComplete: boolean;
    completedAt?: string;
  };
  landlords?: Array<{
    id: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    isCompany?: boolean;
    isPrimary?: boolean;
    informationComplete: boolean;
    completedAt?: string;
  }>;
  jointObligors?: Array<{
    id: string;
    fullName: string;
    email: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    id: string;
    fullName: string;
    email: string;
    informationComplete: boolean;
  }>;
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function PoliciesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPolicies();
  }, [page, statusFilter]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/policies?${params}`);
      const data = await response.json();

      if (data.policies) {
        setPolicies(data.policies);
        setTotalPages(data.pagination.totalPages);
      } else if (data.success && data.data) {
        // Fallback for wrapped response
        setPolicies(data.data.policies || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PolicyStatus) => {
    const statusConfig = {
      [PolicyStatus.DRAFT]: { label: 'Borrador', variant: 'secondary' as const },
      [PolicyStatus.COLLECTING_INFO]: { label: 'Recopilando Info', variant: 'default' as const },
      [PolicyStatus.UNDER_INVESTIGATION]: { label: 'En Investigación', variant: 'default' as const },
      [PolicyStatus.INVESTIGATION_REJECTED]: { label: 'Rechazado', variant: 'destructive' as const },
      [PolicyStatus.PENDING_APPROVAL]: { label: 'Pendiente Aprobación', variant: 'default' as const },
      [PolicyStatus.APPROVED]: { label: 'Aprobado', variant: 'default' as const },
      [PolicyStatus.CONTRACT_PENDING]: { label: 'Contrato Pendiente', variant: 'default' as const },
      [PolicyStatus.CONTRACT_SIGNED]: { label: 'Contrato Firmado', variant: 'default' as const },
      [PolicyStatus.ACTIVE]: { label: 'Activa', variant: 'default' as const },
      [PolicyStatus.EXPIRED]: { label: 'Expirada', variant: 'secondary' as const },
      [PolicyStatus.CANCELLED]: { label: 'Cancelada', variant: 'destructive' as const },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleSendInvitations = async (policyId: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}/send-invitations`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        // Refresh policies
        fetchPolicies();
        alert('Invitaciones enviadas exitosamente');
      } else {
        alert('Error al enviar invitaciones');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Error al enviar invitaciones');
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const primaryLandlord = policy.landlords?.find(l => l.isPrimary) || policy.landlords?.[0];
    return (
      policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.tenant?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.tenant?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      primaryLandlord?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      primaryLandlord?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      primaryLandlord?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Gestión de Protecciones</h1>
        <Button
          onClick={() => router.push('/dashboard/policies/new')}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Protección
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar protección, dirección o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={PolicyStatus.DRAFT}>Borrador</SelectItem>
                <SelectItem value={PolicyStatus.COLLECTING_INFO}>Recopilando Info</SelectItem>
                <SelectItem value={PolicyStatus.UNDER_INVESTIGATION}>En Investigación</SelectItem>
                <SelectItem value={PolicyStatus.APPROVED}>Aprobado</SelectItem>
                <SelectItem value={PolicyStatus.ACTIVE}>Activa</SelectItem>
                <SelectItem value={PolicyStatus.EXPIRED}>Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No se encontraron protecciones</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredPolicies.map((policy) => {
              // Calculate completion progress
              let completedActors = 0;
              let totalActors = 0;

              // Count all landlords
              const landlordCount = policy.landlords?.length || 1;
              totalActors += landlordCount;
              completedActors += policy.landlords?.filter(l => l.informationComplete).length || 0;

              if (policy.tenant) {
                totalActors++;
                if (policy.tenant.informationComplete) completedActors++;
              } else {
                totalActors++;
              }

              // Count guarantors based on type
              if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
                const joCount = policy.jointObligors?.length || 0;
                totalActors += joCount || 1;
                completedActors += policy.jointObligors?.filter(jo => jo.informationComplete).length || 0;
              }

              if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
                const avalCount = policy.avals?.length || 0;
                totalActors += avalCount || 1;
                completedActors += policy.avals?.filter(a => a.informationComplete).length || 0;
              }

              const progressPercentage = totalActors > 0 ? Math.round((completedActors / totalActors) * 100) : 0;
              const primaryLandlord = policy.landlords?.find(l => l.isPrimary) || policy.landlords?.[0];

              return (
                <Card key={policy.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{policy.policyNumber}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {policy.createdAt && format(new Date(policy.createdAt), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                      {getStatusBadge(policy.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Property Info */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Propiedad</p>
                      <p className="text-sm font-medium">{policy.propertyAddress}</p>
                      {policy.propertyType && (
                        <p className="text-xs text-muted-foreground">{policy.propertyType}</p>
                      )}
                      <p className="text-sm mt-1">
                        ${policy.rentAmount?.toLocaleString('es-MX')} /mes
                      </p>
                    </div>

                    {/* Actors Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Tenant */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Inquilino</p>
                        {policy.tenant ? (
                          <div>
                            <p className="text-sm truncate">
                              {policy.tenant.fullName || policy.tenant.companyName || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {policy.tenant.informationComplete ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-orange-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {policy.tenant.informationComplete ? 'Completo' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Pendiente</p>
                        )}
                      </div>

                      {/* Landlord */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Arrendador</p>
                        {primaryLandlord ? (
                          <div>
                            <p className="text-sm truncate">
                              {primaryLandlord.fullName || primaryLandlord.companyName || 'Sin nombre'}
                              {(policy.landlords?.length || 0) > 1 && (
                                <span className="text-xs text-muted-foreground"> (+{(policy.landlords?.length || 0) - 1})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {primaryLandlord.informationComplete ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-orange-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {policy.landlords?.filter(l => l.informationComplete).length || 0}/{policy.landlords?.length || 0} completos
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Pendiente</p>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                        <span className="text-xs font-semibold">{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            progressPercentage === 100
                              ? 'bg-green-500'
                              : progressPercentage > 0
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {completedActors}/{totalActors} actores completados
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Precio Total</p>
                        <p className="text-sm font-semibold">
                          ${policy.totalPrice?.toLocaleString('es-MX')}
                        </p>
                        {policy.package && (
                          <p className="text-xs text-muted-foreground">{policy.package.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Protección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Arrendador</TableHead>
                  <TableHead>Obligado S. / Aval</TableHead>
                  <TableHead>Precio Total</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => {
                  // Calculate completion progress
                  let completedActors = 0;
                  let totalActors = 0;

                  // Count all landlords
                  const landlordCount = policy.landlords?.length || 1; // At least 1 required
                  totalActors += landlordCount;
                  completedActors += policy.landlords?.filter(l => l.informationComplete).length || 0;

                  if (policy.tenant) {
                    totalActors++;
                    if (policy.tenant.informationComplete) completedActors++;
                  } else {
                    totalActors++; // Tenant is required
                  }

                  // Count guarantors based on type
                  if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
                    const joCount = policy.jointObligors?.length || 0;
                    totalActors += joCount || 1; // At least 1 required
                    completedActors += policy.jointObligors?.filter(jo => jo.informationComplete).length || 0;
                  }

                  if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
                    const avalCount = policy.avals?.length || 0;
                    totalActors += avalCount || 1; // At least 1 required
                    completedActors += policy.avals?.filter(a => a.informationComplete).length || 0;
                  }

                  const progressPercentage = totalActors > 0 ? Math.round((completedActors / totalActors) * 100) : 0;

                  return (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{policy.policyNumber}</div>
                          <div className="text-xs text-gray-500">
                            {policy.createdAt && format(new Date(policy.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(policy.status)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{policy.propertyAddress}</div>
                          {policy.propertyType && (
                            <div className="text-xs text-gray-500">{policy.propertyType}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            ${policy.rentAmount?.toLocaleString('es-MX')} /mes
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {policy.tenant ? (
                          <div>
                            <div className="text-sm">
                              {policy.tenant.fullName || policy.tenant.companyName || 'Sin nombre'}
                            </div>
                            <div className="text-xs text-gray-500">{policy.tenant.email}</div>
                            {policy.tenant.informationComplete ? (
                              <CheckCircle className="inline h-3 w-3 text-green-500 mt-1" />
                            ) : (
                              <Clock className="inline h-3 w-3 text-orange-500 mt-1" />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const primaryLandlord = policy.landlords?.find(l => l.isPrimary) || policy.landlords?.[0];
                          const landlordCount = policy.landlords?.length || 0;

                          if (primaryLandlord) {
                            return (
                              <div>
                                <div className="text-sm">
                                  {primaryLandlord.fullName || primaryLandlord.companyName || 'Sin nombre'}
                                  {landlordCount > 1 && (
                                    <span className="text-xs text-gray-500"> (+{landlordCount - 1})</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{primaryLandlord.email}</div>
                                {primaryLandlord.informationComplete ? (
                                  <CheckCircle className="inline h-3 w-3 text-green-500 mt-1" />
                                ) : (
                                  <Clock className="inline h-3 w-3 text-orange-500 mt-1" />
                                )}
                                {landlordCount > 1 && (
                                  <div className="text-xs text-gray-500">
                                    {policy.landlords?.filter(l => l.informationComplete).length}/{landlordCount} completos
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <span className="text-gray-400">Pendiente</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {policy.guarantorType === 'NONE' && 'Sin garantías'}
                          {policy.guarantorType === 'JOINT_OBLIGOR' && (
                            <div>
                              <span>Obligado S.</span>
                              {policy.jointObligors && policy.jointObligors.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {policy.jointObligors.filter(jo => jo.informationComplete).length}/{policy.jointObligors.length} completos
                                </div>
                              )}
                            </div>
                          )}
                          {policy.guarantorType === 'AVAL' && (
                            <div>
                              <span>Aval</span>
                              {policy.avals && policy.avals.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {policy.avals.filter(a => a.informationComplete).length}/{policy.avals.length} completos
                                </div>
                              )}
                            </div>
                          )}
                          {policy.guarantorType === 'BOTH' && (
                            <div>
                              <span>Ambos</span>
                              <div className="text-xs text-gray-500">
                                OS: {policy.jointObligors?.filter(jo => jo.informationComplete).length || 0}/{policy.jointObligors?.length || 0}
                                {' '}
                                A: {policy.avals?.filter(a => a.informationComplete).length || 0}/{policy.avals?.length || 0}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">
                            ${policy.totalPrice?.toLocaleString('es-MX')}
                          </div>
                          {policy.package && (
                            <div className="text-xs text-gray-500">{policy.package.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-20">
                          <div className="text-xs text-gray-600 mb-1">{progressPercentage}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                progressPercentage === 100
                                  ? 'bg-green-500'
                                  : progressPercentage > 0
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {completedActors}/{totalActors} actores
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
