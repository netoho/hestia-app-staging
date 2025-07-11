'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronLeft, ChevronRight, Upload, Send } from 'lucide-react';
import { PolicyStatus } from '@prisma/client';
import { POLICY_STEPS } from '@/lib/types/policy';
import { CreatePolicyProfileForm } from '@/components/forms/CreatePolicyProfileForm';
import { CreatePolicyEmploymentForm } from '@/components/forms/CreatePolicyEmploymentForm';
import { CreatePolicyReferencesForm } from '@/components/forms/CreatePolicyReferencesForm';
import { CreatePolicyDocumentsForm } from '@/components/forms/CreatePolicyDocumentsForm';
import { PolicyReviewStep } from '@/components/tenant/PolicyReviewStep';
import { useToast } from '@/hooks/use-toast';

interface PolicyWizardProps {
  token: string;
  policy: {
    id: string;
    status: PolicyStatus;
    currentStep: number;
    profileData?: any;
    employmentData?: any;
    referencesData?: any;
    documentsData?: any;
  };
  onUpdate: () => void;
}

const stepTitles: Record<number, string> = {
  1: 'Profile Information',
  2: 'Employment Details',
  3: 'References',
  4: 'Documents Upload',
  5: 'Review & Submit'
};

export function PolicyWizard({ token, policy, onUpdate }: PolicyWizardProps) {
  const [currentStep, setCurrentStep] = useState(Math.max(1, policy.currentStep));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { toast } = useToast();

  // Update currentStep when policy changes, but not when we're navigating
  useEffect(() => {
    if (!isNavigating) {
      // Always sync with the policy's currentStep when not navigating
      // This ensures we're always on the correct step
      setCurrentStep(Math.max(1, policy.currentStep));
    }
  }, [policy.currentStep, isNavigating]);

  const handleStepComplete = async (stepData: any) => {
    try {
      setIsNavigating(true);
      
      const response = await fetch(`/api/tenant/${token}/step/${currentStep}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save step data');
      }

      const result = await response.json();
      
      // Update parent to refresh policy data
      // The backend has already advanced the currentStep
      await onUpdate();
      
      toast({
        title: 'Progress Saved',
        description: `Step ${currentStep} completed successfully.`,
      });
    } catch (error) {
      console.error('Error saving step:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save progress',
        variant: 'destructive',
      });
    } finally {
      // Reset navigation flag after a delay
      setTimeout(() => setIsNavigating(false), 300);
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tenant/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit application');
      }

      await onUpdate();
      
      toast({
        title: 'Application Submitted!',
        description: 'Your rental application has been submitted successfully.',
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setIsNavigating(true);
      setCurrentStep(currentStep - 1);
      setTimeout(() => setIsNavigating(false), 300);
    }
  };

  const handleStepClick = (step: number) => {
    if (isStepAccessible(step)) {
      setIsNavigating(true);
      setCurrentStep(step);
      setTimeout(() => setIsNavigating(false), 300);
    }
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  const isStepAccessible = (step: number) => {
    // Allow access to completed steps and current step
    return step <= Math.max(currentStep, policy.currentStep);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CreatePolicyProfileForm 
            onNext={handleStepComplete}
          />
        );
      case 2:
        return (
          <CreatePolicyEmploymentForm
            onNext={handleStepComplete}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <CreatePolicyReferencesForm
            onNext={handleStepComplete}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CreatePolicyDocumentsForm
            token={token}
            policyId={policy.id}
            onNext={handleStepComplete}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <PolicyReviewStep
            policy={policy}
            onSubmit={handleSubmitApplication}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((step) => {
              const status = getStepStatus(step);
              const accessible = isStepAccessible(step);
              
              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 cursor-pointer transition-colors ${
                    accessible ? 'hover:text-primary' : 'cursor-not-allowed opacity-50'
                  }`}
                  onClick={() => handleStepClick(step)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                      status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : status === 'current'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  
                  {step < 5 && (
                    <div
                      className={`hidden md:block w-24 h-0.5 ${
                        step < currentStep ? 'bg-green-500' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={(currentStep / 5) * 100} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Step {currentStep} of 5</span>
              <span>{Math.round((currentStep / 5) * 100)}% Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {currentStep}
            </span>
            {stepTitles[currentStep as keyof typeof stepTitles]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}