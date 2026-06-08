/**
 * Unit tests for the canonical Aval schema.
 *
 * Key aval-specific coverage: the conditional-required refinement
 * (spouse required when married) and the exactly-3 references rule.
 */

import { describe, it, expect } from 'bun:test';
import {
  avalMasterSchema,
  avalIndividualCompleteSchema,
  avalPropertyTabSchema,
  avalReferencesIndividualTabSchema,
  getAvalTabSchema,
  validateAvalData,
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

const validRef = (firstName: string) => ({
  firstName,
  paternalLastName: 'Ref',
  phone: '5551234567',
  relationship: 'Amigo',
});

const propertyBase = {
  hasPropertyGuarantee: true as const,
  guaranteeMethod: 'property' as const,
  guaranteePropertyDetails: validAddress,
  propertyValue: 1_000_000,
  propertyDeedNumber: 'DEED-1',
  propertyRegistry: 'REG-1',
};

const validIndividual = {
  avalType: 'INDIVIDUAL' as const,
  firstName: 'Juan',
  paternalLastName: 'Pérez',
  nationality: 'MEXICAN' as const,
  email: 'juan@example.test',
  phone: '5551234567',
  addressDetails: validAddress,
  relationshipToTenant: 'Hermano',
  ...propertyBase,
  personalReferences: [validRef('A'), validRef('B'), validRef('C')],
};

describe('avalMasterSchema (canonical)', () => {
  it('parses a valid INDIVIDUAL aval', () => {
    const result = avalMasterSchema.safeParse(validIndividual);
    expect(result.success).toBe(true);
  });

  it('rejects when avalType discriminator is missing', () => {
    const { avalType, ...rest } = validIndividual;
    expect(avalMasterSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a non-positive propertyValue (mandatory guarantee)', () => {
    expect(
      avalIndividualCompleteSchema.safeParse({ ...validIndividual, propertyValue: 0 }).success,
    ).toBe(false);
  });
});

describe('avalPropertyTabSchema — conditional-required refinement', () => {
  it('accepts single with no spouse', () => {
    const result = avalPropertyTabSchema.safeParse({ ...propertyBase, maritalStatus: 'single' });
    expect(result.success).toBe(true);
  });

  it('rejects married_joint without a spouse name', () => {
    const result = avalPropertyTabSchema.safeParse({
      ...propertyBase,
      maritalStatus: 'married_joint',
    });
    expect(result.success).toBe(false);
  });

  it('accepts married_separate with a spouse name', () => {
    const result = avalPropertyTabSchema.safeParse({
      ...propertyBase,
      maritalStatus: 'married_separate',
      spouseName: 'María',
    });
    expect(result.success).toBe(true);
  });
});

describe('avalReferencesIndividualTabSchema — exactly 3', () => {
  it('accepts exactly 3 references', () => {
    expect(
      avalReferencesIndividualTabSchema.safeParse({
        personalReferences: [validRef('A'), validRef('B'), validRef('C')],
      }).success,
    ).toBe(true);
  });

  it('rejects 2 references', () => {
    expect(
      avalReferencesIndividualTabSchema.safeParse({
        personalReferences: [validRef('A'), validRef('B')],
      }).success,
    ).toBe(false);
  });

  it('rejects 4 references', () => {
    expect(
      avalReferencesIndividualTabSchema.safeParse({
        personalReferences: [validRef('A'), validRef('B'), validRef('C'), validRef('D')],
      }).success,
    ).toBe(false);
  });
});

describe('getAvalTabSchema + validateAvalData', () => {
  it('returns the property tab schema (with refine)', () => {
    expect(getAvalTabSchema('INDIVIDUAL', 'property')).toBe(avalPropertyTabSchema);
  });

  it('validateAvalData strict accepts the valid individual', () => {
    expect(validateAvalData(validIndividual, 'strict').success).toBe(true);
  });
});
