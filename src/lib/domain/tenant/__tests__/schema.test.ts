/**
 * Unit tests for the canonical tenant domain schema.
 *
 * Floor: every entity's canonical schema gets tests for
 *   1. valid happy fixture parses
 *   2. invalid fixture rejects
 *   3. each refinement / conditional fires
 *
 * These tests are part of the S1 PRD acceptance criteria — they're
 * the safety net that catches schema drift before it reaches the
 * adapters or the wire.
 */

import { describe, it, expect } from 'bun:test';
import {
  tenantSchema,
  tenantPersonalTabIndividualSchema,
  tenantPersonalTabCompanySchema,
  tenantEmploymentTabSchema,
  tenantRentalHistoryTabSchema,
  tenantDocumentsTabSchema,
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
  validateTenantData,
  getTenantTabSchema,
  type TenantIndividualComplete,
  type TenantCompanyComplete,
} from '../schema';

const validPersonalIndividual = {
  tenantType: 'INDIVIDUAL' as const,
  firstName: 'Juan',
  paternalLastName: 'Pérez',
  maternalLastName: 'García',
  nationality: 'MEXICAN' as const,
  curp: 'PEPJ800101HDFRRN09',
  rfc: 'PEPJ800101AB1',
  email: 'juan.perez@example.test',
  phone: '5551234567',
};

const validEmployment = {
  employmentStatus: 'EMPLOYED' as const,
  occupation: 'Software Engineer',
  employerName: 'Hestia Test Corp',
  monthlyIncome: 50000,
};

const validDocuments = {
  requiresCFDI: false,
};

function buildValidIndividual(): TenantIndividualComplete {
  return {
    ...validPersonalIndividual,
    ...validEmployment,
    ...validDocuments,
    hasAdditionalIncome: false,
    hasPets: false,
  };
}

function buildValidCompany(): TenantCompanyComplete {
  return {
    tenantType: 'COMPANY',
    companyName: 'Hestia Tenants S.A.',
    companyRfc: 'HTS200101AB1',
    legalRepFirstName: 'María',
    legalRepPaternalLastName: 'Ramírez',
    legalRepPosition: 'CEO',
    legalRepRfc: 'RAMM800101AB1',
    legalRepEmail: 'maria@example.test',
    legalRepPhone: '5559876543',
    email: 'contact@hestiatenants.test',
    phone: '5551111111',
    requiresCFDI: true,
  } as TenantCompanyComplete;
}

describe('tenantSchema (canonical)', () => {
  it('parses a valid INDIVIDUAL tenant', () => {
    const result = tenantSchema.safeParse(buildValidIndividual());
    expect(result.success).toBe(true);
  });

  it('parses a valid COMPANY tenant', () => {
    const result = tenantSchema.safeParse(buildValidCompany());
    expect(result.success).toBe(true);
  });

  it('rejects when tenantType is missing (discriminator)', () => {
    const { tenantType: _omit, ...withoutType } = buildValidIndividual();
    const result = tenantSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown tenantType', () => {
    const result = tenantSchema.safeParse({
      ...buildValidIndividual(),
      tenantType: 'UNKNOWN',
    });
    expect(result.success).toBe(false);
  });
});

describe('tenantPersonalTabIndividualSchema', () => {
  it('accepts the documented happy fixture', () => {
    const result = tenantPersonalTabIndividualSchema.safeParse(validPersonalIndividual);
    expect(result.success).toBe(true);
  });

  it('rejects malformed CURP', () => {
    const result = tenantPersonalTabIndividualSchema.safeParse({
      ...validPersonalIndividual,
      curp: 'not-a-curp',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed RFC', () => {
    const result = tenantPersonalTabIndividualSchema.safeParse({
      ...validPersonalIndividual,
      rfc: 'too-short',
    });
    expect(result.success).toBe(false);
  });

  it('passport is optional', () => {
    const { passport: _omit, ...withoutPassport } = validPersonalIndividual as Record<string, unknown>;
    const result = tenantPersonalTabIndividualSchema.safeParse(withoutPassport);
    expect(result.success).toBe(true);
  });
});

describe('tenantPersonalTabCompanySchema', () => {
  it('accepts a valid company personal payload', () => {
    const valid = {
      companyName: 'Hestia Tenants S.A.',
      companyRfc: 'HTS200101AB1',
      legalRepFirstName: 'María',
      legalRepPaternalLastName: 'Ramírez',
      legalRepPosition: 'CEO',
      legalRepRfc: 'RAMM800101AB1',
      legalRepEmail: 'maria@example.test',
      legalRepPhone: '5559876543',
      email: 'contact@hestiatenants.test',
      phone: '5551111111',
    };
    const result = tenantPersonalTabCompanySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects when legalRepPosition is missing', () => {
    const result = tenantPersonalTabCompanySchema.safeParse({
      companyName: 'Hestia Tenants S.A.',
      companyRfc: 'HTS200101AB1',
      legalRepFirstName: 'María',
      legalRepPaternalLastName: 'Ramírez',
      // legalRepPosition missing — schema requires it
      legalRepRfc: 'RAMM800101AB1',
      legalRepEmail: 'maria@example.test',
      legalRepPhone: '5559876543',
      email: 'contact@hestiatenants.test',
      phone: '5551111111',
    });
    expect(result.success).toBe(false);
  });
});

describe('tenantEmploymentTabSchema', () => {
  it('accepts a valid employment payload', () => {
    const result = tenantEmploymentTabSchema.safeParse(validEmployment);
    expect(result.success).toBe(true);
  });

  it('rejects monthlyIncome <= 0', () => {
    const result = tenantEmploymentTabSchema.safeParse({
      ...validEmployment,
      monthlyIncome: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when occupation is empty', () => {
    const result = tenantEmploymentTabSchema.safeParse({
      ...validEmployment,
      occupation: '',
    });
    expect(result.success).toBe(false);
  });

  it('hasAdditionalIncome defaults to false', () => {
    const result = tenantEmploymentTabSchema.safeParse(validEmployment);
    if (result.success) {
      expect(result.data.hasAdditionalIncome).toBe(false);
    }
  });
});

describe('tenantRentalHistoryTabSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    const result = tenantRentalHistoryTabSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts empty-string previousLandlordEmail (legacy form input)', () => {
    const result = tenantRentalHistoryTabSchema.safeParse({
      previousLandlordEmail: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const result = tenantRentalHistoryTabSchema.safeParse({
      previousLandlordEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('tenantDocumentsTabSchema', () => {
  it('accepts the minimal valid payload', () => {
    const result = tenantDocumentsTabSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects additionalInfo over 1000 chars', () => {
    const result = tenantDocumentsTabSchema.safeParse({
      additionalInfo: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe('validateTenantData helper', () => {
  it('partial mode tolerates missing required fields', () => {
    const result = validateTenantData(
      { tenantType: 'INDIVIDUAL', firstName: 'Juan' },
      { tenantType: 'INDIVIDUAL', mode: 'partial' },
    );
    expect(result.success).toBe(true);
  });

  it('strict mode rejects an incomplete individual', () => {
    const result = validateTenantData(
      { tenantType: 'INDIVIDUAL', firstName: 'Juan' },
      { tenantType: 'INDIVIDUAL', mode: 'strict' },
    );
    expect(result.success).toBe(false);
  });

  it('routes per-tab', () => {
    const result = validateTenantData(
      validEmployment,
      { tenantType: 'INDIVIDUAL', mode: 'strict', tabName: 'employment' },
    );
    expect(result.success).toBe(true);
  });
});

describe('getTenantTabSchema', () => {
  it('returns the personal-individual schema for INDIVIDUAL + personal', () => {
    expect(getTenantTabSchema('INDIVIDUAL', 'personal')).toBe(
      tenantPersonalTabIndividualSchema,
    );
  });

  it('returns the personal-company schema for COMPANY + personal', () => {
    expect(getTenantTabSchema('COMPANY', 'personal')).toBe(
      tenantPersonalTabCompanySchema,
    );
  });

  it('throws for an unknown tab', () => {
    expect(() => getTenantTabSchema('INDIVIDUAL', 'nonexistent')).toThrow();
  });
});
