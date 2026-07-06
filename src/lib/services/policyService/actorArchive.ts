import prisma from '@/lib/prisma';
import type { Prisma } from '@/prisma/generated/prisma-client/client';

/**
 * Shared archive-and-cleanup for actor replacement flows (#159).
 *
 * Both guarantorTypeChange and tenantReplacement previously carried verbatim
 * copies of this logic, each archiving a hand-picked ~15-scalar summary while
 * hard-deleting addresses and references. The History row now also carries a
 * full-fidelity `snapshot` (the entire actor row + relations at archive time,
 * access tokens redacted), so the typed summary columns can stay a stable
 * queryable subset without being the only surviving record.
 */

type AnyTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface ArchiveMeta {
  policyId: string;
  replacedById: string;
  replacementReason: string;
}

/** Token fields must never outlive the actor row inside an audit record. */
export const SNAPSHOT_REDACTED_FIELDS = ['accessToken', 'tokenExpiry'] as const;

/**
 * JSON-safe snapshot of a fetched actor (with relations): Dates become ISO
 * strings via JSON round-trip; token fields are removed.
 */
export function buildActorSnapshot(actor: Record<string, unknown>): Prisma.InputJsonValue {
  const clean: Record<string, unknown> = { ...actor };
  for (const field of SNAPSHOT_REDACTED_FIELDS) delete clean[field];
  return JSON.parse(JSON.stringify(clean));
}

async function archiveInvestigations(
  tx: AnyTx,
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL',
  actorId: string,
  archivedBy: string,
) {
  await tx.actorInvestigation.updateMany({
    where: {
      actorType,
      actorId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy,
      archiveReason: 'SUPERSEDED',
      brokerToken: null,
      landlordToken: null,
    },
  });
}

async function cleanupActorRelations(
  tx: AnyTx,
  opts: {
    /** ActorDocument / reference FK column for this actor type. */
    docWhere: { tenantId: string } | { jointObligorId: string } | { avalId: string };
    /** ActorSectionValidation discriminator. */
    sectionActorType: 'tenant' | 'jointObligor' | 'aval';
    actorId: string;
    addressIds: (string | null)[];
  },
) {
  // Delete DocumentValidation rows for the actor's documents, then unlink the
  // documents themselves (soft delete — S3 files and rows are kept).
  const docIds = await tx.actorDocument.findMany({
    where: opts.docWhere,
    select: { id: true },
  });
  if (docIds.length > 0) {
    await tx.documentValidation.deleteMany({
      where: { documentId: { in: docIds.map((d) => d.id) } },
    });
  }
  const unlink = Object.keys(opts.docWhere)[0] as 'tenantId' | 'jointObligorId' | 'avalId';
  await tx.actorDocument.updateMany({
    where: opts.docWhere,
    data: { [unlink]: null },
  });

  await tx.personalReference.deleteMany({ where: opts.docWhere });
  await tx.commercialReference.deleteMany({ where: opts.docWhere });

  await tx.actorSectionValidation.deleteMany({
    where: { actorType: opts.sectionActorType, actorId: opts.actorId },
  });

  const addressIds = opts.addressIds.filter((id): id is string => !!id);
  if (addressIds.length > 0) {
    await tx.propertyAddress.deleteMany({ where: { id: { in: addressIds } } });
  }
}

/**
 * Archive a tenant to TenantHistory (summary columns + full snapshot) and
 * clean up its relations. The caller owns what happens to the tenant row
 * itself (tenantReplacement resets it in place).
 */
export async function archiveAndCleanupTenant(tx: AnyTx, tenantId: string, meta: ArchiveMeta) {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      addressDetails: true,
      employerAddressDetails: true,
      previousRentalAddressDetails: true,
      personalReferences: true,
      commercialReferences: true,
      documents: true,
    },
  });

  await tx.tenantHistory.create({
    data: {
      policyId: meta.policyId,
      tenantType: tenant.tenantType,
      firstName: tenant.firstName,
      middleName: tenant.middleName,
      paternalLastName: tenant.paternalLastName,
      maternalLastName: tenant.maternalLastName,
      companyName: tenant.companyName,
      email: tenant.email,
      phone: tenant.phone,
      rfc: tenant.rfc,
      employmentStatus: tenant.employmentStatus,
      occupation: tenant.occupation,
      employerName: tenant.employerName,
      monthlyIncome: tenant.monthlyIncome,
      verificationStatus: tenant.verificationStatus,
      informationComplete: tenant.informationComplete,
      replacedById: meta.replacedById,
      replacementReason: meta.replacementReason,
      snapshot: buildActorSnapshot(tenant),
    },
  });

  await cleanupActorRelations(tx, {
    docWhere: { tenantId },
    sectionActorType: 'tenant',
    actorId: tenantId,
    addressIds: [tenant.addressId, tenant.employerAddressId, tenant.previousRentalAddressId],
  });
  await archiveInvestigations(tx, 'TENANT', tenantId, meta.replacedById);
}

/**
 * Archive a joint obligor to JointObligorHistory (summary + snapshot) and
 * clean up its relations. The caller deletes the row itself.
 */
export async function archiveAndCleanupJointObligor(tx: AnyTx, jointObligorId: string, meta: ArchiveMeta) {
  const jo = await tx.jointObligor.findUniqueOrThrow({
    where: { id: jointObligorId },
    include: {
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
      personalReferences: true,
      commercialReferences: true,
      documents: true,
    },
  });

  await tx.jointObligorHistory.create({
    data: {
      policyId: meta.policyId,
      jointObligorType: jo.jointObligorType,
      firstName: jo.firstName,
      middleName: jo.middleName,
      paternalLastName: jo.paternalLastName,
      maternalLastName: jo.maternalLastName,
      companyName: jo.companyName,
      email: jo.email,
      phone: jo.phone,
      rfc: jo.rfc,
      employmentStatus: jo.employmentStatus,
      occupation: jo.occupation,
      employerName: jo.employerName,
      monthlyIncome: jo.monthlyIncome,
      verificationStatus: jo.verificationStatus,
      informationComplete: jo.informationComplete,
      replacedById: meta.replacedById,
      replacementReason: meta.replacementReason,
      snapshot: buildActorSnapshot(jo),
    },
  });

  await cleanupActorRelations(tx, {
    docWhere: { jointObligorId },
    sectionActorType: 'jointObligor',
    actorId: jointObligorId,
    addressIds: [jo.addressId, jo.employerAddressId, jo.guaranteePropertyAddressId],
  });
  await archiveInvestigations(tx, 'JOINT_OBLIGOR', jointObligorId, meta.replacedById);
}

/**
 * Archive an aval to AvalHistory (summary + snapshot) and clean up its
 * relations. The caller deletes the row itself.
 */
export async function archiveAndCleanupAval(tx: AnyTx, avalId: string, meta: ArchiveMeta) {
  const aval = await tx.aval.findUniqueOrThrow({
    where: { id: avalId },
    include: {
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true,
      personalReferences: true,
      commercialReferences: true,
      documents: true,
    },
  });

  await tx.avalHistory.create({
    data: {
      policyId: meta.policyId,
      avalType: aval.avalType,
      firstName: aval.firstName,
      middleName: aval.middleName,
      paternalLastName: aval.paternalLastName,
      maternalLastName: aval.maternalLastName,
      companyName: aval.companyName,
      email: aval.email,
      phone: aval.phone,
      rfc: aval.rfc,
      employmentStatus: aval.employmentStatus,
      occupation: aval.occupation,
      employerName: aval.employerName,
      monthlyIncome: aval.monthlyIncome,
      verificationStatus: aval.verificationStatus,
      informationComplete: aval.informationComplete,
      replacedById: meta.replacedById,
      replacementReason: meta.replacementReason,
      snapshot: buildActorSnapshot(aval),
    },
  });

  await cleanupActorRelations(tx, {
    docWhere: { avalId },
    sectionActorType: 'aval',
    actorId: avalId,
    addressIds: [aval.addressId, aval.employerAddressId, aval.guaranteePropertyAddressId],
  });
  await archiveInvestigations(tx, 'AVAL', avalId, meta.replacedById);
}
