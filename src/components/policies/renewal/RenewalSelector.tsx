'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';
import { t } from '@/lib/i18n';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';
import type {
  PolicyRenewalSelection,
  PropertyRenewalSelection,
  LandlordRenewalSelection,
  TenantRenewalSelection,
  JointObligorRenewalSelection,
  AvalRenewalSelection,
} from '@/lib/schemas/policy/renewalSelection';
import { SectionCard } from './SectionCard';
import { PolicyTermsCard } from './PolicyTermsCard';
import type { RenewalSourceSummary } from './types';

interface RenewalSelectorProps {
  source: RenewalSourceSummary;
  selection: PolicyRenewalSelection;
  onSelectionChange: (next: PolicyRenewalSelection) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  dateError?: string;
}

const propertySubs = (copy: typeof t.pages.policyRenewal) => [
  { key: 'address', label: copy.propertyAddress },
  { key: 'typeAndDescription', label: copy.propertyTypeAndDescription },
  { key: 'features', label: copy.propertyFeatures },
  { key: 'services', label: copy.propertyServices },
];

const landlordSubs = (copy: typeof t.pages.policyRenewal) => [
  { key: 'basicInfo', label: copy.landlordBasicInfo },
  { key: 'contact', label: copy.landlordContact },
  { key: 'address', label: copy.landlordAddress },
  { key: 'banking', label: copy.landlordBanking },
  { key: 'propertyDeed', label: copy.landlordPropertyDeed },
  { key: 'cfdi', label: copy.landlordCfdi },
  { key: 'documents', label: copy.landlordDocuments },
];

const tenantSubs = (copy: typeof t.pages.policyRenewal) => [
  { key: 'basicInfo', label: copy.tenantBasicInfo },
  { key: 'contact', label: copy.tenantContact },
  { key: 'address', label: copy.tenantAddress },
  { key: 'employment', label: copy.tenantEmployment },
  { key: 'rentalHistory', label: copy.tenantRentalHistory },
  { key: 'references', label: copy.tenantReferences },
  { key: 'paymentPreferences', label: copy.tenantPaymentPreferences },
  { key: 'documents', label: copy.tenantDocuments },
];

const joSubs = (copy: typeof t.pages.policyRenewal) => [
  { key: 'basicInfo', label: copy.jointObligorBasicInfo },
  { key: 'contact', label: copy.jointObligorContact },
  { key: 'address', label: copy.jointObligorAddress },
  { key: 'employment', label: copy.jointObligorEmployment },
  { key: 'guarantee', label: copy.jointObligorGuarantee },
  { key: 'marital', label: copy.jointObligorMarital },
  { key: 'references', label: copy.jointObligorReferences },
  { key: 'documents', label: copy.jointObligorDocuments },
];

const avalSubs = (copy: typeof t.pages.policyRenewal) => [
  { key: 'basicInfo', label: copy.avalBasicInfo },
  { key: 'contact', label: copy.avalContact },
  { key: 'address', label: copy.avalAddress },
  { key: 'employment', label: copy.avalEmployment },
  { key: 'guaranteeProperty', label: copy.avalGuaranteeProperty },
  { key: 'marital', label: copy.avalMarital },
  { key: 'references', label: copy.avalReferences },
  { key: 'documents', label: copy.avalDocuments },
];

function showJOs(gt: GuarantorType) {
  return gt === 'JOINT_OBLIGOR' || gt === 'BOTH';
}
function showAvals(gt: GuarantorType) {
  return gt === 'AVAL' || gt === 'BOTH';
}

export function RenewalSelector({
  source,
  selection,
  onSelectionChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  dateError,
}: RenewalSelectorProps) {
  const copy = t.pages.policyRenewal;

  const setProperty = (patch: Partial<PropertyRenewalSelection>) =>
    onSelectionChange({ ...selection, property: { ...selection.property, ...patch } });
  const setLandlord = (patch: Partial<LandlordRenewalSelection>) =>
    onSelectionChange({ ...selection, landlord: { ...selection.landlord, ...patch } });
  const setTenant = (patch: Partial<TenantRenewalSelection>) =>
    onSelectionChange({ ...selection, tenant: { ...selection.tenant, ...patch } });
  const setJO = (idx: number, patch: Partial<JointObligorRenewalSelection>) => {
    const next = [...selection.jointObligors];
    next[idx] = { ...next[idx], ...patch };
    onSelectionChange({ ...selection, jointObligors: next });
  };
  const setAval = (idx: number, patch: Partial<AvalRenewalSelection>) => {
    const next = [...selection.avals];
    next[idx] = { ...next[idx], ...patch };
    onSelectionChange({ ...selection, avals: next });
  };

  const gt = selection.policyTerms.guarantorType;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-md border bg-muted/50 p-4 text-sm space-y-2">
        <p>{copy.intro}</p>
        <p className="flex items-start gap-2 text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{copy.confirmRequirement}</span>
        </p>
      </div>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{copy.datesTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.datesSubtitle}</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">{copy.startDate}</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">{copy.endDate}</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          {dateError ? (
            <p className="text-sm text-destructive sm:col-span-2">{dateError}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Policy terms (prominent) */}
      <PolicyTermsCard
        value={selection.policyTerms}
        onChange={(v) => onSelectionChange({ ...selection, policyTerms: v })}
      />

      {/* Property */}
      <SectionCard
        title={copy.propertyTitle}
        subs={propertySubs(copy)}
        values={selection.property}
        onChange={(k, v) => setProperty({ [k]: v } as Partial<PropertyRenewalSelection>)}
      />

      {/* Landlord */}
      <SectionCard
        title={`${copy.landlordTitle}${source.landlord.displayName ? ` — ${source.landlord.displayName}` : ''}`}
        included={selection.landlord.include}
        onIncludedChange={(v) => setLandlord({ include: v })}
        subs={landlordSubs(copy)}
        values={selection.landlord}
        onChange={(k, v) => setLandlord({ [k]: v } as Partial<LandlordRenewalSelection>)}
      />

      {/* Tenant */}
      {source.tenant ? (
        <SectionCard
          title={`${copy.tenantTitle}${source.tenant.displayName ? ` — ${source.tenant.displayName}` : ''}`}
          included={selection.tenant.include}
          onIncludedChange={(v) => setTenant({ include: v })}
          subs={tenantSubs(copy)}
          values={selection.tenant}
          onChange={(k, v) => setTenant({ [k]: v } as Partial<TenantRenewalSelection>)}
        />
      ) : null}

      {/* Joint obligors */}
      {showJOs(gt) ? (
        source.jointObligors.length > 0 ? (
          source.jointObligors.map((jo, idx) => {
            const sel = selection.jointObligors.find((s) => s.sourceId === jo.id);
            if (!sel) return null;
            const selIdx = selection.jointObligors.indexOf(sel);
            return (
              <SectionCard
                key={jo.id}
                title={`${copy.jointObligorTitle} — ${jo.displayName}`}
                included={sel.include}
                onIncludedChange={(v) => setJO(selIdx, { include: v })}
                subs={joSubs(copy)}
                values={sel as unknown as Record<string, boolean>}
                onChange={(k, v) => setJO(selIdx, { [k]: v } as Partial<JointObligorRenewalSelection>)}
              />
            );
          })
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" /> {copy.missingJointObligorPlaceholder}
            </CardContent>
          </Card>
        )
      ) : null}

      {/* Avals */}
      {showAvals(gt) ? (
        source.avals.length > 0 ? (
          source.avals.map((av) => {
            const sel = selection.avals.find((s) => s.sourceId === av.id);
            if (!sel) return null;
            const selIdx = selection.avals.indexOf(sel);
            return (
              <SectionCard
                key={av.id}
                title={`${copy.avalTitle} — ${av.displayName}`}
                included={sel.include}
                onIncludedChange={(v) => setAval(selIdx, { include: v })}
                subs={avalSubs(copy)}
                values={sel as unknown as Record<string, boolean>}
                onChange={(k, v) => setAval(selIdx, { [k]: v } as Partial<AvalRenewalSelection>)}
              />
            );
          })
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" /> {copy.missingAvalPlaceholder}
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}

export default RenewalSelector;
