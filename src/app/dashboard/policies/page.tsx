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
  rentAmount: number;
  startDate: string;
  endDate: string;
  tenant?: {
    firstName: string;
    lastName: string;
    email: string;
    informationCompletedAt?: string;
  };
  landlord?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
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

      if (data.success) {
        setPolicies(data.data.policies);
        setTotalPages(data.data.pagination.totalPages);
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

  const filteredPolicies = policies.filter(policy =>
    policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.tenant?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.landlord?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Pólizas</h1>
        <Button onClick={() => router.push('/dashboard/policies/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Póliza
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número de póliza, dirección o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No se encontraron pólizas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Póliza</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Arrendador</TableHead>
                  <TableHead>Renta Mensual</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.policyNumber}</TableCell>
                    <TableCell>{getStatusBadge(policy.status)}</TableCell>
                    <TableCell>{policy.propertyAddress}</TableCell>
                    <TableCell>
                      {policy.tenant ? (
                        <div>
                          <div>{`${policy.tenant.firstName} ${policy.tenant.lastName}`}</div>
                          <div className="text-sm text-gray-500">{policy.tenant.email}</div>
                          {policy.tenant.informationCompletedAt && (
                            <CheckCircle className="inline h-3 w-3 text-green-500 ml-1" />
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {policy.landlord ? (
                        <div>
                          <div>{`${policy.landlord.firstName} ${policy.landlord.lastName}`}</div>
                          <div className="text-sm text-gray-500">{policy.landlord.email}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>${policy.rentAmount.toLocaleString('es-MX')}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(policy.startDate), 'dd/MM/yyyy', { locale: es })}
                        <br />
                        {format(new Date(policy.endDate), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {policy.status === PolicyStatus.DRAFT && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendInvitations(policy.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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