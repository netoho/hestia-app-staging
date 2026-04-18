'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

export interface SectionSubCheckbox {
  key: string;
  label: string;
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Whether the parent section is included; null to hide the top-level toggle entirely. */
  included?: boolean;
  onIncludedChange?: (next: boolean) => void;
  subs: SectionSubCheckbox[];
  values: Record<string, boolean>;
  onChange: (key: string, next: boolean) => void;
  emphasize?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  included,
  onIncludedChange,
  subs,
  values,
  onChange,
  emphasize = false,
  children,
  disabled = false,
}: SectionCardProps) {
  const allOn = subs.every((s) => values[s.key]);
  const allOff = subs.every((s) => !values[s.key]);

  const setAll = (next: boolean) => {
    for (const s of subs) onChange(s.key, next);
  };

  const showTopToggle = typeof included === 'boolean' && !!onIncludedChange;

  return (
    <Card
      className={cn(
        emphasize && 'border-2 border-accent shadow-md',
        disabled && 'opacity-60',
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {showTopToggle ? (
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id={`include-${title}`}
                checked={included}
                disabled={disabled}
                onCheckedChange={(v) => onIncludedChange?.(v === true)}
              />
              <Label htmlFor={`include-${title}`} className="text-sm">
                {t.pages.policyRenewal.includeCard}
              </Label>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAll(true)}
            disabled={disabled || allOn || (showTopToggle && !included)}
          >
            {t.pages.policyRenewal.selectAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAll(false)}
            disabled={disabled || allOff || (showTopToggle && !included)}
          >
            {t.pages.policyRenewal.clearAll}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {subs.map((s) => (
            <div key={s.key} className="flex items-start gap-2">
              <Checkbox
                id={`${title}-${s.key}`}
                checked={values[s.key] ?? false}
                disabled={disabled || (showTopToggle && !included)}
                onCheckedChange={(v) => onChange(s.key, v === true)}
              />
              <Label
                htmlFor={`${title}-${s.key}`}
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

export default SectionCard;
