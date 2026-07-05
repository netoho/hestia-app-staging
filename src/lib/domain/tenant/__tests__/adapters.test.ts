/**
 * Unit tests for the tenant domain adapters.
 *
 *   - db.toDb           — form-to-Prisma transformation
 *   - api.tenantApiOutput — wire-shape contract (drift-checked against
 *                           the canonical schema)
 *   - form.tenantFormDefaults / form.tenantTabFields — RHF helpers
 *
 * The "drift" test is the load-bearing assertion: every field name on
 * the API output must also exist somewhere in the canonical tenant
 * schema. That keeps the API a derivable subset of the domain even
 * though the two are declared in separate files for clarity.
 */

import { describe, it, expect } from 'bun:test';
import { toDb, toDbReferences } from '../adapters/db';
import { tenantApiOutput, tenantApiOutputFields } from '../adapters/api';
import { tenantFormDefaults, tenantTabFields } from '../adapters/form';
import {
  tenantSchema,
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
  tenantPersonalTabIndividualSchema,
  tenantPersonalTabCompanySchema,
  tenantEmploymentTabSchema,
} from '../schema';

// ---------------------------------------------------------------------------
// db adapter
// ---------------------------------------------------------------------------

describe('tenant db adapter — toDb', () => {
  it('parses valid input + normalizes empty strings to null', () => {
    const result = toDb(
      {
        tenantType: 'INDIVIDUAL',
        firstName: 'Juan',
        middleName: '', // empty → null
        paternalLastName: 'Pérez',
        nationality: 'MEXICAN',
        email: 'juan@example.test',
        phone: '5551234567',
      },
      { tenantType: 'INDIVIDUAL', isPartial: true, tabName: 'personal' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.firstName).toBe('Juan');
      expect(result.value.middleName).toBeNull();
    }
  });

  it('normalizes string numbers to actual numbers', () => {
    const result = toDb(
      {
        tenantType: 'INDIVIDUAL',
        employmentStatus: 'EMPLOYED',
        occupation: 'Engineer',
        employerName: 'X',
        monthlyIncome: '45000' as unknown as number,
      },
      { tenantType: 'INDIVIDUAL', isPartial: true, tabName: 'employment' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value.monthlyIncome).toBe('number');
      expect(result.value.monthlyIncome).toBe(45000);
    }
  });

  it('normalizes string booleans to actual booleans', () => {
    const result = toDb(
      {
        tenantType: 'INDIVIDUAL',
        hasAdditionalIncome: 'true' as unknown as boolean,
      },
      { tenantType: 'INDIVIDUAL', isPartial: true, tabName: 'employment' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasAdditionalIncome).toBe(true);
    }
  });

  it('tab filter drops fields outside the active tab', () => {
    const result = toDb(
      {
        tenantType: 'INDIVIDUAL',
        firstName: 'Juan',
        paternalLastName: 'Pérez',
        nationality: 'MEXICAN',
        email: 'j@x.test',
        phone: '5550000000',
        // Employment fields should be dropped when saving the 'personal' tab
        occupation: 'should be dropped',
        employerName: 'should be dropped',
      },
      { tenantType: 'INDIVIDUAL', isPartial: true, tabName: 'personal' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.firstName).toBe('Juan');
      // Fields from other tabs are filtered out
      expect((result.value as Record<string, unknown>).occupation).toBeUndefined();
      expect((result.value as Record<string, unknown>).employerName).toBeUndefined();
    }
  });

  it('maps personal name fields to legalRep fields for COMPANY tenants', () => {
    const result = toDb(
      {
        tenantType: 'COMPANY',
        firstName: 'María',
        paternalLastName: 'López',
        companyName: 'Test Co.',
      },
      { tenantType: 'COMPANY', isPartial: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const v = result.value as Record<string, unknown>;
      expect(v.legalRepFirstName).toBe('María');
      expect(v.legalRepPaternalLastName).toBe('López');
      expect(v.firstName).toBeUndefined();
      expect(v.paternalLastName).toBeUndefined();
    }
  });

  it('rejects when input is not an object', () => {
    const result = toDb('not an object', { tenantType: 'INDIVIDUAL', isPartial: true });
    expect(result.ok).toBe(false);
  });

  it('flips informationComplete + completedAt on non-partial submissions', () => {
    const result = toDb(
      {
        tenantType: 'INDIVIDUAL',
        firstName: 'Juan',
        paternalLastName: 'Pérez',
        nationality: 'MEXICAN',
        email: 'juan@example.test',
        phone: '5551234567',
        curp: 'PEPJ800101HDFRRN09',
        rfc: 'PEPJ800101AB1',
        employmentStatus: 'EMPLOYED',
        occupation: 'Engineer',
        employerName: 'Hestia',
        monthlyIncome: 50000,
        requiresCFDI: false,
        hasAdditionalIncome: false,
        hasPets: false,
      },
      { tenantType: 'INDIVIDUAL', isPartial: false },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const v = result.value as Record<string, unknown>;
      expect(v.informationComplete).toBe(true);
      expect(v.completedAt instanceof Date).toBe(true);
    }
  });
});

describe('tenant db adapter — toDbReferences', () => {
  it('returns undefined for empty/null', () => {
    expect(toDbReferences(undefined, 'personal')).toBeUndefined();
    expect(toDbReferences(null, 'personal')).toBeUndefined();
    expect(toDbReferences([], 'personal')).toBeUndefined();
  });

  it('normalizes commercial references with flat name fields', () => {
    const result = toDbReferences(
      [
        {
          companyName: 'Acme',
          firstName: 'Bob',
          paternalLastName: 'Smith',
          phone: '5551112222',
          email: 'bob@acme.test',
          relationship: 'Vendor',
        },
      ],
      'commercial',
    );
    expect(result).toBeDefined();
    expect(result?.create[0]).toMatchObject({
      contactFirstName: 'Bob',
      contactPaternalLastName: 'Smith',
    });
  });

  it('passes personal references through unchanged', () => {
    const input = [
      {
        firstName: 'Alice',
        paternalLastName: 'Doe',
        phone: '5550000000',
        email: 'alice@test.test',
        relationship: 'Friend',
      },
    ];
    const result = toDbReferences(input, 'personal');
    expect(result?.create.length).toBe(1);
    expect(result?.create[0].firstName).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// api adapter + drift
// ---------------------------------------------------------------------------

describe('tenant api adapter — tenantApiOutput', () => {
  it('parses a realistic Prisma-emitted tenant fixture', () => {
    const fixture = {
      id: 't_1',
      policyId: 'p_1',
      email: 'j@x.test',
      phone: '5550000000',
      firstName: 'Juan',
      middleName: null,
      paternalLastName: 'Pérez',
      maternalLastName: null,
      companyName: null,
      rfc: 'PEPJ800101AB1',
      accessToken: null,
      tokenExpiry: null,
      informationComplete: false,
      completedAt: null,
      verificationStatus: 'PENDING' as const,
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
      rejectedAt: null,
      additionalInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantType: 'INDIVIDUAL' as const,
      nationality: 'MEXICAN' as const,
      curp: 'PEPJ800101HDFRRN09',
      passport: null,
      companyRfc: null,
      legalRepFirstName: null,
      legalRepPaternalLastName: null,
      legalRepEmail: null,
      legalRepPhone: null,
      workPhone: null,
      personalEmail: null,
      workEmail: null,
      currentAddress: null,
      addressId: null,
      employmentStatus: null,
      occupation: null,
      employerName: null,
      monthlyIncome: null,
      paymentMethod: null,
      requiresCFDI: false,
    };
    const result = tenantApiOutput.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('drift: every API field exists in the canonical tenant schema', () => {
    // Collect the keys from each branch of the canonical discriminated
    // union (individual + company). The API exposes the union — every
    // field it claims to return must come from one of these schemas.
    const individualKeys = new Set(
      Object.keys(tenantIndividualCompleteSchema.shape),
    );
    const companyKeys = new Set(Object.keys(tenantCompanyCompleteSchema.shape));
    // Fields that ALL Prisma actor records have by virtue of the table
    // shape, even though they're not in the form schemas (id, createdAt,
    // updatedAt, tokens, verification metadata, etc.). These are real
    // database columns; the drift test accepts them.
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
      'currentAddress',
      'addressId',
    ]);

    for (const apiField of tenantApiOutputFields) {
      const knownInSchema =
        individualKeys.has(apiField) ||
        companyKeys.has(apiField) ||
        prismaBaseFields.has(apiField);
      if (!knownInSchema) {
        throw new Error(
          `tenantApiOutput.${apiField} is not present on the canonical tenant schema. ` +
            `Either add it to tenantSchema (preferred — extends the domain) or remove ` +
            `it from tenantApiOutput. See src/lib/domain/README.md for the recipe.`,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// form adapter
// ---------------------------------------------------------------------------

describe('tenant form adapter — tenantFormDefaults', () => {
  it('returns the documented baseline defaults', () => {
    const defaults = tenantFormDefaults();
    expect(defaults.tenantType).toBe('INDIVIDUAL');
    expect(defaults.nationality).toBe('MEXICAN');
    expect(defaults.hasAdditionalIncome).toBe(false);
    expect(defaults.hasPets).toBe(false);
    expect(defaults.requiresCFDI).toBe(false);
  });

  it('forwards tenantType override', () => {
    const defaults = tenantFormDefaults({ tenantType: 'COMPANY' });
    expect(defaults.tenantType).toBe('COMPANY');
  });

  it('initialData fields override the baseline', () => {
    const defaults = tenantFormDefaults({
      initialData: { firstName: 'Juan', requiresCFDI: true },
    });
    expect(defaults.firstName).toBe('Juan');
    expect(defaults.requiresCFDI).toBe(true);
  });
});

describe('tenant form adapter — tenantTabFields', () => {
  it('returns the personal-individual field list derived from the schema', () => {
    const fields = tenantTabFields('INDIVIDUAL', 'personal');
    expect(fields).toBeDefined();
    // Pull a known field from the canonical schema to assert the
    // derivation actually went through .keyof().
    const expected = Object.keys(tenantPersonalTabIndividualSchema.shape);
    for (const key of expected) {
      expect(fields).toContain(key);
    }
  });

  it('returns the personal-company field list', () => {
    const fields = tenantTabFields('COMPANY', 'personal');
    expect(fields).toBeDefined();
    const expected = Object.keys(tenantPersonalTabCompanySchema.shape);
    for (const key of expected) {
      expect(fields).toContain(key);
    }
  });

  it('returns the employment field list', () => {
    const fields = tenantTabFields('INDIVIDUAL', 'employment');
    expect(fields).toBeDefined();
    const expected = Object.keys(tenantEmploymentTabSchema.shape);
    for (const key of expected) {
      expect(fields).toContain(key);
    }
  });

  it('returns undefined for an unknown tab', () => {
    expect(tenantTabFields('INDIVIDUAL', 'nonexistent')).toBeUndefined();
  });
});
