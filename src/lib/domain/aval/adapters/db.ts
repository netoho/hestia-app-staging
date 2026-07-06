/**
 * DB adapter for the Aval domain entity.
 *
 * Replaces `src/lib/utils/aval/prepareForDB.ts`. Accepts `unknown`,
 * enforces aval's invariants (mandatory property guarantee, legal-rep
 * mapping for companies, exactly-3 references), normalizes types + empty
 * strings, and returns a Prisma-ready payload wrapped in `Result`.
 *
 * Pure transformation — the service validates the result through the
 * canonical schema separately (matching the legacy prepareForDB flow).
 * Zero `as any` inside this file.
 */

import { Result } from '@/lib/services/types/result';
import { ServiceError, ErrorCode } from '@/lib/services/types/errors';
import { VALIDATION_CONFIG } from '@/lib/constants/businessConfig';
import {
  emptyStringsToNull,
  removeUndefined,
  normalizeBooleans,
  normalizeNumbers as normalizeNumbersBase,
} from '@/lib/utils/dataTransform';
import { avalTabFields } from './form';
import type { AvalTypeEnum } from '../schema';

const AVAL_NUMBER_FIELDS = ['monthlyIncome', 'propertyValue', 'yearsOfRelationship'] as const;

export type AvalDbPayload = Record<string, unknown>;

interface ToDbOptions {
  avalType: AvalTypeEnum;
  isPartial?: boolean;
  tabName?: string;
}

/**
 * Build a Prisma-ready aval payload from unknown form/admin input.
 * Address sub-objects (`addressDetails`, `employerAddressDetails`,
 * `guaranteePropertyDetails`) survive in the payload so the service can
 * upsert them; references are converted to Prisma `{ create }` format.
 */
export function toDb(input: unknown, opts: ToDbOptions): Result<AvalDbPayload> {
  if (input === null || typeof input !== 'object') {
    return Result.error(
      new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Aval input must be an object',
        400,
        { receivedType: typeof input },
        true,
        'La información proporcionada no es válida.',
      ),
    );
  }

  let working: Record<string, unknown> = { ...(input as Record<string, unknown>) };

  // 1. Tab filter.
  if (opts.tabName) {
    working = filterByTab(working, opts.avalType, opts.tabName);
  }

  // 2. Aval-type mapping + mandatory-guarantee enforcement.
  working = mapAvalFields(working, opts.avalType);

  // 3. Normalize booleans + numbers.
  working = normalizeBooleans(working);
  working = normalizeNumbersBase(working, [...AVAL_NUMBER_FIELDS]);

  // 4. Address sub-objects: empty strings → null.
  working = processAddressFields(working);

  // 5. Top-level empty strings → null, drop undefined.
  working = emptyStringsToNull(working) as Record<string, unknown>;
  working = removeUndefined(working);

  // 6. References → Prisma nested-create format.
  if (working.personalReferences) {
    working.personalReferences = toDbReferences(
      working.personalReferences as unknown[],
      'personal',
    );
  }
  if (working.commercialReferences) {
    working.commercialReferences = toDbReferences(
      working.commercialReferences as unknown[],
      'commercial',
    );
  }

  // 7. Mark complete on full submissions.
  if (opts.isPartial === false) {
    working.informationComplete = true;
    working.completedAt = new Date();
  }

  return Result.ok(working);
}

/**
 * Prepare references for Prisma's nested-create format. Aval requires
 * exactly N references (warn-only here; the schema enforces the count).
 */
export function toDbReferences(
  references: unknown[] | undefined | null,
  type: 'personal' | 'commercial',
): { create: Record<string, unknown>[] } | undefined {
  if (!references || references.length === 0) return undefined;

  if (references.length !== VALIDATION_CONFIG.AVAL_REQUIRED_REFERENCES) {
    console.warn(
      `Aval requires exactly ${VALIDATION_CONFIG.AVAL_REQUIRED_REFERENCES} references, but got ${references.length}`,
    );
  }

  const cleaned = references.map((ref) => {
    const cleanRef = emptyStringsToNull(removeUndefined(ref as Record<string, unknown>)) as Record<
      string,
      unknown
    >;
    if (type === 'commercial' && !cleanRef.contactFirstName && cleanRef.firstName) {
      return {
        companyName: cleanRef.companyName,
        contactFirstName: cleanRef.firstName,
        contactMiddleName: cleanRef.middleName,
        contactPaternalLastName: cleanRef.paternalLastName,
        contactMaternalLastName: cleanRef.maternalLastName,
        phone: cleanRef.phone,
        email: cleanRef.email,
        relationship: cleanRef.relationship,
        yearsOfRelationship: cleanRef.yearsOfRelationship,
      };
    }
    return cleanRef;
  });

  return { create: cleaned };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function filterByTab(
  data: Record<string, unknown>,
  avalType: AvalTypeEnum,
  tabName: string,
): Record<string, unknown> {
  const allowed = avalTabFields(avalType, tabName);
  if (!allowed) return data;

  const filtered: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in data) filtered[field] = data[field];
  }

  // Forward nested objects + relations the form sends as top-level keys.
  if (tabName === 'personal' && data.addressDetails) filtered.addressDetails = data.addressDetails;
  if (tabName === 'employment' && data.employerAddressDetails) {
    filtered.employerAddressDetails = data.employerAddressDetails;
  }
  if (tabName === 'property') {
    if (data.guaranteePropertyDetails) filtered.guaranteePropertyDetails = data.guaranteePropertyDetails;
    filtered.hasPropertyGuarantee = true;
    filtered.guaranteeMethod = 'PROPERTY';
  }
  if (tabName === 'references') {
    if (data.personalReferences) filtered.personalReferences = data.personalReferences;
    if (data.commercialReferences) filtered.commercialReferences = data.commercialReferences;
  }

  return filtered;
}

function mapAvalFields(
  data: Record<string, unknown>,
  avalType: AvalTypeEnum,
): Record<string, unknown> {
  const out = { ...data };

  // Aval ALWAYS has a property guarantee.
  out.hasPropertyGuarantee = true;
  out.guaranteeMethod = 'PROPERTY';

  // Legacy isCompany → avalType. The enum is the aval model's ONLY stored
  // discriminator — isCompany is an input-compat alias, never a column
  // (writing it throws PrismaClientValidationError). Anything type-branching
  // on a loaded aval must read avalType (#151).
  if ('isCompany' in out) {
    out.avalType = out.isCompany ? 'COMPANY' : 'INDIVIDUAL';
    delete out.isCompany;
  } else {
    out.avalType = avalType;
  }

  // Company: copy personal-name fields into legalRep* slots, drop the originals.
  if (avalType === 'COMPANY' && out.firstName) {
    out.legalRepFirstName = out.legalRepFirstName || out.firstName;
    out.legalRepMiddleName = out.legalRepMiddleName || out.middleName;
    out.legalRepPaternalLastName = out.legalRepPaternalLastName || out.paternalLastName;
    out.legalRepMaternalLastName = out.legalRepMaternalLastName || out.maternalLastName;
    delete out.firstName;
    delete out.middleName;
    delete out.paternalLastName;
    delete out.maternalLastName;
  }

  return out;
}

function processAddressFields(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const key of ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails'] as const) {
    const value = out[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = emptyStringsToNull(value as Record<string, unknown>);
    }
  }
  return out;
}
