/**
 * DB adapter for the Tenant domain entity.
 *
 * Replaces `src/lib/utils/tenant/prepareForDB.ts` — the legacy file
 * accepted `data: any`, cast field-by-field, and produced an untyped
 * record. This adapter accepts `unknown`, parses through the canonical
 * `tenantSchema` (or its tab/partial mode), normalizes types + empty
 * strings, then returns a typed Prisma-ready payload wrapped in
 * `AsyncResult` — consistent with the service layer's Result pattern.
 *
 * Zero `as any` inside this file is a contract — the whole point is to
 * stop the field-by-field casts.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';
import { Result } from '@/lib/services/types/result';
import { ServiceError, ErrorCode } from '@/lib/services/types/errors';
import {
  emptyStringsToNull,
  removeUndefined,
  normalizeBooleans,
  normalizeNumbers as normalizeNumbersBase,
} from '@/lib/utils/dataTransform';
import { tenantTabFields } from './form';
import {
  getTenantTabSchema,
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
  type TenantType,
} from '../schema';

/**
 * Fields whose values are emitted as numbers in the DB but may arrive as
 * strings from the form layer (RHF + uncontrolled inputs).
 */
const TENANT_NUMBER_FIELDS = [
  'monthlyIncome',
  'additionalIncomeAmount',
  'previousRentAmount',
  'rentalHistoryYears',
  'numberOfOccupants',
  'yearsAtJob',
  'employeeCount',
  'yearsInBusiness',
] as const;

/**
 * Payload the adapter produces. The Prisma update/create call sites
 * accept this directly (TenantUncheckedUpdateInput is permissive enough
 * to absorb the partial shape) after the service has resolved address
 * relations via `upsertAddress` and stripped the `*AddressDetails` keys.
 */
export type TenantDbPayload = Partial<
  Omit<Prisma.TenantUncheckedUpdateInput, 'personalReferences' | 'commercialReferences' | 'documents'>
> & {
  // Address sub-objects survive in the payload temporarily so the
  // service can upsert them and inject the resulting `*AddressId`s.
  addressDetails?: Record<string, unknown> | null;
  employerAddressDetails?: Record<string, unknown> | null;
  previousRentalAddressDetails?: Record<string, unknown> | null;
};

interface ToDbOptions {
  tenantType: TenantType;
  /** When true, fields not present in `data` are simply omitted (no
   * required-field rejection). For tab-saves and admin patches. */
  isPartial?: boolean;
  /** When set, restrict the payload to fields belonging to that tab. */
  tabName?: string;
}

/**
 * Adapter entrypoint. Accepts unknown form/admin input, returns a
 * typed payload ready for Prisma. Errors flow as `Result.error` —
 * never thrown — so the service layer's transaction wrapper can
 * surface them cleanly.
 *
 * Pure data transformation — no I/O. Sync `Result` rather than
 * `AsyncResult` so the base service's `buildUpdateData` (sync)
 * can call it without restructuring.
 */
export function toDb(
  input: unknown,
  opts: ToDbOptions,
): Result<TenantDbPayload> {
  if (input === null || typeof input !== 'object') {
    return Result.error(
      new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Tenant input must be an object',
        400,
        { receivedType: typeof input },
        true,
        'La información proporcionada no es válida.',
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Pipeline ordering: NORMALIZE first, VALIDATE second, TRANSFORM
  // third. This matches the legacy `prepareForDB.ts` order and is
  // important — forms submit string numbers ('45000') and string
  // booleans ('true') which the canonical schema rejects. Normalize
  // before we hand the payload to Zod.
  // ──────────────────────────────────────────────────────────────────
  let working: Record<string, unknown> = { ...(input as Record<string, unknown>) };

  // 1. Normalize boolean strings ('true'/'false' → boolean).
  working = normalizeBooleans(working);

  // 2. Normalize number strings → numbers (for the tenant-specific
  //    numeric fields).
  working = normalizeNumbersBase(working, [...TENANT_NUMBER_FIELDS]);

  // 3. Map legal-rep fields for company tenants BEFORE validation —
  //    company schemas require legalRep* fields, not the un-prefixed
  //    personal-name ones.
  if (opts.tenantType === 'COMPANY') {
    working = mapLegalRepFields(working);
  }

  // 4. Only an EXPLICIT type in the input may write the tenantType column.
  //    opts.tenantType selects which schema validates, but callers derive it
  //    heuristically when the payload has no type signal (TenantService
  //    guesses INDIVIDUAL) — unconditionally injecting it here reverted
  //    COMPANY tenants to INDIVIDUAL on references/documents tab saves.
  const inputRecord = input as Record<string, unknown>;
  if (inputRecord.tenantType !== undefined || inputRecord.isCompany !== undefined) {
    working.tenantType = opts.tenantType;
  } else {
    delete working.tenantType;
  }

  // 5. Validate against the canonical schema in the appropriate mode.
  //    Tab-level validation lets us accept fields one tab at a time
  //    without rejecting the partial for unrelated tabs.
  if (opts.tabName) {
    const tabSchema = getTenantTabSchema(opts.tenantType, opts.tabName);
    const parsed = (opts.isPartial ?? true)
      ? tabSchema.partial().safeParse(working)
      : tabSchema.safeParse(working);
    if (!parsed.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          400,
          { issues: parsed.error.flatten() },
          true,
          'La información proporcionada no es válida.',
        ),
      );
    }
  } else if (opts.isPartial === false) {
    // No tab specified + explicit non-partial = strict validation
    // against the complete schema (create + final submit).
    const completeSchema =
      opts.tenantType === 'COMPANY' ? tenantCompanyCompleteSchema : tenantIndividualCompleteSchema;
    const parsed = completeSchema.safeParse(working);
    if (!parsed.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          400,
          { issues: parsed.error.flatten() },
          true,
          'La información proporcionada no es válida.',
        ),
      );
    }
  }
  // (isPartial == null || true) && !tabName is the loosest case —
  // admin patches and ad-hoc updates. Skip schema validation; the
  // normalization above still ran.

  // 6. Tab filter — only persist fields belonging to the tab. Done
  //    AFTER validation so a tab save still validates the tab's
  //    cross-field rules even though we strip other tabs' fields
  //    from the final payload.
  if (opts.tabName) {
    working = filterByTab(working, opts.tenantType, opts.tabName);
  }

  // 7. Normalize address sub-objects (empty strings → null inside each).
  working = processAddressFields(working);

  // 8. Top-level empty-strings → null.
  working = emptyStringsToNull(working) as Record<string, unknown>;

  // 9. Drop undefined values (Prisma rejects them).
  working = removeUndefined(working);

  // 10. Mark complete if this is a full (non-partial) submission.
  if (opts.isPartial === false) {
    working.informationComplete = true;
    working.completedAt = new Date();
  }

  return Result.ok(working as TenantDbPayload);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filterByTab(
  data: Record<string, unknown>,
  tenantType: TenantType,
  tabName: string,
): Record<string, unknown> {
  const allowed = tenantTabFields(tenantType, tabName);
  if (!allowed) return data;

  const filtered: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in data) filtered[field] = data[field];
  }

  // References live in a sub-object the form sends as a top-level key;
  // forward them through when the references tab is being saved.
  if (tabName === 'references') {
    if (data.personalReferences) filtered.personalReferences = data.personalReferences;
    if (data.commercialReferences) filtered.commercialReferences = data.commercialReferences;
  }

  return filtered;
}

function mapLegalRepFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };

  // If the form sent personal-name fields for a company tenant, copy
  // them into the legalRep* slots (only when the legalRep slot is empty)
  // and remove the personal-name fields.
  if (out.firstName !== undefined) {
    if (out.legalRepFirstName == null) out.legalRepFirstName = out.firstName;
    delete out.firstName;
  }
  if (out.middleName !== undefined) {
    if (out.legalRepMiddleName == null) out.legalRepMiddleName = out.middleName;
    delete out.middleName;
  }
  if (out.paternalLastName !== undefined) {
    if (out.legalRepPaternalLastName == null) out.legalRepPaternalLastName = out.paternalLastName;
    delete out.paternalLastName;
  }
  if (out.maternalLastName !== undefined) {
    if (out.legalRepMaternalLastName == null) out.legalRepMaternalLastName = out.maternalLastName;
    delete out.maternalLastName;
  }

  return out;
}

function processAddressFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };

  for (const key of ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails'] as const) {
    const value = out[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = emptyStringsToNull(value as Record<string, unknown>);
    }
  }

  return out;
}

/**
 * Prepare references for Prisma's nested-create format. Lifted from the
 * legacy prepareForDB so the migration is a drop-in for service-layer
 * callers.
 */
export function toDbReferences(
  references: unknown[] | undefined | null,
  type: 'personal' | 'commercial',
): { create: Record<string, unknown>[] } | undefined {
  if (!references || references.length === 0) return undefined;

  const cleaned = references.map((ref) => {
    const sanitized = emptyStringsToNull(removeUndefined(ref as Record<string, unknown>));
    if (type === 'commercial') {
      const r = sanitized as Record<string, unknown>;
      if (!r.contactFirstName && r.firstName) {
        return {
          companyName: r.companyName,
          contactFirstName: r.firstName,
          contactMiddleName: r.middleName,
          contactPaternalLastName: r.paternalLastName,
          contactMaternalLastName: r.maternalLastName,
          phone: r.phone,
          email: r.email,
          relationship: r.relationship,
          yearsOfRelationship: r.yearsOfRelationship,
        };
      }
    }
    return sanitized as Record<string, unknown>;
  });

  return { create: cleaned };
}
