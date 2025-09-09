'use client';

import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n';

interface PolicyQuickInfoProps {
  tenantEmail: string;
  createdAt: string;
  documentsCount: number;
}

export function PolicyQuickInfo({ tenantEmail, createdAt, documentsCount }: PolicyQuickInfoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.quickInfo.tenantEmail}</p>
            <p className="font-medium">{tenantEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t.pages.policies.details.quickInfo.created}</p>
            <p className="font-medium">{formatDate(createdAt)}</p>
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