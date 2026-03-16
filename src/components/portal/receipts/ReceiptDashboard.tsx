'use client';

import { useState, useMemo, useCallback } from 'react';
import { ReceiptType } from '@/prisma/generated/prisma-client/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { useReceiptOperations } from '@/hooks/useReceiptOperations';
import { formatAddress } from '@/lib/utils/formatting';
import { getTypesForMonth, type ReceiptConfigEntry } from '@/lib/utils/receiptConfig';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import PolicySelector from './PolicySelector';
import MonthReceiptCard from './MonthReceiptCard';
import ReceiptHistoryList from './ReceiptHistoryList';
import ReceiptConfigEditor from './ReceiptConfigEditor';

// --- Types ---

interface ReceiptRecord {
  id: string;
  year: number;
  month: number;
  receiptType: ReceiptType;
  status: string;
  originalName?: string | null;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  notApplicableNote?: string | null;
  markedNotApplicableAt?: Date | string | null;
  otherCategory?: string | null;
  otherDescription?: string | null;
}

interface PolicyData {
  policyId: string;
  policyNumber: string;
  tenantId: string;
  rentAmount: number | null;
  contractLength: number | null;
  propertyAddress: {
    street?: string | null;
    exteriorNumber?: string | null;
    interiorNumber?: string | null;
    neighborhood?: string | null;
    postalCode?: string | null;
    municipality?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  requiredReceiptTypes: ReceiptType[];
  receiptConfigs?: ReceiptConfigEntry[];
  receipts: ReceiptRecord[];
  activatedAt: string | Date | null;
}

interface ReceiptDashboardProps {
  mode: 'portal' | 'admin';
  token?: string;
  tenantName: string;
  policies: PolicyData[];
  refetchData: () => void;
}

// --- Helpers ---

function generateMonthRange(activatedAt: string | Date | null): { year: number; month: number }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let startYear = currentYear;
  let startMonth = currentMonth;

  if (activatedAt) {
    const d = new Date(activatedAt);
    startYear = d.getFullYear();
    startMonth = d.getMonth() + 1;
  }

  const months: { year: number; month: number }[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return months;
}

// --- Component ---

export default function ReceiptDashboard({
  mode,
  token,
  tenantName,
  policies,
  refetchData,
}: ReceiptDashboardProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState(policies[0]?.policyId || '');

  const selectedPolicy = policies.find(p => p.policyId === selectedPolicyId) || policies[0];

  const ops = useReceiptOperations({
    mode,
    token,
    policyId: selectedPolicy?.policyId || '',
    refetchData,
  });

  // Per-month type resolver using config history
  const resolveTypesForMonth = useCallback((year: number, month: number): ReceiptType[] => {
    if (!selectedPolicy) return [];
    return getTypesForMonth(
      selectedPolicy.receiptConfigs || [],
      year,
      month,
      selectedPolicy.requiredReceiptTypes,
    );
  }, [selectedPolicy]);

  // Compute month range
  const allMonths = useMemo(
    () => generateMonthRange(selectedPolicy?.activatedAt ?? null),
    [selectedPolicy?.activatedAt],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthEntry = allMonths.find(m => m.year === currentYear && m.month === currentMonth);
  const pastMonths = allMonths
    .filter(m => !(m.year === currentYear && m.month === currentMonth))
    .reverse();

  const currentMonthReceipts = (selectedPolicy?.receipts || []).filter(
    r => r.year === currentYear && r.month === currentMonth,
  );

  const currentMonthTypes = resolveTypesForMonth(currentYear, currentMonth);

  if (!selectedPolicy) return null;

  const isPortal = mode === 'portal';

  return (
    <div>
      {/* Hero — portal only */}
      {isPortal && (
        <div className="border-b bg-gradient-to-b from-white to-blue-50">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="text-center">
              <h1 className="font-headline text-3xl md:text-4xl mb-2 text-primary">
                {t.portal.title}
              </h1>
              <p className="text-muted-foreground">
                {t.portal.welcome(tenantName)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={isPortal ? 'container mx-auto px-4 py-6 max-w-4xl space-y-6' : 'space-y-6'}>
        {/* Admin badge */}
        {mode === 'admin' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <ShieldCheck className="h-3 w-3" />
              {t.admin.viewingAs}
            </Badge>
          </div>
        )}

        {/* Policy selector — portal only (multi-policy) */}
        {isPortal && policies.length > 1 && (
          <PolicySelector
            policies={policies.map(p => ({
              policyId: p.policyId,
              policyNumber: p.policyNumber,
              propertyAddress: p.propertyAddress,
            }))}
            selectedPolicyId={selectedPolicyId}
            onSelect={setSelectedPolicyId}
          />
        )}

        {/* Config editor — admin only */}
        {mode === 'admin' && (
          <ReceiptConfigEditor
            policyId={selectedPolicy.policyId}
            onConfigSaved={refetchData}
          />
        )}

        {/* Policy info card */}
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
            <CardTitle className="font-headline text-lg">
              {t.admin.policySubtitle(selectedPolicy.policyNumber)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t.portal.propertyLabel}</p>
                  <p className="text-sm font-medium text-primary">
                    {formatAddress(selectedPolicy.propertyAddress)}
                  </p>
                </div>
              </div>
              {selectedPolicy.rentAmount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t.portal.rentAmount}</p>
                    <p className="text-sm font-medium text-primary">
                      ${selectedPolicy.rentAmount.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </div>
              )}
              {selectedPolicy.contractLength && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t.portal.period}</p>
                    <p className="text-sm font-medium text-primary">
                      {selectedPolicy.contractLength} meses
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current month */}
        {currentMonthEntry && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              {t.portal.currentMonth}
            </h2>
            <MonthReceiptCard
              year={currentYear}
              month={currentMonth}
              requiredTypes={currentMonthTypes}
              receipts={currentMonthReceipts}
              onUpload={(file, type, otherCat, otherDesc) => ops.uploadReceipt(file, currentYear, currentMonth, type, otherCat, otherDesc)}
              onDelete={ops.deleteReceipt}
              onDownload={ops.downloadReceipt}
              onMarkNA={(type, note) => ops.markNotApplicable(currentYear, currentMonth, type, note)}
              onUndoNA={ops.undoNotApplicable}
              getSlotOperation={(type, otherCat) => ops.getSlotOperation(currentYear, currentMonth, type, otherCat)}
            />
          </div>
        )}

        {/* Past months */}
        {pastMonths.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              {t.portal.pastMonths}
            </h2>
            <ReceiptHistoryList
              months={pastMonths}
              getRequiredTypes={resolveTypesForMonth}
              receipts={selectedPolicy.receipts}
              onUpload={(file, year, month, type, otherCat, otherDesc) => ops.uploadReceipt(file, year, month, type, otherCat, otherDesc)}
              onDelete={ops.deleteReceipt}
              onDownload={ops.downloadReceipt}
              onMarkNA={(year, month, type, note) => ops.markNotApplicable(year, month, type, note)}
              onUndoNA={ops.undoNotApplicable}
              getSlotOperation={(year, month, type, otherCat) => ops.getSlotOperation(year, month, type, otherCat)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
