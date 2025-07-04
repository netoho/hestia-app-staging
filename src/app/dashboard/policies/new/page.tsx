
'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { CreatePolicyProfileForm } from '@/components/forms/CreatePolicyProfileForm';
import { CreatePolicyEmploymentForm } from '@/components/forms/CreatePolicyEmploymentForm';
import { CreatePolicyReferencesForm } from '@/components/forms/CreatePolicyReferencesForm';
import { CreatePolicyDocumentsForm } from '@/components/forms/CreatePolicyDocumentsForm';
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
        <ol className="flex items-center w-full">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`flex w-full items-center ${
                index < steps.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-4 after:inline-block" : ""
              } ${step.id < currentStep ? 'after:border-primary' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 ${
                  step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                 <span className="font-bold">{step.id}</span>
              </div>
            </li>
          ))}
        </ol>
         <div className="mt-3 hidden md:flex justify-between">
            {steps.map(step => (
                 <div key={step.id} className="text-center w-40">
                    <p className={`font-medium text-sm ${
                        step.id === currentStep ? 'text-primary' : 'text-muted-foreground'
                    }`}>{step.name}</p>
                 </div>
            ))}
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardContent className="p-6">
          {currentStep === 1 && <CreatePolicyProfileForm onNext={handleNextStep} />}
          {currentStep === 2 && <CreatePolicyEmploymentForm onNext={handleNextStep} onBack={handlePrevStep} />}
          {currentStep === 3 && <CreatePolicyReferencesForm onNext={handleNextStep} onBack={handlePrevStep} />}
          {currentStep === 4 && <CreatePolicyDocumentsForm onNext={handleNextStep} onBack={handlePrevStep} />}
          {/* Future steps will be rendered here */}
          {currentStep === 5 && (
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold">Payment Step</h2>
                <p>Payment form will be implemented here.</p>
                <Button onClick={handlePrevStep} variant="outline" className="mt-4">Back</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
