'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Local components
import { PolicyHeader } from './components/PolicyHeader';
import { PolicyProgressBar } from './components/PolicyProgressBar';
import { MarkCompleteDialog } from './components/MarkCompleteDialog';
import { ActorTabSkeleton } from './components/ActorTabSkeleton';

// Tab components
import { OverviewTab, LandlordTab, TenantTab, GuarantorsTab } from './tabs';

// Hook
import { usePolicyActions } from './hooks/usePolicyActions';

// Skeletons
import DocumentListSkeleton from '@/components/ui/skeleton/DocumentListSkeleton';
import TimelineSkeleton from '@/components/ui/skeleton/TimelineSkeleton';
import PaymentsTabSkeleton from '@/components/policies/payments/PaymentsTabSkeleton';

// Dynamic imports for heavy components
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

const ChangeGuarantorTypeModal = dynamic(() => import('@/components/policies/ChangeGuarantorTypeModal'), {
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
  const [currentTab, setCurrentTab] = useState('overview');
  const [tabLoading, setTabLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReplaceTenantModal, setShowReplaceTenantModal] = useState(false);
  const [showChangeGuarantorTypeModal, setShowChangeGuarantorTypeModal] = useState(false);
  const [isTabsScrollable, setIsTabsScrollable] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Check if tabs container is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setIsTabsScrollable(scrollWidth > clientWidth);
      }
    };
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, []);

  // Centralized actions hook
  const {
    sending,
    editingActor,
    markCompleteActor,
    isMarkingComplete,
    downloadingPdf,
    handleSendInvitations,
    sendIndividualInvitation,
    approvePolicy,
    handleMarkComplete,
    handleDownloadPdf,
    handleEditActor,
    handleMarkActorComplete,
    closeEditingActor,
    closeMarkComplete,
  } = usePolicyActions({ policyId, policyNumber: policy.policyNumber, onRefresh });

  // Check if all actors are approved
  const checkAllActorsApproved = () => {
    if (!policy) return false;

    const landlordsApproved = policy.landlords?.length > 0 &&
      policy.landlords.filter((l: any) => l.isPrimary).every((l: any) => l.verificationStatus === 'APPROVED');
    const tenantApproved = policy.tenant?.verificationStatus === 'APPROVED';
    const jointObligorsApproved = !policy.jointObligors?.length ||
      policy.jointObligors.every((jo: any) => jo.verificationStatus === 'APPROVED');
    const avalsApproved = !policy.avals?.length ||
      policy.avals.every((a: any) => a.verificationStatus === 'APPROVED');

    return landlordsApproved && tenantApproved && jointObligorsApproved && avalsApproved;
  };

  // Calculate payment stats
  const completedPayments = policy.payments?.filter(
    (p: { status: string }) => p.status === 'COMPLETED'
  ).length ?? 0;
  const totalPayments = policy.payments?.length ?? 0;

  // Handle tab change with skeleton loading
  const handleTabChange = (value: string) => {
    setTabLoading(true);
    setCurrentTab(value);
    // Small delay to show skeleton transition
    setTimeout(() => setTabLoading(false), 150);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <PolicyHeader
          policyNumber={policy.policyNumber}
          propertyAddress={policy.propertyAddress}
          status={policy.status}
          investigationVerdict={policy.investigation?.verdict}
          policyId={policyId}
          permissions={permissions}
          isStaffOrAdmin={isStaffOrAdmin}
          allActorsApproved={checkAllActorsApproved()}
          progressOverall={policy.progress?.overall}
          sending={sending}
          downloadingPdf={downloadingPdf}
          onSendInvitations={handleSendInvitations}
          onApprove={approvePolicy}
          onShareClick={() => setShowShareModal(true)}
          onCancelClick={() => setShowCancelModal(true)}
          onDownloadPdf={handleDownloadPdf}
        />

        {/* Progress Bar */}
        <PolicyProgressBar
          completedActors={policy.progress?.completedActors ?? 0}
          totalActors={policy.progress?.totalActors ?? 0}
          documentsUploaded={policy.progress?.documentsUploaded ?? 0}
          documentsRequired={policy.progress?.documentsRequired ?? 0}
          completedPayments={completedPayments}
          totalPayments={totalPayments}
          onActorsClick={() => setCurrentTab('tenant')}
          onDocumentsClick={() => setCurrentTab('documents')}
          onPaymentsClick={() => setCurrentTab('payments')}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="relative">
          <div ref={tabsContainerRef} className="overflow-x-auto pb-2">
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
          {/* Scroll indicator - only visible on mobile when scrollable */}
          {isTabsScrollable && (
            <div className="absolute right-0 top-0 h-10 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab policy={policy} policyId={policyId} />
        </TabsContent>

        {/* Landlord Tab */}
        <TabsContent value="landlord">
          {tabLoading && currentTab === 'landlord' ? (
            <ActorTabSkeleton />
          ) : (
            <LandlordTab
              landlords={policy.landlords || []}
              activities={policy.activities || []}
              policyId={policyId}
              permissions={permissions}
              sending={sending}
              onEditClick={handleEditActor}
              onSendInvitation={sendIndividualInvitation}
              onMarkComplete={handleMarkActorComplete}
            />
          )}
        </TabsContent>

        {/* Tenant Tab */}
        <TabsContent value="tenant">
          {tabLoading && currentTab === 'tenant' ? (
            <ActorTabSkeleton />
          ) : (
            <TenantTab
              tenant={policy.tenant}
              activities={policy.activities || []}
              policyId={policyId}
              permissions={permissions}
              sending={sending}
              onEditClick={handleEditActor}
              onSendInvitation={sendIndividualInvitation}
              onMarkComplete={handleMarkActorComplete}
              isStaffOrAdmin={isStaffOrAdmin}
              policyStatus={policy.status}
              tenantHistory={policy.tenantHistory}
              onReplaceTenant={() => setShowReplaceTenantModal(true)}
            />
          )}
        </TabsContent>

        {/* Guarantors Tab */}
        <TabsContent value="guarantors">
          {tabLoading && currentTab === 'guarantors' ? (
            <ActorTabSkeleton />
          ) : (
            <GuarantorsTab
              guarantorType={policy.guarantorType || 'NONE'}
              jointObligors={policy.jointObligors || []}
              avals={policy.avals || []}
              activities={policy.activities || []}
              policyId={policyId}
              permissions={permissions}
              sending={sending}
              onEditClick={handleEditActor}
              onSendInvitation={sendIndividualInvitation}
              onMarkComplete={handleMarkActorComplete}
              isStaffOrAdmin={isStaffOrAdmin}
              policyStatus={policy.status}
              jointObligorHistory={policy.jointObligorHistory}
              avalHistory={policy.avalHistory}
              onChangeGuarantorType={() => setShowChangeGuarantorTypeModal(true)}
            />
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

      {/* Modals */}
      {editingActor && (
        <InlineActorEditor
          isOpen={!!editingActor}
          onClose={closeEditingActor}
          actorId={editingActor.actorId}
          actorType={editingActor.type}
          policyId={policyId}
          policy={policy}
          onSave={() => {
            onRefresh();
            closeEditingActor();
          }}
        />
      )}

      <ShareInvitationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
      />

      <CancelPolicyModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
        onSuccess={onRefresh}
      />

      <ReplaceTenantModal
        isOpen={showReplaceTenantModal}
        onClose={() => setShowReplaceTenantModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
        currentTenantEmail={policy.tenant?.email || ''}
        hasGuarantors={(policy.jointObligors?.length > 0) || (policy.avals?.length > 0)}
        onSuccess={onRefresh}
      />

      <ChangeGuarantorTypeModal
        isOpen={showChangeGuarantorTypeModal}
        onClose={() => setShowChangeGuarantorTypeModal(false)}
        policyId={policyId}
        policyNumber={policy.policyNumber}
        currentGuarantorType={policy.guarantorType || 'NONE'}
        hasExistingGuarantors={(policy.jointObligors?.length > 0) || (policy.avals?.length > 0)}
        onSuccess={onRefresh}
      />

      <MarkCompleteDialog
        open={!!markCompleteActor}
        onOpenChange={(open) => !open && closeMarkComplete()}
        actorType={markCompleteActor?.type ?? null}
        actorName={markCompleteActor?.name ?? null}
        isPending={isMarkingComplete}
        onMarkComplete={handleMarkComplete}
      />
    </div>
  );
}
