'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { PolicyStatus } from '@prisma/client';
import { POLICY_STATUS_DISPLAY, POLICY_STATUS_COLORS } from '@/lib/types/policy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PolicyDetails {
  id: string;
  tenantEmail: string;
  tenantPhone?: string;
  status: PolicyStatus;
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

  const { toast } = useToast();
  const { token } = useAuth();

  const fetchPolicy = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Policy not found');
        }
        throw new Error('Failed to load policy details');
      }

      const data = await response.json();
      setPolicy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && policyId) {
      fetchPolicy();
    }
  }, [token, policyId]);

  const getStatusBadgeVariant = (status: PolicyStatus) => {
    const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gray: 'secondary',
      blue: 'default',
      yellow: 'outline',
      orange: 'outline',
      purple: 'default',
      green: 'default',
      red: 'destructive',
    };
    return colorMap[POLICY_STATUS_COLORS[status]] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
      case 'initiated':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'sent':
      case 'resent':
        return <User className="h-4 w-4 text-orange-500" />;
      case 'step_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'document_uploaded':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'submitted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-700" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.action) {
      case 'created':
        return 'Solicitud de póliza creada';
      case 'sent':
        return 'Invitación enviada al inquilino';
      case 'resent':
        return 'Invitación reenviada al inquilino';
      case 'step_completed':
        return `Paso ${activity.details?.step || ''} completado`;
      case 'document_uploaded':
        return `Documento subido: ${activity.details?.fileName || 'archivo'}`;
      case 'submitted':
        return 'Solicitud enviada para revisión';
      case 'approved':
        return 'Solicitud aprobada';
      case 'denied':
        return 'Solicitud denegada';
      default:
        return activity.action;
    }
  };

  const updatePolicyStatus = async (newStatus: PolicyStatus, reason?: string) => {
    if (!token || !policy) return;
    
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/policies/${policy.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
        title: 'Status Updated',
        description: `Policy status changed to ${POLICY_STATUS_DISPLAY[newStatus]}`,
      });
    } catch (error) {
      console.error('Error updating policy status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading policy details...</p>
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
            <CardTitle className="text-red-600">Error Loading Policy</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/policies')} className="w-full">
              Back to Policies
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
            <CardTitle>Policy Not Found</CardTitle>
            <CardDescription>
              The requested policy could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/policies')} className="w-full">
              Back to Policies
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
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/policies')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Policies
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Policy Details</h1>
              <p className="text-muted-foreground">
                Manage and review policy application details
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={getStatusBadgeVariant(policy.status)} className="text-sm">
                {POLICY_STATUS_DISPLAY[policy.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tenant Email</p>
                <p className="font-medium">{policy.tenantEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(policy.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="font-medium">{policy.documents.length} files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Actions */}
        {(policy.status === PolicyStatus.SUBMITTED || policy.status === PolicyStatus.UNDER_REVIEW) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Review Actions</CardTitle>
              <CardDescription>
                Change the status of this policy application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={() => updatePolicyStatus(PolicyStatus.APPROVED)}
                  disabled={updatingStatus}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => updatePolicyStatus(PolicyStatus.DENIED, 'Additional review required')}
                  disabled={updatingStatus}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny
                </Button>
                <Button
                  onClick={() => updatePolicyStatus(PolicyStatus.UNDER_REVIEW)}
                  disabled={updatingStatus}
                  variant="outline"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Under Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Application Data</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Profile Data */}
            {policy.profileData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{policy.profileData.nationality === 'mexican' ? 'Mexicana' : 'Extranjera'}</p>
                    </div>
                    {policy.profileData.curp && (
                      <div>
                        <p className="text-sm text-muted-foreground">CURP</p>
                        <p className="font-medium">{policy.profileData.curp}</p>
                      </div>
                    )}
                    {policy.profileData.passport && (
                      <div>
                        <p className="text-sm text-muted-foreground">Passport</p>
                        <p className="font-medium">{policy.profileData.passport}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employment Data */}
            {policy.employmentData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Employment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Employment Status</p>
                      <p className="font-medium">{policy.employmentData.employmentStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{policy.employmentData.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{policy.employmentData.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p className="font-medium">{policy.employmentData.position}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Income</p>
                      <p className="font-medium">${policy.employmentData.monthlyIncome?.toLocaleString()} MXN</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Check Consent</p>
                      <p className="font-medium">{policy.employmentData.creditCheckConsent ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* References Data */}
            {policy.referencesData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Personal Reference</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{policy.referencesData.personalReferenceName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{policy.referencesData.personalReferencePhone}</p>
                        </div>
                      </div>
                    </div>
                    
                    {policy.referencesData.workReferenceName && (
                      <div>
                        <h4 className="font-medium mb-2">Work Reference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{policy.referencesData.workReferenceName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{policy.referencesData.workReferencePhone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {policy.referencesData.landlordReferenceName && (
                      <div>
                        <h4 className="font-medium mb-2">Landlord Reference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{policy.referencesData.landlordReferenceName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{policy.referencesData.landlordReferencePhone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {policy.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uploaded Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {policy.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(doc.fileSize)} • Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {doc.category === 'identification' ? 'ID' : 
                           doc.category === 'income' ? 'Income' : 'Optional'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                  Complete history of actions taken on this policy application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {policy.activities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        {getActivityIcon(activity.action)}
                        {index < policy.activities.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{getActivityDescription(activity)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.performedBy === 'tenant' ? 'Performed by tenant' : 
                           activity.performedBy ? `Performed by staff` : 'System action'}
                        </p>
                        {activity.details && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(activity.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}