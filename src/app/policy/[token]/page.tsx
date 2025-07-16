'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { PolicyStatus, PolicyStatusType } from '@/lib/prisma-types';
import { POLICY_STATUS_DISPLAY, POLICY_STEPS } from '@/lib/types/policy';
import { PolicyWizard } from '@/components/tenant/PolicyWizard';
import { t } from '@/lib/i18n';

interface PolicyData {
  id: string;
  status: PolicyStatusType;
  currentStep: number;
  tenantEmail: string;
  profileData?: any;
  employmentData?: any;
  referencesData?: any;
  documentsData?: any;
  documents: Array<{
    id: string;
    category: string;
    originalName: string;
    fileSize: number;
    uploadedAt: string;
  }>;
}

export default function TenantPolicyPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tenant/${token}`, {
        cache: 'no-store', // Ensure we always get fresh data
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t.wizard.messages.invalidLink);
        }
        throw new Error(t.wizard.messages.failedToLoad);
      }
      
      const data = await response.json();
      setPolicy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.wizard.messages.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPolicy();
    }
  }, [token]);

  const getStepProgress = (currentStep: number, status: PolicyStatusType) => {
    if (status === PolicyStatus.SUBMITTED || status === PolicyStatus.APPROVED || status === PolicyStatus.DENIED || status === PolicyStatus.UNDER_REVIEW) {
      return 100;
    }

    return (currentStep / 4) * 100;
  };

  const getStepProgressMessage = (currentStep: number, status: PolicyStatusType) => {
    if (status === PolicyStatus.SUBMITTED || status === PolicyStatus.APPROVED) {
      return `100% Complete`
    }


    if (status === PolicyStatus.UNDER_REVIEW || status === PolicyStatus.DENIED) {
      return ``
    }

    return `${Math.round(getStepProgress(currentStep, status))}% Complete`
  }

  const isApplicationComplete = (status: PolicyStatusType) => {
    return status === PolicyStatus.SUBMITTED || 
           status === PolicyStatus.UNDER_REVIEW || 
           status === PolicyStatus.APPROVED || 
           status === PolicyStatus.DENIED;
  };

  const getStatusIcon = (status: PolicyStatusType) => {
    switch (status) {
      case PolicyStatus.APPROVED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case PolicyStatus.DENIED:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case PolicyStatus.SUBMITTED:
      case PolicyStatus.UNDER_REVIEW:
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-orange-500" />;
    }
  };

  const getStatusMessage = (status: PolicyStatusType) => {
    switch (status) {
      case PolicyStatus.SENT_TO_TENANT:
        return t.wizard.status.welcome;
      case PolicyStatus.IN_PROGRESS:
        return t.wizard.status.inProgress;
      case PolicyStatus.SUBMITTED:
        return t.wizard.status.submitted;
      case PolicyStatus.UNDER_REVIEW:
        return t.wizard.status.underReview;
      case PolicyStatus.APPROVED:
        return t.wizard.status.approved;
      case PolicyStatus.DENIED:
        return t.wizard.status.denied;
      default:
        return t.wizard.status.unknown;
    }
  };

  const canEdit = (status: PolicyStatusType) => {
    return status === PolicyStatus.SENT_TO_TENANT || status === PolicyStatus.IN_PROGRESS;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.wizard.messages.loadingApplication}</p>
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
            <CardTitle className="text-red-600">{t.wizard.messages.accessError}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              {t.wizard.messages.accessErrorDescription}
            </p>
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
            <CardTitle>{t.wizard.messages.policyNotFound}</CardTitle>
            <CardDescription>
              {t.wizard.messages.policyNotFoundDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {t.wizard.header.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {t.wizard.header.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(policy.status)}
                <Badge variant={policy.status === PolicyStatus.APPROVED ? 'default' : 'secondary'}>
                  {POLICY_STATUS_DISPLAY[policy.status]}
                </Badge>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{t.wizard.header.applicationProgress}</span>
                <span className="text-sm text-muted-foreground">
                  {getStepProgressMessage(policy.currentStep, policy.status)}
                </span>
              </div>
              <Progress 
                value={getStepProgress(policy.currentStep, policy.status)} 
                className="h-2"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Status Message */}
        <Alert className="mb-6">
          <AlertDescription className="text-base">
            {getStatusMessage(policy.status)}
          </AlertDescription>
        </Alert>

        {/* Application Form or Status Display */}
        {canEdit(policy.status) ? (
          <PolicyWizard 
            token={token}
            policy={policy}
            onUpdate={fetchPolicy}
          />
        ) : (
          <div className="space-y-6">
            {/* Submission Success Message */}
            {isApplicationComplete(policy.status) && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <CardTitle className="text-green-800">
                    {t.wizard.status.submittedTitle}
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    {t.wizard.status.submittedDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-2 text-sm text-green-700">
                    {t.wizard.status.notifications.map((notification, index) => (
                      <p key={index}>{notification}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Application Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t.wizard.summary.title}</CardTitle>
                <CardDescription>
                  {policy.status === PolicyStatus.SUBMITTED 
                    ? t.wizard.summary.submitted
                    : policy.status === PolicyStatus.UNDER_REVIEW
                    ? t.wizard.summary.underReview
                    : policy.status === PolicyStatus.APPROVED
                    ? t.wizard.summary.approved
                    : t.wizard.summary.denied
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">{t.wizard.summary.informationSent}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${policy.profileData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{t.wizard.summary.personalInfo} {policy.profileData ? t.wizard.summary.complete : t.wizard.summary.incomplete}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${policy.employmentData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{t.wizard.summary.employmentInfo} {policy.employmentData ? t.wizard.summary.complete : t.wizard.summary.incomplete}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${policy.referencesData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{t.wizard.summary.references} {policy.referencesData ? t.wizard.summary.complete : t.wizard.summary.incomplete}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${policy.documents.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>{t.wizard.summary.documents} {policy.documents.length} {t.wizard.summary.uploaded}</span>
                    </div>
                  </div>
                </div>

                {policy.documents.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">{t.wizard.summary.uploadedDocuments}</h3>
                    <div className="space-y-2">
                      {policy.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{doc.originalName}</span>
                          <Badge variant="outline" className="text-xs">
                            {doc.category === 'identification' ? t.wizard.summary.identification : 
                             doc.category === 'income' ? t.wizard.summary.income : t.wizard.review.optional}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    <p><strong>{t.wizard.summary.email}</strong> {policy.tenantEmail}</p>
                    {policy.status === PolicyStatus.SUBMITTED && (
                      <p><strong>{t.wizard.summary.sent}</strong> {new Date().toLocaleDateString('es-MX')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
