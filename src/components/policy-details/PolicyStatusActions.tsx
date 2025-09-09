'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { PolicyStatus, PolicyStatusType } from '@/lib/prisma-types';
import { POLICY_STATUS_DISPLAY } from '@/lib/types/policy';
import { t } from '@/lib/i18n';

interface PolicyStatusActionsProps {
  status: PolicyStatusType;
  onUpdateStatus: (newStatus: PolicyStatusType, reason?: string) => void;
  updatingStatus: boolean;
}

export function PolicyStatusActions({ 
  status, 
  onUpdateStatus, 
  updatingStatus 
}: PolicyStatusActionsProps) {
  // Only show for submitted or under review policies
  if (status !== PolicyStatus.SUBMITTED && status !== PolicyStatus.UNDER_REVIEW) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t.pages.policies.details.reviewActions.title}</CardTitle>
        <CardDescription>
          {t.pages.policies.details.reviewActions.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button
            onClick={() => onUpdateStatus(PolicyStatus.APPROVED)}
            disabled={updatingStatus}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t.pages.policies.details.reviewActions.approve}
          </Button>
          <Button
            onClick={() => onUpdateStatus(PolicyStatus.DENIED, 'Additional review required')}
            disabled={updatingStatus}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t.pages.policies.details.reviewActions.deny}
          </Button>
          <Button
            onClick={() => onUpdateStatus(PolicyStatus.UNDER_REVIEW)}
            disabled={updatingStatus}
            variant="outline"
          >
            <Clock className="h-4 w-4 mr-2" />
            {t.pages.policies.details.reviewActions.markUnderReview}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}