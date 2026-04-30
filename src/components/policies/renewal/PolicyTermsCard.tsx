'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';
import { t } from '@/lib/i18n';
import type { PolicyTermsRenewalSelection } from '@/lib/schemas/policy/renewalSelection';

interface PolicyTermsCardProps {
  value: PolicyTermsRenewalSelection;
  onChange: (next: PolicyTermsRenewalSelection) => void;
}

export function PolicyTermsCard({ value, onChange }: PolicyTermsCardProps) {
  const copy = t.pages.policyRenewal;
  const update = <K extends keyof PolicyTermsRenewalSelection>(
    key: K,
    next: PolicyTermsRenewalSelection[K],
  ) => onChange({ ...value, [key]: next });

  const subs: Array<{ key: keyof PolicyTermsRenewalSelection; label: string }> = [
    { key: 'financial', label: copy.financial },
    { key: 'contract', label: copy.contract },
    { key: 'packageAndPricing', label: copy.packageAndPricing },
  ];

  return (
    <Card className="border-2 border-accent shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-accent" />
          {copy.policyTermsTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{copy.policyTermsWarning}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="guarantor-type">{copy.guarantorType}</Label>
          <Select
            value={value.guarantorType}
            onValueChange={(v) => update('guarantorType', v as GuarantorType)}
          >
            <SelectTrigger id="guarantor-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{copy.guarantorOptions.NONE}</SelectItem>
              <SelectItem value="JOINT_OBLIGOR">{copy.guarantorOptions.JOINT_OBLIGOR}</SelectItem>
              <SelectItem value="AVAL">{copy.guarantorOptions.AVAL}</SelectItem>
              <SelectItem value="BOTH">{copy.guarantorOptions.BOTH}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{copy.guarantorTypeHelper}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {subs.map((s) => (
            <div key={s.key} className="flex items-start gap-2">
              <Checkbox
                id={`policyTerms-${s.key}`}
                checked={value[s.key] as boolean}
                onCheckedChange={(v) => update(s.key, (v === true) as never)}
              />
              <Label
                htmlFor={`policyTerms-${s.key}`}
                className="text-sm leading-tight cursor-pointer"
              >
                {s.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PolicyTermsCard;
