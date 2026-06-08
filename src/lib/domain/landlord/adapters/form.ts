/**
 * Form adapter for the Landlord domain entity.
 *
 *   1. **`landlordFormDefaults(opts)`** — the `defaultValues` object the
 *      landlord tab components feed `useForm({ defaultValues })`. Returns
 *      the documented baseline plus any `initialData` the caller merges
 *      over it, so future field additions only touch this file + schema.
 *
 *   2. **`landlordTabFields(isCompany, tabName)`** — per-tab field-name
 *      lists derived via `.keyof()` on the canonical tab schemas.
 *      Replaces the hand-coded `LANDLORD_TAB_FIELDS` constant; field-list
 *      drift between schema and tab-filter is now impossible.
 */

import {
  landlordOwnerInfoIndividualSchema,
  landlordOwnerInfoCompanySchema,
  landlordPropertyInfoTabSchema,
  landlordFinancialInfoTabSchema,
  landlordDocumentsTabSchema,
} from '../schema';

interface FormDefaultsOptions {
  isCompany?: boolean;
  isPrimary?: boolean;
  /** Existing data to merge over the baseline defaults. */
  initialData?: Record<string, unknown> | null | undefined;
}

/**
 * Produce `defaultValues` for `useForm({ defaultValues })`. Used by every
 * landlord tab component so the baseline shape is consistent.
 */
export function landlordFormDefaults(
  opts: FormDefaultsOptions = {},
): Record<string, unknown> {
  const baseline: Record<string, unknown> = {
    isCompany: opts.isCompany ?? false,
    isPrimary: opts.isPrimary ?? false,
    nationality: 'MEXICAN',
    hasAdditionalIncome: false,
    requiresCFDI: false,
    hasIVA: false,
    issuesTaxReceipts: false,
  };

  return {
    ...baseline,
    ...(opts.initialData ?? {}),
  };
}

/**
 * Per-tab field-name lists derived from the canonical tab schemas via
 * `.keyof()`. Used by the DB adapter for tab filtering and by any caller
 * that needs "which fields belong to which tab".
 */
export function landlordTabFields(
  isCompany: boolean,
  tabName: string,
): readonly string[] | undefined {
  switch (tabName) {
    case 'owner-info':
      return isCompany
        ? landlordOwnerInfoCompanySchema.keyof().options
        : landlordOwnerInfoIndividualSchema.keyof().options;
    case 'property-info':
      return landlordPropertyInfoTabSchema.keyof().options;
    case 'financial-info':
      return landlordFinancialInfoTabSchema.keyof().options;
    case 'documents':
      return landlordDocumentsTabSchema.keyof().options;
    default:
      return undefined;
  }
}
