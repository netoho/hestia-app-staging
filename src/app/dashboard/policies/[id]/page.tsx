'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Upload,
  User,
  Users,
  Building,
  Home,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  Edit,
  Eye,
  AlertCircle,
  ChevronRight,
  Activity,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PolicyDetails {
  id: string;
  policyNumber: string;
  status: string;

  // Property Information
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;

  // Guarantor Configuration
  guarantorType: string;

  // Package/Pricing
  packageId?: string;
  package?: {
    id: string;
    name: string;
    price: number;
    features?: string;
  };
  totalPrice: number;
  tenantPercentage?: number;
  landlordPercentage?: number;

  // Actors
  landlord?: {
    id: string;
    isCompany?: boolean;
    fullName: string;
    rfc?: string;
    email: string;
    phone: string;
    address?: string;
    bankName?: string;
    accountNumber?: string;
    clabe?: string;
    occupation?: string;
    companyName?: string;
    monthlyIncome?: number;
    informationComplete: boolean;
    completedAt?: string;
    documents?: Array<{
      id: string;
      category: string;
      documentType: string;
      originalName: string;
      verifiedAt?: string;
    }>;
  };

  tenant?: {
    id: string;
    tenantType?: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone: string;
    nationality?: string;
    curp?: string;
    passport?: string;
    employmentStatus?: string;
    occupation?: string;
    monthlyIncome?: number;
    informationComplete: boolean;
    completedAt?: string;
    references?: Array<{
      name: string;
      phone: string;
      email?: string;
      relationship: string;
    }>;
    documents?: Array<{
      id: string;
      category: string;
      documentType: string;
      originalName: string;
      verifiedAt?: string;
    }>;
  };

  jointObligors?: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    nationality?: string;
    curp?: string;
    passport?: string;
    address?: string;
    employmentStatus?: string;
    occupation?: string;
    companyName?: string;
    monthlyIncome?: number;
    informationComplete: boolean;
    completedAt?: string;
    references?: Array<{
      name: string;
      phone: string;
      email?: string;
      relationship: string;
    }>;
    documents?: Array<{
      id: string;
      category: string;
      documentType: string;
      originalName: string;
    }>;
  }>;

  avals?: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    nationality?: string;
    curp?: string;
    passport?: string;
    address?: string;
    employmentStatus?: string;
    occupation?: string;
    companyName?: string;
    monthlyIncome?: number;
    propertyAddress?: string;
    propertyValue?: number;
    propertyDeedNumber?: string;
    informationComplete: boolean;
    completedAt?: string;
    references?: Array<{
      name: string;
      phone: string;
      email?: string;
      relationship: string;
    }>;
    documents?: Array<{
      id: string;
      category: string;
      documentType: string;
      originalName: string;
    }>;
  }>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  activatedAt?: string;

  // Activities
  activities?: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    performedBy?: {
      name?: string;
      email: string;
    };
    performedByActor?: string;
  }>;

  // Documents
  documents?: Array<{
    id: string;
    category: string;
    originalName: string;
    fileSize: number;
    createdAt: string;
  }>;
}

export default function PolicyDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [policyId, setPolicyId] = useState<string>('');
  const [policy, setPolicy] = useState<PolicyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('overview');

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (policyId) {
      fetchPolicyDetails();
    }
  }, [policyId]);

  const fetchPolicyDetails = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}`);
      if (!response.ok) throw new Error('Failed to fetch policy');

      const data = await response.json();
      setPolicy(data.data || data);
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitations = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/send-invitations`, {
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Borrador', color: 'bg-gray-500' },
      COLLECTING_INFO: { label: 'Recopilando Info', color: 'bg-blue-500' },
      UNDER_INVESTIGATION: { label: 'En Investigación', color: 'bg-yellow-500' },
      INVESTIGATION_REJECTED: { label: 'Rechazado', color: 'bg-red-500' },
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', color: 'bg-orange-500' },
      APPROVED: { label: 'Aprobado', color: 'bg-green-500' },
      CONTRACT_PENDING: { label: 'Contrato Pendiente', color: 'bg-purple-500' },
      CONTRACT_SIGNED: { label: 'Contrato Firmado', color: 'bg-indigo-500' },
      ACTIVE: { label: 'Activa', color: 'bg-green-600' },
      EXPIRED: { label: 'Expirada', color: 'bg-gray-600' },
      CANCELLED: { label: 'Cancelada', color: 'bg-red-600' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };

    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-MX')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Póliza no encontrada</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate progress
  let completedActors = 0;
  let totalActors = 2; // Landlord and Tenant are always required

  if (policy.landlord?.informationComplete) completedActors++;
  if (policy.tenant?.informationComplete) completedActors++;

  if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
    totalActors += policy.jointObligors?.length || 1;
    completedActors += policy.jointObligors?.filter(jo => jo.informationComplete).length || 0;
  }

  if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
    totalActors += policy.avals?.length || 1;
    completedActors += policy.avals?.filter(a => a.informationComplete).length || 0;
  }

  const progressPercentage = Math.round((completedActors / totalActors) * 100);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/policies')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Póliza {policy.policyNumber}</h1>
            <p className="text-gray-600 mt-1">{policy.propertyAddress}</p>
          </div>
          {getStatusBadge(policy.status)}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/policies/${policyId}/progress`)}
          >
            <Activity className="mr-2 h-4 w-4" />
            Ver Progreso
          </Button>
          {(policy.status === 'DRAFT' || policy.status === 'COLLECTING_INFO') && (
            <Button onClick={handleSendInvitations}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Invitaciones
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Progreso de Información</p>
              <p className="text-2xl font-bold">{progressPercentage}% Completado</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{completedActors} de {totalActors} actores</p>
              <p className="text-xs text-gray-500 mt-1">han completado su información</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Garantías</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Actividad</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Información del Inmueble
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="font-medium">{policy.propertyAddress}</p>
                </div>
                {policy.propertyType && (
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Propiedad</p>
                    <p className="font-medium">{policy.propertyType}</p>
                  </div>
                )}
                {policy.propertyDescription && (
                  <div>
                    <p className="text-sm text-gray-600">Descripción</p>
                    <p className="font-medium">{policy.propertyDescription}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Renta Mensual</p>
                  <p className="font-medium text-lg">{formatCurrency(policy.rentAmount)}</p>
                </div>
                {policy.contractLength && (
                  <div>
                    <p className="text-sm text-gray-600">Duración del Contrato</p>
                    <p className="font-medium">{policy.contractLength} meses</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Package & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Plan y Precio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {policy.package && (
                  <div>
                    <p className="text-sm text-gray-600">Plan Seleccionado</p>
                    <p className="font-medium">{policy.package.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Precio Total</p>
                  <p className="font-medium text-lg text-green-600">{formatCurrency(policy.totalPrice)}</p>
                </div>
                {policy.tenantPercentage !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">División del Pago</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm">Inquilino: {policy.tenantPercentage}%</span>
                      <span className="text-sm">Arrendador: {policy.landlordPercentage}%</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div
                        className="h-2 bg-blue-500 rounded-l"
                        style={{ width: `${policy.tenantPercentage}%` }}
                      />
                      <div
                        className="h-2 bg-green-500 rounded-r"
                        style={{ width: `${policy.landlordPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Tipo de Garantía</p>
                  <p className="font-medium">
                    {policy.guarantorType === 'NONE' && 'Sin garantías'}
                    {policy.guarantorType === 'JOINT_OBLIGOR' && 'Obligado Solidario'}
                    {policy.guarantorType === 'AVAL' && 'Aval'}
                    {policy.guarantorType === 'BOTH' && 'Obligado Solidario y Aval'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Línea de Tiempo del Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Póliza Creada</p>
                    <p className="text-sm text-gray-600">{formatDateTime(policy.createdAt)}</p>
                  </div>
                </div>
                {policy.submittedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Enviada para Investigación</p>
                      <p className="text-sm text-gray-600">{formatDateTime(policy.submittedAt)}</p>
                    </div>
                  </div>
                )}
                {policy.activatedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Póliza Activada</p>
                      <p className="text-sm text-gray-600">{formatDateTime(policy.activatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Landlord Tab */}
        <TabsContent value="landlord" className="space-y-6">
          {policy.landlord ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Información del Arrendador
                    </div>
                    <div className="flex items-center gap-2">
                      {policy.landlord.informationComplete ? (
                        <Badge className="bg-green-500 text-white">Completo</Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Información Personal</h3>
                      {policy.landlord.isCompany && (
                        <div>
                          <p className="text-sm text-gray-600">Tipo</p>
                          <Badge variant="outline">Empresa</Badge>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">{policy.landlord.isCompany ? 'Razón Social' : 'Nombre Completo'}</p>
                        <p className="font-medium">{policy.landlord.fullName}</p>
                      </div>
                      {policy.landlord.rfc && (
                        <div>
                          <p className="text-sm text-gray-600">RFC</p>
                          <p className="font-medium">{policy.landlord.rfc}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {policy.landlord.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {policy.landlord.phone}
                        </p>
                      </div>
                      {policy.landlord.address && (
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="font-medium flex items-start gap-1">
                            <MapPin className="h-4 w-4 mt-0.5" />
                            {policy.landlord.address}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(policy.landlord.bankName || policy.landlord.clabe) && (
                        <>
                          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Información Bancaria</h3>
                          {policy.landlord.bankName && (
                            <div>
                              <p className="text-sm text-gray-600">Banco</p>
                              <p className="font-medium">{policy.landlord.bankName}</p>
                            </div>
                          )}
                          {policy.landlord.accountNumber && (
                            <div>
                              <p className="text-sm text-gray-600">Número de Cuenta</p>
                              <p className="font-medium">{policy.landlord.accountNumber}</p>
                            </div>
                          )}
                          {policy.landlord.clabe && (
                            <div>
                              <p className="text-sm text-gray-600">CLABE</p>
                              <p className="font-medium font-mono">{policy.landlord.clabe}</p>
                            </div>
                          )}
                        </>
                      )}

                      {!policy.landlord.isCompany && (policy.landlord.occupation || policy.landlord.companyName) && (
                        <>
                          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Información Laboral</h3>
                          {policy.landlord.occupation && (
                            <div>
                              <p className="text-sm text-gray-600">Ocupación</p>
                              <p className="font-medium">{policy.landlord.occupation}</p>
                            </div>
                          )}
                          {policy.landlord.companyName && (
                            <div>
                              <p className="text-sm text-gray-600">Empresa</p>
                              <p className="font-medium">{policy.landlord.companyName}</p>
                            </div>
                          )}
                          {policy.landlord.monthlyIncome && (
                            <div>
                              <p className="text-sm text-gray-600">Ingreso Mensual</p>
                              <p className="font-medium">{formatCurrency(policy.landlord.monthlyIncome)}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {policy.landlord.documents && policy.landlord.documents.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">Documentos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {policy.landlord.documents.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">{doc.documentType}</p>
                                <p className="text-xs text-gray-500">{doc.originalName}</p>
                              </div>
                            </div>
                            {doc.verifiedAt && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No se ha capturado información del arrendador</p>
                <Button onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Capturar Información
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tenant Tab */}
        <TabsContent value="tenant" className="space-y-6">
          {policy.tenant ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Inquilino
                  </div>
                  {policy.tenant.informationComplete ? (
                    <Badge className="bg-green-500 text-white">Completo</Badge>
                  ) : (
                    <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Información Personal</h3>
                    {policy.tenant.tenantType && (
                      <div>
                        <p className="text-sm text-gray-600">Tipo</p>
                        <Badge variant="outline">
                          {policy.tenant.tenantType === 'COMPANY' ? 'Empresa' : 'Persona Física'}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Nombre</p>
                      <p className="font-medium">{policy.tenant.fullName || policy.tenant.companyName || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {policy.tenant.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {policy.tenant.phone}
                      </p>
                    </div>
                    {policy.tenant.nationality && (
                      <div>
                        <p className="text-sm text-gray-600">Nacionalidad</p>
                        <p className="font-medium">{policy.tenant.nationality === 'MEXICAN' ? 'Mexicana' : 'Extranjera'}</p>
                      </div>
                    )}
                    {policy.tenant.curp && (
                      <div>
                        <p className="text-sm text-gray-600">CURP</p>
                        <p className="font-medium font-mono">{policy.tenant.curp}</p>
                      </div>
                    )}
                    {policy.tenant.passport && (
                      <div>
                        <p className="text-sm text-gray-600">Pasaporte</p>
                        <p className="font-medium">{policy.tenant.passport}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {policy.tenant.employmentStatus && (
                      <>
                        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Información Laboral</h3>
                        <div>
                          <p className="text-sm text-gray-600">Situación Laboral</p>
                          <p className="font-medium">{policy.tenant.employmentStatus}</p>
                        </div>
                        {policy.tenant.occupation && (
                          <div>
                            <p className="text-sm text-gray-600">Ocupación</p>
                            <p className="font-medium">{policy.tenant.occupation}</p>
                          </div>
                        )}
                        {policy.tenant.monthlyIncome && (
                          <div>
                            <p className="text-sm text-gray-600">Ingreso Mensual</p>
                            <p className="font-medium">{formatCurrency(policy.tenant.monthlyIncome)}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {policy.tenant.references && policy.tenant.references.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">Referencias Personales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {policy.tenant.references.map((ref, index) => (
                        <Card key={index} className="p-3">
                          <p className="font-medium text-sm">{ref.name}</p>
                          <p className="text-xs text-gray-600">{ref.relationship}</p>
                          <p className="text-xs text-gray-600">{ref.phone}</p>
                          {ref.email && <p className="text-xs text-gray-600">{ref.email}</p>}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {policy.tenant.documents && policy.tenant.documents.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">Documentos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {policy.tenant.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{doc.documentType}</p>
                              <p className="text-xs text-gray-500">{doc.originalName}</p>
                            </div>
                          </div>
                          {doc.verifiedAt && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se ha capturado información del inquilino</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Guarantors Tab */}
        <TabsContent value="guarantors" className="space-y-6">
          {/* Joint Obligors */}
          {(policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Obligados Solidarios
              </h3>
              {policy.jointObligors && policy.jointObligors.length > 0 ? (
                policy.jointObligors.map((jo) => (
                  <Card key={jo.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{jo.fullName}</span>
                        {jo.informationComplete ? (
                          <Badge className="bg-green-500 text-white">Completo</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{jo.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Teléfono</p>
                            <p className="font-medium">{jo.phone}</p>
                          </div>
                          {jo.nationality && (
                            <div>
                              <p className="text-sm text-gray-600">Nacionalidad</p>
                              <p className="font-medium">{jo.nationality === 'MEXICAN' ? 'Mexicana' : 'Extranjera'}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {jo.occupation && (
                            <div>
                              <p className="text-sm text-gray-600">Ocupación</p>
                              <p className="font-medium">{jo.occupation}</p>
                            </div>
                          )}
                          {jo.companyName && (
                            <div>
                              <p className="text-sm text-gray-600">Empresa</p>
                              <p className="font-medium">{jo.companyName}</p>
                            </div>
                          )}
                          {jo.monthlyIncome && (
                            <div>
                              <p className="text-sm text-gray-600">Ingreso Mensual</p>
                              <p className="font-medium">{formatCurrency(jo.monthlyIncome)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {jo.references && jo.references.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Referencias</p>
                          <div className="flex gap-2 flex-wrap">
                            {jo.references.map((ref, idx) => (
                              <Badge key={idx} variant="outline">
                                {ref.name} - {ref.relationship}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {jo.documents && jo.documents.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Documentos</p>
                          <div className="flex gap-2 flex-wrap">
                            {jo.documents.map(doc => (
                              <Badge key={doc.id} variant="secondary">
                                <FileText className="h-3 w-3 mr-1" />
                                {doc.documentType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-600">No se han registrado obligados solidarios</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Avals */}
          {(policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Avales
              </h3>
              {policy.avals && policy.avals.length > 0 ? (
                policy.avals.map((aval) => (
                  <Card key={aval.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{aval.fullName}</span>
                        {aval.informationComplete ? (
                          <Badge className="bg-green-500 text-white">Completo</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{aval.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Teléfono</p>
                            <p className="font-medium">{aval.phone}</p>
                          </div>
                          {aval.occupation && (
                            <div>
                              <p className="text-sm text-gray-600">Ocupación</p>
                              <p className="font-medium">{aval.occupation}</p>
                            </div>
                          )}
                          {aval.monthlyIncome && (
                            <div>
                              <p className="text-sm text-gray-600">Ingreso Mensual</p>
                              <p className="font-medium">{formatCurrency(aval.monthlyIncome)}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Propiedad en Garantía</h4>
                          {aval.propertyAddress && (
                            <div>
                              <p className="text-sm text-gray-600">Dirección</p>
                              <p className="font-medium">{aval.propertyAddress}</p>
                            </div>
                          )}
                          {aval.propertyValue && (
                            <div>
                              <p className="text-sm text-gray-600">Valor</p>
                              <p className="font-medium">{formatCurrency(aval.propertyValue)}</p>
                            </div>
                          )}
                          {aval.propertyDeedNumber && (
                            <div>
                              <p className="text-sm text-gray-600">Número de Escritura</p>
                              <p className="font-medium">{aval.propertyDeedNumber}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {aval.references && aval.references.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Referencias</p>
                          <div className="flex gap-2 flex-wrap">
                            {aval.references.map((ref, idx) => (
                              <Badge key={idx} variant="outline">
                                {ref.name} - {ref.relationship}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {aval.documents && aval.documents.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2">Documentos</p>
                          <div className="flex gap-2 flex-wrap">
                            {aval.documents.map(doc => (
                              <Badge key={doc.id} variant="secondary">
                                <FileText className="h-3 w-3 mr-1" />
                                {doc.documentType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-600">No se han registrado avales</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {policy.guarantorType === 'NONE' && (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Esta póliza no requiere garantías adicionales</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de la Póliza</CardTitle>
              <CardDescription>
                Todos los documentos relacionados con esta póliza
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policy.documents && policy.documents.length > 0 ? (
                <div className="space-y-3">
                  {policy.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{doc.originalName}</p>
                          <p className="text-sm text-gray-500">
                            {doc.category} • {(doc.fileSize / 1024).toFixed(2)} KB • {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No hay documentos cargados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividad</CardTitle>
              <CardDescription>
                Registro de todas las acciones realizadas en esta póliza
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policy.activities && policy.activities.length > 0 ? (
                <div className="space-y-4">
                  {policy.activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.performedBy?.name || activity.performedBy?.email || activity.performedByActor || 'Sistema'} •{' '}
                          {formatDateTime(activity.createdAt)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}