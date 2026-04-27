import { UserRole } from "@/prisma/generated/prisma-client/enums";
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export { prisma };

// Tables in reverse dependency order for safe truncation.
// ReminderLog has no FK to Policy, so it doesn't cascade — list it explicitly.
// TenantReceipt / ReceiptConfig / ActorInvestigationDocument / PaymentTransfer
// cascade from their parents, but listing them keeps intent obvious.
const TABLES = [
  'ReminderLog',
  'PolicyActivity',
  'ReviewNote',
  'ActorSectionValidation',
  'DocumentValidation',
  'ActorDocument',
  'PolicyDocument',
  'TenantReceipt',
  'ReceiptConfig',
  'PersonalReference',
  'CommercialReference',
  'PaymentTransfer',
  'Payment',
  'Contract',
  'ActorInvestigationDocument',
  'ActorInvestigation',
  'Incident',
  'Aval',
  'JointObligor',
  'Tenant',
  'Landlord',
  'PropertyDetails',
  'PropertyAddress',
  'Policy',
  'Session',
  'Account',
  'VerificationToken',
  'User',
  'Package',
  'SystemConfig',
];

export async function resetDatabase(): Promise<void> {
  for (const table of TABLES) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table might not exist yet, ignore.
    }
  }
}

export async function seedTestData(): Promise<void> {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      email: 'admin@hestiaplp.com.mx',
      name: 'Super Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  await prisma.package.createMany({
    data: [
      {
        id: 'basic',
        name: 'Protección Libertad',
        price: 3800,
        description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
        features: JSON.stringify({
          INVESTIGACIÓN: ['Estudio Socio - Económico', 'Análisis de Buró de Crédito'],
        }),
        ctaText: 'Comenzar',
        ctaLink: '/register?package=basic',
        highlight: false,
      },
      {
        id: 'standard',
        name: 'Protección Esencial',
        price: 4100,
        percentage: 40,
        minAmount: 4100,
        description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
        features: JSON.stringify({
          INVESTIGACIÓN: ['Estudio Socio - Económico', 'Análisis de Buró de Crédito'],
        }),
        ctaText: 'Elegir Esencial',
        ctaLink: '/register?package=standard',
        highlight: false,
      },
      {
        id: 'premium',
        name: 'Protección Premium',
        price: 5500,
        percentage: 50,
        minAmount: 5500,
        description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
        features: JSON.stringify({
          INVESTIGACIÓN: ['Estudio Socio - Económico', 'Análisis de Buró de Crédito'],
        }),
        ctaText: 'Optar por Premium',
        ctaLink: '/register?package=premium',
        highlight: true,
      },
    ],
  });

  await prisma.systemConfig.create({
    data: {
      id: 'system-config-1',
      investigationFee: 200,
      defaultTokenExpiry: 7,
    },
  });
}

export async function createTestUser(data: {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  withInvitationToken?: boolean;
}) {
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      password: hashedPassword,
      invitationToken: data.withInvitationToken ? crypto.randomUUID() : null,
      invitationTokenExpiry: data.withInvitationToken
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : null,
    },
  });
}
