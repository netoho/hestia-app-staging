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
 * Returns a CSV of activated policies in the requested date range.
 * Filter applies to `activatedAt`. Rows with `activatedAt = NULL` are excluded.
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
      activatedAt: { gte: range.from, lte: range.to, not: null },
    },
    select: {
      policyNumber: true,
      activatedAt: true,
      contractStartDate: true,
      contractEndDate: true,
      expiresAt: true,
      rentAmount: true,
      totalPrice: true,
      guarantorType: true,
      package: { select: { name: true } },
      createdBy: { select: { internalId: true, name: true, role: true } },
      managedBy: { select: { name: true } },
    },
    orderBy: { activatedAt: 'asc' },
  });

  const fields = [
    'Fecha activación',
    'Nº protección',
    'Tipo (paquete)',
    'Garantía',
    'Monto de renta',
    'Costo de la protección',
    'ID del broker',
    'Nombre del broker',
    'Inicio de vigencia',
    'Fin de vigencia',
    'Vendedor / CS',
  ] as const;

  const rows = policies.map((p) => {
    const isBroker = p.createdBy?.role === 'BROKER';
    const inicio = p.contractStartDate ?? p.activatedAt;
    const fin = p.contractEndDate ?? p.expiresAt;
    return {
      'Fecha activación': formatDDMMYYYY(p.activatedAt),
      'Nº protección': p.policyNumber,
      'Tipo (paquete)': p.package?.name ?? 'Personalizado',
      'Garantía': GUARANTOR_LABEL[p.guarantorType] ?? p.guarantorType,
      'Monto de renta': p.rentAmount,
      'Costo de la protección': p.totalPrice,
      'ID del broker': isBroker ? p.createdBy?.internalId ?? '' : '',
      'Nombre del broker': isBroker ? p.createdBy?.name ?? '' : '',
      'Inicio de vigencia': formatDDMMYYYY(inicio),
      'Fin de vigencia': formatDDMMYYYY(fin),
      'Vendedor / CS': p.managedBy?.name ?? 'CS',
    };
  });

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
