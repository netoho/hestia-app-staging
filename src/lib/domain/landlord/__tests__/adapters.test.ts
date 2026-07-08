/**
 * Unit tests for the Landlord adapters:
 *   - db.toDb / toDbMultiple / toDbPropertyDetails — Prisma payload builder
 *     (incl. the landlord-specific landlord/policy field split)
 *   - api.landlordApiOutput — wire-shape contract (drift-checked against
 *     the canonical schema)
 *   - form.landlordFormDefaults / landlordTabFields — RHF helpers
 */

import { describe, it, expect } from 'bun:test';
import { toDb, toDbMultiple, toDbPropertyDetails } from '../adapters/db';
import { landlordApiOutput, landlordApiOutputFields } from '../adapters/api';
import { landlordFormDefaults, landlordTabFields } from '../adapters/form';
import {
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
  landlordOwnerInfoIndividualSchema,
  landlordFinancialInfoTabSchema,
} from '../schema';

// ---------------------------------------------------------------------------
// db adapter
// ---------------------------------------------------------------------------

describe('landlord db adapter — toDb', () => {
  it('normalizes empty strings to null', () => {
    const result = toDb({ isCompany: false, firstName: 'Ana', middleName: '' }, { isCompany: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.landlordData.firstName).toBe('Ana');
      expect(result.value.landlordData.middleName).toBeNull();
    }
  });

  it('normalizes string numbers to actual numbers', () => {
    const result = toDb({ isCompany: false, monthlyIncome: '45000', propertyValue: '1000000' }, { isCompany: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.value.landlordData as Record<string, unknown>;
      expect(data.monthlyIncome).toBe(45000);
      expect(data.propertyValue).toBe(1000000);
    }
  });

  it('normalizes string booleans to actual booleans', () => {
    const result = toDb({ isCompany: false, requiresCFDI: 'true' }, { isCompany: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.landlordData.requiresCFDI).toBe(true);
  });

  it('splits policy-level financial fields off the landlord payload', () => {
    const result = toDb(
      { isCompany: false, firstName: 'Ana', hasIVA: true, securityDeposit: 15000, paymentMethod: 'bank_transfer' },
      { isCompany: false },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Landlord payload no longer carries the policy fields.
      expect('hasIVA' in result.value.landlordData).toBe(false);
      expect('securityDeposit' in result.value.landlordData).toBe(false);
      // They moved to policyData (passed through; numeric coercion is the
      // Policy service's responsibility, matching the legacy prepareForDB).
      expect(result.value.policyData).toBeDefined();
      expect(result.value.policyData?.hasIVA).toBe(true);
      expect(result.value.policyData?.securityDeposit).toBe(15000);
      expect(result.value.policyData?.paymentMethod).toBe('bank_transfer');
    }
  });

  it('returns undefined policyData when no policy fields present', () => {
    const result = toDb({ isCompany: false, firstName: 'Ana' }, { isCompany: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.policyData).toBeUndefined();
  });

  it('maps personal name fields to legalRep fields for COMPANY landlords', () => {
    const result = toDb(
      { isCompany: true, firstName: 'María', paternalLastName: 'Ramírez', companyName: 'X S.A.' },
      { isCompany: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.landlordData.legalRepFirstName).toBe('María');
      expect(result.value.landlordData.legalRepPaternalLastName).toBe('Ramírez');
      expect('firstName' in result.value.landlordData).toBe(false);
    }
  });

  it('rejects when input is not an object', () => {
    expect(toDb(null, { isCompany: false }).ok).toBe(false);
    expect(toDb('nope', { isCompany: false }).ok).toBe(false);
  });

  it('flips informationComplete + completedAt on non-partial submissions', () => {
    const result = toDb({ isCompany: false, firstName: 'Ana' }, { isCompany: false, isPartial: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.landlordData.informationComplete).toBe(true);
      expect(result.value.landlordData.completedAt).toBeInstanceOf(Date);
    }
  });

  it('tab filter keeps only the active tab fields (+ isCompany/isPrimary)', () => {
    const result = toDb(
      { isCompany: false, isPrimary: true, bankName: 'BBVA', accountNumber: '123', firstName: 'Ana' },
      { isCompany: false, tabName: 'financial-info' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // firstName belongs to owner-info, not financial-info → dropped.
      expect('firstName' in result.value.landlordData).toBe(false);
    }
  });
});

describe('landlord db adapter — toDbMultiple', () => {
  it('rejects an empty array', () => {
    expect(toDbMultiple([]).ok).toBe(false);
  });

  it('rejects when there is no primary landlord', () => {
    expect(toDbMultiple([{ isCompany: false, isPrimary: false, firstName: 'A' }]).ok).toBe(false);
  });

  it('rejects when there are multiple primaries', () => {
    const r = toDbMultiple([
      { isCompany: false, isPrimary: true, firstName: 'A' },
      { isCompany: false, isPrimary: true, firstName: 'B' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('consolidates policy data from the primary landlord', () => {
    const r = toDbMultiple([
      { isCompany: false, isPrimary: true, firstName: 'A', hasIVA: true },
      { isCompany: false, isPrimary: false, firstName: 'B' },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.landlords).toHaveLength(2);
      expect(r.value.policyData?.hasIVA).toBe(true);
    }
  });
});

describe('landlord db adapter — toDbPropertyDetails', () => {
  it('returns undefined for empty input', () => {
    expect(toDbPropertyDetails(null)).toBeUndefined();
  });

  it('normalizes booleans + parking number string', () => {
    const out = toDbPropertyDetails({ isFurnished: 'true', parkingSpaces: '2' });
    expect(out?.isFurnished).toBe(true);
    expect(out?.parkingSpaces).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// api adapter + drift
// ---------------------------------------------------------------------------

describe('landlord api adapter — landlordApiOutput', () => {
  it('drift: every API field exists in the canonical landlord schema', () => {
    const individualKeys = new Set(Object.keys(landlordIndividualCompleteSchema.shape));
    const companyKeys = new Set(Object.keys(landlordCompanyCompleteSchema.shape));
    // Columns every Prisma landlord record has by virtue of the table
    // shape, even when not in the form schemas.
    const prismaBaseFields = new Set([
      'id',
      'createdAt',
      'updatedAt',
      'accessToken',
      'tokenExpiry',
      'informationComplete',
      'completedAt',
      'verificationStatus',
      'verifiedAt',
      'verifiedBy',
      'rejectionReason',
      'rejectedAt',
      'additionalInfo',
      'policyId',
      'firstName',
      'middleName',
      'paternalLastName',
      'maternalLastName',
      'companyName',
      'rfc',
      'email',
      'phone',
      'address',
      'addressId',
      'occupation',
      // Trimmed from the tab/canonical schemas on #189 (no tab ever rendered
      // them); the columns still exist and the API emits them.
      'cfdiData',
      'monthlyIncome',
      'hasAdditionalIncome',
      'additionalIncomeSource',
      'additionalIncomeAmount',
    ]);

    for (const apiField of landlordApiOutputFields) {
      const known =
        individualKeys.has(apiField) || companyKeys.has(apiField) || prismaBaseFields.has(apiField);
      if (!known) {
        throw new Error(
          `landlordApiOutput.${apiField} is not present on the canonical landlord schema. ` +
            `Add it to landlordSchema (preferred) or remove it from landlordApiOutput.`,
        );
      }
    }
  });

  it('parses a realistic Prisma-emitted landlord fixture', () => {
    const fixture = {
      id: 'l1',
      policyId: 'p1',
      email: 'a@b.test',
      phone: '5551234567',
      firstName: 'Ana',
      middleName: null,
      paternalLastName: 'Pérez',
      maternalLastName: null,
      companyName: null,
      rfc: null,
      accessToken: null,
      tokenExpiry: null,
      informationComplete: false,
      completedAt: null,
      verificationStatus: 'PENDING',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
      rejectedAt: null,
      additionalInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPrimary: true,
      isCompany: false,
      nationality: 'MEXICAN',
      curp: null,
      companyRfc: null,
      businessType: null,
      legalRepFirstName: null,
      legalRepPaternalLastName: null,
      legalRepPosition: null,
      legalRepEmail: null,
      legalRepPhone: null,
      address: '',
      addressId: null,
      bankName: null,
      accountNumber: null,
      clabe: null,
      accountHolder: null,
      occupation: null,
      monthlyIncome: null,
      requiresCFDI: false,
    };
    expect(landlordApiOutput.safeParse(fixture).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// form adapter
// ---------------------------------------------------------------------------

describe('landlord form adapter — landlordFormDefaults', () => {
  it('returns the documented baseline defaults', () => {
    const d = landlordFormDefaults();
    expect(d.isCompany).toBe(false);
    expect(d.isPrimary).toBe(false);
    expect(d.nationality).toBe('MEXICAN');
    expect(d.requiresCFDI).toBe(false);
    expect(d.hasIVA).toBe(false);
  });

  it('initialData overrides the baseline', () => {
    const d = landlordFormDefaults({ initialData: { firstName: 'Ana', requiresCFDI: true } });
    expect(d.firstName).toBe('Ana');
    expect(d.requiresCFDI).toBe(true);
  });
});

describe('landlord form adapter — landlordTabFields', () => {
  it('derives the owner-info individual field list via .keyof()', () => {
    const fields = landlordTabFields(false, 'owner-info');
    expect(fields).toBeDefined();
    for (const key of Object.keys(landlordOwnerInfoIndividualSchema.shape)) {
      expect(fields).toContain(key);
    }
  });

  it('derives the financial-info field list', () => {
    const fields = landlordTabFields(false, 'financial-info');
    expect(fields).toBeDefined();
    for (const key of Object.keys(landlordFinancialInfoTabSchema.shape)) {
      expect(fields).toContain(key);
    }
  });

  it('returns undefined for an unknown tab', () => {
    expect(landlordTabFields(false, 'nonexistent')).toBeUndefined();
  });
});
