'use client';

import { useState, useMemo } from 'react';
import { ReceiptType, ReceiptStatus } from '@/prisma/generated/prisma-client/enums';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, DollarSign, Calendar } from 'lucide-react';
import { useReceiptOperations } from '@/hooks/useReceiptOperations';
import { formatAddress } from '@/lib/utils/formatting';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import PolicySelector from './PolicySelector';
import MonthReceiptCard from './MonthReceiptCard';
import ReceiptHistoryList from './ReceiptHistoryList';

// --- Types (inferred from getPortalData output) ---

interface ReceiptRecord {
  id: string;
  year: number;
  month: number;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  originalName?: string | null;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  notApplicableNote?: string | null;
  markedNotApplicableAt?: Date | string | null;
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
  receipts: ReceiptRecord[];
  activatedAt: string | Date | null;
}

interface ReceiptDashboardProps {
  token: string;
  tenantName: string;
  policies: PolicyData[];
  refetchPortalData: () => void;
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
  token,
  tenantName,
  policies,
  refetchPortalData,
}: ReceiptDashboardProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState(policies[0]?.policyId || '');

  const selectedPolicy = policies.find(p => p.policyId === selectedPolicyId) || policies[0];

  const ops = useReceiptOperations({
    token,
    policyId: selectedPolicy?.policyId || '',
    refetchPortalData,
  });

  // Compute month range
  const allMonths = useMemo(
    () => generateMonthRange(selectedPolicy?.activatedAt ?? null),
    [selectedPolicy?.activatedAt],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Current month is the last entry (or the current date month)
  const currentMonthEntry = allMonths.find(m => m.year === currentYear && m.month === currentMonth);
  const pastMonths = allMonths
    .filter(m => !(m.year === currentYear && m.month === currentMonth))
    .reverse(); // newest first

  // Filter receipts for current month
  const currentMonthReceipts = (selectedPolicy?.receipts || []).filter(
    r => r.year === currentYear && r.month === currentMonth,
  );

  if (!selectedPolicy) return null;

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(to bottom, #ffffff, #dbeafe)', borderColor: '#d4dae1' }} className="border-b">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="font-headline text-3xl md:text-4xl mb-2" style={{ color: '#173459' }}>
              {t.portal.title}
            </h1>
            <p className="text-muted-foreground">
              Bienvenido, {tenantName}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Policy selector */}
        <PolicySelector
          policies={policies.map(p => ({
            policyId: p.policyId,
            policyNumber: p.policyNumber,
            propertyAddress: p.propertyAddress,
          }))}
          selectedPolicyId={selectedPolicyId}
          onSelect={setSelectedPolicyId}
        />

        {/* Policy info card */}
        <Card className="shadow-sm border-0">
          <CardHeader style={{ background: 'linear-gradient(to right, #173459, #2b5a8c)', color: 'white' }}>
            <CardTitle className="font-headline text-lg">
              Protección #{selectedPolicy.policyNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#173459' }} />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t.portal.propertyLabel}</p>
                  <p className="text-sm font-medium" style={{ color: '#173459' }}>
                    {formatAddress(selectedPolicy.propertyAddress)}
                  </p>
                </div>
              </div>
              {selectedPolicy.rentAmount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Renta mensual</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>
                      ${selectedPolicy.rentAmount.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </div>
              )}
              {selectedPolicy.contractLength && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Período</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>
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
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#173459' }}>
              {t.portal.currentMonth}
            </h2>
            <MonthReceiptCard
              year={currentYear}
              month={currentMonth}
              requiredTypes={selectedPolicy.requiredReceiptTypes}
              receipts={currentMonthReceipts}
              onUpload={(file, type) => ops.uploadReceipt(file, currentYear, currentMonth, type)}
              onDelete={ops.deleteReceipt}
              onDownload={ops.downloadReceipt}
              onMarkNA={(type, note) => ops.markNotApplicable(currentYear, currentMonth, type, note)}
              onUndoNA={ops.undoNotApplicable}
              getSlotOperation={(type) => ops.getSlotOperation(currentYear, currentMonth, type)}
            />
          </div>
        )}

        {/* Past months */}
        {pastMonths.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#173459' }}>
              {t.portal.pastMonths}
            </h2>
            <ReceiptHistoryList
              months={pastMonths}
              requiredTypes={selectedPolicy.requiredReceiptTypes}
              receipts={selectedPolicy.receipts}
              onUpload={(file, year, month, type) => ops.uploadReceipt(file, year, month, type)}
              onDelete={ops.deleteReceipt}
              onDownload={ops.downloadReceipt}
              onMarkNA={(year, month, type, note) => ops.markNotApplicable(year, month, type, note)}
              onUndoNA={ops.undoNotApplicable}
              getSlotOperation={(year, month, type) => ops.getSlotOperation(year, month, type)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
