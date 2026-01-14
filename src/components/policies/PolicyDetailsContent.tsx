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
  XCircle,
  MoreVertical,
  FileText,
  CreditCard,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc/client';
import { formatFullName } from '@/lib/utils/names';
import { downloadPolicyPdf } from '@/lib/pdf/downloadPdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

const ReplaceTenantModal = dynamic(() => import('@/components/policies/ReplaceTenantModal'), {
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
import { UserMinus } from 'lucide-react';

// Statuses that allow tenant replacement
const REPLACEABLE_STATUSES = ['DRAFT', 'COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];

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
  const [showReplaceTenantModal, setShowReplaceTenantModal] = useState(false);
  const [markCompleteActor, setMarkCompleteActor] = useState<{
    type: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
    actorId: string;
    name: string;
  } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadPolicyPdf(policyId, policy.policyNumber);
      toast({
        title: t.pages.policies.details.toast.pdfGenerated,
        description: t.pages.policies.details.toast.pdfGeneratedDesc,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al descargar PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
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

  // Progress indicator helper
  const ProgressIndicator = ({
    label,
    current,
    total,
    icon: Icon,
    onClick,
  }: {
    label: string;
    current: number;
    total: number;
    icon: React.ElementType;
    onClick?: () => void;
  }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const isComplete = current === total && total > 0;
    const hasData = total > 0;

    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          onClick && "hover:bg-gray-100 cursor-pointer",
          !onClick && "cursor-default"
        )}
      >
        <Icon className={cn(
          "h-4 w-4",
          isComplete ? "text-green-600" : "text-gray-500"
        )} />
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn(
          "font-semibold",
          isComplete ? "text-green-600" : "text-gray-900"
        )}>
          {hasData ? `${current}/${total}` : '—'}
        </span>
        {hasData && (
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isComplete ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </button>
    );
  };

  // Calculate payment stats
  const completedPayments = policy.payments?.filter(
    (p: { status: string }) => p.status === 'COMPLETED'
  ).length ?? 0;
  const totalPayments = policy.payments?.length ?? 0;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-300">
      {/* Compact Header */}
      <div className="mb-6 space-y-4">
        {/* Row 1: Title + Status + Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/policies')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">
                  Protección {policy.policyNumber}
                </h1>
                {getStatusBadge(policy.status)}
                {policy.investigation?.verdict === 'APPROVED' && (
                  <Badge className="bg-blue-500 hover:bg-blue-600 shrink-0">
                    <Shield className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Investigación </span>Aprobada
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {policy.propertyAddress}
              </p>
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Review Information - Staff/Admin */}
              {(permissions.canApprove || permissions.canVerifyDocuments) &&
               policy.status === 'UNDER_INVESTIGATION' &&
               policy.investigation?.verdict !== 'APPROVED' && (
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/policies/${policyId}/review`)}
                  disabled={policy.progress && policy.progress.overall < 100}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Revisar Información
                </DropdownMenuItem>
              )}

              {/* Approve Policy - Staff/Admin */}
              {permissions.canApprove &&
               allActorsApproved &&
               policy.investigation?.verdict === 'APPROVED' &&
               (policy.status === 'UNDER_INVESTIGATION' || policy.status === 'PENDING_APPROVAL') && (
                <DropdownMenuItem onClick={approvePolicy} className="text-green-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t.pages.policies.approvePolicy}
                </DropdownMenuItem>
              )}

              {/* Send Invitations */}
              {permissions.canSendInvitations && (policy.status === 'DRAFT' || policy.status === 'COLLECTING_INFO') && (
                <DropdownMenuItem
                  onClick={handleSendInvitations}
                  disabled={sending === 'all'}
                >
                  {sending === 'all' ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t.pages.policies.sendInvitations}
                </DropdownMenuItem>
              )}

              {/* Share Links */}
              {permissions.canSendInvitations && (
                <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir Enlaces
                </DropdownMenuItem>
              )}

              {/* Download PDF */}
              <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t.pages.policies.details.downloadPDF}
              </DropdownMenuItem>

              {/* Cancel Policy - Staff/Admin only */}
              {isStaffOrAdmin && policy.status !== 'CANCELLED' && policy.status !== 'EXPIRED' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowCancelModal(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Protección
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: Progress Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-gray-50 rounded-lg p-2">
          <ProgressIndicator
            label="Actores"
            current={policy.progress?.completedActors ?? 0}
            total={policy.progress?.totalActors ?? 0}
            icon={Users}
            onClick={() => setCurrentTab('tenant')}
          />
          <div className="hidden sm:block w-px h-6 bg-gray-300" />
          <ProgressIndicator
            label="Documentos"
            current={policy.progress?.documentsUploaded ?? 0}
            total={policy.progress?.documentsRequired ?? 0}
            icon={FileText}
            onClick={() => setCurrentTab('documents')}
          />
          <div className="hidden sm:block w-px h-6 bg-gray-300" />
          <ProgressIndicator
            label="Pagos"
            current={completedPayments}
            total={totalPayments}
            icon={CreditCard}
            onClick={() => setCurrentTab('payments')}
          />
        </div>
      </div>

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
            <div className="flex justify-between items-center mb-4">
              {/* Replace Tenant Button */}
              {isStaffOrAdmin && REPLACEABLE_STATUSES.includes(policy.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplaceTenantModal(true)}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Reemplazar
                </Button>
              )}
              {(!isStaffOrAdmin || !REPLACEABLE_STATUSES.includes(policy.status)) && <div />}

              {/* View Toggle */}
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

          {/* Tenant Replacement History */}
          {policy.tenantHistory && policy.tenantHistory.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial de reemplazos ({policy.tenantHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policy.tenantHistory.map((prev: any) => (
                    <div key={prev.id} className="border-l-2 border-muted pl-4 py-2">
                      <p className="font-medium">
                        {prev.tenantType === 'COMPANY'
                          ? prev.companyName
                          : formatFullName(
                              prev.firstName || '',
                              prev.paternalLastName || '',
                              prev.maternalLastName || '',
                              prev.middleName || undefined
                            )}
                      </p>
                      <p className="text-sm text-muted-foreground">{prev.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reemplazado: {format(new Date(prev.replacedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Razón: {prev.replacementReason}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

      {/* Replace Tenant Modal */}
      <ReplaceTenantModal
        isOpen={showReplaceTenantModal}
        onClose={() => setShowReplaceTenantModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
        currentTenantEmail={policy.tenant?.email || ''}
        hasGuarantors={(policy.jointObligors?.length > 0) || (policy.avals?.length > 0)}
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
