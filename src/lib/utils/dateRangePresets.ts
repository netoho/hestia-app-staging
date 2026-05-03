/**
 * Date-range presets for the activations report.
 *
 * Returns a [from, to] pair with `from` at 00:00 and `to` at 23:59:59.999
 * so date-only callers don't off-by-one the last day.
 *
 * Time zone: uses the runtime's local zone — fine for both server (Vercel)
 * and client. Hestia ops live in MX; if cross-zone reporting matters later,
 * pivot here without touching callers.
 */

export type ReportPreset =
  | 'currentMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'last12Months'
  | 'ytd'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getDateRangeForPreset(preset: ReportPreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case 'currentMonth':
      return { from: startOfMonth(now), to: endOfDay(now) };

    case 'lastMonth': {
      const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    }

    case 'last3Months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      return { from, to: endOfDay(now) };
    }

    case 'last6Months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      return { from, to: endOfDay(now) };
    }

    case 'last12Months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      return { from, to: endOfDay(now) };
    }

    case 'ytd':
      return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: endOfDay(now) };

    case 'lastYear': {
      const y = now.getFullYear() - 1;
      return {
        from: new Date(y, 0, 1, 0, 0, 0, 0),
        to: new Date(y, 11, 31, 23, 59, 59, 999),
      };
    }

    case 'custom':
      throw new Error('custom preset has no implicit range — pass explicit from/to');
  }
}

export function parseCustomRange(fromIso: string, toIso: string): DateRange {
  const from = startOfDay(new Date(fromIso));
  const to = endOfDay(new Date(toIso));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('invalid custom range');
  }
  if (from > to) {
    throw new Error('from must be on or before to');
  }
  return { from, to };
}

export function presetSlug(preset: ReportPreset): string {
  switch (preset) {
    case 'currentMonth': return 'mes-en-curso';
    case 'lastMonth': return 'mes-anterior';
    case 'last3Months': return 'ultimos-3-meses';
    case 'last6Months': return 'ultimos-6-meses';
    case 'last12Months': return 'ultimos-12-meses';
    case 'ytd': return 'ano-en-curso';
    case 'lastYear': return 'ano-anterior';
    case 'custom': return 'personalizado';
  }
}
