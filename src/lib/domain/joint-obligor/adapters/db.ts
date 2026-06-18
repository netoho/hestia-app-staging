/**
 * DB adapter for the Joint Obligor domain entity.
 *
 * Replaces `src/lib/utils/joint-obligor/prepareForDB.ts` (58 `as any` casts).
 * Accepts `unknown`, maps the two axes (jointObligorType × guaranteeMethod),
 * normalizes types + empty strings, and returns a Prisma-ready payload wrapped
 * in `Result`. Address sub-objects survive for the service to upsert; references
 * are converted to Prisma `{ create }` format. The service validates the result
 * through the canonical schema separately. Zero `as any` inside this file.
 */

import { Result } from '@/lib/services/types/result';
import { ServiceError, ErrorCode } from '@/lib/services/types/errors';
import {
  emptyStringsToNull,
  removeUndefined,
  normalizeBooleans,
  normalizeNumbers as normalizeNumbersBase,
} from '@/lib/utils/dataTransform';
import { jointObligorTabFields } from './form';
import type { JointObligorTypeEnum, GuaranteeMethodEnum } from '../schema';

const JOINT_OBLIGOR_NUMBER_FIELDS = ['monthlyIncome', 'propertyValue', 'yearsOfRelationship'] as const;

export type JointObligorDbPayload = Record<string, unknown>;

interface ToDbOptions {
  jointObligorType: JointObligorTypeEnum;
  guaranteeMethod?: GuaranteeMethodEnum;
  isPartial?: boolean;
  tabName?: string;
}

/**
 * Build a Prisma-ready joint-obligor payload from unknown form/admin input.
 */
export function toDb(input: unknown, opts: ToDbOptions): Result<JointObligorDbPayload> {
  if (input === null || typeof input !== 'object') {
    return Result.error(
      new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Joint obligor input must be an object',
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
    working = filterByTab(working, opts.jointObligorType, opts.tabName);
  }

  // 2. Type + guarantee-method mapping.
  working = mapFields(working, opts);

  // 3. Normalize booleans + numbers.
  working = normalizeBooleans(working);
  working = normalizeNumbersBase(working, [...JOINT_OBLIGOR_NUMBER_FIELDS]);

  // 4. Address sub-objects: empty strings → null.
  working = processAddressFields(working);

  // 5. Top-level empty strings → null, drop undefined.
  working = emptyStringsToNull(working) as Record<string, unknown>;
  working = removeUndefined(working);

  // 6. References → Prisma nested-create format.
  if (working.personalReferences) {
    working.personalReferences = toDbReferences(working.personalReferences as unknown[], 'personal');
  }
  if (working.commercialReferences) {
    working.commercialReferences = toDbReferences(working.commercialReferences as unknown[], 'commercial');
  }

  // 7. Mark complete on full submissions.
  if (opts.isPartial === false) {
    working.informationComplete = true;
    working.completedAt = new Date();
  }

  return Result.ok(working);
}

/**
 * Prepare references for Prisma's nested-create format, normalizing a commercial
 * reference that arrived in personal-name shape.
 */
export function toDbReferences(
  references: unknown[] | undefined | null,
  type: 'personal' | 'commercial',
): { create: Record<string, unknown>[] } | undefined {
  if (!references || references.length === 0) return undefined;

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
  jointObligorType: JointObligorTypeEnum,
  tabName: string,
): Record<string, unknown> {
  const allowed = jointObligorTabFields(jointObligorType, tabName);
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
  if (tabName === 'guarantee') {
    if (data.guaranteePropertyDetails) filtered.guaranteePropertyDetails = data.guaranteePropertyDetails;
    if (data.guaranteeMethod !== undefined) filtered.guaranteeMethod = data.guaranteeMethod;
  }
  if (tabName === 'references') {
    if (data.personalReferences) filtered.personalReferences = data.personalReferences;
    if (data.commercialReferences) filtered.commercialReferences = data.commercialReferences;
  }

  return filtered;
}

function mapFields(data: Record<string, unknown>, opts: ToDbOptions): Record<string, unknown> {
  const out = { ...data };

  // Legacy isCompany → jointObligorType.
  if ('isCompany' in out) {
    out.jointObligorType = out.isCompany ? 'COMPANY' : 'INDIVIDUAL';
    delete out.isCompany;
  } else if (out.jointObligorType === undefined) {
    out.jointObligorType = opts.jointObligorType;
  }

  // Guarantee method drives the hasPropertyGuarantee flag.
  const guaranteeMethod = (out.guaranteeMethod ?? opts.guaranteeMethod) as
    | GuaranteeMethodEnum
    | undefined;
  if (guaranteeMethod !== undefined) {
    out.guaranteeMethod = guaranteeMethod;
    out.hasPropertyGuarantee = guaranteeMethod === 'PROPERTY';
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
