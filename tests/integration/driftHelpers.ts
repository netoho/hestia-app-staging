/**
 * #159 drift-test helpers.
 *
 * `fillAllColumns` writes a distinctive marker into EVERY writable scalar
 * column of a row, using information_schema as the source of truth — so a
 * column added to the Prisma schema is automatically part of the roundtrip
 * assertions with zero test edits. That is the whole point: clone/reset/
 * archive code paths that hand-enumerate fields go red the moment the schema
 * grows past them.
 */

import { prisma } from '../utils/database';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  column_default: string | null;
}

/** Timestamps churn on every write; markers there prove nothing. */
const ALWAYS_SKIPPED = ['id', 'createdAt', 'updatedAt'];

const MARKER_DATE = new Date('2026-01-02T03:04:05.000Z');

async function foreignKeyColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1`,
    table,
  );
  return new Set(rows.map((r) => r.column_name));
}

async function enumLabels(udtName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder`,
    udtName,
  );
  return rows.map((r) => r.enumlabel);
}

const q = (s: string) => s.replace(/'/g, "''");

/**
 * Fill every writable scalar column of `"table"` row `id` with a marker value
 * and return the marker map. Foreign-key columns, `id`, and timestamps are
 * skipped (FK targets are asserted by content elsewhere). `suffix`
 * disambiguates markers when several rows of the same table are compared.
 */
export async function fillAllColumns(
  table: string,
  id: string,
  opts: { skip?: string[]; suffix?: string } = {},
): Promise<Record<string, unknown>> {
  const cols = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `SELECT column_name, data_type, udt_name, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  if (cols.length === 0) throw new Error(`fillAllColumns: unknown table "${table}"`);

  const fks = await foreignKeyColumns(table);
  const current = (
    await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${table}" WHERE id = $1`,
      id,
    )
  )[0];
  if (!current) throw new Error(`fillAllColumns: no ${table} row ${id}`);

  const skip = new Set([...ALWAYS_SKIPPED, ...(opts.skip ?? []), ...fks]);
  const sfx = opts.suffix ? `_${opts.suffix}` : '';

  const markers: Record<string, unknown> = {};
  const sets: string[] = [];

  for (const c of cols) {
    if (skip.has(c.column_name)) continue;
    const col = `"${c.column_name}"`;

    switch (c.data_type) {
      case 'text':
      case 'character varying': {
        const v = `zz_${c.column_name}${sfx}`;
        markers[c.column_name] = v;
        sets.push(`${col} = '${q(v)}'`);
        break;
      }
      case 'character': {
        // bpchar pads to its declared length; keep the marker short so it
        // fits any char(n), and compare the trimmed value.
        markers[c.column_name] = 'zz';
        sets.push(`${col} = 'zz'`);
        break;
      }
      case 'boolean': {
        const v = c.column_default?.includes('true') ? false : true;
        markers[c.column_name] = v;
        sets.push(`${col} = ${v}`);
        break;
      }
      case 'integer':
      case 'bigint':
      case 'smallint': {
        markers[c.column_name] = 7;
        sets.push(`${col} = 7`);
        break;
      }
      case 'double precision':
      case 'real':
      case 'numeric': {
        markers[c.column_name] = 123.45;
        sets.push(`${col} = 123.45`);
        break;
      }
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'date': {
        markers[c.column_name] = MARKER_DATE;
        sets.push(`${col} = '${MARKER_DATE.toISOString()}'::timestamptz`);
        break;
      }
      case 'jsonb':
      case 'json': {
        const v = { drift: `${c.column_name}${sfx}` };
        markers[c.column_name] = v;
        sets.push(`${col} = '${q(JSON.stringify(v))}'::${c.data_type}`);
        break;
      }
      case 'USER-DEFINED': {
        const labels = await enumLabels(c.udt_name);
        if (labels.length === 0) throw new Error(`fillAllColumns: no labels for enum ${c.udt_name}`);
        // Pick a label different from the current value so "copied" and
        // "left at default" are distinguishable.
        let v = labels[labels.length - 1];
        if (v === current[c.column_name] && labels.length > 1) v = labels[0];
        markers[c.column_name] = v;
        sets.push(`${col} = '${q(v)}'::"${c.udt_name}"`);
        break;
      }
      case 'ARRAY': {
        const v = [`zz_${c.column_name}${sfx}`];
        markers[c.column_name] = v;
        sets.push(`${col} = ARRAY['${q(v[0])}']::${c.udt_name.replace(/^_/, '')}[]`);
        break;
      }
      default:
        throw new Error(
          `fillAllColumns: unhandled type ${c.data_type} (${c.udt_name}) for ${table}.${c.column_name} — extend the switch`,
        );
    }
  }

  await prisma.$executeRawUnsafe(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $1`, id);
  return markers;
}

/** Normalize for cross-representation equality (Dates vs ISO strings). */
export const norm = (v: unknown): unknown => (v instanceof Date ? v.toISOString() : v);

export interface ColumnMismatch {
  column: string;
  expected: unknown;
  actual: unknown;
}

/**
 * Compare `actual` against `expected` over `columns`, minus `excluded`.
 * Returns the full mismatch list so a failing assertion names every drifted
 * column at once instead of stopping at the first.
 */
export function compareRows(
  columns: readonly string[],
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  excluded: readonly string[] = [],
): ColumnMismatch[] {
  const skip = new Set(excluded);
  const mismatches: ColumnMismatch[] = [];
  for (const col of columns) {
    if (skip.has(col)) continue;
    const e = norm(expected[col]);
    const a = norm(actual[col]);
    if (JSON.stringify(e) !== JSON.stringify(a)) {
      mismatches.push({ column: col, expected: e, actual: a });
    }
  }
  return mismatches;
}

/** Guard the exclusion lists themselves: every entry must be a real column. */
export function phantomExclusions(
  columns: readonly string[],
  excluded: readonly string[],
): string[] {
  const real = new Set(columns);
  return excluded.filter((c) => !real.has(c));
}
