/**
 * Form adapter for the Joint Obligor domain entity.
 *
 *   1. `jointObligorFormDefaults(opts)` — `defaultValues` baseline for the JO
 *      tab components.
 *   2. `jointObligorTabFields(type, tab)` — per-tab field-name lists derived via
 *      `.keyof()` on the canonical tab schemas. The `guarantee` tab returns the
 *      union of income + property fields, so a tab save keeps whichever set the
 *      chosen guaranteeMethod sent.
 */

import {
  jointObligorPersonalIndividualTabSchema,
  jointObligorPersonalCompanyTabSchema,
  jointObligorEmploymentTabSchema,
  incomeGuaranteeSchema,
  propertyGuaranteeSchema,
  jointObligorReferencesIndividualTabSchema,
  jointObligorReferencesCompanyTabSchema,
  jointObligorDocumentsTabSchema,
  type JointObligorTypeEnum,
  type GuaranteeMethodEnum,
} from '../schema';

interface FormDefaultsOptions {
  jointObligorType?: JointObligorTypeEnum;
  guaranteeMethod?: GuaranteeMethodEnum;
  initialData?: Record<string, unknown> | null | undefined;
}

export function jointObligorFormDefaults(opts: FormDefaultsOptions = {}): Record<string, unknown> {
  const guaranteeMethod = opts.guaranteeMethod ?? 'INCOME';
  const baseline: Record<string, unknown> = {
    jointObligorType: opts.jointObligorType ?? 'INDIVIDUAL',
    nationality: 'MEXICAN',
    guaranteeMethod,
    hasPropertyGuarantee: guaranteeMethod === 'PROPERTY',
    propertyUnderLegalProceeding: false,
  };

  return {
    ...baseline,
    ...(opts.initialData ?? {}),
  };
}

export function jointObligorTabFields(
  jointObligorType: JointObligorTypeEnum,
  tab: string,
): readonly string[] | undefined {
  switch (tab) {
    case 'personal':
      return jointObligorType === 'COMPANY'
        ? jointObligorPersonalCompanyTabSchema.keyof().options
        : jointObligorPersonalIndividualTabSchema.keyof().options;
    case 'employment':
      return jointObligorEmploymentTabSchema.keyof().options;
    case 'guarantee':
      // Either guarantee method may be active on a tab save — keep both sets.
      return Array.from(
        new Set([
          ...incomeGuaranteeSchema.keyof().options,
          ...propertyGuaranteeSchema.keyof().options,
        ]),
      );
    case 'references':
      return jointObligorType === 'COMPANY'
        ? jointObligorReferencesCompanyTabSchema.keyof().options
        : jointObligorReferencesIndividualTabSchema.keyof().options;
    case 'documents':
      return jointObligorDocumentsTabSchema.keyof().options;
    default:
      return undefined;
  }
}
