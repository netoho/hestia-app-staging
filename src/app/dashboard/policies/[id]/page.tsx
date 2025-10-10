'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
  RefreshCw,
  Clock,
  XCircle,
  Eye
} from 'lucide-react';
import { t } from '@/lib/i18n';

// Import new components
import ActorCard from '@/components/policies/details/ActorCard';
import ActorVerificationCard from '@/components/policies/details/ActorVerificationCard';
import PropertyCard from '@/components/policies/details/PropertyCard';
import PricingCard from '@/components/policies/details/PricingCard';
import TimelineCard from '@/components/policies/details/TimelineCard';
import DocumentsList from '@/components/policies/details/DocumentsList';
import ActivityTimeline from '@/components/policies/details/ActivityTimeline';

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

  // Property Details (new separated model)
  propertyDetails?: any;

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
  const [sending, setSending] = useState<string | null>(null);

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
    }
  };

  const rejectActor = async (actorType: string, actorId: string, reason: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}/actors/${actorType}/${actorId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: reason,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject actor');

      alert('Actor rechazado y notificado');
      await fetchPolicyDetails();
    } catch (error) {
      console.error('Error rejecting actor:', error);
      alert('Error al rechazar el actor');
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
            <PropertyCard
              propertyAddress={policy.propertyAddress}
              propertyType={policy.propertyType}
              propertyDescription={policy.propertyDescription}
              rentAmount={policy.rentAmount}
              contractLength={policy.contractLength}
              propertyDetails={policy.propertyDetails}
              policyId={policyId}
            />
            <PricingCard
              package={policy.package}
              totalPrice={policy.totalPrice}
              tenantPercentage={policy.tenantPercentage}
              landlordPercentage={policy.landlordPercentage}
              guarantorType={policy.guarantorType}
              policyId={policyId}
            />
          </div>
          <TimelineCard
            createdAt={policy.createdAt}
            submittedAt={policy.submittedAt}
            approvedAt={policy.approvedAt}
            activatedAt={policy.activatedAt}
          />
        </TabsContent>

        {/* Landlord Tab */}
        <TabsContent value="landlord" className="space-y-6">
          <ActorCard
            actor={policy.landlord}
            actorType="landlord"
            policyId={policyId}
            getVerificationBadge={getVerificationBadge}
          />
        </TabsContent>

        {/* Tenant Tab */}
        <TabsContent value="tenant" className="space-y-6">
          <ActorCard
            actor={policy.tenant}
            actorType="tenant"
            policyId={policyId}
            getVerificationBadge={getVerificationBadge}
          />
        </TabsContent>

        {/* Guarantors Tab */}
        <TabsContent value="guarantors" className="space-y-6">
          {/* Joint Obligors */}
          {(policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') && (
            <div className="space-y-4">
              {policy.jointObligors && policy.jointObligors.length > 0 ? (
                policy.jointObligors.map((jo: any) => (
                  <ActorCard
                    key={jo.id}
                    actor={jo}
                    actorType="jointObligor"
                    policyId={policyId}
                    getVerificationBadge={getVerificationBadge}
                  />
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
                  <ActorCard
                    key={aval.id}
                    actor={aval}
                    actorType="aval"
                    policyId={policyId}
                    getVerificationBadge={getVerificationBadge}
                  />
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

        {/* Verification Tab - For Staff/Admin */}
        {isStaffOrAdmin && (
          <TabsContent value="verification" className="space-y-6">
            <ActorVerificationCard
              policy={policy}
              onApprove={approveActor}
              onReject={rejectActor}
            />
          </TabsContent>
        )}

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentsList documents={policy.documents} />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <ActivityTimeline activities={policy.activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
