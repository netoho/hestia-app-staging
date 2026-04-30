'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { formatDateLong } from '@/lib/utils/formatting';
import type { PolicyRenewalSelection } from '@/lib/schemas/policy/renewalSelection';
import type { RenewalSourceSummary } from './types';

interface RenewalPreviewProps {
  source: RenewalSourceSummary;
  selection: PolicyRenewalSelection;
  startDate: string;
  endDate: string;
}

function Row({ label, copied }: { label: string; copied: boolean }) {
  const copy = t.pages.policyRenewal;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <Badge
        variant={copied ? 'default' : 'outline'}
        className="shrink-0 gap-1"
      >
        {copied ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        {copied ? copy.previewCopied : copy.previewBlank}
      </Badge>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

export function RenewalPreview({
  source,
  selection,
  startDate,
  endDate,
}: RenewalPreviewProps) {
  const copy = t.pages.policyRenewal;
  const gt = selection.policyTerms.guarantorType;
  const showJOs = gt === 'JOINT_OBLIGOR' || gt === 'BOTH';
  const showAvals = gt === 'AVAL' || gt === 'BOTH';

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/50 p-4 text-sm">
        {copy.previewIntro}
      </div>

      <Section title={copy.datesTitle}>
        <Row label={copy.startDate} copied={true} />
        <Row label={copy.endDate} copied={true} />
        <div className="py-1.5 text-sm text-muted-foreground">
          {startDate ? formatDateLong(startDate) : '—'}
          {' → '}
          {endDate ? formatDateLong(endDate) : '—'}
        </div>
      </Section>

      <Section title={copy.policyTermsTitle}>
        <Row
          label={copy.guarantorType}
          copied={true}
        />
        <div className="py-1.5 text-sm text-muted-foreground">
          {copy.guarantorOptions[gt]}
        </div>
        <Row label={copy.financial} copied={selection.policyTerms.financial} />
        <Row label={copy.contract} copied={selection.policyTerms.contract} />
        <Row label={copy.packageAndPricing} copied={selection.policyTerms.packageAndPricing} />
      </Section>

      <Section title={copy.propertyTitle}>
        <Row label={copy.propertyAddress} copied={selection.property.address} />
        <Row label={copy.propertyTypeAndDescription} copied={selection.property.typeAndDescription} />
        <Row label={copy.propertyFeatures} copied={selection.property.features} />
        <Row label={copy.propertyServices} copied={selection.property.services} />
      </Section>

      <Section
        title={`${copy.landlordTitle}${source.landlord.displayName ? ` — ${source.landlord.displayName}` : ''}`}
      >
        <Row label={copy.landlordBasicInfo} copied={selection.landlord.include && selection.landlord.basicInfo} />
        <Row label={copy.landlordContact} copied={selection.landlord.include && selection.landlord.contact} />
        <Row label={copy.landlordAddress} copied={selection.landlord.include && selection.landlord.address} />
        <Row label={copy.landlordBanking} copied={selection.landlord.include && selection.landlord.banking} />
        <Row label={copy.landlordPropertyDeed} copied={selection.landlord.include && selection.landlord.propertyDeed} />
        <Row label={copy.landlordCfdi} copied={selection.landlord.include && selection.landlord.cfdi} />
        <Row
          label={`${copy.landlordDocuments} (${copy.previewDocuments(source.landlord.documentCount)})`}
          copied={selection.landlord.include && selection.landlord.documents}
        />
      </Section>

      {source.tenant ? (
        <Section
          title={`${copy.tenantTitle}${source.tenant.displayName ? ` — ${source.tenant.displayName}` : ''}`}
        >
          <Row label={copy.tenantBasicInfo} copied={selection.tenant.include && selection.tenant.basicInfo} />
          <Row label={copy.tenantContact} copied={selection.tenant.include && selection.tenant.contact} />
          <Row label={copy.tenantAddress} copied={selection.tenant.include && selection.tenant.address} />
          <Row label={copy.tenantEmployment} copied={selection.tenant.include && selection.tenant.employment} />
          <Row label={copy.tenantRentalHistory} copied={selection.tenant.include && selection.tenant.rentalHistory} />
          <Row label={copy.tenantReferences} copied={selection.tenant.include && selection.tenant.references} />
          <Row label={copy.tenantPaymentPreferences} copied={selection.tenant.include && selection.tenant.paymentPreferences} />
          <Row
            label={`${copy.tenantDocuments} (${copy.previewDocuments(source.tenant.documentCount)})`}
            copied={selection.tenant.include && selection.tenant.documents}
          />
        </Section>
      ) : null}

      {showJOs &&
        source.jointObligors.map((jo) => {
          const sel = selection.jointObligors.find((s) => s.sourceId === jo.id);
          if (!sel) return null;
          return (
            <Section
              key={jo.id}
              title={`${copy.jointObligorTitle} — ${jo.displayName}`}
            >
              <Row label={copy.jointObligorBasicInfo} copied={sel.include && sel.basicInfo} />
              <Row label={copy.jointObligorContact} copied={sel.include && sel.contact} />
              <Row label={copy.jointObligorAddress} copied={sel.include && sel.address} />
              <Row label={copy.jointObligorEmployment} copied={sel.include && sel.employment} />
              <Row label={copy.jointObligorGuarantee} copied={sel.include && sel.guarantee} />
              <Row label={copy.jointObligorMarital} copied={sel.include && sel.marital} />
              <Row label={copy.jointObligorReferences} copied={sel.include && sel.references} />
              <Row
                label={`${copy.jointObligorDocuments} (${copy.previewDocuments(jo.documentCount)})`}
                copied={sel.include && sel.documents}
              />
            </Section>
          );
        })}

      {showAvals &&
        source.avals.map((av) => {
          const sel = selection.avals.find((s) => s.sourceId === av.id);
          if (!sel) return null;
          return (
            <Section
              key={av.id}
              title={`${copy.avalTitle} — ${av.displayName}`}
            >
              <Row label={copy.avalBasicInfo} copied={sel.include && sel.basicInfo} />
              <Row label={copy.avalContact} copied={sel.include && sel.contact} />
              <Row label={copy.avalAddress} copied={sel.include && sel.address} />
              <Row label={copy.avalEmployment} copied={sel.include && sel.employment} />
              <Row label={copy.avalGuaranteeProperty} copied={sel.include && sel.guaranteeProperty} />
              <Row label={copy.avalMarital} copied={sel.include && sel.marital} />
              <Row label={copy.avalReferences} copied={sel.include && sel.references} />
              <Row
                label={`${copy.avalDocuments} (${copy.previewDocuments(av.documentCount)})`}
                copied={sel.include && sel.documents}
              />
            </Section>
          );
        })}
    </div>
  );
}

export default RenewalPreview;
