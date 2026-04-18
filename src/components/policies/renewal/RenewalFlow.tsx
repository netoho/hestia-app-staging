'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';
import { t } from '@/lib/i18n';
import type {
  PolicyRenewalSelection,
} from '@/lib/schemas/policy/renewalSelection';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';
import { RenewalSelector } from './RenewalSelector';
import { RenewalPreview } from './RenewalPreview';
import type { RenewalSourceSummary } from './types';

interface RenewalFlowProps {
  source: RenewalSourceSummary;
  sourcePolicyId: string;
}

function defaultSelection(source: RenewalSourceSummary): PolicyRenewalSelection {
  return {
    property: {
      address: true,
      typeAndDescription: true,
      features: true,
      services: true,
    },
    policyTerms: {
      guarantorType: source.guarantorType,
      financial: true,
      contract: true,
      packageAndPricing: true,
    },
    landlord: {
      include: true,
      basicInfo: true,
      contact: true,
      address: true,
      banking: true,
      propertyDeed: true,
      cfdi: true,
      documents: true,
    },
    tenant: {
      include: !!source.tenant,
      basicInfo: true,
      contact: true,
      address: true,
      employment: true,
      rentalHistory: true,
      references: true,
      paymentPreferences: true,
      documents: true,
    },
    jointObligors: source.jointObligors.map((jo) => ({
      sourceId: jo.id,
      include: true,
      basicInfo: true,
      contact: true,
      address: true,
      employment: true,
      guarantee: true,
      marital: true,
      references: true,
      documents: true,
    })),
    avals: source.avals.map((av) => ({
      sourceId: av.id,
      include: true,
      basicInfo: true,
      contact: true,
      address: true,
      employment: true,
      guaranteeProperty: true,
      marital: true,
      references: true,
      documents: true,
    })),
  };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function oneYearFromIso(start: string) {
  const d = start ? new Date(start) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function RenewalFlow({ source, sourcePolicyId }: RenewalFlowProps) {
  const copy = t.pages.policyRenewal;
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [selection, setSelection] = React.useState<PolicyRenewalSelection>(() =>
    defaultSelection(source),
  );
  const [startDate, setStartDate] = React.useState<string>(() => todayIso());
  const [endDate, setEndDate] = React.useState<string>(() => oneYearFromIso(todayIso()));
  const [dateError, setDateError] = React.useState<string | undefined>(undefined);

  const renewMutation = trpc.policy.renew.useMutation();

  const validateDates = (): boolean => {
    if (!startDate || !endDate) {
      setDateError(copy.datesRequired);
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setDateError(copy.endDateAfterStart);
      return false;
    }
    setDateError(undefined);
    return true;
  };

  const goToPreview = () => {
    if (!validateDates()) return;
    setStep(2);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep(1);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateDates()) {
      setStep(1);
      return;
    }
    try {
      const result = await renewMutation.mutateAsync({
        sourcePolicyId,
        selection,
        startDate,
        endDate,
      });
      toast({
        title: copy.success,
        description: copy.successDescription(
          result.newPolicyNumber,
          result.documentsCopied,
          result.documentsFailed,
        ),
      });
      router.push(`/dashboard/policies/${result.newPolicyId}`);
    } catch (err) {
      toast({
        title: copy.error,
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/policies/${sourcePolicyId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {copy.pageSubtitle(source.policyNumber)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className={step === 1 ? 'font-semibold' : 'text-muted-foreground'}>
          1. {copy.step1Label}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className={step === 2 ? 'font-semibold' : 'text-muted-foreground'}>
          2. {copy.step2Label}
        </span>
      </div>

      {step === 1 ? (
        <RenewalSelector
          source={source}
          selection={selection}
          onSelectionChange={setSelection}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          dateError={dateError}
        />
      ) : (
        <RenewalPreview
          source={source}
          selection={selection}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t">
        {step === 1 ? (
          <>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/policies/${sourcePolicyId}`)}
            >
              {copy.backToPolicy}
            </Button>
            <Button onClick={goToPreview}>
              {copy.next}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.back}
            </Button>
            <Button onClick={handleSubmit} disabled={renewMutation.isPending}>
              {renewMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default RenewalFlow;
