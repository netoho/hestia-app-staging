'use client';

import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { formatDateTimeLong } from '@/lib/utils/formatting';

interface PolicyQuickInfoProps {
  tenantEmail: string;
  createdAt: string;
  documentsCount: number;
  internalCode?: string;
}

export function PolicyQuickInfo({ tenantEmail, createdAt, documentsCount, internalCode }: PolicyQuickInfoProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {internalCode && (
            <div>
              <p className="text-sm text-muted-foreground">Código Interno</p>
              <p className="font-medium">{internalCode}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.quickInfo.tenantEmail}</p>
            <p className="font-medium">{tenantEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.quickInfo.created}</p>
            <p className="font-medium">{formatDateTimeLong(createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.quickInfo.documents}</p>
            <p className="font-medium">{documentsCount} {t.pages.policies.details.quickInfo.files}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}