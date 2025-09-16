'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  User,
  Users,
  Building,
  Home,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Edit,
  AlertCircle,
  Activity,
  Shield,
  RefreshCw,
  Check,
  X,
  Eye,
  Calendar,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { t } from '@/lib/i18n';

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

  // Actors with verification status
  landlord?: any;
  tenant?: any;
  jointObligors?: any[];
  avals?: any[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  activatedAt?: string;
  approvedAt?: string;

  // Activities
  activities?: any[];

  // Documents
  documents?: any[];

  // User info
  createdBy?: {
    name?: string;
    email: string;
  };
}

export default function UnifiedPolicyDetailsPage({
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
  const [sending, setSending] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    actorType: string;
    actorId: string;
    actorName: string;
  }>({ open: false, actorType: '', actorId: '', actorName: '' });
  const [rejectionReason, setRejectionReason] = useState('');

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
      setSending('all');
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
    } finally {
      setSending(null);
    }
  };

  const sendIndividualInvitation = async (actorType: string, actorId: string) => {
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
      await fetchPolicyDetails();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Error al enviar la invitación');
    } finally {
      setSending(null);
    }
  };

  const approveActor = async (actorType: string, actorId: string) => {
    setApproving(actorId);
    try {
      const response = await fetch(`/api/policies/${policyId}/actors/${actorType}/${actorId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve actor');

      alert('Actor aprobado exitosamente');
      await fetchPolicyDetails();
    } catch (error) {
      console.error('Error approving actor:', error);
      alert('Error al aprobar el actor');
    } finally {
      setApproving(null);
    }
  };

  const rejectActor = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón de rechazo');
      return;
    }

    setApproving(rejectDialog.actorId);
    try {
      const response = await fetch(`/api/policies/${policyId}/actors/${rejectDialog.actorType}/${rejectDialog.actorId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject actor');

      alert('Actor rechazado y notificado');
      setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
      setRejectionReason('');
      await fetchPolicyDetails();
    } catch (error) {
      console.error('Error rejecting actor:', error);
      alert('Error al rechazar el actor');
    } finally {
      setApproving(null);
    }
  };

  const approvePolicy = async () => {
    if (!confirm('¿Estás seguro de que deseas aprobar esta póliza?')) return;

    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve policy');

      alert('Póliza aprobada exitosamente');
      await fetchPolicyDetails();
    } catch (error) {
      console.error('Error approving policy:', error);
      alert('Error al aprobar la póliza');
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

  const getVerificationBadge = (status: string) => {
    const config = {
      PENDING: { label: t.pages.policies.actorVerification.pending, color: 'bg-gray-500', icon: Clock },
      APPROVED: { label: t.pages.policies.actorVerification.approved, color: 'bg-green-500', icon: CheckCircle2 },
      REJECTED: { label: t.pages.policies.actorVerification.rejected, color: 'bg-red-500', icon: XCircle },
      IN_REVIEW: { label: t.pages.policies.actorVerification.inReview, color: 'bg-yellow-500', icon: Eye },
    };

    const badgeConfig = config[status as keyof typeof config] || config.PENDING;
    const Icon = badgeConfig.icon;

    return (
      <Badge className={`${badgeConfig.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badgeConfig.label}
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

  const calculateProgress = () => {
    if (!policy) return 0;

    let completedActors = 0;
    let totalActors = 2; // Landlord and Tenant are always required

    if (policy.landlord?.informationComplete) completedActors++;
    if (policy.tenant?.informationComplete) completedActors++;

    if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
      totalActors += policy.jointObligors?.length || 1;
      completedActors += policy.jointObligors?.filter((jo: any) => jo.informationComplete).length || 0;
    }

    if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
      totalActors += policy.avals?.length || 1;
      completedActors += policy.avals?.filter((a: any) => a.informationComplete).length || 0;
    }

    return Math.round((completedActors / totalActors) * 100);
  };

  const checkAllActorsApproved = () => {
    if (!policy) return false;

    const landlordApproved = policy.landlord?.verificationStatus === 'APPROVED';
    const tenantApproved = policy.tenant?.verificationStatus === 'APPROVED';

    const jointObligorsApproved = !policy.jointObligors?.length ||
      policy.jointObligors.every((jo: any) => jo.verificationStatus === 'APPROVED');

    const avalsApproved = !policy.avals?.length ||
      policy.avals.every((a: any) => a.verificationStatus === 'APPROVED');

    return landlordApproved && tenantApproved && jointObligorsApproved && avalsApproved;
  };

  const isStaffOrAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF';

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

  const progressPercentage = calculateProgress();
  const allActorsApproved = checkAllActorsApproved();

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
          {isStaffOrAdmin && allActorsApproved && policy.status === 'UNDER_INVESTIGATION' && (
            <Button
              onClick={approvePolicy}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t.pages.policies.approvePolicy}
            </Button>
          )}

          {(policy.status === 'DRAFT' || policy.status === 'COLLECTING_INFO') && (
            <Button
              onClick={handleSendInvitations}
              variant="default"
              disabled={sending === 'all'}
            >
              {sending === 'all' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.sendInvitations}
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
              <p className="text-sm text-gray-600">
                {policy.landlord?.informationComplete ? 1 : 0} +
                {policy.tenant?.informationComplete ? 1 : 0} +
                {policy.jointObligors?.filter((jo: any) => jo.informationComplete).length || 0} +
                {policy.avals?.filter((a: any) => a.informationComplete).length || 0} actores completados
              </p>
              {isStaffOrAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  {allActorsApproved
                    ? t.pages.policies.actorVerification.allActorsApproved
                    : t.pages.policies.actorVerification.pendingActorApprovals}
                </p>
              )}
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className={`grid w-full ${isStaffOrAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Garantías</TabsTrigger>
          {isStaffOrAdmin && (
            <TabsTrigger value="verification">Verificación</TabsTrigger>
          )}
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
                {policy.approvedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Póliza Aprobada</p>
                      <p className="text-sm text-gray-600">{formatDateTime(policy.approvedAt)}</p>
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
                        {policy.landlord.documents.map((doc: any) => (
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
                      {policy.tenant.references.map((ref: any, index: number) => (
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
                      {policy.tenant.documents.map((doc: any) => (
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
                policy.jointObligors.map((jo: any) => (
                  <Card key={jo.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{jo.fullName}</span>
                        <div className="flex items-center gap-2">
                          {getVerificationBadge(jo.verificationStatus || 'PENDING')}
                          {jo.informationComplete ? (
                            <Badge className="bg-green-500 text-white">Completo</Badge>
                          ) : (
                            <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                          )}
                        </div>
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
                            {jo.references.map((ref: any, idx: number) => (
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
                            {jo.documents.map((doc: any) => (
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
                policy.avals.map((aval: any) => (
                  <Card key={aval.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{aval.fullName}</span>
                        <div className="flex items-center gap-2">
                          {getVerificationBadge(aval.verificationStatus || 'PENDING')}
                          {aval.informationComplete ? (
                            <Badge className="bg-green-500 text-white">Completo</Badge>
                          ) : (
                            <Badge className="bg-orange-500 text-white">Pendiente</Badge>
                          )}
                        </div>
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
                            {aval.references.map((ref: any, idx: number) => (
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
                            {aval.documents.map((doc: any) => (
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

        {/* Verification Tab - New for Staff/Admin */}
        {isStaffOrAdmin && (
          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.pages.policies.actorVerification.title}</CardTitle>
                <CardDescription>{t.pages.policies.actorVerification.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Landlord Verification */}
                {policy.landlord && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        <span className="font-medium">Arrendador: {policy.landlord.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge(policy.landlord.verificationStatus || 'PENDING')}
                        {policy.landlord.informationComplete && policy.landlord.verificationStatus === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => approveActor('landlord', policy.landlord.id)}
                              disabled={approving === policy.landlord.id}
                            >
                              {approving === policy.landlord.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {t.pages.policies.actorVerification.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600"
                              onClick={() => setRejectDialog({
                                open: true,
                                actorType: 'landlord',
                                actorId: policy.landlord.id,
                                actorName: policy.landlord.fullName
                              })}
                            >
                              <X className="h-4 w-4" />
                              {t.pages.policies.actorVerification.reject}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {policy.landlord.rejectionReason && (
                      <Alert className="mt-2 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Razón de rechazo</AlertTitle>
                        <AlertDescription>{policy.landlord.rejectionReason}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Tenant Verification */}
                {policy.tenant && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <span className="font-medium">
                          Inquilino: {policy.tenant.fullName || policy.tenant.companyName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge(policy.tenant.verificationStatus || 'PENDING')}
                        {policy.tenant.informationComplete && policy.tenant.verificationStatus === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => approveActor('tenant', policy.tenant.id)}
                              disabled={approving === policy.tenant.id}
                            >
                              {approving === policy.tenant.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {t.pages.policies.actorVerification.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600"
                              onClick={() => setRejectDialog({
                                open: true,
                                actorType: 'tenant',
                                actorId: policy.tenant.id,
                                actorName: policy.tenant.fullName || policy.tenant.companyName
                              })}
                            >
                              <X className="h-4 w-4" />
                              {t.pages.policies.actorVerification.reject}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {policy.tenant.rejectionReason && (
                      <Alert className="mt-2 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Razón de rechazo</AlertTitle>
                        <AlertDescription>{policy.tenant.rejectionReason}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Joint Obligors Verification */}
                {policy.jointObligors?.map((jo: any) => (
                  <div key={jo.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">Obligado Solidario: {jo.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge(jo.verificationStatus || 'PENDING')}
                        {jo.informationComplete && jo.verificationStatus === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => approveActor('jointObligor', jo.id)}
                              disabled={approving === jo.id}
                            >
                              {approving === jo.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {t.pages.policies.actorVerification.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600"
                              onClick={() => setRejectDialog({
                                open: true,
                                actorType: 'jointObligor',
                                actorId: jo.id,
                                actorName: jo.fullName
                              })}
                            >
                              <X className="h-4 w-4" />
                              {t.pages.policies.actorVerification.reject}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {jo.rejectionReason && (
                      <Alert className="mt-2 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Razón de rechazo</AlertTitle>
                        <AlertDescription>{jo.rejectionReason}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}

                {/* Avals Verification */}
                {policy.avals?.map((aval: any) => (
                  <div key={aval.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <span className="font-medium">Aval: {aval.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge(aval.verificationStatus || 'PENDING')}
                        {aval.informationComplete && aval.verificationStatus === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => approveActor('aval', aval.id)}
                              disabled={approving === aval.id}
                            >
                              {approving === aval.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              {t.pages.policies.actorVerification.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600"
                              onClick={() => setRejectDialog({
                                open: true,
                                actorType: 'aval',
                                actorId: aval.id,
                                actorName: aval.fullName
                              })}
                            >
                              <X className="h-4 w-4" />
                              {t.pages.policies.actorVerification.reject}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {aval.rejectionReason && (
                      <Alert className="mt-2 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Razón de rechazo</AlertTitle>
                        <AlertDescription>{aval.rejectionReason}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
                  {policy.documents.map((doc: any) => (
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
                  {policy.activities.map((activity: any) => (
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

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
          setRejectionReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.pages.policies.actorVerification.rejectDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.pages.policies.actorVerification.rejectDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Actor: {rejectDialog.actorName}</Label>
            </div>
            <div>
              <Label htmlFor="reason">{t.pages.policies.actorVerification.rejectionReason}</Label>
              <Textarea
                id="reason"
                placeholder={t.pages.policies.actorVerification.rejectionReasonPlaceholder}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, actorType: '', actorId: '', actorName: '' });
                setRejectionReason('');
              }}
            >
              {t.pages.policies.actorVerification.cancelReject}
            </Button>
            <Button
              variant="destructive"
              onClick={rejectActor}
              disabled={!rejectionReason.trim() || approving === rejectDialog.actorId}
            >
              {approving === rejectDialog.actorId ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.actorVerification.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}