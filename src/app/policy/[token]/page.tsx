'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { PolicyStatus } from '@prisma/client';
import { POLICY_STATUS_DISPLAY, POLICY_STEPS } from '@/lib/types/policy';
import { PolicyWizard } from '@/components/tenant/PolicyWizard';

interface PolicyData {
  id: string;
  status: PolicyStatus;
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
      const response = await fetch(`/api/tenant/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Invalid or expired link. Please contact your agent for a new invitation.');
        }
        throw new Error('Failed to load policy application');
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
    if (token) {
      fetchPolicy();
    }
  }, [token]);

  const getStepProgress = (currentStep: number, status: PolicyStatus) => {
    if (status === PolicyStatus.SUBMITTED || status === PolicyStatus.APPROVED || status === PolicyStatus.DENIED) {
      return 100;
    }
    return (currentStep / 4) * 100;
  };

  const getStatusIcon = (status: PolicyStatus) => {
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

  const getStatusMessage = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.SENT_TO_TENANT:
        return "Welcome! Please complete the application form below.";
      case PolicyStatus.IN_PROGRESS:
        return "Your application is in progress. Continue where you left off.";
      case PolicyStatus.SUBMITTED:
        return "Application submitted successfully! We'll review your information and get back to you soon.";
      case PolicyStatus.UNDER_REVIEW:
        return "Your application is currently under review. We'll notify you of our decision soon.";
      case PolicyStatus.APPROVED:
        return "Congratulations! Your application has been approved.";
      case PolicyStatus.DENIED:
        return "Your application has been reviewed. Please contact us for more information.";
      default:
        return "Application status unknown.";
    }
  };

  const canEdit = (status: PolicyStatus) => {
    return status === PolicyStatus.SENT_TO_TENANT || status === PolicyStatus.IN_PROGRESS;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your application...</p>
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
            <CardTitle className="text-red-600">Access Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              If you continue to experience issues, please contact your agent for assistance.
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
            <CardTitle>Policy Not Found</CardTitle>
            <CardDescription>
              The requested policy application could not be found.
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
                  Hestia Policy Application
                </CardTitle>
                <CardDescription className="text-base">
                  Complete your rental application below
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
                <span className="text-sm font-medium">Application Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(getStepProgress(policy.currentStep, policy.status))}% Complete
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
          <Card>
            <CardHeader>
              <CardTitle>Application Summary</CardTitle>
              <CardDescription>
                Your application has been submitted and is being processed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Submitted Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Email:</strong> {policy.tenantEmail}
                  </div>
                  <div>
                    <strong>Documents:</strong> {policy.documents.length} files uploaded
                  </div>
                  <div>
                    <strong>Profile:</strong> {policy.profileData ? 'Complete' : 'Incomplete'}
                  </div>
                  <div>
                    <strong>Employment:</strong> {policy.employmentData ? 'Complete' : 'Incomplete'}
                  </div>
                  <div>
                    <strong>References:</strong> {policy.referencesData ? 'Complete' : 'Incomplete'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}