/**
 * Integration tests for the small auxiliary tRPC routers:
 *   - contract  (1 procedure)
 *   - address   (2 procedures, googleMapsService stubbed at preload)
 *   - package   (4 procedures)
 *   - pricing   (6 procedures)
 *
 * Floor coverage everywhere (happy path + auth gate). Pricing has the most
 * business logic, so it gets a couple of business-invariant assertions.
 */

import { describe, test, expect } from 'bun:test';
import { GuarantorType, UserRole } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createAdminCaller, createPublicCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import { packageFactory } from '../factories';

// ===========================================================================
// contract.getByPolicy
// ===========================================================================
describe('contract.getByPolicy', () => {
  test('returns null (placeholder implementation)', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();
    const result = await caller.contract.getByPolicy({ policyId: policy.id });
    expect(result).toBeNull();
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.contract.getByPolicy({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// address.autocomplete
// ===========================================================================
describe('address.autocomplete', () => {
  test('returns empty results when input is shorter than 3 chars', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.address.autocomplete({ input: 'ab' });
    expect(result).toEqual({ results: [] });
  });

  test('returns googleMapsService results when input is long enough', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.address.autocomplete({ input: 'Av. Reforma' });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]!.placeId).toBe('place-fake');
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.address.autocomplete({ input: 'Av. Reforma' }),
    });
  });
});

// ===========================================================================
// address.details
// ===========================================================================
describe('address.details', () => {
  test('returns parsed Mexican-format address from a placeId', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.address.details({ placeId: 'place-fake' });
    expect(result.address.placeId).toBe('place-fake');
    expect(result.address.country).toBe('México');
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.address.details({ placeId: 'place-fake' }),
    });
  });
});

// ===========================================================================
// package.getAll
// ===========================================================================
describe('package.getAll', () => {
  test('returns active packages from the seeded baseline', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.package.getAll();
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((p) => p.isActive)).toBe(true);
  });

  test('excludes inactive packages', async () => {
    await prisma.package.update({ where: { id: 'basic' }, data: { isActive: false } });
    const { caller } = createPublicCaller();
    const result = await caller.package.getAll();
    expect(result.find((p) => p.id === 'basic')).toBeUndefined();
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.package.getAll(),
    });
  });
});

// ===========================================================================
// package.getById
// ===========================================================================
describe('package.getById', () => {
  test('returns the package by id', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.package.getById({ id: 'basic' });
    expect(result.id).toBe('basic');
    expect(result.name).toBeDefined();
  });

  test('throws NOT_FOUND when package does not exist', async () => {
    const { caller } = createPublicCaller();
    await expect(caller.package.getById({ id: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.package.getById({ id: 'basic' }),
    });
  });
});

// ===========================================================================
// package.getStats
// ===========================================================================
describe('package.getStats', () => {
  test('returns stats counting policies bound to the package', async () => {
    const pkg = await packageFactory.create();
    await createPolicyWithActors();

    const { caller } = await createAdminCaller();
    const result = await caller.package.getStats({ packageId: pkg.id });

    expect(typeof result.totalPolicies).toBe('number');
    expect(typeof result.activePolicies).toBe('number');
    expect(typeof result.totalRevenue).toBe('number');
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.package.getStats({ packageId: 'basic' }),
    });
  });
});

// ===========================================================================
// package.recommend
// ===========================================================================
describe('package.recommend', () => {
  test('returns packages sorted by calculated price + a recommendedId', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.package.recommend({ rentAmount: 15000 });

    expect(result.packages.length).toBeGreaterThan(0);
    // Sorted ascending by calculatedPrice
    for (let i = 1; i < result.packages.length; i++) {
      expect(result.packages[i]!.calculatedPrice).toBeGreaterThanOrEqual(
        result.packages[i - 1]!.calculatedPrice,
      );
    }
    expect(typeof result.recommendedId === 'string' || result.recommendedId === undefined).toBe(true);
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.package.recommend({ rentAmount: 15000 }),
    });
  });
});

// ===========================================================================
// pricing.calculate
// ===========================================================================
describe('pricing.calculate', () => {
  test('returns a full PricingCalculation for valid percentages', async () => {
    const pkg = await packageFactory.create();
    const { caller } = await createAdminCaller();

    const result = await caller.pricing.calculate({
      packageId: pkg.id,
      rentAmount: 15000,
      tenantPercentage: 50,
      landlordPercentage: 50,
    });

    expect(result.totalWithIva).toBeGreaterThan(0);
    expect(result.tenantAmount + result.landlordAmount).toBeCloseTo(result.totalWithIva, 1);
  });

  test('rejects when percentages do not sum to 100', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.calculate({
        packageId: 'basic',
        rentAmount: 15000,
        tenantPercentage: 60,
        landlordPercentage: 30,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('rejects when package does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.calculate({
        packageId: 'nope',
        rentAmount: 15000,
        tenantPercentage: 100,
        landlordPercentage: 0,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.pricing.calculate({
          packageId: 'basic',
          rentAmount: 15000,
          tenantPercentage: 100,
          landlordPercentage: 0,
        }),
    });
  });
});

// ===========================================================================
// pricing.calculateWithOverride
// ===========================================================================
describe('pricing.calculateWithOverride', () => {
  test('returns isManualOverride=true when manualPrice is provided', async () => {
    const { caller } = await createAdminCaller();
    const result = await caller.pricing.calculateWithOverride({
      packageId: 'basic',
      rentAmount: 15000,
      tenantPercentage: 100,
      landlordPercentage: 0,
      manualPrice: 5000,
    });

    expect(result.isManualOverride).toBe(true);
    expect(result.packagePrice).toBe(5000);
    expect(result.tenantAmount).toBeCloseTo(result.totalWithIva, 1);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.pricing.calculateWithOverride({
          packageId: 'basic',
          rentAmount: 15000,
          tenantPercentage: 100,
          landlordPercentage: 0,
          manualPrice: 4000,
        }),
    });
  });
});

// ===========================================================================
// pricing.getPricingHistory
// ===========================================================================
describe('pricing.getPricingHistory', () => {
  test('returns a snapshot of policy pricing fields + the package summary', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.pricing.getPricingHistory({ policyId: policy.id });
    expect(result.totalPrice).toBe(policy.totalPrice);
    expect(result.tenantPercentage).toBe(policy.tenantPercentage);
    expect(result.landlordPercentage).toBe(policy.landlordPercentage);
    expect(result.rentAmount).toBe(policy.rentAmount);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.getPricingHistory({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.pricing.getPricingHistory({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// pricing.validatePricing
// ===========================================================================
describe('pricing.validatePricing', () => {
  test('returns isValid=true when expected matches calculated total', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    // First compute what the calculated price would be by calling
    // pricing.validatePricing with an arbitrary expected — read the
    // calculatedPrice and re-call with it as expectedPrice.
    const probe = await caller.pricing.validatePricing({
      policyId: policy.id,
      expectedPrice: 0,
    });

    const matched = await caller.pricing.validatePricing({
      policyId: policy.id,
      expectedPrice: probe.calculatedPrice,
    });

    expect(matched.isValid).toBe(true);
    expect(Math.abs(matched.difference)).toBeLessThan(0.01);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.validatePricing({ policyId: 'nope', expectedPrice: 1 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.pricing.validatePricing({ policyId: policy.id, expectedPrice: 0 }),
    });
  });
});

// ===========================================================================
// pricing.getPolicyPricing — admin
// ===========================================================================
describe('pricing.getPolicyPricing', () => {
  test('returns the editable pricing block for an existing policy', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.pricing.getPolicyPricing({ policyId: policy.id });
    expect(result.policyNumber).toBe(policy.policyNumber);
    expect(result.rentAmount).toBe(policy.rentAmount);
    expect(result.data.totalPrice).toBe(policy.totalPrice);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.getPolicyPricing({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.pricing.getPolicyPricing({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// pricing.updatePolicyPricing — admin
// ===========================================================================
describe('pricing.updatePolicyPricing', () => {
  test('updates pricing fields and logs activity', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.pricing.updatePolicyPricing({
      policyId: policy.id,
      packageId: 'basic',
      totalPrice: 9999,
      tenantPercentage: 70,
      landlordPercentage: 30,
      guarantorType: GuarantorType.JOINT_OBLIGOR,
    });

    expect(result.data.totalPrice).toBe(9999);
    expect(result.data.tenantPercentage).toBe(70);
    expect(result.data.landlordPercentage).toBe(30);
    expect(result.data.guarantorType).toBe(GuarantorType.JOINT_OBLIGOR);

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'pricing_updated' },
    });
    expect(activity).not.toBeNull();
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.pricing.updatePolicyPricing({
        policyId: 'nope',
        totalPrice: 1000,
        tenantPercentage: 100,
        landlordPercentage: 0,
        guarantorType: GuarantorType.NONE,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.pricing.updatePolicyPricing({
          policyId: policy.id,
          totalPrice: 5000,
          tenantPercentage: 100,
          landlordPercentage: 0,
          guarantorType: GuarantorType.NONE,
        }),
    });
  });
});
