'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Shield,
  Users,
  RefreshCw,
  Clock,
  Eye,
  TrendingUp,
  Share2,
  Info,
  History,
  XCircle
} from 'lucide-react';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc/client';

// Import lightweight components (eager loading)
import ActorCard from '@/components/policies/details/ActorCard';
import PropertyCard from '@/components/policies/details/PropertyCard';
import PricingCard from '@/components/policies/details/PricingCard';
import TimelineCard from '@/components/policies/details/TimelineCard';
import ActorActivityTimeline from '@/components/policies/ActorActivityTimeline';

// Import skeleton and error components
import ActorCardSkeleton from '@/components/ui/skeleton/ActorCardSkeleton';
import TimelineSkeleton from '@/components/ui/skeleton/TimelineSkeleton';
import DocumentListSkeleton from '@/components/ui/skeleton/DocumentListSkeleton';

// Dynamic imports for heavy components (lazy loading)
const ShareInvitationModal = dynamic(() => import('@/components/policies/ShareInvitationModal'), {
  loading: () => null,
  ssr: false
});

const CancelPolicyModal = dynamic(() => import('@/components/policies/CancelPolicyModal'), {
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

const PaymentsTab = dynamic(() => import('@/components/policies/payments/PaymentsTab'), {
  loading: () => <PaymentsTabSkeleton />,
  ssr: false
});

import PaymentsTabSkeleton from '@/components/policies/payments/PaymentsTabSkeleton';

interface PolicyDetailsContentProps {
  policy: any;
  policyId: string;
  permissions: {
    canEdit: boolean;
    canApprove: boolean;
    canSendInvitations: boolean;
    canVerifyDocuments: boolean;
  };
  isStaffOrAdmin: boolean;
  onRefresh: () => Promise<void>;
}

export default function PolicyDetailsContent({
  policy,
  policyId,
  permissions,
  isStaffOrAdmin,
  onRefresh
}: PolicyDetailsContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [currentTab, setCurrentTab] = useState('overview');
  const [tabLoading, setTabLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [editingActor, setEditingActor] = useState<{
    type: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
    actorId: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [markCompleteActor, setMarkCompleteActor] = useState<{
    type: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
    actorId: string;
    name: string;
  } | null>(null);

  // Toggle states for actor views
  const [landlordView, setLandlordView] = useState<'info' | 'history'>('info');
  const [tenantView, setTenantView] = useState<'info' | 'history'>('info');
  const [guarantorView, setGuarantorView] = useState<'info' | 'history'>('info');

  // tRPC mutations
  const sendInvitationsMutation = trpc.policy.sendInvitations.useMutation({
    onSuccess: () => {
      alert('Invitaciones enviadas exitosamente');
      onRefresh();
    },
    onError: (error) => {
      console.error('Error sending invitations:', error);
      alert('Error al enviar invitaciones');
    },
    onSettled: () => {
      setSending(null);
    },
  });

  const updateStatusMutation = trpc.policy.updateStatus.useMutation({
    onSuccess: () => {
      alert('Protección aprobada exitosamente');
      onRefresh();
    },
    onError: (error) => {
      console.error('Error updating policy status:', error);
      alert('Error al actualizar el estado de la protección');
    },
  });

  // Admin submit actor mutation (mark as complete)
  const adminSubmitMutation = trpc.actor.adminSubmitActor.useMutation({
    onSuccess: () => {
      toast({
        title: 'Actor marcado como completo',
        description: `El actor ha sido marcado como completo exitosamente`,
      });
      // Invalidate queries
      utils.actor.listByPolicy.invalidate({ policyId });
      onRefresh();
      setMarkCompleteActor(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al marcar como completo',
        variant: 'destructive',
      });
    },
  });

  const handleSendInvitations = async () => {
    setSending('all');
    sendInvitationsMutation.mutate({
      policyId,
      resend: true,
    });
  };

  const sendIndividualInvitation = async (actorType: string, actorId: string) => {
    setSending(actorId);
    sendInvitationsMutation.mutate({
      policyId,
      actors: [actorType],
      resend: true,
    });
  };

  const approvePolicy = async () => {
    if (!confirm('¿Estás seguro de que deseas aprobar esta protección?')) return;

    updateStatusMutation.mutate({
      policyId,
      status: 'APPROVED' as const,
    });
  };

  const handleMarkComplete = (skipValidation: boolean) => {
    if (!markCompleteActor) return;
    adminSubmitMutation.mutate({
      type: markCompleteActor.type,
      id: markCompleteActor.actorId,
      skipValidation,
    });
  };

  const getActorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tenant: 'Inquilino',
      landlord: 'Arrendador',
      aval: 'Aval',
      jointObligor: 'Obligado Solidario',
    };
    return labels[type] || 'Actor';
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
    let totalActors = 0;

    // Count all landlords
    const landlordCount = policy.landlords?.length || 1;
    totalActors += landlordCount;
    completedActors += policy.landlords?.filter((l: any) => l.informationComplete).length || 0;

    // Count tenant
    totalActors += 1;
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

    // Check all landlords are approved
    const landlordsApproved = policy.landlords?.length > 0 &&
      policy.landlords.filter(l => l.isPrimary).every((l: any) => l.verificationStatus === 'APPROVED');

    const tenantApproved = policy.tenant?.verificationStatus === 'APPROVED';

    const jointObligorsApproved = !policy.jointObligors?.length ||
      policy.jointObligors.every((jo: any) => jo.verificationStatus === 'APPROVED');

    const avalsApproved = !policy.avals?.length ||
      policy.avals.every((a: any) => a.verificationStatus === 'APPROVED');

    return landlordsApproved && tenantApproved && jointObligorsApproved && avalsApproved;
  };

  const progressPercentage = calculateProgress();
  const allActorsApproved = checkAllActorsApproved();

  // Handle tab change with smooth transition
  const handleTabChange = (value: string) => {
    setTabLoading(true);
    setCurrentTab(value);
    // Add small delay to show transition
    setTimeout(() => setTabLoading(false), 150);
  };

  // Enhanced ActorCard with action buttons
  const EnhancedActorCard = ({ actor, actorType }: { actor: any; actorType: any }) => (
    <ActorCard
      actor={actor}
      actorType={actorType}
      policyId={policyId}
      getVerificationBadge={getVerificationBadge}
      onEditClick={() => setEditingActor({ type: actorType, actorId: actor?.id })}
      onSendInvitation={
        permissions.canSendInvitations && !actor?.informationComplete
          ? () => sendIndividualInvitation(actorType, actor?.id)
          : undefined
      }
      onMarkComplete={
        permissions.canEdit && !actor?.informationComplete
          ? () => setMarkCompleteActor({
              type: actorType,
              actorId: actor?.id,
              name: actor?.companyName || actor?.fullName || `${actor?.firstName || ''} ${actor?.paternalLastName || ''}`.trim() || 'Actor',
            })
          : undefined
      }
      canEdit={permissions.canEdit}
      sending={sending === actor?.id}
    />
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/policies')}
            className="transition-all hover:scale-105 hover:shadow-md w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Protección {policy.policyNumber}</h1>
              {getStatusBadge(policy.status)}
              {policy.investigation?.verdict === 'APPROVED' && (
                <Badge className="bg-blue-500 hover:bg-blue-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Investigación Aprobada
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{policy.propertyAddress}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Review Information Button - For Staff/Admin (only when investigation not yet approved) */}
          {(permissions.canApprove || permissions.canVerifyDocuments) &&
           policy.status === 'UNDER_INVESTIGATION' &&
           policy.investigation?.verdict !== 'APPROVED' && (
            <Button
              onClick={() => router.push(`/dashboard/policies/${policyId}/review`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg"
              disabled={
                policy.progress &&
                policy.progress.overall < 100
              }
              title={
                policy.progress && policy.progress.overall < 100
                  ? "La información de los actores debe estar completa antes de revisar"
                  : "Revisar información de la póliza"
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              Revisar Información
            </Button>
          )}

          {/* Policy Approval Button - Only for Staff/Admin when investigation approved */}
          {permissions.canApprove &&
           allActorsApproved &&
           policy.investigation?.verdict === 'APPROVED' &&
           (policy.status === 'UNDER_INVESTIGATION' || policy.status === 'PENDING_APPROVAL') && (
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

          {/* Cancel Policy Button - Staff/Admin only */}
          {isStaffOrAdmin && policy.status !== 'CANCELLED' && policy.status !== 'EXPIRED' && (
            <Button
              onClick={() => setShowCancelModal(true)}
              variant="destructive"
              className="transition-all hover:scale-105 hover:shadow-md"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Protección
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

      {/* Main Content Tabs - Mobile Scrollable */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="relative">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full md:w-full md:grid md:grid-cols-7">
              <TabsTrigger value="overview" className="whitespace-nowrap">General</TabsTrigger>
              <TabsTrigger value="landlord" className="whitespace-nowrap">Arrendador</TabsTrigger>
              <TabsTrigger value="tenant" className="whitespace-nowrap">Inquilino</TabsTrigger>
              <TabsTrigger value="guarantors" className="whitespace-nowrap">Obligado S. / Aval</TabsTrigger>
              <TabsTrigger value="payments" className="whitespace-nowrap">Pagos</TabsTrigger>
              <TabsTrigger value="documents" className="whitespace-nowrap">Documentos</TabsTrigger>
              <TabsTrigger value="timeline" className="whitespace-nowrap">Actividad</TabsTrigger>
            </TabsList>
          </div>
          {/* Scroll indicator for mobile */}
          <div className="absolute right-0 top-0 h-10 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>

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

        {/* Landlord Tab with Toggle */}
        <TabsContent value="landlord" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {policy.landlords && policy.landlords.length > 0 && (
            <div className="flex justify-end mb-4">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => setLandlordView('info')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    landlordView === 'info'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Información
                </button>
                <button
                  onClick={() => setLandlordView('history')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    landlordView === 'history'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </button>
              </div>
            </div>
          )}

          {policy.landlords && policy.landlords.length > 0 ? (
            policy.landlords.map((landlord: any, index: number) => (
              <div key={landlord.id} className="space-y-4">
                {index > 0 && <hr className="my-6" />}
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {landlord.isPrimary ? 'Arrendador Principal' : `Co-propietario ${index}`}
                  {landlord.isPrimary && <Badge variant="outline" className="ml-2">Principal</Badge>}
                </h3>
                {landlordView === 'info' ? (
                  <EnhancedActorCard actor={landlord} actorType="landlord" />
                ) : (
                  <ActorActivityTimeline
                    activities={policy.activities}
                    actorId={landlord.id}
                    actorName={landlord.fullName || landlord.companyName}
                  />
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-600">No se ha registrado información del arrendador</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tenant Tab with Toggle */}
        <TabsContent value="tenant" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {policy.tenant && (
            <div className="flex justify-end mb-4">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => setTenantView('info')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    tenantView === 'info'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Información
                </button>
                <button
                  onClick={() => setTenantView('history')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    tenantView === 'history'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </button>
              </div>
            </div>
          )}

          {tenantView === 'info' ? (
            <EnhancedActorCard actor={policy.tenant} actorType="tenant" />
          ) : (
            <ActorActivityTimeline
              activities={policy.activities}
              actorType="tenant"
              actorName={policy.tenant?.fullName || policy.tenant?.companyName}
            />
          )}
        </TabsContent>

        {/* Guarantors Tab with Toggle */}
        <TabsContent value="guarantors" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {(policy.jointObligors?.length > 0 || policy.avals?.length > 0) && (
            <div className="flex justify-end mb-4">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => setGuarantorView('info')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    guarantorView === 'info'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Información
                </button>
                <button
                  onClick={() => setGuarantorView('history')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    guarantorView === 'history'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </button>
              </div>
            </div>
          )}

          {/* Joint Obligors */}
          {(policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Obligados Solidarios
              </h3>
              {policy.jointObligors && policy.jointObligors.length > 0 ? (
                policy.jointObligors.map((jo: any) => (
                  <div key={jo.id}>
                    {guarantorView === 'info' ? (
                      <EnhancedActorCard actor={jo} actorType="jointObligor" />
                    ) : (
                      <ActorActivityTimeline
                        activities={policy.activities}
                        actorId={jo.id}
                        actorName={jo.fullName || jo.companyName}
                      />
                    )}
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
                  <div key={aval.id}>
                    {guarantorView === 'info' ? (
                      <EnhancedActorCard actor={aval} actorType="aval" />
                    ) : (
                      <ActorActivityTimeline
                        activities={policy.activities}
                        actorId={aval.id}
                        actorName={aval.fullName || aval.companyName}
                      />
                    )}
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
                <p className="text-gray-600">Esta protección no requiere garantías adicionales</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PaymentsTab policyId={policyId} isStaffOrAdmin={isStaffOrAdmin} />
        </TabsContent>

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
          actorId={editingActor.actorId}
          actorType={editingActor.type}
          policyId={policyId}
          policy={policy}
          onSave={() => {
            onRefresh();
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

      {/* Cancel Policy Modal */}
      <CancelPolicyModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
        onSuccess={onRefresh}
      />

      {/* Mark Complete Confirmation Dialog */}
      <AlertDialog open={!!markCompleteActor} onOpenChange={(open) => !open && setMarkCompleteActor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Marcar {markCompleteActor ? getActorTypeLabel(markCompleteActor.type) : 'Actor'} como Completo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcara a {markCompleteActor?.name} como completo.
              Si faltan documentos requeridos, puede elegir continuar de todas formas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Si hay documentos faltantes, se mostrara un error. Use &quot;Forzar Completo&quot; para omitir la validacion.
              </AlertDescription>
            </Alert>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleMarkComplete(true)}
              disabled={adminSubmitMutation.isPending}
            >
              Forzar Completo
            </Button>
            <AlertDialogAction
              onClick={() => handleMarkComplete(false)}
              disabled={adminSubmitMutation.isPending}
            >
              {adminSubmitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Marcar Completo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
