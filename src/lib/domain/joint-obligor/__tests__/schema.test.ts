/**
 * Unit tests for the canonical Joint Obligor schema (S4a, #139).
 *
 * Covers the synthetic `jointObligorVariant` discriminator: each of the four
 * (type × guarantee-method) variants parses, cross-variant payloads are
 * rejected, compose/decompose round-trips, and the strict preprocess wrapper
 * preserves the existing wire shape (no explicit variant on the payload).
 */

import { describe, it, expect } from 'bun:test';
import {
  jointObligorCanonicalSchema,
  jointObligorStrictSchema,
  JOINT_OBLIGOR_VARIANTS,
  composeJointObligorVariant,
  decomposeJointObligorVariant,
  type JointObligorVariant,
} from '../schema';

const validAddress = {
  street: 'Av. Reforma',
  exteriorNumber: '123',
  neighborhood: 'Centro',
  municipality: 'Cuauhtémoc',
  city: 'CDMX',
  state: 'CDMX',
  postalCode: '06600',
};

const personalRef = (firstName: string) => ({
  firstName,
  paternalLastName: 'Ref',
  phone: '5551234567',
  relationship: 'Amigo',
});

const commercialRef = (companyName: string) => ({
  companyName,
  contactFirstName: 'Ana',
  contactPaternalLastName: 'López',
  phone: '5551234567',
  relationship: 'Proveedor',
});

const individualPersonal = {
  jointObligorType: 'INDIVIDUAL' as const,
  firstName: 'Juan',
  paternalLastName: 'Pérez',
  nationality: 'MEXICAN' as const,
  email: 'juan@example.test',
  phone: '5551234567',
  curp: 'PEGJ901231HDFRRN09',
  rfc: 'PEGJ901231AB1',
  addressDetails: validAddress,
  relationshipToTenant: 'sibling' as const,
};

const individualEmployment = {
  employmentStatus: 'EMPLOYED' as const,
  occupation: 'Ingeniero',
};

const companyPersonal = {
  jointObligorType: 'COMPANY' as const,
  companyName: 'Acme SA',
  companyRfc: 'ABC901231XY1',
  legalRepFirstName: 'Ana',
  legalRepPaternalLastName: 'López',
  legalRepPosition: 'Director',
  legalRepRfc: 'LOAN901231AB1',
  legalRepPhone: '5551234567',
  legalRepEmail: 'ana@acme.test',
  email: 'contact@acme.test',
  phone: '5559876543',
  addressDetails: validAddress,
  relationshipToTenant: 'Proveedor',
};

const incomeGuarantee = {
  guaranteeMethod: 'INCOME' as const,
  bankName: 'BBVA',
  accountHolder: 'Juan Pérez',
  monthlyIncome: 50000,
};

const propertyGuarantee = {
  guaranteeMethod: 'PROPERTY' as const,
  guaranteePropertyDetails: validAddress,
  propertyValue: 1_000_000,
  propertyDeedNumber: 'DEED-1',
  propertyRegistry: 'REG-1',
};

const threePersonalRefs = {
  personalReferences: [personalRef('A'), personalRef('B'), personalRef('C')],
};
const threeCommercialRefs = {
  commercialReferences: [commercialRef('X'), commercialRef('Y'), commercialRef('Z')],
};

const individualIncome = {
  jointObligorVariant: 'INDIVIDUAL_INCOME' as const,
  ...individualPersonal,
  ...individualEmployment,
  ...incomeGuarantee,
  ...threePersonalRefs,
};
const individualProperty = {
  jointObligorVariant: 'INDIVIDUAL_PROPERTY' as const,
  ...individualPersonal,
  ...individualEmployment,
  ...propertyGuarantee,
  ...threePersonalRefs,
};
const companyIncome = {
  jointObligorVariant: 'COMPANY_INCOME' as const,
  ...companyPersonal,
  ...incomeGuarantee,
  ...threeCommercialRefs,
};
const companyProperty = {
  jointObligorVariant: 'COMPANY_PROPERTY' as const,
  ...companyPersonal,
  ...propertyGuarantee,
  ...threeCommercialRefs,
};

const fixtures: Record<JointObligorVariant, Record<string, unknown>> = {
  INDIVIDUAL_INCOME: individualIncome,
  INDIVIDUAL_PROPERTY: individualProperty,
  COMPANY_INCOME: companyIncome,
  COMPANY_PROPERTY: companyProperty,
};

describe('jointObligorCanonicalSchema — 4-variant discriminated union', () => {
  for (const variant of JOINT_OBLIGOR_VARIANTS) {
    it(`parses a valid ${variant}`, () => {
      const result = jointObligorCanonicalSchema.safeParse(fixtures[variant]);
      if (!result.success) console.error(variant, result.error.issues);
      expect(result.success).toBe(true);
    });
  }

  it('rejects a payload with no discriminator', () => {
    const { jointObligorVariant: _omit, ...rest } = individualIncome;
    expect(jointObligorCanonicalSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a cross-variant payload (income shape tagged as a property variant)', () => {
    const crossed = { ...individualIncome, jointObligorVariant: 'INDIVIDUAL_PROPERTY' };
    expect(jointObligorCanonicalSchema.safeParse(crossed).success).toBe(false);
  });

  it('rejects an otherwise-valid variant missing a required field', () => {
    const { bankName: _omit, ...noBank } = individualIncome;
    expect(jointObligorCanonicalSchema.safeParse(noBank).success).toBe(false);
  });
});

describe('compose / decompose variant', () => {
  it('round-trips all four variants', () => {
    for (const variant of JOINT_OBLIGOR_VARIANTS) {
      const { jointObligorType, guaranteeMethod } = decomposeJointObligorVariant(variant);
      expect(composeJointObligorVariant(jointObligorType, guaranteeMethod)).toBe(variant);
    }
  });

  it('composes from the two axes', () => {
    expect(composeJointObligorVariant('COMPANY', 'PROPERTY')).toBe('COMPANY_PROPERTY');
    expect(composeJointObligorVariant('INDIVIDUAL', 'INCOME')).toBe('INDIVIDUAL_INCOME');
  });
});

describe('jointObligorStrictSchema — preprocess preserves the wire contract', () => {
  it('accepts a payload WITHOUT an explicit variant (derives it from the two axes)', () => {
    const { jointObligorVariant: _omit, ...noVariant } = individualIncome;
    expect(jointObligorStrictSchema.safeParse(noVariant).success).toBe(true);
  });

  it('derives the correct discriminator on parse', () => {
    const { jointObligorVariant: _omit, ...noVariant } = companyProperty;
    const result = jointObligorStrictSchema.safeParse(noVariant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { jointObligorVariant: string }).jointObligorVariant).toBe(
        'COMPANY_PROPERTY',
      );
    }
  });

  it('rejects when the two axes are missing (cannot derive a discriminator)', () => {
    const {
      jointObligorVariant: _v,
      jointObligorType: _t,
      guaranteeMethod: _g,
      ...noAxes
    } = individualIncome;
    expect(jointObligorStrictSchema.safeParse(noAxes).success).toBe(false);
  });
});
