import { prisma } from './db';
import { APP_ENV } from '../playwright.config';

/**
 * DB-seeded fixtures (standing convention, 2026-07-06): when a scenario needs
 * a pre-existing policy state (e.g. an ACTIVE policy to renew), seed it
 * directly instead of re-driving the whole creation journey — creation is
 * already covered by E2E-01..07.
 *
 * The seeded actors are COMPLETE per the strict validators (fields, ≥3
 * personal references, required documents), so specs can assert that flows
 * built on top of them (renewal clone → strict re-complete) pass WITHOUT the
 * force path. Documents get real MinIO objects so the S3 copy paths run for
 * real.
 */

const PDF_BYTES = Buffer.from('%PDF-1.4\n% e2e seed document\n%%EOF\n');

async function putS3Objects(keys: string[]): Promise<void> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: APP_ENV.AWS_S3_REGION,
    endpoint: APP_ENV.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: APP_ENV.AWS_ACCESS_KEY_ID,
      secretAccessKey: APP_ENV.AWS_SECRET_ACCESS_KEY,
    },
  });
  try {
    for (const key of keys) {
      await client.send(
        new PutObjectCommand({
          Bucket: APP_ENV.AWS_S3_BUCKET,
          Key: key,
          Body: PDF_BYTES,
          ContentType: 'application/pdf',
        }),
      );
    }
  } finally {
    client.destroy();
  }
}

const mkAddressData = (tag: string) => ({
  street: `Calle ${tag}`,
  exteriorNumber: '123',
  neighborhood: 'Centro',
  postalCode: '06000',
  municipality: 'Cuauhtémoc',
  city: 'Ciudad de México',
  state: 'CDMX',
});

const docData = (
  category: string,
  actorTag: string,
  fk: Record<string, string>,
) => ({
  category: category as never,
  documentType: category.toLowerCase(),
  fileName: `${actorTag}-${category.toLowerCase()}.pdf`,
  originalName: `${actorTag}-${category.toLowerCase()}.pdf`,
  fileSize: PDF_BYTES.length,
  mimeType: 'application/pdf',
  s3Key: `e2e-seed/${actorTag}/${category.toLowerCase()}.pdf`,
  s3Bucket: APP_ENV.AWS_S3_BUCKET,
  uploadStatus: 'COMPLETE' as const,
  uploadedAt: new Date(),
  ...fk,
});

const personalRefs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    firstName: `Referencia${i + 1}`,
    paternalLastName: 'Personal',
    phone: `55111111${String(i).padStart(2, '0')}`,
    relationship: 'Amistad',
    email: `ref${i + 1}@example.com`,
  }));

export interface SeededRenewablePolicy {
  policyId: string;
  policyNumber: string;
  tenantId: string;
  landlordPrimaryId: string;
  landlordCoOwnerId: string;
  tenantName: string;
  landlordPrimaryName: string;
  landlordCoOwnerName: string;
}

/**
 * ACTIVE policy: complete individual tenant + TWO complete individual
 * landlords (primary + co-owner), propertyDetails, full financial terms,
 * 10 documents with real MinIO objects, one APPROVED tenant investigation
 * (so renewal's archive-on-source behavior is observable).
 */
export async function seedActiveRenewablePolicy(): Promise<SeededRenewablePolicy> {
  const landlordCommon = {
    isCompany: false,
    nationality: 'MEXICAN' as const,
    workPhone: '5530000000',
    occupation: 'Empresario',
    monthlyIncome: 80000,
    bankName: 'BBVA',
    accountNumber: '01234567890',
    clabe: '012180001234567897',
    propertyDeedNumber: 'ESC-2020-4521',
    propertyRegistryFolio: 'FOLIO-889021',
    informationComplete: true,
    completedAt: new Date(),
    verificationStatus: 'APPROVED' as const,
  };

  const policy = await prisma.policy.create({
    data: {
      policyNumber: `POL-E2E08-${Date.now().toString(36).toUpperCase()}`,
      status: 'ACTIVE',
      rentAmount: 25000,
      contractLength: 12,
      guarantorType: 'NONE',
      packageId: 'basic',
      totalPrice: 9500,
      tenantPercentage: 100,
      landlordPercentage: 0,
      hasIVA: true,
      issuesTaxReceipts: true,
      securityDeposit: 25000,
      maintenanceFee: 1500,
      maintenanceIncludedInRent: false,
      rentIncreasePercentage: 5,
      paymentMethod: 'TRANSFER',
      createdById: 'test-admin-user-id',
      activatedAt: new Date('2026-01-01T00:00:00Z'),
      expiresAt: new Date('2026-12-31T00:00:00Z'),
      propertyDetails: {
        create: {
          propertyType: 'APARTMENT',
          propertyDescription: 'Departamento 2 recámaras, piso 3',
          isFurnished: false,
          hasElectricity: true,
          hasWater: true,
          propertyAddressDetails: { create: mkAddressData('Propiedad 100') },
          contractSigningAddressDetails: { create: mkAddressData('Firma 200') },
        },
      },
      tenant: {
        create: {
          tenantType: 'INDIVIDUAL',
          firstName: 'Julieta',
          paternalLastName: 'Vargas',
          maternalLastName: 'Solís',
          nationality: 'MEXICAN',
          curp: 'VASJ900215MDFRLL08',
          rfc: 'VASJ900215AB1',
          email: 'julieta.e2e08@example.com',
          phone: '5544332211',
          employmentStatus: 'EMPLOYED',
          occupation: 'Contadora',
          employerName: 'Despacho Contable SA',
          position: 'Gerente',
          monthlyIncome: 48000,
          incomeSource: 'Salario',
          yearsAtJob: 4,
          paymentMethod: 'MENSUAL',
          informationComplete: true,
          completedAt: new Date(),
          verificationStatus: 'APPROVED',
          addressDetails: { create: mkAddressData('Inquilino 300') },
          employerAddressDetails: { create: mkAddressData('Empleador 400') },
          personalReferences: { create: personalRefs(3) },
          commercialReferences: {
            create: [
              {
                companyName: 'Proveedora del Centro',
                contactFirstName: 'Luis',
                contactPaternalLastName: 'Mena',
                phone: '5522334455',
                relationship: 'Proveedor',
                yearsOfRelationship: 3,
              },
            ],
          },
        },
      },
    },
    include: { tenant: true },
  });

  const landlordPrimary = await prisma.landlord.create({
    data: {
      ...landlordCommon,
      policy: { connect: { id: policy.id } },
      isPrimary: true,
      firstName: 'Carlos',
      paternalLastName: 'Ramírez',
      maternalLastName: 'Ortega',
      rfc: 'RAOC750310CD2',
      curp: 'RAOC750310HDFMRR04',
      email: 'carlos.e2e08@example.com',
      phone: '5511223344',
      address: 'Av. Reforma 123, Juárez, CDMX',
      accountHolder: 'Carlos Ramírez Ortega',
      requiresCFDI: true,
      cfdiData: 'RFC facturación: RAOC750310CD2, uso CFDI G03',
      addressDetails: { create: mkAddressData('Arrendador 500') },
    },
  });

  const landlordCoOwner = await prisma.landlord.create({
    data: {
      ...landlordCommon,
      policy: { connect: { id: policy.id } },
      isPrimary: false,
      firstName: 'Ana',
      paternalLastName: 'López',
      maternalLastName: 'Ferrer',
      rfc: 'LOFA820620EF3',
      curp: 'LOFA820620MDFPRR02',
      email: 'ana.e2e08@example.com',
      phone: '5599887766',
      address: 'Calle Durango 45, Roma Norte, CDMX',
      accountHolder: 'Ana López Ferrer',
      requiresCFDI: true,
      cfdiData: 'RFC facturación: LOFA820620EF3, uso CFDI G03',
      addressDetails: { create: mkAddressData('Copropietaria 600') },
    },
  });

  const tenantId = policy.tenant!.id;
  const docs = [
    ...['IDENTIFICATION', 'INCOME_PROOF', 'ADDRESS_PROOF', 'BANK_STATEMENT'].map((c) =>
      docData(c, 'tenant', { tenantId }),
    ),
    ...['IDENTIFICATION', 'PROPERTY_DEED', 'PROPERTY_TAX_STATEMENT'].map((c) =>
      docData(c, 'landlord-a', { landlordId: landlordPrimary.id }),
    ),
    ...['IDENTIFICATION', 'PROPERTY_DEED', 'PROPERTY_TAX_STATEMENT'].map((c) =>
      docData(c, 'landlord-b', { landlordId: landlordCoOwner.id }),
    ),
  ];
  await prisma.actorDocument.createMany({ data: docs as never });
  await putS3Objects(docs.map((d) => d.s3Key));

  // An APPROVED investigation on the source: renewal must archive it.
  await prisma.actorInvestigation.create({
    data: {
      policyId: policy.id,
      actorType: 'TENANT',
      actorId: tenantId,
      status: 'APPROVED',
      submittedBy: 'test-admin-user-id',
      findings: 'Investigación aprobada previa a la renovación (seed E2E-08).',
    },
  });

  return {
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    tenantId,
    landlordPrimaryId: landlordPrimary.id,
    landlordCoOwnerId: landlordCoOwner.id,
    tenantName: 'Julieta Vargas Solís',
    landlordPrimaryName: 'Carlos Ramírez Ortega',
    landlordCoOwnerName: 'Ana López Ferrer',
  };
}
