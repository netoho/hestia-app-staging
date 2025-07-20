'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileDown, Loader2 } from 'lucide-react';
import { PolicyStatusType } from '@/lib/prisma-types';
import { POLICY_STATUS_DISPLAY, POLICY_STATUS_COLORS } from '@/lib/types/policy';
import { t } from '@/lib/i18n';

interface PolicyDetailsHeaderProps {
  onBack: () => void;
  status: PolicyStatusType;
  onDownloadPDF: () => void;
  downloadingPDF: boolean;
}

export function PolicyDetailsHeader({ 
  onBack, 
  status, 
  onDownloadPDF, 
  downloadingPDF 
}: PolicyDetailsHeaderProps) {
  const getStatusBadgeVariant = (status: PolicyStatusType) => {
    const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gray: 'secondary',
      blue: 'default',
      yellow: 'outline',
      orange: 'outline',
      purple: 'default',
      green: 'default',
      red: 'destructive',
    };
    return colorMap[POLICY_STATUS_COLORS[status]] || 'default';
  };

  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t.pages.policies.details.backToPolicies}
      </Button>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.pages.policies.details.title}</h1>
          <p className="text-muted-foreground">
            {t.pages.policies.details.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
            variant="outline"
            size="sm"
          >
            {downloadingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {t.pages.policies.details.downloadPDF}
          </Button>
          <Badge variant={getStatusBadgeVariant(status)} className="text-sm">
            {POLICY_STATUS_DISPLAY[status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}