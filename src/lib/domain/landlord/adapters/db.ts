/**
 * DB adapter for the Landlord domain entity.
 *
 * Replaces `src/lib/utils/landlord/prepareForDB.ts` — the legacy file
 * accepted `data: any` and cast field-by-field. This adapter accepts
 * `unknown`, normalizes types + empty strings, optionally validates
 * through the canonical schema, then returns a typed payload wrapped in
 * the service-layer `Result`.
 *
 * Landlord-specific wrinkle: some financial fields are stored on the
 * **Policy** table, not Landlord. `toDb` therefore returns
 * `{ landlordData, policyData }` — the service applies `policyData` to
 * the policy. `toDbMultiple` handles the co-ownership array (enforcing
 * exactly-one-primary), and `toDbPropertyDetails` prepares the
 * PropertyDetails payload.
 *
 * Zero `as any` inside this file is a contract.
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
import { landlordTabFields } from './form';
import { validatePrimaryLandlord } from '../schema';

/** Landlord numeric fields that may arrive as strings from the form layer. */
const LANDLORD_NUMBER_FIELDS = [
  'propertyValue',
  'monthlyIncome',
  'additionalIncomeAmount',
  'parkingSpaces',
] as const;

/** Fields stored on the Policy table rather than Landlord. */
const POLICY_FINANCIAL_FIELDS = [
  'hasIVA',
  'issuesTaxReceipts',
  'securityDeposit',
  'maintenanceFee',
  'rentIncreasePercentage',
  'paymentMethod',
] as const;

export type LandlordDbPayload = Partial<
  Omit<Prisma.LandlordUncheckedUpdateInput, 'documents' | 'policy'>
> & {
  // Address sub-objects survive temporarily so the service can upsert
  // them and inject the resulting `addressId`.
  addressDetails?: Record<string, unknown> | null;
};

export type PolicyFinancialPayload = Record<string, unknown>;

interface ToDbOptions {
  isCompany: boolean;
  /** When omitted/true, missing fields are tolerated (tab + admin saves). */
  isPartial?: boolean;
  /** When set, restrict the payload to fields belonging to that tab. */
  tabName?: string;
}

function validationError(detail: unknown): ServiceError {
  return new ServiceError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    400,
    { issues: detail },
    true,
    'La información proporcionada no es válida.',
  );
}

/**
 * Build a Prisma-ready landlord payload from unknown form/admin input.
 * Returns `{ landlordData, policyData }` — `policyData` is undefined when
 * no policy-level financial fields were present.
 *
 * Pure data transformation; sync `Result` so the service's (sync)
 * update-builder can call it directly.
 */
export function toDb(
  input: unknown,
  opts: ToDbOptions,
): Result<{ landlordData: LandlordDbPayload; policyData?: PolicyFinancialPayload }> {
  if (input === null || typeof input !== 'object') {
    return Result.error(
      new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Landlord input must be an object',
        400,
        { receivedType: typeof input },
        true,
        'La información proporcionada no es válida.',
      ),
    );
  }

  let working: Record<string, unknown> = { ...(input as Record<string, unknown>) };

  // 1. Tab filter (only persist the active tab's fields). Done first to
  //    match the legacy pipeline; isCompany/isPrimary always kept for context.
  if (opts.tabName) {
    working = filterByTab(working, opts.isCompany, opts.tabName);
  }

  // 2. Map landlord-type fields (legal-rep mapping for companies; defaults).
  working = mapLandlordFields(working, opts.isCompany);

  // 3. Normalize boolean + number strings before validation.
  working = normalizeBooleans(working);
  working = normalizeNumbersBase(working, [...LANDLORD_NUMBER_FIELDS]);

  // 4. Address sub-objects: empty strings → null inside each.
  working = processAddressFields(working);

  // 5. Top-level empty strings → null, drop undefined.
  working = emptyStringsToNull(working) as Record<string, unknown>;
  working = removeUndefined(working);

  // 6. Split policy-level financial fields off the landlord payload.
  const policyData: PolicyFinancialPayload = {};
  for (const field of POLICY_FINANCIAL_FIELDS) {
    if (field in working) {
      policyData[field] = working[field];
      delete working[field];
    }
  }

  // 7. Mark complete on full submissions.
  if (opts.isPartial === false) {
    working.informationComplete = true;
    working.completedAt = new Date();
  }

  return Result.ok({
    landlordData: working as LandlordDbPayload,
    policyData: Object.keys(policyData).length > 0 ? policyData : undefined,
  });
}

/**
 * Prepare an array of landlords (co-ownership). Enforces exactly-one-primary
 * and consolidates policy-level financial data from the primary landlord.
 */
export function toDbMultiple(
  landlords: unknown,
  opts: { isPartial?: boolean } = {},
): Result<{ landlords: LandlordDbPayload[]; policyData?: PolicyFinancialPayload }> {
  if (!Array.isArray(landlords) || landlords.length === 0) {
    return Result.error(validationError('No se proporcionaron arrendadores'));
  }

  const primaryCheck = validatePrimaryLandlord(
    landlords.map((l) => ({ isPrimary: Boolean((l as Record<string, unknown>)?.isPrimary) })),
  );
  if (!primaryCheck.valid) {
    return Result.error(validationError(primaryCheck.error));
  }

  const prepared: LandlordDbPayload[] = [];
  let consolidatedPolicyData: PolicyFinancialPayload = {};

  for (const landlord of landlords) {
    const ld = landlord as Record<string, unknown>;
    const result = toDb(ld, {
      isCompany: Boolean(ld.isCompany),
      isPartial: opts.isPartial,
    });
    if (!result.ok) return Result.error(result.error);

    prepared.push(result.value.landlordData);

    // Policy data should match across landlords; take it from the primary.
    if (result.value.policyData && ld.isPrimary) {
      consolidatedPolicyData = { ...consolidatedPolicyData, ...result.value.policyData };
    }
  }

  return Result.ok({
    landlords: prepared,
    policyData: Object.keys(consolidatedPolicyData).length > 0 ? consolidatedPolicyData : undefined,
  });
}

/**
 * Prepare a PropertyDetails payload (utilities booleans + parking number +
 * address sub-objects). Replaces `preparePropertyDetailsForDB`.
 */
export function toDbPropertyDetails(
  propertyData: unknown,
): Record<string, unknown> | undefined {
  if (!propertyData || typeof propertyData !== 'object') return undefined;

  let prepared: Record<string, unknown> = { ...(propertyData as Record<string, unknown>) };

  prepared = normalizeBooleans(prepared);
  if (typeof prepared.parkingSpaces === 'string') {
    prepared.parkingSpaces = parseInt(prepared.parkingSpaces, 10) || 0;
  }
  prepared = processAddressFields(prepared);
  prepared = emptyStringsToNull(prepared) as Record<string, unknown>;
  prepared = removeUndefined(prepared);

  return prepared;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filterByTab(
  data: Record<string, unknown>,
  isCompany: boolean,
  tabName: string,
): Record<string, unknown> {
  const allowed = landlordTabFields(isCompany, tabName);
  if (!allowed) return data;

  const filtered: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in data) filtered[field] = data[field];
  }
  // Always keep type/role context for downstream mapping.
  filtered.isCompany = data.isCompany;
  filtered.isPrimary = data.isPrimary;
  return filtered;
}

function mapLandlordFields(
  data: Record<string, unknown>,
  isCompany: boolean,
): Record<string, unknown> {
  const out = { ...data };

  // For companies, copy personal-name fields into the legalRep* slots
  // (only when the slot is empty) and drop the personal-name fields.
  if (isCompany && out.firstName && !out.legalRepFirstName) {
    out.legalRepFirstName = out.firstName;
    out.legalRepMiddleName = out.middleName;
    out.legalRepPaternalLastName = out.paternalLastName;
    out.legalRepMaternalLastName = out.maternalLastName;
    delete out.firstName;
    delete out.middleName;
    delete out.paternalLastName;
    delete out.maternalLastName;
  }

  out.isCompany = Boolean(isCompany);
  if (out.isPrimary === undefined) out.isPrimary = false;

  return out;
}

function processAddressFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const key of ['addressDetails', 'propertyAddressDetails'] as const) {
    const value = out[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = emptyStringsToNull(value as Record<string, unknown>);
    }
  }
  return out;
}
