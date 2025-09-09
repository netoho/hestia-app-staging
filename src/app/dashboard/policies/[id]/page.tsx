'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { PolicyStatusType } from '@/lib/prisma-types';
import { POLICY_STATUS_DISPLAY } from '@/lib/types/policy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { t } from '@/lib/i18n';

// Import new components
import { PolicyDetailsHeader } from '@/components/policy-details/PolicyDetailsHeader';
import { PolicyQuickInfo } from '@/components/policy-details/PolicyQuickInfo';
import { PolicyStatusActions } from '@/components/policy-details/PolicyStatusActions';
import { PolicyPaymentInfo } from '@/components/policy-details/PolicyPaymentInfo';
import { PolicyDetailsContent } from '@/components/policy-details/PolicyDetailsContent';
import { PolicyDocuments } from '@/components/policy-details/PolicyDocuments';
import { PolicyActivityLog } from '@/components/policy-details/PolicyActivityLog';
import { PolicyInvestigationInfo } from '@/components/policy-details/PolicyInvestigationInfo';
import { PolicyContractInfo } from '@/components/policy-details/PolicyContractInfo';

interface PolicyDetails {
  id: string;
  tenantEmail: string;
  tenantPhone?: string;
  status: PolicyStatusType;
  currentStep: number;
  profileData?: any;
  employmentData?: any;
  referencesData?: any;
  documentsData?: any;
  accessToken: string;
  tokenExpiry: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewReason?: string;
  packageId?: string | null;
  packageName?: string | null;
  price?: number | null;
  paymentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  
  // Lifecycle dates
  investigationStartedAt?: string | null;
  investigationCompletedAt?: string | null;
  contractUploadedAt?: string | null;
  contractSignedAt?: string | null;
  policyActivatedAt?: string | null;
  contractLength: number;
  policyExpiresAt?: string | null;
  
  createdAt: string;
  updatedAt: string;
  initiatedByUser: {
    id: string;
    email: string;
    name?: string;
  };
  reviewedByUser?: {
    id: string;
    email: string;
    name?: string;
  };
  documents: Array<{
    id: string;
    category: string;
    originalName: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    details?: any;
    performedBy?: string;
    ipAddress?: string;
    createdAt: string;
  }>;
  
  // Investigation data
  investigation?: {
    id: string;
    verdict?: 'APPROVED' | 'REJECTED' | 'HIGH_RISK' | null;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    rejectedBy?: string | null;
    rejectionReason?: string | null;
    rejectedAt?: string | null;
    landlordDecision?: 'PROCEED' | 'REJECT' | null;
    landlordOverride: boolean;
    landlordNotes?: string | null;
    assignedTo?: string | null;
    completedBy?: string | null;
    completedAt?: string | null;
    responseTimeHours?: number | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  
  // Contract data
  contracts: Array<{
    id: string;
    version: number;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isCurrent: boolean;
    uploadedBy: string;
    uploadedAt: string;
  }>;
}

export default function PolicyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params.id as string;
  
  const [policy, setPolicy] = useState<PolicyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchPolicy = async () => {
    if (!isAuthenticated || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t.pages.policies.details.policyNotFound);
        }
        if (response.status === 401) {
          throw new Error(t.pages.policies.details.toast.authFailed);
        }
        throw new Error(t.pages.policies.details.errorLoading);
      }

      const data = await response.json();
      
      // Add default values for new fields if they don't exist
      const policyWithDefaults = {
        ...data,
        contractLength: data.contractLength || 12,
        investigation: data.investigation || null,
        contracts: data.contracts || [],
        investigationStartedAt: data.investigationStartedAt || null,
        investigationCompletedAt: data.investigationCompletedAt || null,
        contractUploadedAt: data.contractUploadedAt || null,
        contractSignedAt: data.contractSignedAt || null,
        policyActivatedAt: data.policyActivatedAt || null,
        policyExpiresAt: data.policyExpiresAt || null,
      };
      
      setPolicy(policyWithDefaults);
    } catch (err) {
      console.error('Policy fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && policyId) {
      fetchPolicy();
    }
  }, [isAuthenticated, user, policyId]);

  // Also try to fetch when authentication becomes available
  useEffect(() => {
    if (isAuthenticated && user && policyId && !policy && !loading) {
      fetchPolicy();
    }
  }, [isAuthenticated, user]);

  // Simplified handlers - complex logic moved to components

  const updatePolicyStatus = async (newStatus: PolicyStatusType, reason?: string) => {
    if (!isAuthenticated || !user || !policy) return;
    
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/policies/${policy.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          reason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update policy status');
      }

      await fetchPolicy();
      toast({
        title: t.pages.policies.details.toast.statusUpdated,
        description: t.pages.policies.details.toast.statusChangedTo(POLICY_STATUS_DISPLAY[newStatus]),
      });
    } catch (error) {
      console.error('Error updating policy status:', error);
      toast({
        title: t.pages.policies.details.toast.error,
        description: error instanceof Error ? error.message : t.pages.policies.details.toast.failedToUpdate,
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!isAuthenticated || !user || !policy) return;
    
    setDownloadingPDF(true);
    try {
      const response = await fetch(`/api/policies/${policy.id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t.pages.policies.details.toast.authFailed);
        }
        if (response.status === 403) {
          throw new Error(t.pages.policies.details.toast.noPermission);
        }
        if (response.status === 404) {
          throw new Error(t.pages.policies.details.policyNotFound);
        }
        throw new Error('Error al generar el documento PDF');
      }

      const htmlContent = await response.text();
      
      // Create a blob and download link
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solicitud-arrendamiento-${policy.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t.pages.policies.details.toast.pdfGenerated,
        description: t.pages.policies.details.toast.pdfGeneratedDesc,
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: t.pages.policies.details.toast.downloadFailed,
        description: error instanceof Error ? error.message : 'Error al generar el documento',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    if (!isAuthenticated || !user || !policy) return;
    
    setDownloadingDoc(documentId);
    try {
      const response = await fetch(`/api/policies/${policy.id}/documents/${documentId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t.pages.policies.details.toast.authFailed);
        }
        if (response.status === 403) {
          throw new Error(t.pages.policies.details.toast.noPermission);
        }
        if (response.status === 404) {
          throw new Error(t.pages.policies.details.toast.documentNotFound);
        }
        throw new Error(t.pages.policies.details.toast.failedToGenerate);
      }

      const data = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t.pages.policies.details.toast.downloadStarted,
        description: t.pages.policies.details.toast.isBeingDownloaded(fileName),
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: t.pages.policies.details.toast.downloadFailed,
        description: error instanceof Error ? error.message : t.pages.policies.details.toast.failedToDownload,
        variant: 'destructive',
      });
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Investigation handlers
  const handleStartInvestigation = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/investigation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignedTo: user?.id,
          notes: 'Investigation started from policy details page'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start investigation');
      }

      toast({
        title: 'Investigación Iniciada',
        description: 'La investigación ha sido iniciada exitosamente.',
        variant: 'default',
      });

      // Refresh policy data
      await fetchPolicy();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al iniciar investigación',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteInvestigation = async (verdict: 'APPROVED' | 'REJECTED' | 'HIGH_RISK') => {
    try {
      const response = await fetch(`/api/policies/${policyId}/investigation/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          verdict: verdict,
          riskLevel: verdict === 'HIGH_RISK' ? 'HIGH' : 'LOW',
          notes: `Investigation completed with verdict: ${verdict}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete investigation');
      }

      toast({
        title: 'Investigación Completada',
        description: `Investigación completada con veredicto: ${verdict}`,
        variant: 'default',
      });

      // Refresh policy data
      await fetchPolicy();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al completar investigación',
        variant: 'destructive',
      });
    }
  };

  const handleLandlordOverride = async (decision: 'PROCEED' | 'REJECT', notes?: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}/investigation/landlord-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision: decision,
          notes: notes || `Landlord decision: ${decision}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process landlord override');
      }

      toast({
        title: 'Decisión del Propietario',
        description: `Override procesado: ${decision}`,
        variant: 'default',
      });

      // Refresh policy data
      await fetchPolicy();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar override',
        variant: 'destructive',
      });
    }
  };

  // Contract handlers
  const handleUploadContract = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('contract', file);

      const response = await fetch(`/api/policies/${policyId}/contracts/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload contract');
      }

      toast({
        title: 'Contrato Subido',
        description: `Contrato "${file.name}" subido exitosamente.`,
        variant: 'default',
      });

      // Refresh policy data
      await fetchPolicy();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir contrato',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadContract = async (contractId: string) => {
    toast({
      title: 'Próximamente',
      description: 'Descarga de contratos estará disponible pronto.',
      variant: 'default',
    });
  };

  const handleMarkContractSigned = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/contracts/mark-signed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark contract as signed');
      }

      toast({
        title: 'Contrato Firmado',
        description: 'El contrato ha sido marcado como firmado.',
        variant: 'default',
      });

      // Refresh policy data
      await fetchPolicy();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al marcar contrato firmado',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.pages.policies.details.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">{t.pages.policies.details.errorLoading}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/policies')} className="w-full">
              {t.pages.policies.details.backToPolicies}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t.pages.policies.details.policyNotFound}</CardTitle>
            <CardDescription>
              {t.pages.policies.details.policyNotFoundDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/policies')} className="w-full">
              {t.pages.policies.details.backToPolicies}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <PolicyDetailsHeader
          onBack={() => router.push('/dashboard/policies')}
          status={policy.status}
          onDownloadPDF={handleDownloadPDF}
          downloadingPDF={downloadingPDF}
        />

        {/* Quick Info */}
        <PolicyQuickInfo
          tenantEmail={policy.tenantEmail}
          createdAt={policy.createdAt}
          documentsCount={policy.documents.length}
        />

        {/* Status Actions */}
        <PolicyStatusActions
          status={policy.status}
          onUpdateStatus={updatePolicyStatus}
          updatingStatus={updatingStatus}
        />

        {/* Payment Information */}
        <PolicyPaymentInfo
          packageId={policy.packageId}
          packageName={policy.packageName}
          price={policy.price}
          paymentStatus={policy.paymentStatus}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{t.pages.policies.details.tabs.details}</TabsTrigger>
            <TabsTrigger value="activity">{t.pages.policies.details.tabs.activity}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <PolicyDetailsContent
              profileData={policy.profileData}
              employmentData={policy.employmentData}
              referencesData={policy.referencesData}
            />
            
            {/* Investigation Management */}
            <PolicyInvestigationInfo
              investigation={policy.investigation ? {
                ...policy.investigation,
                createdAt: new Date(policy.investigation.createdAt),
                updatedAt: new Date(policy.investigation.updatedAt),
                completedAt: policy.investigation.completedAt ? new Date(policy.investigation.completedAt) : null,
                rejectedAt: policy.investigation.rejectedAt ? new Date(policy.investigation.rejectedAt) : null
              } : null}
              policyStatus={policy.status}
              onStartInvestigation={() => handleStartInvestigation()}
              onCompleteInvestigation={(verdict) => handleCompleteInvestigation(verdict)}
              onLandlordOverride={(decision, notes) => handleLandlordOverride(decision, notes)}
            />
            
            {/* Contract Management */}
            <PolicyContractInfo
              contracts={policy.contracts.map(contract => ({
                ...contract,
                uploadedAt: new Date(contract.uploadedAt)
              }))}
              policyStatus={policy.status}
              contractSignedAt={policy.contractSignedAt ? new Date(policy.contractSignedAt) : null}
              contractLength={policy.contractLength}
              policyExpiresAt={policy.policyExpiresAt ? new Date(policy.policyExpiresAt) : null}
              onUploadContract={(file) => handleUploadContract(file)}
              onDownloadContract={(contractId) => handleDownloadContract(contractId)}
              onMarkSigned={() => handleMarkContractSigned()}
            />
            
            <PolicyDocuments
              documents={policy.documents}
              onDownloadDocument={handleDownloadDocument}
              downloadingDoc={downloadingDoc}
            />
          </TabsContent>

          <TabsContent value="activity">
            <PolicyActivityLog activities={policy.activities} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}