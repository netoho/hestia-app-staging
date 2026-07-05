/**
 * Form adapter for the Tenant domain entity.
 *
 * Exposes two things to the React Hook Form layer:
 *
 *   1. **`tenantFormDefaults(opts)`** — the `defaultValues` object that
 *      `useForm({ defaultValues })` consumes. Today it's a thin helper
 *      that returns the documented baseline (`tenantType`, `nationality:
 *      'MEXICAN'`, `hasAdditionalIncome: false`, `hasPets: false`,
 *      `requiresCFDI: false`) plus whatever the caller passes via
 *      `initialData`. A follow-up can promote this to a Zod-defaults
 *      walker so default values come from `.default()` calls on the
 *      canonical schema; for S1 the explicit shape is clearer and
 *      doesn't require Zod internals.
 *
 *   2. **`tenantTabFields(tenantType, tabName)`** — per-tab field-name
 *      lists derived via `.keyof()` on the corresponding tab schema.
 *      Replaces the hand-coded `TENANT_TAB_FIELDS` constant; field-list
 *      drift between schema and tab-filter is now impossible because
 *      the list is derived.
 */

import {
  tenantPersonalTabIndividualSchema,
  tenantPersonalTabCompanySchema,
  tenantEmploymentTabSchema,
  tenantRentalHistoryTabSchema,
  tenantReferencesTabIndividualSchema,
  tenantReferencesTabCompanySchema,
  tenantDocumentsTabSchema,
  type TenantType,
} from '../schema';

interface FormDefaultsOptions {
  tenantType?: TenantType;
  /** Existing data to merge over the baseline defaults. */
  initialData?: Record<string, unknown> | null | undefined;
}

/**
 * Produce `defaultValues` for `useForm({ defaultValues })`. Used by
 * every tenant tab component so the baseline shape is consistent and
 * future field additions only need to touch this file (and the canonical
 * schema).
 */
export function tenantFormDefaults(
  opts: FormDefaultsOptions = {},
): Record<string, unknown> {
  const baseline: Record<string, unknown> = {
    tenantType: opts.tenantType ?? 'INDIVIDUAL',
    nationality: 'MEXICAN',
    hasAdditionalIncome: false,
    hasPets: false,
    requiresCFDI: false,
  };

  return {
    ...baseline,
    ...(opts.initialData ?? {}),
  };
}

/**
 * Per-tab field-name lists derived from the canonical tab schemas via
 * `.keyof()`. Used by the DB adapter for tab filtering and by any
 * caller that needs to know "which fields belong to which tab".
 */
export function tenantTabFields(
  tenantType: TenantType,
  tabName: string,
): readonly string[] | undefined {
  if (tenantType === 'COMPANY') {
    switch (tabName) {
      case 'personal':
        return tenantPersonalTabCompanySchema.keyof().options;
      case 'references':
        return tenantReferencesTabCompanySchema.keyof().options;
      case 'documents':
        return tenantDocumentsTabSchema.keyof().options;
      default:
        return undefined;
    }
  }

  switch (tabName) {
    case 'personal':
      return tenantPersonalTabIndividualSchema.keyof().options;
    case 'employment':
      return tenantEmploymentTabSchema.keyof().options;
    case 'rental':
      return tenantRentalHistoryTabSchema.keyof().options;
    case 'references':
      return tenantReferencesTabIndividualSchema.keyof().options;
    case 'documents':
      return tenantDocumentsTabSchema.keyof().options;
    default:
      return undefined;
  }
}
