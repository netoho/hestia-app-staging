/**
 * Unit tests for the Aval adapters: db (toDb / toDbReferences), api
 * (drift), form (defaults / tab fields).
 */

import { describe, it, expect } from 'bun:test';
import { toDb, toDbReferences } from '../adapters/db';
import { avalApiOutput, avalApiOutputFields } from '../adapters/api';
import { avalFormDefaults, avalTabFields } from '../adapters/form';
import {
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
  avalPropertyTabBaseSchema,
} from '../schema';

describe('aval db adapter — toDb', () => {
  it('always enforces the mandatory property guarantee', () => {
    const result = toDb({ avalType: 'INDIVIDUAL', firstName: 'Ana' }, { avalType: 'INDIVIDUAL' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasPropertyGuarantee).toBe(true);
      expect(result.value.guaranteeMethod).toBe('property');
    }
  });

  it('normalizes string numbers (propertyValue)', () => {
    const result = toDb(
      { avalType: 'INDIVIDUAL', propertyValue: '1500000' },
      { avalType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.propertyValue).toBe(1_500_000);
  });

  it('maps personal name fields to legalRep fields for COMPANY avals', () => {
    const result = toDb(
      { avalType: 'COMPANY', firstName: 'María', paternalLastName: 'Ramírez', companyName: 'X S.A.' },
      { avalType: 'COMPANY' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.legalRepFirstName).toBe('María');
      expect(result.value.legalRepPaternalLastName).toBe('Ramírez');
      expect('firstName' in result.value).toBe(false);
    }
  });

  it('maps legacy isCompany → avalType', () => {
    const result = toDb({ isCompany: true, companyName: 'X' }, { avalType: 'INDIVIDUAL' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.avalType).toBe('COMPANY');
      expect('isCompany' in result.value).toBe(false);
    }
  });

  it('converts personalReferences to Prisma { create } format', () => {
    const refs = [
      { firstName: 'A', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
      { firstName: 'B', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
      { firstName: 'C', paternalLastName: 'R', phone: '5551234567', relationship: 'Amigo' },
    ];
    const result = toDb(
      { avalType: 'INDIVIDUAL', personalReferences: refs },
      { avalType: 'INDIVIDUAL' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const pref = result.value.personalReferences as { create: unknown[] };
      expect(pref.create).toHaveLength(3);
    }
  });

  it('rejects when input is not an object', () => {
    expect(toDb(null, { avalType: 'INDIVIDUAL' }).ok).toBe(false);
  });

  it('flips informationComplete + completedAt on non-partial submissions', () => {
    const result = toDb({ avalType: 'INDIVIDUAL' }, { avalType: 'INDIVIDUAL', isPartial: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.informationComplete).toBe(true);
      expect(result.value.completedAt).toBeInstanceOf(Date);
    }
  });
});

describe('aval db adapter — toDbReferences', () => {
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

describe('aval api adapter — drift', () => {
  it('every API field exists in the canonical aval schema', () => {
    const individualKeys = new Set(Object.keys(avalIndividualCompleteSchema.shape));
    const companyKeys = new Set(Object.keys(avalCompanyCompleteSchema.shape));
    const prismaBaseFields = new Set([
      'id', 'createdAt', 'updatedAt', 'accessToken', 'tokenExpiry', 'informationComplete',
      'completedAt', 'verificationStatus', 'verifiedAt', 'verifiedBy', 'rejectionReason',
      'rejectedAt', 'additionalInfo', 'policyId', 'firstName', 'middleName', 'paternalLastName',
      'maternalLastName', 'companyName', 'rfc', 'email', 'phone', 'monthlyIncome',
      // Real aval columns the form schema doesn't collect (aval doesn't ask for CURP/passport).
      'curp', 'passport',
    ]);

    for (const apiField of avalApiOutputFields) {
      const known =
        individualKeys.has(apiField) || companyKeys.has(apiField) || prismaBaseFields.has(apiField);
      if (!known) {
        throw new Error(
          `avalApiOutput.${apiField} is not present on the canonical aval schema. ` +
            `Add it to the schema (preferred) or remove it from avalApiOutput.`,
        );
      }
    }
  });

  it('parses a realistic Prisma-emitted aval fixture', () => {
    const fixture = {
      id: 'a1', policyId: 'p1', email: 'a@b.test', phone: '5551234567',
      firstName: 'Ana', middleName: null, paternalLastName: 'P', maternalLastName: null,
      companyName: null, rfc: null, accessToken: null, tokenExpiry: null,
      informationComplete: false, completedAt: null, verificationStatus: 'PENDING',
      verifiedAt: null, verifiedBy: null, rejectionReason: null, rejectedAt: null,
      additionalInfo: null, createdAt: new Date(), updatedAt: new Date(),
      avalType: 'INDIVIDUAL', nationality: 'MEXICAN', curp: null, passport: null,
      relationshipToTenant: 'Hermano', companyRfc: null, guaranteeMethod: 'property',
      hasPropertyGuarantee: true, propertyValue: 1000000, monthlyIncome: null,
    };
    expect(avalApiOutput.safeParse(fixture).success).toBe(true);
  });
});

describe('aval form adapter', () => {
  it('defaults include the mandatory property guarantee', () => {
    const d = avalFormDefaults();
    expect(d.avalType).toBe('INDIVIDUAL');
    expect(d.hasPropertyGuarantee).toBe(true);
    expect(d.guaranteeMethod).toBe('property');
  });

  it('derives the property tab field list from the base schema', () => {
    const fields = avalTabFields('INDIVIDUAL', 'property');
    expect(fields).toBeDefined();
    for (const key of Object.keys(avalPropertyTabBaseSchema.shape)) {
      expect(fields).toContain(key);
    }
  });

  it('returns undefined for an unknown tab', () => {
    expect(avalTabFields('INDIVIDUAL', 'nonexistent')).toBeUndefined();
  });
});
