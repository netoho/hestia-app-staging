/**
 * #159 — clone/copy-list drift roundtrips.
 *
 * Every writable scalar column of every cloned/archived entity gets a marker
 * value (driftHelpers.fillAllColumns, driven by information_schema), then the
 * real service runs and the result is compared column-by-column against the
 * source. A column added to the schema automatically joins the assertion —
 * if renewal/replacement/guarantor-change doesn't handle it, this suite goes
 * red naming the exact column.
 *
 * Exclusion lists below are the explicit product decisions ("deliberately not
 * carried over"), each with its reason. phantomExclusions() keeps the lists
 * honest against renames.
 */

import { describe, test, expect } from 'bun:test';
import { prisma } from '../../utils/database';
import { Prisma } from '@/prisma/generated/prisma-client/client';
import { clonePolicyForRenewal } from '@/lib/services/policyService/renewal';
import { replaceTenantOnPolicy } from '@/lib/services/policyService/tenantReplacement';
import { changeGuarantorType } from '@/lib/services/policyService/guarantorTypeChange';
import { SNAPSHOT_REDACTED_FIELDS } from '@/lib/services/policyService/actorArchive';
import type { PolicyRenewalSelection } from '@/lib/schemas/policy/renewalSelection';
import { createPolicyWithActors } from '../scenarios';
import { jointObligorFactory, avalFactory } from '../factories';
import { fillAllColumns, compareRows, phantomExclusions, norm } from '../driftHelpers';

const COLS = {
  tenant: Object.values(Prisma.TenantScalarFieldEnum) as string[],
  landlord: Object.values(Prisma.LandlordScalarFieldEnum) as string[],
  jointObligor: Object.values(Prisma.JointObligorScalarFieldEnum) as string[],
  aval: Object.values(Prisma.AvalScalarFieldEnum) as string[],
  policy: Object.values(Prisma.PolicyScalarFieldEnum) as string[],
  propertyDetails: Object.values(Prisma.PropertyDetailsScalarFieldEnum) as string[],
  propertyAddress: Object.values(Prisma.PropertyAddressScalarFieldEnum) as string[],
  personalReference: Object.values(Prisma.PersonalReferenceScalarFieldEnum) as string[],
  commercialReference: Object.values(Prisma.CommercialReferenceScalarFieldEnum) as string[],
};

/** The renewal deliberately restarts the completion/verification lifecycle. */
const ACTOR_LIFECYCLE = [
  'informationComplete',
  'completedAt',
  'verificationStatus',
  'verifiedAt',
  'verifiedBy',
  'rejectionReason',
  'rejectedAt',
  'accessToken',
  'tokenExpiry',
] as const;

const ROW_SYSTEM = ['id', 'policyId', 'createdAt', 'updatedAt'] as const;

// Structured-address FK columns are compared by CONTENT (the clone recreates
// the PropertyAddress rows), not by id.
const RENEWAL_EXCLUDED = {
  tenant: [
    ...ROW_SYSTEM,
    ...ACTOR_LIFECYCLE,
    'addressId',
    'employerAddressId',
    'previousRentalAddressId',
    // Legacy free-text address columns — absent from the tenant domain
    // schema; superseded by the structured *AddressId relations.
    'currentAddress',
    'companyAddress',
    'employerAddress',
    'previousRentalAddress',
  ],
  landlord: [
    ...ROW_SYSTEM,
    ...ACTOR_LIFECYCLE,
    'addressId',
  ],
  jointObligor: [
    ...ROW_SYSTEM,
    ...ACTOR_LIFECYCLE,
    'addressId',
    'employerAddressId',
    'guaranteePropertyAddressId',
    // Legacy free-text — absent from the JO domain schema.
    'address',
    'employerAddress',
  ],
  aval: [
    ...ROW_SYSTEM,
    ...ACTOR_LIFECYCLE,
    'addressId',
    'employerAddressId',
    'guaranteePropertyAddressId',
    // Legacy free-text — absent from the aval domain schema.
    'address',
    'employerAddress',
  ],
  propertyDetails: [...ROW_SYSTEM, 'propertyAddressId', 'contractSigningAddressId'],
  propertyAddress: ['id', 'createdAt', 'updatedAt'],
  personalReference: ['id', 'createdAt', 'updatedAt', 'tenantId', 'jointObligorId', 'avalId'],
  commercialReference: ['id', 'createdAt', 'updatedAt', 'tenantId', 'jointObligorId', 'avalId'],
} as const;

/** Policy columns the renewal carries over verbatim (all-true selection). */
const POLICY_COPIED = [
  'rentAmount',
  'contractLength',
  'packageId',
  'totalPrice',
  'tenantPercentage',
  'landlordPercentage',
  'tenantPaymentMethod',
  'tenantRequiresCFDI',
  'tenantCFDIData',
  'hasIVA',
  'issuesTaxReceipts',
  'securityDeposit',
  'maintenanceFee',
  'maintenanceIncludedInRent',
  'rentIncreasePercentage',
  'paymentMethod',
  'managedById',
] as const;

/** Policy columns deliberately NOT carried over, with reasons. */
const POLICY_EXCLUDED = [
  'id',
  'policyNumber', // freshly generated
  'internalCode', // reset to null
  'guarantorType', // comes from the renewal selection (asserted separately)
  'createdById', // the renewal initiator
  'status', // new policy starts at COLLECTING_INFO
  'submittedAt',
  'approvedAt',
  'activatedAt', // = renewal startDate input
  'expiresAt', // = renewal endDate input
  'contractStartDate', // new contract period entered in the new flow
  'contractEndDate',
  'reviewNotes', // fresh review cycle
  'cancelledAt',
  'cancellationReason',
  'cancellationComment',
  'cancelledById',
  'renewedToId', // link management on the SOURCE policy
  'createdAt',
  'updatedAt',
] as const;

const allTrueSelection = (
  landlordIds: string[],
  joIds: string[],
  avalIds: string[],
): PolicyRenewalSelection => ({
  property: { address: true, typeAndDescription: true, features: true, services: true },
  policyTerms: { guarantorType: 'BOTH', financial: true, contract: true, packageAndPricing: true },
  landlords: landlordIds.map((sourceId) => ({
    sourceId,
    include: true,
    basicInfo: true,
    contact: true,
    address: true,
    banking: true,
    propertyDeed: true,
    cfdi: true,
    documents: true,
  })),
  tenant: {
    include: true,
    basicInfo: true,
    contact: true,
    address: true,
    employment: true,
    rentalHistory: true,
    references: true,
    paymentPreferences: true,
    documents: true,
  },
  jointObligors: joIds.map((sourceId) => ({
    sourceId,
    include: true,
    basicInfo: true,
    contact: true,
    address: true,
    employment: true,
    guarantee: true,
    marital: true,
    references: true,
    documents: true,
  })),
  avals: avalIds.map((sourceId) => ({
    sourceId,
    include: true,
    basicInfo: true,
    contact: true,
    address: true,
    employment: true,
    guaranteeProperty: true,
    marital: true,
    references: true,
    documents: true,
  })),
});

const mkAddress = async () =>
  prisma.propertyAddress.create({
    data: {
      street: 'seed',
      exteriorNumber: '1',
      neighborhood: 'seed',
      postalCode: '00000',
      municipality: 'seed',
      city: 'seed',
      state: 'seed',
    },
  });

const mkPersonalRef = async (fk: Record<string, string>, tag: string) =>
  prisma.personalReference.create({
    data: {
      firstName: `seed_${tag}`,
      paternalLastName: 'seed',
      phone: '5500000000',
      relationship: 'seed',
      ...fk,
    },
  });

const mkCommercialRef = async (fk: Record<string, string>, tag: string) =>
  prisma.commercialReference.create({
    data: {
      companyName: `seed_${tag}`,
      contactFirstName: 'seed',
      contactPaternalLastName: 'seed',
      phone: '5500000000',
      relationship: 'seed',
      ...fk,
    },
  });

const mkDocument = async (fk: Record<string, string>, tag: string) =>
  prisma.actorDocument.create({
    data: {
      category: 'IDENTIFICATION',
      documentType: 'identification',
      fileName: `${tag}.pdf`,
      originalName: `${tag}.pdf`,
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: `drift/${tag}.pdf`,
      s3Bucket: 'test-bucket',
      uploadStatus: 'COMPLETE',
      ...fk,
    },
  });

const row = async (table: string, id: string) =>
  (
    await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${table}" WHERE id = $1`,
      id,
    )
  )[0]!;

test('exclusion lists only name real columns', () => {
  const phantoms = [
    ...phantomExclusions(COLS.tenant, RENEWAL_EXCLUDED.tenant),
    ...phantomExclusions(COLS.landlord, RENEWAL_EXCLUDED.landlord),
    ...phantomExclusions(COLS.jointObligor, RENEWAL_EXCLUDED.jointObligor),
    ...phantomExclusions(COLS.aval, RENEWAL_EXCLUDED.aval),
    ...phantomExclusions(COLS.propertyDetails, RENEWAL_EXCLUDED.propertyDetails),
    ...phantomExclusions(COLS.policy, [...POLICY_COPIED, ...POLICY_EXCLUDED]),
  ];
  expect(phantoms).toEqual([]);
});

test('every Policy column is classified as copied or excluded', () => {
  const classified = new Set<string>([...POLICY_COPIED, ...POLICY_EXCLUDED]);
  const unaccounted = COLS.policy.filter((c) => !classified.has(c));
  // New Policy column? Decide: carried over on renewal (POLICY_COPIED and the
  // renewal.ts create) or deliberately not (POLICY_EXCLUDED with a reason).
  expect(unaccounted).toEqual([]);
});

describe('renewal clone (#159)', () => {
  test('every marker-filled column survives an all-selected renewal', async () => {
    const { policy, creator, tenant, landlord } = await createPolicyWithActors({
      status: 'ACTIVE',
    });
    const jo = await jointObligorFactory.create({}, { transient: { policyId: policy.id } });
    const aval = await avalFactory.create({}, { transient: { policyId: policy.id } });

    // Wire every structured-address slot + propertyDetails + references.
    const addr = {
      tenant: await mkAddress(),
      tenantEmployer: await mkAddress(),
      tenantPrevious: await mkAddress(),
      landlord: await mkAddress(),
      jo: await mkAddress(),
      joEmployer: await mkAddress(),
      joGuarantee: await mkAddress(),
      aval: await mkAddress(),
      avalEmployer: await mkAddress(),
      avalGuarantee: await mkAddress(),
      property: await mkAddress(),
      signing: await mkAddress(),
    };
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        addressId: addr.tenant.id,
        employerAddressId: addr.tenantEmployer.id,
        previousRentalAddressId: addr.tenantPrevious.id,
      },
    });
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { addressId: addr.landlord.id },
    });
    await prisma.jointObligor.update({
      where: { id: jo.id },
      data: {
        addressId: addr.jo.id,
        employerAddressId: addr.joEmployer.id,
        guaranteePropertyAddressId: addr.joGuarantee.id,
      },
    });
    await prisma.aval.update({
      where: { id: aval.id },
      data: {
        addressId: addr.aval.id,
        employerAddressId: addr.avalEmployer.id,
        guaranteePropertyAddressId: addr.avalGuarantee.id,
      },
    });
    const propertyDetails = await prisma.propertyDetails.create({
      data: {
        policyId: policy.id,
        propertyAddressId: addr.property.id,
        contractSigningAddressId: addr.signing.id,
      },
    });
    await mkPersonalRef({ tenantId: tenant.id }, 'tp');
    await mkCommercialRef({ tenantId: tenant.id }, 'tc');
    await mkPersonalRef({ jointObligorId: jo.id }, 'jp');
    await mkCommercialRef({ jointObligorId: jo.id }, 'jc');
    await mkPersonalRef({ avalId: aval.id }, 'ap');
    await mkCommercialRef({ avalId: aval.id }, 'ac');

    // Marker-fill everything.
    await fillAllColumns('Tenant', tenant.id);
    await fillAllColumns('Landlord', landlord.id);
    await fillAllColumns('JointObligor', jo.id);
    await fillAllColumns('Aval', aval.id);
    await fillAllColumns('Policy', policy.id, { skip: ['status'] });
    await fillAllColumns('PropertyDetails', propertyDetails.id);
    for (const [slot, a] of Object.entries(addr)) {
      await fillAllColumns('PropertyAddress', a.id, { suffix: slot });
    }
    for (const r of await prisma.personalReference.findMany()) {
      await fillAllColumns('PersonalReference', r.id, {
        suffix: r.tenantId ? 'tp' : r.jointObligorId ? 'jp' : 'ap',
      });
    }
    for (const r of await prisma.commercialReference.findMany()) {
      await fillAllColumns('CommercialReference', r.id, {
        suffix: r.tenantId ? 'tc' : r.jointObligorId ? 'jc' : 'ac',
      });
    }

    // Ground truth = the rows as the service will read them.
    const src = {
      policy: await row('Policy', policy.id),
      tenant: await row('Tenant', tenant.id),
      landlord: await row('Landlord', landlord.id),
      jo: await row('JointObligor', jo.id),
      aval: await row('Aval', aval.id),
      propertyDetails: await row('PropertyDetails', propertyDetails.id),
    };

    const result = await clonePolicyForRenewal({
      sourcePolicyId: policy.id,
      selection: allTrueSelection([landlord.id], [jo.id], [aval.id]),
      startDate: '2027-01-01',
      endDate: '2028-01-01',
      initiatedById: creator.id,
    });

    const clone = await prisma.policy.findUniqueOrThrow({
      where: { id: result.newPolicyId },
      include: {
        tenant: {
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            previousRentalAddressDetails: true,
            personalReferences: true,
            commercialReferences: true,
          },
        },
        landlords: { include: { addressDetails: true } },
        jointObligors: {
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
          },
        },
        avals: {
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
          },
        },
        propertyDetails: {
          include: { propertyAddressDetails: true, contractSigningAddressDetails: true },
        },
      },
    });

    // ---- Actor + policy + property column-by-column drift ----
    const mismatches = {
      tenant: compareRows(
        COLS.tenant,
        src.tenant,
        clone.tenant as unknown as Record<string, unknown>,
        RENEWAL_EXCLUDED.tenant,
      ),
      landlord: compareRows(
        COLS.landlord,
        src.landlord,
        clone.landlords[0] as unknown as Record<string, unknown>,
        RENEWAL_EXCLUDED.landlord,
      ),
      jointObligor: compareRows(
        COLS.jointObligor,
        src.jo,
        clone.jointObligors[0] as unknown as Record<string, unknown>,
        RENEWAL_EXCLUDED.jointObligor,
      ),
      aval: compareRows(
        COLS.aval,
        src.aval,
        clone.avals[0] as unknown as Record<string, unknown>,
        RENEWAL_EXCLUDED.aval,
      ),
      policy: compareRows(
        [...POLICY_COPIED],
        src.policy,
        clone as unknown as Record<string, unknown>,
        [],
      ),
      propertyDetails: compareRows(
        COLS.propertyDetails,
        src.propertyDetails,
        clone.propertyDetails as unknown as Record<string, unknown>,
        RENEWAL_EXCLUDED.propertyDetails,
      ),
    };
    expect(mismatches).toEqual({
      tenant: [],
      landlord: [],
      jointObligor: [],
      aval: [],
      policy: [],
      propertyDetails: [],
    });

    // ---- Structured addresses are recreated with identical content ----
    const addressPairs: Array<[string, Record<string, unknown> | null | undefined]> = [
      [addr.tenant.id, clone.tenant?.addressDetails as never],
      [addr.tenantEmployer.id, clone.tenant?.employerAddressDetails as never],
      [addr.tenantPrevious.id, clone.tenant?.previousRentalAddressDetails as never],
      [addr.landlord.id, clone.landlords[0].addressDetails as never],
      [addr.jo.id, clone.jointObligors[0].addressDetails as never],
      [addr.joEmployer.id, clone.jointObligors[0].employerAddressDetails as never],
      [addr.joGuarantee.id, clone.jointObligors[0].guaranteePropertyDetails as never],
      [addr.aval.id, clone.avals[0].addressDetails as never],
      [addr.avalEmployer.id, clone.avals[0].employerAddressDetails as never],
      [addr.avalGuarantee.id, clone.avals[0].guaranteePropertyDetails as never],
      [addr.property.id, clone.propertyDetails?.propertyAddressDetails as never],
      [addr.signing.id, clone.propertyDetails?.contractSigningAddressDetails as never],
    ];
    const addressMismatches: Record<string, unknown> = {};
    for (const [sourceId, cloned] of addressPairs) {
      const source = await row('PropertyAddress', sourceId);
      if (!cloned) {
        addressMismatches[String(source.street)] = 'address row not recreated';
        continue;
      }
      const diff = compareRows(
        COLS.propertyAddress,
        source,
        cloned,
        RENEWAL_EXCLUDED.propertyAddress,
      );
      if (diff.length) addressMismatches[String(source.street)] = diff;
    }
    expect(addressMismatches).toEqual({});

    // ---- References are recreated with identical content ----
    const refMismatches: Record<string, unknown> = {};
    const refSets: Array<[string, Record<string, unknown>[], 'personalReference' | 'commercialReference']> = [
      ['tenant.personal', clone.tenant?.personalReferences as never, 'personalReference'],
      ['tenant.commercial', clone.tenant?.commercialReferences as never, 'commercialReference'],
      ['jo.personal', clone.jointObligors[0].personalReferences as never, 'personalReference'],
      ['jo.commercial', clone.jointObligors[0].commercialReferences as never, 'commercialReference'],
      ['aval.personal', clone.avals[0].personalReferences as never, 'personalReference'],
      ['aval.commercial', clone.avals[0].commercialReferences as never, 'commercialReference'],
    ];
    const srcRefs = {
      'tenant.personal': await prisma.personalReference.findFirst({ where: { tenantId: tenant.id } }),
      'tenant.commercial': await prisma.commercialReference.findFirst({ where: { tenantId: tenant.id } }),
      'jo.personal': await prisma.personalReference.findFirst({ where: { jointObligorId: jo.id } }),
      'jo.commercial': await prisma.commercialReference.findFirst({ where: { jointObligorId: jo.id } }),
      'aval.personal': await prisma.personalReference.findFirst({ where: { avalId: aval.id } }),
      'aval.commercial': await prisma.commercialReference.findFirst({ where: { avalId: aval.id } }),
    } as Record<string, Record<string, unknown> | null>;
    for (const [label, clonedRefs, kind] of refSets) {
      if (!clonedRefs || clonedRefs.length !== 1) {
        refMismatches[label] = `expected exactly 1 cloned reference, got ${clonedRefs?.length ?? 0}`;
        continue;
      }
      const diff = compareRows(
        COLS[kind],
        srcRefs[label]!,
        clonedRefs[0],
        RENEWAL_EXCLUDED[kind],
      );
      if (diff.length) refMismatches[label] = diff;
    }
    expect(refMismatches).toEqual({});

    // ---- Renewal mechanics ----
    expect(clone.status).toBe('COLLECTING_INFO');
    expect(clone.guarantorType).toBe('BOTH');
    expect(norm(clone.activatedAt)).toBe('2027-01-01T00:00:00.000Z');
    expect(norm(clone.expiresAt)).toBe('2028-01-01T00:00:00.000Z');
    expect((await row('Policy', policy.id)).renewedToId).toBe(clone.id);
    expect(clone.tenant?.accessToken).toBeTruthy(); // fresh tokens minted
    expect(clone.tenant?.informationComplete).toBe(false);
    expect(
      await prisma.actorInvestigation.count({ where: { policyId: clone.id, status: 'PENDING' } }),
    ).toBe(3);
  });
});

describe('tenant replacement (#159)', () => {
  test('archives a full snapshot and leaks nothing onto the new tenant', async () => {
    const { policy, creator, tenant } = await createPolicyWithActors();
    const address = await mkAddress();
    await prisma.tenant.update({ where: { id: tenant.id }, data: { addressId: address.id } });
    await mkPersonalRef({ tenantId: tenant.id }, 'tp');
    await mkDocument({ tenantId: tenant.id }, 'tdoc');
    await fillAllColumns('PropertyAddress', address.id, { suffix: 'taddr' });
    await fillAllColumns('Tenant', tenant.id);
    const source = await row('Tenant', tenant.id);
    const doc = await prisma.actorDocument.findFirstOrThrow({ where: { tenantId: tenant.id } });

    const result = await replaceTenantOnPolicy({
      policyId: policy.id,
      replacementReason: 'drift roundtrip',
      newTenant: {
        tenantType: 'INDIVIDUAL',
        email: 'nuevo@example.com',
        phone: '5522222222',
        firstName: 'Nuevo',
      },
      replaceGuarantors: false,
      performedById: creator.id,
    });
    expect(result).toEqual({ success: true });

    // ---- Snapshot: full fidelity, tokens redacted ----
    const history = await prisma.tenantHistory.findFirstOrThrow({
      where: { policyId: policy.id },
    });
    const snap = history.snapshot as Record<string, unknown>;
    expect(snap).toBeTruthy();
    const snapMismatches = compareRows(COLS.tenant, source, snap, SNAPSHOT_REDACTED_FIELDS);
    expect(snapMismatches).toEqual([]);
    for (const redacted of SNAPSHOT_REDACTED_FIELDS) {
      expect(snap).not.toContainKey(redacted);
    }
    expect((snap.personalReferences as unknown[]).length).toBe(1);
    expect((snap.documents as unknown[]).length).toBe(1);
    expect((snap.addressDetails as Record<string, unknown>).street).toBe('zz_street_taddr');

    // ---- Leak check: no marker survives on the reset row ----
    const INPUT_SET = new Set(['tenantType', 'email', 'phone', 'firstName', 'companyName']);
    const SYSTEM = new Set(['id', 'policyId', 'createdAt', 'updatedAt']);
    const after = await row('Tenant', tenant.id);
    const leaks = COLS.tenant.filter((col) => {
      if (INPUT_SET.has(col) || SYSTEM.has(col)) return false;
      if (source[col] === null) return false; // nothing to leak
      return JSON.stringify(norm(after[col])) === JSON.stringify(norm(source[col]));
    });
    expect(leaks).toEqual([]);

    // ---- Cleanup semantics ----
    expect(await prisma.personalReference.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await prisma.propertyAddress.findUnique({ where: { id: address.id } })).toBeNull();
    const unlinkedDoc = await prisma.actorDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(unlinkedDoc.tenantId).toBeNull(); // row + S3 file survive, link removed
    expect(after.accessToken).toBeTruthy(); // fresh token minted post-reset
    expect(after.accessToken).not.toBe(source.accessToken);
  });
});

describe('guarantor type change (#159)', () => {
  test('archives full JO snapshot, deletes the rows, creates the new aval', async () => {
    const { policy, creator } = await createPolicyWithActors();
    await prisma.policy.update({
      where: { id: policy.id },
      data: { guarantorType: 'JOINT_OBLIGOR' },
    });
    const jo = await jointObligorFactory.create({}, { transient: { policyId: policy.id } });
    const joAddress = await mkAddress();
    await prisma.jointObligor.update({
      where: { id: jo.id },
      data: { addressId: joAddress.id },
    });
    await mkPersonalRef({ jointObligorId: jo.id }, 'jp');
    await mkDocument({ jointObligorId: jo.id }, 'jdoc');
    await fillAllColumns('PropertyAddress', joAddress.id, { suffix: 'jaddr' });
    await fillAllColumns('JointObligor', jo.id);
    const source = await row('JointObligor', jo.id);
    const doc = await prisma.actorDocument.findFirstOrThrow({
      where: { jointObligorId: jo.id },
    });

    const result = await changeGuarantorType({
      policyId: policy.id,
      reason: 'drift roundtrip',
      newGuarantorType: 'AVAL',
      newAvals: [{ email: 'aval@example.com', phone: '5533333333', firstName: 'Aval' }],
      performedById: creator.id,
    });
    expect(result).toEqual({ success: true });

    // ---- Snapshot: full fidelity, tokens redacted ----
    const history = await prisma.jointObligorHistory.findFirstOrThrow({
      where: { policyId: policy.id },
    });
    const snap = history.snapshot as Record<string, unknown>;
    const snapMismatches = compareRows(COLS.jointObligor, source, snap, SNAPSHOT_REDACTED_FIELDS);
    expect(snapMismatches).toEqual([]);
    for (const redacted of SNAPSHOT_REDACTED_FIELDS) {
      expect(snap).not.toContainKey(redacted);
    }
    expect((snap.personalReferences as unknown[]).length).toBe(1);
    expect((snap.documents as unknown[]).length).toBe(1);
    expect((snap.addressDetails as Record<string, unknown>).street).toBe('zz_street_jaddr');

    // ---- Replacement semantics ----
    expect(await prisma.jointObligor.count({ where: { policyId: policy.id } })).toBe(0);
    expect(await prisma.propertyAddress.findUnique({ where: { id: joAddress.id } })).toBeNull();
    expect(
      (await prisma.actorDocument.findUniqueOrThrow({ where: { id: doc.id } })).jointObligorId,
    ).toBeNull();
    const newAval = await prisma.aval.findFirstOrThrow({ where: { policyId: policy.id } });
    expect(newAval.email).toBe('aval@example.com');
    expect(newAval.accessToken).toBeTruthy();
    expect((await row('Policy', policy.id)).guarantorType).toBe('AVAL');
  });
});
