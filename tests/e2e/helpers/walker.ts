import { Page, Locator, expect } from '@playwright/test';
import { z } from 'zod';
import { samplePdf } from './files';
import {
  tenantPersonalTabIndividualSchema,
  tenantEmploymentTabSchema,
  tenantRentalHistoryTabSchema,
} from '@/lib/domain/tenant/schema';
import {
  jointObligorPersonalIndividualTabSchema,
  jointObligorEmploymentTabSchema,
  incomeGuaranteeSchema,
} from '@/lib/domain/joint-obligor/schema';
import { AVAL_TAB_SCHEMAS } from '@/lib/domain/aval/schema';

/**
 * #180 — schema-driven parity walker.
 *
 * The canonical domain tab schemas are the single source of truth: every
 * field they declare gets located by the `data-field` attribute FormControl
 * stamps (RHF name === schema key), filled with a generated value on the
 * PORTAL surface, and read back on the ADMIN inline editor — same component
 * since T3, but the walker proves the data pipeline field-by-field.
 *
 * Contract enforced:
 *  - a schema field whose control can't be located is a FAILURE unless it's
 *    in the tab's documented ALLOWED_SKIP (conditionally-rendered sections);
 *  - a filled field whose admin-side display differs is a FAILURE.
 *
 * A new schema field automatically joins the walk — zero test edits.
 */

// ─── Walk registry (PR A: tenant / JO / aval, INDIVIDUAL variant) ────────────

export interface WalkTab {
  /** Tab id (matches actorConfig + wizard) */
  id: string;
  /** Tab trigger label in the wizard UI (actorConfig) */
  label: string;
  schema: z.ZodTypeAny;
  /**
   * Schema fields with no unconditional control on this tab — each entry is
   * a documented product/UI reason, not a free pass. Anything else that
   * fails to locate turns the walk red.
   */
  allowedSkip?: string[];
  /** Extra portal-side steps the tab's save gate demands (e.g. uploads). */
  beforeSave?: (page: Page) => Promise<void>;
}

/** Upload one PDF into a DocumentManagerCard slot (same ids the portals use). */
export async function uploadWalkerDoc(page: Page, category: string): Promise<void> {
  const name = `walker-${category.toLowerCase()}-${Date.now()}`;
  await page.locator(`#upload-${category.toLowerCase()}`).setInputFiles(samplePdf(name));
  await expect(page.getByText(`${name}.pdf`)).toBeVisible({ timeout: 30_000 });
}

export interface ActorWalk {
  actorType: 'tenant' | 'jointObligor' | 'aval';
  /** Portal path prefix */
  portalPath: string;
  /** Policy-detail tab that hosts the actor's card */
  adminTab: string;
  tabs: WalkTab[];
}

export const INDIVIDUAL_WALKS: ActorWalk[] = [
  {
    actorType: 'tenant',
    portalPath: '/actor/tenant',
    adminTab: 'tenant',
    tabs: [
      {
        id: 'personal',
        label: 'Personal',
        schema: tenantPersonalTabIndividualSchema,
        allowedSkip: [
          // Rendered only for FOREIGN nationality (conditional section).
          'passport',
          'immigrationStatus',
        ],
      },
      { id: 'employment', label: 'Empleo', schema: tenantEmploymentTabSchema },
      { id: 'rental', label: 'Historial', schema: tenantRentalHistoryTabSchema },
    ],
  },
  {
    actorType: 'jointObligor',
    portalPath: '/actor/joint-obligor',
    adminTab: 'guarantors',
    tabs: [
      {
        id: 'personal',
        label: 'Personal',
        schema: jointObligorPersonalIndividualTabSchema,
        allowedSkip: ['passport', 'immigrationStatus'],
      },
      { id: 'employment', label: 'Empleo', schema: jointObligorEmploymentTabSchema },
      {
        id: 'guarantee',
        label: 'Garantía',
        // The tab schema is a discriminatedUnion(guaranteeMethod); the walk
        // drives the INCOME branch (PROPERTY's address grid + marriage
        // conditionals are E2E-03/04 territory).
        schema: incomeGuaranteeSchema,
        allowedSkip: [
          'hasPropertyGuarantee', // literal(false), no control by design
        ],
        // The income branch gates its save on income-proof uploads inside
        // the tab itself.
        beforeSave: (page) => uploadWalkerDoc(page, 'INCOME_PROOF'),
      },
    ],
  },
  {
    actorType: 'aval',
    portalPath: '/actor/aval',
    adminTab: 'guarantors',
    tabs: [
      {
        id: 'personal',
        label: 'Personal',
        schema: AVAL_TAB_SCHEMAS.INDIVIDUAL.personal,
        allowedSkip: ['passport', 'immigrationStatus'],
      },
      { id: 'employment', label: 'Empleo', schema: AVAL_TAB_SCHEMAS.INDIVIDUAL.employment },
      {
        id: 'property',
        label: 'Propiedad',
        schema: AVAL_TAB_SCHEMAS.INDIVIDUAL.property,
        allowedSkip: [
          // Aval guarantee is PROPERTY-only (see domain README) — these two
          // are fixed literals with no controls.
          'hasPropertyGuarantee',
          'guaranteeMethod',
          // Rendered only for married_* statuses; the walker picks the LAST
          // maritalStatus option (common_law) — E2E-04 owns the married path.
          'spouseName',
          'spouseRfc',
          'spouseCurp',
        ],
      },
    ],
  },
];

// ─── Value generation ────────────────────────────────────────────────────────

/**
 * Format-refined fields need VALID values or the tab save 400s. Keyed by
 * field-name suffix match (names are consistent across entities).
 */
const NAME_VALUE_RULES: Array<[RegExp, string]> = [
  [/email$/i, 'walker.{field}@example.com'],
  [/companyRfc$/i, 'ZWA010101AB1'], // persona moral: 12
  [/rfc$/i, 'ZAWA800101AB1'], // persona física: 13
  [/curp$/i, 'ZAWA800101HDFLKR07'],
  [/phone$/i, '5587654321'],
  [/clabe$/i, '012180001234567897'],
  [/postalCode$/i, '06600'],
];

function stringValueFor(field: string): string {
  const leaf = field.split('.').pop() ?? field;
  for (const [re, value] of NAME_VALUE_RULES) {
    if (re.test(leaf)) return value.replace('{field}', leaf.toLowerCase());
  }
  return `ZW ${leaf}`;
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let s: any = schema;
  for (;;) {
    if (s instanceof z.ZodOptional || s instanceof z.ZodNullable) s = s.unwrap();
    else if (s instanceof z.ZodDefault) s = s.removeDefault();
    else if (s instanceof z.ZodEffects) s = s.innerType();
    else if (s instanceof z.ZodPipeline) s = s._def.in;
    else return s;
  }
}

/**
 * Leaf fields of a tab schema. Object-typed fields (the address composites —
 * one RHF field wrapping AddressAutocomplete) stay WHOLE: they're driven via
 * the grid inputs inside their data-field root.
 */
export function walkableFields(schema: z.ZodTypeAny): string[] {
  const obj = unwrap(schema);
  if (!(obj instanceof z.ZodObject)) return [];
  const fields: string[] = [];
  for (const [key, raw] of Object.entries(obj.shape) as [string, z.ZodTypeAny][]) {
    const inner = unwrap(raw);
    if (inner instanceof z.ZodArray) continue; // arrays (references) — out of walker v1
    fields.push(key);
  }
  return fields;
}

function leafSchema(schema: z.ZodTypeAny, field: string): z.ZodTypeAny {
  const obj = unwrap(schema) as z.ZodObject<any>;
  return unwrap(obj.shape[field]);
}

// The AddressAutocomplete manual grid renders static-id inputs; scoped inside
// the composite's data-field root they're unambiguous even with several
// widgets on one page.
const ADDRESS_GRID_IDS = [
  'street',
  'exteriorNumber',
  'interiorNumber',
  'neighborhood',
  'postalCode',
  'municipality',
  'city',
  'state',
] as const;

const ADDRESS_VALUES: Record<(typeof ADDRESS_GRID_IDS)[number], string> = {
  street: 'Calle Walker',
  exteriorNumber: '77',
  interiorNumber: '3B',
  neighborhood: 'Condesa',
  postalCode: '06140',
  municipality: 'Cuauhtémoc',
  city: 'Ciudad de México',
  state: 'CDMX',
};

function isAddressComposite(leaf: z.ZodTypeAny): boolean {
  return leaf instanceof z.ZodObject && 'street' in leaf.shape;
}

async function fillAddressComposite(root: Locator): Promise<string> {
  const parts: string[] = [];
  for (const id of ADDRESS_GRID_IDS) {
    const input = root.locator(`#${id}`).first();
    if ((await input.count()) === 0) continue;
    await input.fill(ADDRESS_VALUES[id]);
    parts.push(`${id}=${ADDRESS_VALUES[id]}`);
  }
  return parts.join('|');
}

async function readAddressComposite(root: Locator): Promise<string> {
  const parts: string[] = [];
  for (const id of ADDRESS_GRID_IDS) {
    const input = root.locator(`#${id}`).first();
    if ((await input.count()) === 0) continue;
    parts.push(`${id}=${await input.inputValue()}`);
  }
  return parts.join('|');
}

// ─── Control driver ──────────────────────────────────────────────────────────

export interface WalkFillResult {
  /** field → expected display value (as the UI shows it) */
  filled: Record<string, string>;
  /** fields with no locatable control */
  skipped: string[];
}

async function controlFor(
  scope: Page | Locator,
  field: string,
  timeout = 4_000,
): Promise<Locator | null> {
  const loc = scope.locator(`[data-field="${field}"]`).first();
  try {
    await loc.waitFor({ state: 'visible', timeout });
    return loc;
  } catch {
    return null;
  }
}

/**
 * Enum fields default to the LAST option (avoids resting defaults) — except
 * where the last option flips the form into another variant mid-walk.
 */
const ENUM_PICK_FIRST = new Set(['nationality']);

async function readControl(control: Locator): Promise<string> {
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  const role = await control.getAttribute('role');
  if (role === 'checkbox' || role === 'switch') {
    return (await control.getAttribute('data-state')) === 'checked' ? 'true' : 'false';
  }
  if (role === 'radiogroup') {
    const checked = control.locator('[role="radio"][data-state="checked"]').first();
    if ((await checked.count()) === 0) return '';
    return (await checked.getAttribute('value')) ?? 'checked';
  }
  if (role === 'combobox' || tag === 'button') {
    return ((await control.textContent()) ?? '').trim();
  }
  if (tag === 'input' || tag === 'textarea') {
    return await control.inputValue();
  }
  return ((await control.textContent()) ?? '').trim();
}

/**
 * Fill every walkable field of `tab` inside `scope`. Returns what was
 * actually set (as displayed) + what couldn't be located.
 */
export async function fillTabBySchema(
  scope: Page | Locator,
  tab: WalkTab,
): Promise<WalkFillResult> {
  const filled: Record<string, string> = {};
  const skipped: string[] = [];

  const fields = walkableFields(tab.schema);
  // Barrier: the tab content (or a fresh route compile in dev) may still be
  // mounting — wait generously for the first field that is EXPECTED to have
  // a control (allowedSkip fields have none by design).
  const allowed = new Set(tab.allowedSkip ?? []);
  const firstRendered = fields.find((f) => !allowed.has(f) && !allowed.has(f.split('.')[0]));
  await scope
    .locator(`[data-field="${firstRendered ?? fields[0]}"]`)
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });

  for (const field of fields) {
    const control = await controlFor(scope, field);
    if (!control) {
      skipped.push(field);
      continue;
    }

    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    const role = await control.getAttribute('role');
    const type = (await control.getAttribute('type'))?.toLowerCase();
    const leaf = leafSchema(tab.schema, field);

    if (isAddressComposite(leaf)) {
      const signature = await fillAddressComposite(control);
      if (signature) filled[field] = signature;
      else skipped.push(field);
      continue;
    }

    if (role === 'checkbox' || role === 'switch') {
      if ((await control.getAttribute('data-state')) !== 'checked') await control.click();
      filled[field] = 'true';
      continue;
    }

    if (role === 'radiogroup') {
      // Literal discriminators (tenantType/avalType…) click their own value;
      // enum radios pick the LAST option (mirrors the select strategy).
      const radios = control.locator('[role="radio"]');
      const count = await radios.count();
      if (count === 0) {
        skipped.push(field);
        continue;
      }
      const target =
        leaf instanceof z.ZodLiteral
          ? control.locator(`[role="radio"][value="${String(leaf.value)}"]`).first()
          : radios.nth(ENUM_PICK_FIRST.has(field.split('.').pop() ?? field) ? 0 : count - 1);
      if ((await target.getAttribute('data-state')) !== 'checked') await target.click();
      filled[field] = (await target.getAttribute('value')) ?? 'checked';
      continue;
    }

    if (role === 'combobox') {
      // Radix Select: open, pick the LAST option (avoids resting defaults),
      // parity value = the trigger's displayed text.
      await control.click();
      const options = control.page().getByRole('option');
      const count = await options.count();
      if (count === 0) {
        await control.page().keyboard.press('Escape');
        skipped.push(field);
        continue;
      }
      const leafName = field.split('.').pop() ?? field;
      await options.nth(ENUM_PICK_FIRST.has(leafName) ? 0 : count - 1).click();
      filled[field] = ((await control.textContent()) ?? '').trim();
      continue;
    }

    if (tag === 'input' || tag === 'textarea') {
      let value: string;
      if (type === 'date') value = '1985-03-09';
      else if (type === 'number' || leaf instanceof z.ZodNumber) value = '4321';
      else if (leaf instanceof z.ZodBoolean) {
        skipped.push(field); // boolean rendered as plain input — unexpected
        continue;
      } else value = stringValueFor(field);
      await control.fill(value);
      filled[field] = value;
      continue;
    }

    skipped.push(field);
  }

  return { filled, skipped };
}

/** Read the same fields back on another surface (the admin inline editor). */
export async function readFieldsBack(
  scope: Page | Locator,
  tab: WalkTab,
  fields: string[],
): Promise<{ values: Record<string, string>; missing: string[] }> {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const field of fields) {
    const control = await controlFor(scope, field);
    if (!control) {
      missing.push(field);
      continue;
    }
    values[field] = isAddressComposite(leafSchema(tab.schema, field))
      ? await readAddressComposite(control)
      : await readControl(control);
  }
  return { values, missing };
}

/** Diff helper producing readable failures: field → { portal, admin }. */
export function diffSurfaces(
  expected: Record<string, string>,
  actual: Record<string, string>,
): Record<string, { portal: string; admin: string | undefined }> {
  const diff: Record<string, { portal: string; admin: string | undefined }> = {};
  for (const [field, portalValue] of Object.entries(expected)) {
    if (actual[field] !== portalValue) {
      diff[field] = { portal: portalValue, admin: actual[field] };
    }
  }
  return diff;
}

/** Assert the tab's skipped set is exactly the documented conditional set. */
export function assertSkipsAllowed(actorType: string, tab: WalkTab, skipped: string[]): void {
  const allowed = new Set(tab.allowedSkip ?? []);
  const violations = skipped.filter((f) => !allowed.has(f) && !allowed.has(f.split('.')[0]));
  expect(
    violations,
    `${actorType}/${tab.id}: schema fields with no locatable control`,
  ).toEqual([]);
}
