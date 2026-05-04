import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import {
  getDateRangeForPreset,
  parseCustomRange,
  presetSlug,
  type ReportPreset,
} from '@/lib/utils/dateRangePresets';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';
import { POLICY_STATUS_CONFIG } from '@/lib/config/policyStatus';

const VALID_PRESETS: ReportPreset[] = [
  'currentMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'last12Months',
  'ytd',
  'lastYear',
  'custom',
];

function isValidPreset(value: string | null): value is ReportPreset {
  return value !== null && (VALID_PRESETS as string[]).includes(value);
}

function formatDDMMYYYY(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function filenameDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

const GUARANTOR_LABEL: Record<GuarantorType, string> = {
  NONE: 'Sin garantía',
  JOINT_OBLIGOR: 'Obligado solidario',
  AVAL: 'Aval',
  BOTH: 'Obligado solidario + Aval',
};

/**
 * GET /api/reports/policies/csv?preset=...&from=...&to=...
 *
 * Returns a CSV of every policy whose `createdAt` falls in the requested
 * date range — every status (COLLECTING_INFO, PENDING_APPROVAL, ACTIVE,
 * EXPIRED, CANCELLED) is included. Per-row lifecycle timestamps live in
 * dedicated columns so consumers can re-sort/filter in Excel.
 *
 * Auth: ADMIN + STAFF.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const presetParam = searchParams.get('preset');

  if (!isValidPreset(presetParam)) {
    return NextResponse.json({ error: 'preset inválido' }, { status: 400 });
  }
  const preset = presetParam;

  let range;
  try {
    if (preset === 'custom') {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      if (!from || !to) {
        return NextResponse.json({ error: 'from/to requeridos para preset custom' }, { status: 400 });
      }
      range = parseCustomRange(from, to);
    } else {
      range = getDateRangeForPreset(preset);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'rango inválido';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const policies = await prisma.policy.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
    },
    select: {
      policyNumber: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      activatedAt: true,
      expiresAt: true,
      cancelledAt: true,
      contractStartDate: true,
      contractEndDate: true,
      rentAmount: true,
      totalPrice: true,
      guarantorType: true,
      package: { select: { name: true } },
      managedBy: { select: { internalId: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 16 columns. Every lifecycle timestamp is its own column so consumers can
  // sort/filter independently in Excel — no fallbacks or coalescing in the
  // export. `Nombre del broker` falls back to "CS" when `managedById` is null.
  const fields = [
    'Nº protección',
    'Estado',
    'Fecha de creación',
    'Fecha de envío',
    'Fecha de aprobación',
    'Fecha de activación',
    'Fecha de expiración',
    'Fecha de cancelación',
    'Inicio de contrato',
    'Fin de contrato',
    'Tipo (paquete)',
    'Garantía',
    'Monto de renta',
    'Costo de la protección',
    'ID del broker',
    'Nombre del broker',
  ] as const;

  const rows = policies.map((p) => ({
    'Nº protección': p.policyNumber,
    'Estado': POLICY_STATUS_CONFIG[p.status]?.label ?? p.status,
    'Fecha de creación': formatDDMMYYYY(p.createdAt),
    'Fecha de envío': formatDDMMYYYY(p.submittedAt),
    'Fecha de aprobación': formatDDMMYYYY(p.approvedAt),
    'Fecha de activación': formatDDMMYYYY(p.activatedAt),
    'Fecha de expiración': formatDDMMYYYY(p.expiresAt),
    'Fecha de cancelación': formatDDMMYYYY(p.cancelledAt),
    'Inicio de contrato': formatDDMMYYYY(p.contractStartDate),
    'Fin de contrato': formatDDMMYYYY(p.contractEndDate),
    'Tipo (paquete)': p.package?.name ?? 'Personalizado',
    'Garantía': GUARANTOR_LABEL[p.guarantorType] ?? p.guarantorType,
    'Monto de renta': p.rentAmount,
    'Costo de la protección': p.totalPrice,
    'ID del broker': p.managedBy?.internalId ?? '',
    'Nombre del broker': p.managedBy?.name ?? 'CS',
  }));

  // Pass explicit fields so the header row renders even when rows is empty.
  const csv = Papa.unparse({ fields: [...fields], data: rows }, { header: true });
  const bom = '﻿';
  const body = bom + csv;

  const filename = `protecciones_${presetSlug(preset)}_${filenameDate()}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
