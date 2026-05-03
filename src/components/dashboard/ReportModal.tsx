'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t } from '@/lib/i18n';
import type { ReportPreset } from '@/lib/utils/dateRangePresets';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESETS: ReportPreset[] = [
  'currentMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'last12Months',
  'ytd',
  'lastYear',
  'custom',
];

function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function ReportModal({ open, onOpenChange }: ReportModalProps) {
  const [preset, setPreset] = useState<ReportPreset>('currentMonth');
  const [customFrom, setCustomFrom] = useState<string>(startOfMonthIso());
  const [customTo, setCustomTo] = useState<string>(todayIso());

  const presetLabels = t.pages.dashboard.report.presets;

  const customRangeInvalid = useMemo(() => {
    if (preset !== 'custom') return false;
    if (!customFrom || !customTo) return true;
    return new Date(customFrom).getTime() > new Date(customTo).getTime();
  }, [preset, customFrom, customTo]);

  const handleDownload = () => {
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      params.set('from', customFrom);
      params.set('to', customTo);
    }
    const url = `/api/reports/policies/csv?${params.toString()}`;
    window.location.href = url;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.pages.dashboard.report.title}</DialogTitle>
          <DialogDescription>{t.pages.dashboard.report.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-preset">{t.pages.dashboard.report.rangeLabel}</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as ReportPreset)}>
              <SelectTrigger id="report-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {presetLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="report-from">{t.pages.dashboard.report.fromLabel}</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to">{t.pages.dashboard.report.toLabel}</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom || undefined}
                />
              </div>
              {customRangeInvalid && (
                <p className="col-span-2 text-sm text-destructive">
                  {t.pages.dashboard.report.invalidRange}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.pages.dashboard.report.cancel}
          </Button>
          <Button onClick={handleDownload} disabled={customRangeInvalid}>
            {t.pages.dashboard.report.download}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
