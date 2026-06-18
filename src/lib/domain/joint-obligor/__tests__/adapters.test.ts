/**
 * Unit tests for the Joint Obligor adapters: db (toDb / toDbReferences), api
 * (drift), form (defaults / tab fields).
 */

import { describe, it, expect } from 'bun:test';
import { toDb, toDbReferences } from '../adapters/db';
import { jointObligorApiOutput, jointObligorApiOutputFields } from '../adapters/api';
import { jointObligorFormDefaults, jointObligorTabFields } from '../adapters/form';
import {
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
} from '../schema';

describe('joint-obligor db adapter — toDb', () => {
  it('maps legacy isCompany → jointObligorType', () => {
    const result = toDb({ isCompany: true, companyName: 'X' }, { jointObligorType: 'INDIVIDUAL' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.jointObligorType).toBe('COMPANY');
      expect('isCompany' in result.value).toBe(false);
    }
  });

  it('guaranteeMethod PROPERTY drives hasPropertyGuarantee = true', () => {
    const result = toDb(
      { jointObligorType: 'INDIVIDUAL', guaranteeMethod: 'PROPERTY' },
      { jointObligorType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.guaranteeMethod).toBe('PROPERTY');
      expect(result.value.hasPropertyGuarantee).toBe(true);
    }
  });

  it('guaranteeMethod INCOME drives hasPropertyGuarantee = false', () => {
    const result = toDb(
      { jointObligorType: 'INDIVIDUAL', guaranteeMethod: 'INCOME' },
      { jointObligorType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.hasPropertyGuarantee).toBe(false);
  });

  it('normalizes string numbers (propertyValue, monthlyIncome)', () => {
    const result = toDb(
      { jointObligorType: 'INDIVIDUAL', propertyValue: '1500000', monthlyIncome: '40000' },
      { jointObligorType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.propertyValue).toBe(1_500_000);
      expect(result.value.monthlyIncome).toBe(40_000);
    }
  });

  it('converts personalReferences to Prisma { create } format', () => {
    const refs = [
      { firstName: 'A', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
      { firstName: 'B', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
      { firstName: 'C', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
    ];
    const result = toDb(
      { jointObligorType: 'INDIVIDUAL', personalReferences: refs },
      { jointObligorType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const pref = result.value.personalReferences as { create: unknown[] };
      expect(pref.create).toHaveLength(3);
    }
  });

  it('does NOT write phantom legacy fields (fullName/birthDate/etc.)', () => {
    const result = toDb(
      { jointObligorType: 'INDIVIDUAL', firstName: 'Juan', paternalLastName: 'Pérez' },
      { jointObligorType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('fullName' in result.value).toBe(false);
      expect('birthDate' in result.value).toBe(false);
      expect(result.value.firstName).toBe('Juan');
    }
  });

  it('rejects when input is not an object', () => {
    expect(toDb(null, { jointObligorType: 'INDIVIDUAL' }).ok).toBe(false);
  });

  it('flips informationComplete + completedAt on non-partial submissions', () => {
    const result = toDb({ jointObligorType: 'INDIVIDUAL' }, { jointObligorType: 'INDIVIDUAL', isPartial: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.informationComplete).toBe(true);
      expect(result.value.completedAt).toBeInstanceOf(Date);
    }
  });
});

describe('joint-obligor db adapter — toDbReferences', () => {
  it('returns undefined for empty/null', () => {
    expect(toDbReferences(null, 'personal')).toBeUndefined();
    expect(toDbReferences([], 'personal')).toBeUndefined();
  });

  it('maps commercial references with flat name fields', () => {
    const out = toDbReferences(
      [{ companyName: 'Acme', firstName: 'Ana', paternalLastName: 'P', phone: '5551234567', relationship: 'Proveedor' }],
      'commercial',
    );
    expect(out?.create[0].contactFirstName).toBe('Ana');
    expect(out?.create[0].contactPaternalLastName).toBe('P');
  });
});

describe('joint-obligor api adapter — drift', () => {
  it('every API field exists in the canonical schema or is a known Prisma base column', () => {
    const branchKeys = new Set<string>([
      ...Object.keys(jointObligorIndividualIncomeCompleteSchema.shape),
      ...Object.keys(jointObligorIndividualPropertyCompleteSchema.shape),
      ...Object.keys(jointObligorCompanyIncomeCompleteSchema.shape),
      ...Object.keys(jointObligorCompanyPropertyCompleteSchema.shape),
    ]);
    const prismaBaseFields = new Set([
      'id', 'policyId', 'createdAt', 'updatedAt', 'accessToken', 'tokenExpiry',
      'informationComplete', 'completedAt', 'verificationStatus', 'verifiedAt',
      'verifiedBy', 'rejectionReason', 'rejectedAt',
      // Real JO column the form schema doesn't collect (no passport in the form).
      'passport',
    ]);

    for (const apiField of jointObligorApiOutputFields) {
      const known = branchKeys.has(apiField) || prismaBaseFields.has(apiField);
      if (!known) {
        throw new Error(
          `jointObligorApiOutput.${apiField} is not present on the canonical joint-obligor schema. ` +
            `Add it to the schema (preferred) or remove it from jointObligorApiOutput.`,
        );
      }
    }
  });

  it('parses a realistic Prisma-emitted joint-obligor fixture', () => {
    const fixture = {
      id: 'j1', policyId: 'p1', email: 'a@b.test', phone: '5551234567',
      firstName: 'Ana', middleName: null, paternalLastName: 'P', maternalLastName: null,
      companyName: null, rfc: null, accessToken: null, tokenExpiry: null,
      informationComplete: false, completedAt: null, verificationStatus: 'PENDING',
      verifiedAt: null, verifiedBy: null, rejectionReason: null, rejectedAt: null,
      additionalInfo: null, createdAt: new Date(), updatedAt: new Date(),
      jointObligorType: 'INDIVIDUAL', nationality: 'MEXICAN', curp: null, passport: null,
      relationshipToTenant: 'sibling', companyRfc: null, guaranteeMethod: 'INCOME',
      hasPropertyGuarantee: false, propertyValue: null, monthlyIncome: 40000,
    };
    expect(jointObligorApiOutput.safeParse(fixture).success).toBe(true);
  });
});

describe('joint-obligor form adapter', () => {
  it('defaults to INDIVIDUAL income guarantee', () => {
    const d = jointObligorFormDefaults();
    expect(d.jointObligorType).toBe('INDIVIDUAL');
    expect(d.guaranteeMethod).toBe('INCOME');
    expect(d.hasPropertyGuarantee).toBe(false);
  });

  it('honors a PROPERTY guarantee default', () => {
    const d = jointObligorFormDefaults({ guaranteeMethod: 'PROPERTY' });
    expect(d.guaranteeMethod).toBe('PROPERTY');
    expect(d.hasPropertyGuarantee).toBe(true);
  });

  it('guarantee tab returns the union of income + property fields', () => {
    const fields = jointObligorTabFields('INDIVIDUAL', 'guarantee');
    expect(fields).toContain('bankName');
    expect(fields).toContain('propertyValue');
  });

  it('returns undefined for an unknown tab', () => {
    expect(jointObligorTabFields('INDIVIDUAL', 'nonexistent')).toBeUndefined();
  });
});
