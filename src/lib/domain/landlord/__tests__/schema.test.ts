/**
 * Unit tests for the canonical Landlord schema.
 *
 * Covers: discriminated-union parse (individual/company), tab-schema
 * accept/reject (curp/rfc/company-required), the exactly-one-primary
 * business rule, and the multi-landlord array wrapper.
 */

import { describe, it, expect } from 'bun:test';
import {
  landlordSchema,
  landlordOwnerInfoIndividualSchema,
  landlordOwnerInfoCompanySchema,
  landlordFinancialInfoTabSchema,
  multiLandlordSchema,
  validatePrimaryLandlord,
  validateMultiLandlordSubmission,
  getLandlordTabSchema,
} from '../schema';

const validIndividual = {
  isCompany: false as const,
  isPrimary: true,
  firstName: 'Juan',
  paternalLastName: 'Pérez',
  maternalLastName: 'García',
  nationality: 'MEXICAN' as const,
  curp: 'PEPJ800101HDFRRN09',
  rfc: 'PEPJ800101AB1',
  email: 'juan.perez@example.test',
  phone: '5551234567',
};

const validCompany = {
  isCompany: true as const,
  isPrimary: true,
  companyName: 'Hestia Arrendadores S.A.',
  companyRfc: 'HTS200101AB1',
  legalRepFirstName: 'María',
  legalRepPaternalLastName: 'Ramírez',
  legalRepPosition: 'Directora',
  legalRepRfc: 'PEPJ800101AB1',
  legalRepCurp: 'PEPJ800101HDFRRN09',
  legalRepPhone: '5559876543',
  legalRepEmail: 'maria@example.test',
  email: 'contacto@hestia.test',
  phone: '5551111111',
  address: 'Av. Reforma 123',
};

describe('landlordSchema (canonical)', () => {
  it('parses a valid INDIVIDUAL landlord', () => {
    expect(landlordSchema.safeParse(validIndividual).success).toBe(true);
  });

  it('parses a valid COMPANY landlord', () => {
    expect(landlordSchema.safeParse(validCompany).success).toBe(true);
  });

  it('rejects when isCompany discriminator is missing', () => {
    const { isCompany, ...rest } = validIndividual;
    expect(landlordSchema.safeParse(rest).success).toBe(false);
  });
});

describe('landlordOwnerInfoIndividualSchema', () => {
  it('accepts the happy fixture', () => {
    expect(landlordOwnerInfoIndividualSchema.safeParse(validIndividual).success).toBe(true);
  });

  it('rejects a malformed CURP', () => {
    const result = landlordOwnerInfoIndividualSchema.safeParse({ ...validIndividual, curp: 'NOPE' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed RFC', () => {
    const result = landlordOwnerInfoIndividualSchema.safeParse({ ...validIndividual, rfc: 'X' });
    expect(result.success).toBe(false);
  });

  it('isPrimary defaults to false when omitted', () => {
    const { isPrimary, ...rest } = validIndividual;
    const result = landlordOwnerInfoIndividualSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(false);
  });
});

describe('landlordOwnerInfoCompanySchema', () => {
  it('accepts a valid company payload', () => {
    expect(landlordOwnerInfoCompanySchema.safeParse(validCompany).success).toBe(true);
  });

  it('rejects when legalRepPosition is missing', () => {
    const { legalRepPosition, ...rest } = validCompany;
    expect(landlordOwnerInfoCompanySchema.safeParse(rest).success).toBe(false);
  });

  it('rejects when companyName is empty', () => {
    expect(landlordOwnerInfoCompanySchema.safeParse({ ...validCompany, companyName: '' }).success).toBe(
      false,
    );
  });
});

describe('landlordFinancialInfoTabSchema', () => {
  it('defaults boolean flags to false', () => {
    const result = landlordFinancialInfoTabSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresCFDI).toBe(false);
      expect(result.data.hasIVA).toBe(false);
      expect(result.data.issuesTaxReceipts).toBe(false);
    }
  });

  it('declares exactly the three rendered fiscal toggles (#189 surplus trim)', () => {
    expect(Object.keys(landlordFinancialInfoTabSchema.shape).sort()).toEqual([
      'hasIVA',
      'issuesTaxReceipts',
      'requiresCFDI',
    ]);
  });
});

describe('validatePrimaryLandlord', () => {
  it('accepts exactly one primary', () => {
    expect(validatePrimaryLandlord([{ isPrimary: true }, { isPrimary: false }]).valid).toBe(true);
  });

  it('rejects zero primaries', () => {
    expect(validatePrimaryLandlord([{ isPrimary: false }]).valid).toBe(false);
  });

  it('rejects more than one primary', () => {
    expect(validatePrimaryLandlord([{ isPrimary: true }, { isPrimary: true }]).valid).toBe(false);
  });
});

describe('multiLandlordSchema + validateMultiLandlordSubmission', () => {
  it('parses an array with a single primary landlord', () => {
    const result = multiLandlordSchema.safeParse({ landlords: [validIndividual] });
    expect(result.success).toBe(true);
  });

  it('rejects an empty landlords array', () => {
    expect(multiLandlordSchema.safeParse({ landlords: [] }).success).toBe(false);
  });

  it('rejects two primaries via the business-rule validator', () => {
    const result = validateMultiLandlordSubmission({
      landlords: [validIndividual, { ...validIndividual, email: 'b@x.test' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('getLandlordTabSchema', () => {
  it('returns the company owner-info schema for company landlords', () => {
    expect(getLandlordTabSchema(true, 'owner-info')).toBe(landlordOwnerInfoCompanySchema);
  });

  it('throws on an unknown tab', () => {
    expect(() => getLandlordTabSchema(false, 'nonexistent')).toThrow();
  });
});
