
'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { CreatePolicyProfileForm } from '@/components/forms/CreatePolicyProfileForm';
import { CreatePolicyEmploymentForm } from '@/components/forms/CreatePolicyEmploymentForm';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n';

const steps = [
  { id: 1, name: t.pages.newPolicy.steps.profile },
  { id: 2, name: t.pages.newPolicy.steps.employment },
  { id: 3, name: t.pages.newPolicy.steps.references },
  { id: 4, name: t.pages.newPolicy.steps.documents },
  { id: 5, name: t.pages.newPolicy.steps.payment },
];

export default function NewPolicyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  const handleNextStep = (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep((prev) => (prev < steps.length ? prev + 1 : prev));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => (prev > 1 ? prev - 1 : prev));
  };


  return (
    <div>
      <PageTitle
        title={t.pages.newPolicy.title}
        subtitle={t.pages.newPolicy.subtitle}
      />
      
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.id < currentStep
                    ? 'bg-primary/50 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id}
              </div>
              <p className={`ml-2 font-medium ${
                  step.id === currentStep ? 'text-primary' : 'text-foreground'
                }`}>{step.name}</p>
              {index < steps.length - 1 && (
                <div className="mx-4 h-px w-16 flex-1 bg-border"></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardContent className="p-6">
          {currentStep === 1 && <CreatePolicyProfileForm onNext={handleNextStep} />}
          {currentStep === 2 && <CreatePolicyEmploymentForm onNext={handleNextStep} onBack={handlePrevStep} />}
          {/* Future steps will be rendered here */}
        </CardContent>
      </Card>
    </div>
  );
}
