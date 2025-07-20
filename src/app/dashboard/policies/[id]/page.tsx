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
      setPolicy(data);
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