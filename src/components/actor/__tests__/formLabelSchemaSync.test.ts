/**
 * Form-label / schema sync regression guard.
 *
 * Pins the 9 label fixes from the PR-4 regression sweep + scans every
 * actor form file for FormField/FormLabel pairs and asserts the
 * label's required/optional marker matches the corresponding strict
 * tab schema's optionality.
 *
 * Why: prior to PR-4, the UI lied about several fields —
 * `legalRepMaternalLastName` was labelled `required` while the schema
 * had it as `.optional().nullable()` (and similar for ~8 others). This
 * caused two failure modes: false-required (user feels forced to fill
 * an actually-optional field) and false-optional (form passes RHF,
 * server rejects with a generic "Información incompleta" — exactly
 * the "swallowed validation" symptom users reported).
 *
 * How: lightweight regex over each form file pairs every
 * `name="X"` block with the next `<FormLabel ...>` it sees, then
 * looks the field up in the strict tab schema. Conditional-required
 * fields (passport for foreigners, spouse* when married) are
 * allowlisted via `CONDITIONAL_REQUIRED`.
 *
 * Adding a new actor form? Add it to `FORM_MANIFEST` below with the
 * schemas its fields live in.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { ZodTypeAny } from 'zod';

import { getTenantTabSchema } from '@/lib/schemas/tenant';
import { AVAL_TAB_SCHEMAS } from '@/lib/schemas/aval';
import { getJointObligorTabSchema } from '@/lib/schemas/joint-obligor';

const PROJECT_ROOT = resolve(__dirname, '../../../..');

/**
 * Fields the schema marks `.optional()` but the form correctly shows
 * as required INSIDE a conditional-render block. Skip these — the
 * schema's broader optionality is by design (so partial-saves work)
 * while the UI knows the contextual rule.
 */
const CONDITIONAL_REQUIRED = new Set<string>([
  // Tenant: passport required for FOREIGN nationality
  'passport',
  // Aval/JointObligor: spouse fields required when marital status is married_*
  'spouseName',
  'spouseRfc',
  'spouseCurp',
]);

interface FormFieldLabel {
  name: string;
  flag: 'required' | 'optional' | 'unmarked';
  line: number;
}

function extractFieldLabelPairs(source: string): FormFieldLabel[] {
  const pairs: FormFieldLabel[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const nameMatch = lines[i].match(/\bname=["']([a-zA-Z0-9_.]+)["']/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    let flag: 'required' | 'optional' | 'unmarked' | null = null;
    let labelLine = i;
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      const labelMatch = lines[j].match(/<FormLabel(\s+(required|optional))?[\s>]/);
      if (labelMatch) {
        flag = (labelMatch[2] as 'required' | 'optional') ?? 'unmarked';
        labelLine = j + 1;
        break;
      }
    }
    if (flag !== null) {
      pairs.push({ name, flag, line: labelLine });
    }
  }

  return pairs;
}

/**
 * Treat a field as "optional" if any wrapper in its type chain is
 * ZodOptional or ZodDefault — both mean the value can be omitted.
 *
 * ZodNullable alone is NOT optional: the value can be null, but it
 * must still be sent (undefined would fail validation). In practice
 * a nullable-but-not-optional field with `.min(1)` is required —
 * e.g. `personNameSchema.firstName = z.string().min(1).nullable()`.
 *
 * So we walk through Nullable/Effects wrappers but match Optional/
 * Default at any depth.
 */
function isZodOptional(field: ZodTypeAny | undefined): boolean {
  if (!field) return false;
  let current: any = field;
  // Walk through all wrappers; declare optional if any wrapper is
  // ZodOptional or ZodDefault. Stop unwrapping at the leaf (no _def).
  while (current?._def) {
    const typeName = current._def.typeName;
    if (typeName === 'ZodOptional' || typeName === 'ZodDefault') return true;
    if (typeName === 'ZodNullable' && current._def.innerType) {
      current = current._def.innerType;
      continue;
    }
    if (typeName === 'ZodEffects' && current._def.schema) {
      current = current._def.schema;
      continue;
    }
    if ((typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') && Array.isArray(current._def.options)) {
      // Any optional/literal('') branch makes the union effectively optional.
      const branches: any[] = current._def.options;
      const hasEmptyLiteral = branches.some(
        (b) => b?._def?.typeName === 'ZodLiteral' && b._def.value === '',
      );
      if (hasEmptyLiteral) return true;
      return branches.some((b) => isZodOptional(b));
    }
    // Hit a leaf type (ZodString, ZodNumber, ZodObject, etc.) — done.
    break;
  }
  return false;
}

function getSchemaField(schema: ZodTypeAny, path: string): ZodTypeAny | undefined {
  const segments = path.split('.');
  let current: any = schema;
  for (const seg of segments) {
    while (current?._def && !current.shape && current._def.innerType) {
      current = current._def.innerType;
    }
    while (current?._def?.typeName === 'ZodEffects' && current._def.schema) {
      current = current._def.schema;
    }
    if (!current?.shape) return undefined;
    current = current.shape[seg];
    if (!current) return undefined;
  }
  return current;
}

interface FormManifestEntry {
  file: string;
  schemas: ZodTypeAny[];
}

const FORM_MANIFEST: FormManifestEntry[] = [
  {
    file: 'src/components/actor/tenant/TenantPersonalInfoTab-RHF.tsx',
    schemas: [
      getTenantTabSchema('INDIVIDUAL', 'personal'),
      getTenantTabSchema('COMPANY', 'personal'),
    ],
  },
  {
    file: 'src/components/actor/tenant/TenantEmploymentTab-RHF.tsx',
    schemas: [getTenantTabSchema('INDIVIDUAL', 'employment')],
  },
  {
    file: 'src/components/actor/tenant/TenantRentalHistoryTab-RHF.tsx',
    schemas: [getTenantTabSchema('INDIVIDUAL', 'rental')],
  },
  {
    file: 'src/components/actor/aval/AvalPersonalInfoTab-RHF.tsx',
    schemas: [
      AVAL_TAB_SCHEMAS.INDIVIDUAL.personal,
      AVAL_TAB_SCHEMAS.COMPANY.personal,
    ],
  },
  {
    file: 'src/components/actor/aval/AvalEmploymentTab-RHF.tsx',
    schemas: [AVAL_TAB_SCHEMAS.INDIVIDUAL.employment],
  },
  {
    file: 'src/components/actor/aval/AvalPropertyGuaranteeTab-RHF.tsx',
    schemas: [AVAL_TAB_SCHEMAS.INDIVIDUAL.property, AVAL_TAB_SCHEMAS.COMPANY.property],
  },
  {
    file: 'src/components/actor/joint-obligor/JointObligorPersonalInfoTab-RHF.tsx',
    schemas: [
      getJointObligorTabSchema('personal', 'INDIVIDUAL'),
      getJointObligorTabSchema('personal', 'COMPANY'),
    ],
  },
  {
    file: 'src/components/actor/joint-obligor/JointObligorEmploymentTab-RHF.tsx',
    schemas: [getJointObligorTabSchema('employment', 'INDIVIDUAL')],
  },
];

describe('Form label / schema sync (regression guard)', () => {
  for (const entry of FORM_MANIFEST) {
    describe(entry.file, () => {
      const fullPath = resolve(PROJECT_ROOT, entry.file);

      if (!existsSync(fullPath)) {
        it('file exists', () => {
          throw new Error(`Form file not found: ${fullPath}`);
        });
        return;
      }

      const source = readFileSync(fullPath, 'utf-8');
      const pairs = extractFieldLabelPairs(source);

      it('parser finds at least one FormField/FormLabel pair', () => {
        expect(pairs.length).toBeGreaterThan(0);
      });

      const checkable = pairs.filter(
        (pair) =>
          pair.flag !== 'unmarked' && !CONDITIONAL_REQUIRED.has(pair.name),
      );

      for (const pair of checkable) {
        const fieldSchemas = entry.schemas
          .map((schema) => getSchemaField(schema, pair.name))
          .filter((f): f is ZodTypeAny => !!f);

        if (fieldSchemas.length === 0) continue;

        const everySchemaOptional = fieldSchemas.every((f) => isZodOptional(f));
        const expectedRequired = !everySchemaOptional;

        it(`${pair.name} (line ${pair.line}) label is ${expectedRequired ? 'required' : 'optional'} per schema`, () => {
          if (expectedRequired) {
            expect(pair.flag).toBe('required');
          } else {
            expect(pair.flag).toBe('optional');
          }
        });
      }
    });
  }
});
