/**
 * @deprecated
 *
 * This module re-exports the canonical tenant schema from its new
 * location at `@/lib/domain/tenant/schema`. New code should import
 * from the domain path directly. This shim exists so existing
 * imports keep working during the S2–S6c entity-migration phases;
 * once every consumer is on the new path, this file can be deleted.
 *
 * See `docs/ARCHITECTURE.md` for the hexagonal pattern and
 * `src/lib/domain/README.md` for the recipe to migrate further
 * consumers.
 */

export * from '@/lib/domain/tenant/schema';

import {
  tenantPersonalTabIndividualSchema,
  tenantPersonalTabCompanySchema,
  tenantEmploymentTabSchema,
  tenantRentalHistoryTabSchema,
  tenantReferencesTabIndividualSchema,
  tenantReferencesTabCompanySchema,
  tenantDocumentsTabSchema,
} from '@/lib/domain/tenant/schema';
import { tenantTabFields } from '@/lib/domain/tenant/adapters/form';

/**
 * @deprecated Use `tenantTabFields(tenantType, tabName)` from
 * `@/lib/domain/tenant/adapters/form` — it derives the list via
 * `.keyof()` on the canonical tab schema, eliminating drift.
 *
 * Preserved here as an object-shape compatibility shim for callers
 * that still index by `TENANT_TAB_FIELDS[type][tab]`.
 */
export const TENANT_TAB_FIELDS = {
  INDIVIDUAL: {
    personal: tenantTabFields('INDIVIDUAL', 'personal') ?? [],
    employment: tenantTabFields('INDIVIDUAL', 'employment') ?? [],
    rental: tenantTabFields('INDIVIDUAL', 'rental') ?? [],
    references: tenantTabFields('INDIVIDUAL', 'references') ?? [],
    documents: tenantTabFields('INDIVIDUAL', 'documents') ?? [],
  },
  COMPANY: {
    personal: tenantTabFields('COMPANY', 'personal') ?? [],
    references: tenantTabFields('COMPANY', 'references') ?? [],
    documents: tenantTabFields('COMPANY', 'documents') ?? [],
  },
} as const;
