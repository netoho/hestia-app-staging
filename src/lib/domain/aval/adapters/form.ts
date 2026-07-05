/**
 * Form adapter for the Aval domain entity.
 *
 *   1. `avalFormDefaults(opts)` — `defaultValues` baseline for the aval tab
 *      components (aval always has the mandatory property guarantee).
 *   2. `avalTabFields(avalType, tab)` — per-tab field-name lists derived via
 *      `.keyof()` on the canonical tab schemas. The property tab uses the
 *      *base* schema (the refined one is a ZodEffects, not a ZodObject).
 */

import {
  avalPersonalIndividualTabSchema,
  avalPersonalCompanyTabSchema,
  avalEmploymentTabSchema,
  avalPropertyTabBaseSchema,
  avalReferencesIndividualTabSchema,
  avalReferencesCompanyTabSchema,
  avalDocumentsTabSchema,
  type AvalTypeEnum,
} from '../schema';

interface FormDefaultsOptions {
  avalType?: AvalTypeEnum;
  initialData?: Record<string, unknown> | null | undefined;
}

export function avalFormDefaults(opts: FormDefaultsOptions = {}): Record<string, unknown> {
  const baseline: Record<string, unknown> = {
    avalType: opts.avalType ?? 'INDIVIDUAL',
    nationality: 'MEXICAN',
    // Aval's guarantee is mandatory and always property-based.
    hasPropertyGuarantee: true,
    guaranteeMethod: 'PROPERTY',
    propertyUnderLegalProceeding: false,
  };

  return {
    ...baseline,
    ...(opts.initialData ?? {}),
  };
}

export function avalTabFields(
  avalType: AvalTypeEnum,
  tab: string,
): readonly string[] | undefined {
  switch (tab) {
    case 'personal':
      return avalType === 'COMPANY'
        ? avalPersonalCompanyTabSchema.keyof().options
        : avalPersonalIndividualTabSchema.keyof().options;
    case 'employment':
      return avalEmploymentTabSchema.keyof().options;
    case 'property':
      return avalPropertyTabBaseSchema.keyof().options;
    case 'references':
      return avalType === 'COMPANY'
        ? avalReferencesCompanyTabSchema.keyof().options
        : avalReferencesIndividualTabSchema.keyof().options;
    case 'documents':
      return avalDocumentsTabSchema.keyof().options;
    default:
      return undefined;
  }
}
