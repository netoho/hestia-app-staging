'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Eye,
  FileText,
  TrendingUp,
  Share2
} from 'lucide-react';
import { t } from '@/lib/i18n';
import { usePolicyPermissions, useIsStaffOrAdmin } from '@/lib/hooks/usePolicyPermissions';

// Import lightweight components (eager loading)
import ActorCard from '@/components/policies/details/ActorCard';
import PropertyCard from '@/components/policies/details/PropertyCard';
import PricingCard from '@/components/policies/details/PricingCard';
import TimelineCard from '@/components/policies/details/TimelineCard';
import ActorProgressCard from '@/components/policies/ActorProgressCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';

// Import skeleton and error components
import PolicyDetailsSkeleton from '@/components/ui/skeleton/PolicyDetailsSkeleton';
import ActorCardSkeleton from '@/components/ui/skeleton/ActorCardSkeleton';
import ProgressCardSkeleton from '@/components/ui/skeleton/ProgressCardSkeleton';
import TimelineSkeleton from '@/components/ui/skeleton/TimelineSkeleton';
import DocumentListSkeleton from '@/components/ui/skeleton/DocumentListSkeleton';
import PolicyErrorState from '@/components/ui/error/PolicyErrorState';
import ErrorBoundary from '@/components/ui/error/ErrorBoundary';

// Dynamic imports for heavy components (lazy loading)
const ApprovalWorkflow = dynamic(() => import('@/components/policies/ApprovalWorkflow'), {
  loading: () => <ActorCardSkeleton />,
  ssr: false
});

const ShareInvitationModal = dynamic(() => import('@/components/policies/ShareInvitationModal'), {
  loading: () => null,
  ssr: false
});

const InlineActorEditor = dynamic(() => import('@/components/policies/InlineActorEditor'), {
  loading: () => null,
  ssr: false
});

const DocumentsList = dynamic(() => import('@/components/policies/details/DocumentsList'), {
  loading: () => <DocumentListSkeleton />,
  ssr: false
});

const ActivityTimeline = dynamic(() => import('@/components/policies/details/ActivityTimeline'), {
  loading: () => <TimelineSkeleton />,
  ssr: false
});

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

  // Progress metrics (from API with ?include=progress)
  progress?: {
    overall: number;
    byActor: Record<string, {
      percentage: number;
      completedFields: number;
      totalFields: number;
      documentsUploaded: number;
      documentsRequired: number;
    }>;
    completedActors: number;
    totalActors: number;
    documentsUploaded: number;
    documentsRequired: number;
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
  const [error, setError] = useState<{
    code?: number;
    message?: string;
    type?: 'network' | 'not-found' | 'server' | 'unauthorized' | 'unknown';
  } | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [tabLoading, setTabLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [editingActor, setEditingActor] = useState<{
    type: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
    actor: any;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

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
      setError(null);
      // Fetch policy with progress calculation
      const response = await fetch(`/api/policies/${policyId}?include=progress`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          setError({ code: 404, type: 'not-found', message: errorData.message });
        } else if (response.status === 401 || response.status === 403) {
          setError({ code: response.status, type: 'unauthorized', message: errorData.message });
        } else if (response.status >= 500) {
          setError({ code: response.status, type: 'server', message: errorData.message });
        } else {
          setError({ code: response.status, type: 'unknown', message: errorData.message });
        }
        return;
      }

      const data = await response.json();
      setPolicy(data.data || data);
    } catch (error) {
      console.error('Error fetching policy:', error);
      setError({
        type: 'network',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      });
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

  // Use permission hooks
  const user = session?.user ? {
    id: (session.user as any).id || '',
    email: session.user.email || '',
    role: (session.user as any).role || 'BROKER',
    name: session.user.name || undefined,
  } : null;

  const permissions = usePolicyPermissions(user, policy ? {
    id: policy.id,
    createdById: policy.createdBy?.id || '',
    status: policy.status,
  } : null);

  const isStaffOrAdmin = useIsStaffOrAdmin(user);

  // Handle loading state with skeleton
  if (loading) {
    return <PolicyDetailsSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <PolicyErrorState
        error={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetchPolicyDetails();
        }}
        onGoHome={() => router.push('/dashboard/policies')}
      />
    );
  }

  // Handle not found after loading
  if (!policy) {
    return (
      <PolicyErrorState
        error={{ code: 404, type: 'not-found' }}
        onRetry={() => {
          setLoading(true);
          fetchPolicyDetails();
        }}
        onGoHome={() => router.push('/dashboard/policies')}
      />
    );
  }

  const progressPercentage = calculateProgress();
  const allActorsApproved = checkAllActorsApproved();

  // Handle tab change with smooth transition
  const handleTabChange = (value: string) => {
    setTabLoading(true);
    setCurrentTab(value);
    // Add small delay to show transition
    setTimeout(() => setTabLoading(false), 150);
  };

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/policies')}
            className="transition-all hover:scale-105 hover:shadow-md"
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
          {/* Policy Approval Button - Only for Staff/Admin */}
          {permissions.canApprove && allActorsApproved && policy.status === 'UNDER_INVESTIGATION' && (
            <Button
              onClick={approvePolicy}
              className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105 hover:shadow-lg"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t.pages.policies.approvePolicy}
            </Button>
          )}

          {/* Send Invitations Button */}
          {permissions.canSendInvitations && (policy.status === 'DRAFT' || policy.status === 'COLLECTING_INFO') && (
            <Button
              onClick={handleSendInvitations}
              variant="default"
              disabled={sending === 'all'}
              className="transition-all hover:scale-105 hover:shadow-md disabled:hover:scale-100"
            >
              {sending === 'all' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t.pages.policies.sendInvitations}
            </Button>
          )}

          {/* Share Links Button */}
          {permissions.canSendInvitations && (
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className="transition-all hover:scale-105 hover:shadow-md"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartir Enlaces
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Progress Overview */}
      <Card className="mb-6 transition-all hover:shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle>Progreso General</CardTitle>
            </div>
            {policy.progress && (
              <Badge variant="outline" className="text-sm">
                {policy.progress.completedActors} / {policy.progress.totalActors} Actores
              </Badge>
            )}
          </div>
          <CardDescription>
            Estado de completitud de información y documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progreso Total</span>
                <span className="font-bold text-lg">
                  {policy.progress?.overall || progressPercentage}%
                </span>
              </div>
              <Progress
                value={policy.progress?.overall || progressPercentage}
                className="h-3 transition-all duration-500"
              />
            </div>

            {/* Stats Grid */}
            {policy.progress && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg transition-all hover:bg-gray-100 hover:scale-105">
                  <div className="text-2xl font-bold text-blue-600 transition-all">
                    {policy.progress.totalActors}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Actores Totales</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg transition-all hover:bg-green-100 hover:scale-105">
                  <div className="text-2xl font-bold text-green-600 transition-all">
                    {policy.progress.completedActors}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Completados</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg transition-all hover:bg-orange-100 hover:scale-105">
                  <div className="text-2xl font-bold text-orange-600 transition-all">
                    {policy.progress.totalActors - policy.progress.completedActors}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Pendientes</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg transition-all hover:bg-purple-100 hover:scale-105">
                  <div className="text-2xl font-bold text-purple-600 transition-all">
                    {policy.progress.documentsUploaded}/{policy.progress.documentsRequired}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Documentos</div>
                </div>
              </div>
            )}

            {/* Verification Status for Staff/Admin */}
            {isStaffOrAdmin && (
              <Alert className={allActorsApproved ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
                {allActorsApproved ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-orange-600" />
                )}
                <AlertDescription className={allActorsApproved ? 'text-green-700' : 'text-orange-700'}>
                  {allActorsApproved
                    ? t.pages.policies.actorVerification.allActorsApproved
                    : t.pages.policies.actorVerification.pendingActorApprovals}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className={`grid w-full ${permissions.canApprove || permissions.canVerifyDocuments ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="landlord">Arrendador</TabsTrigger>
          <TabsTrigger value="tenant">Inquilino</TabsTrigger>
          <TabsTrigger value="guarantors">Obligado S. / Aval</TabsTrigger>
          {/* Show verification tab only for users with approval/verification permissions */}
          {(permissions.canApprove || permissions.canVerifyDocuments) && (
            <TabsTrigger value="verification">Verificación</TabsTrigger>
          )}
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Actividad</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
        <TabsContent value="landlord" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActorCard
                actor={policy.landlord}
                actorType="landlord"
                policyId={policyId}
                getVerificationBadge={getVerificationBadge}
                onEditClick={() => setEditingActor({ type: 'landlord', actor: policy.landlord })}
              />
            </div>
            <div className="space-y-4">
              <ActorProgressCard
                actor={policy.landlord}
                actorType="landlord"
                onEdit={() => setEditingActor({ type: 'landlord', actor: policy.landlord })}
                onSendInvitation={() => sendIndividualInvitation('landlord', policy.landlord?.id)}
                permissions={{
                  canEdit: permissions.canEdit,
                  canSendInvitations: permissions.canSendInvitations,
                }}
              />
              <ActorActivityTimeline
                activities={policy.activities}
                actorType="landlord"
                actorName={policy.landlord?.fullName || policy.landlord?.companyName}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tenant Tab */}
        <TabsContent value="tenant" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActorCard
                actor={policy.tenant}
                actorType="tenant"
                policyId={policyId}
                getVerificationBadge={getVerificationBadge}
                onEditClick={() => setEditingActor({ type: 'tenant', actor: policy.tenant })}
              />
            </div>
            <div className="space-y-4">
              <ActorProgressCard
                actor={policy.tenant}
                actorType="tenant"
                onEdit={() => setEditingActor({ type: 'tenant', actor: policy.tenant })}
                onSendInvitation={() => sendIndividualInvitation('tenant', policy.tenant?.id)}
                permissions={{
                  canEdit: permissions.canEdit,
                  canSendInvitations: permissions.canSendInvitations,
                }}
              />
              <ActorActivityTimeline
                activities={policy.activities}
                actorType="tenant"
                actorName={policy.tenant?.fullName || policy.tenant?.companyName}
              />
            </div>
          </div>
        </TabsContent>

        {/* Guarantors Tab */}
        <TabsContent value="guarantors" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Joint Obligors */}
          {(policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Obligados Solidarios
              </h3>
              {policy.jointObligors && policy.jointObligors.length > 0 ? (
                policy.jointObligors.map((jo: any) => (
                  <div key={jo.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <ActorCard
                        actor={jo}
                        actorType="jointObligor"
                        policyId={policyId}
                        getVerificationBadge={getVerificationBadge}
                        onEditClick={() => setEditingActor({ type: 'jointObligor', actor: jo })}
                      />
                    </div>
                    <div className="space-y-4">
                      <ActorProgressCard
                        actor={jo}
                        actorType="jointObligor"
                        onEdit={() => setEditingActor({ type: 'jointObligor', actor: jo })}
                        onSendInvitation={() => sendIndividualInvitation('jointObligor', jo.id)}
                        permissions={{
                          canEdit: permissions.canEdit,
                          canSendInvitations: permissions.canSendInvitations,
                        }}
                      />
                      <ActorActivityTimeline
                        activities={policy.activities}
                        actorId={jo.id}
                        actorName={jo.fullName || jo.companyName}
                      />
                    </div>
                  </div>
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
                  <div key={aval.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <ActorCard
                        actor={aval}
                        actorType="aval"
                        policyId={policyId}
                        getVerificationBadge={getVerificationBadge}
                        onEditClick={() => setEditingActor({ type: 'aval', actor: aval })}
                      />
                    </div>
                    <div className="space-y-4">
                      <ActorProgressCard
                        actor={aval}
                        actorType="aval"
                        onEdit={() => setEditingActor({ type: 'aval', actor: aval })}
                        onSendInvitation={() => sendIndividualInvitation('aval', aval.id)}
                        permissions={{
                          canEdit: permissions.canEdit,
                          canSendInvitations: permissions.canSendInvitations,
                        }}
                      />
                      <ActorActivityTimeline
                        activities={policy.activities}
                        actorId={aval.id}
                        actorName={aval.fullName || aval.companyName}
                      />
                    </div>
                  </div>
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
        {(permissions.canApprove || permissions.canVerifyDocuments) && (
          <TabsContent value="verification" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ApprovalWorkflow
              policy={policy}
              onApprove={approveActor}
              onReject={rejectActor}
              onApprovePolicy={approvePolicy}
              canApprovePolicy={permissions.canApprove}
            />
          </TabsContent>
        )}

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <DocumentsList documents={policy.documents} />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <ActivityTimeline activities={policy.activities} />
        </TabsContent>
      </Tabs>

      {/* Inline Actor Editor Modal */}
      {editingActor && (
        <InlineActorEditor
          isOpen={!!editingActor}
          onClose={() => setEditingActor(null)}
          actor={editingActor.actor}
          actorType={editingActor.type}
          policy={policy}
          onSave={async () => {
            await fetchPolicyDetails();
            setEditingActor(null);
          }}
        />
      )}

      {/* Share Invitation Modal */}
      <ShareInvitationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
      />
    </div>
    </ErrorBoundary>
  );
}
