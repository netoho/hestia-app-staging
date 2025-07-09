import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const packagesData = [
  { id: 'basic', name: 'Escudo Básico', price: '$49', description: 'Servicios esenciales de investigación para asegurar la fiabilidad del inquilino.', features: ['Verificación de antecedentes del inquilino', 'Resumen de informe de crédito', 'Búsqueda de historial de desalojos'], ctaText: 'Comenzar', ctaLink: '/register?package=basic', highlight: false },
  { id: 'standard', name: 'Seguro Estándar', price: '$99', description: 'Protección integral que incluye soporte en el contrato y garantías iniciales.', features: ['Todas las funciones de Escudo Básico', 'Plantilla de contrato de arrendamiento personalizable', 'Garantía de pago de renta (1 mes)', 'Consulta legal básica'], ctaText: 'Elegir Estándar', ctaLink: '/register?package=standard', highlight: true },
  { id: 'premium', name: 'Fortaleza Premium', price: '$199', description: 'Tranquilidad total con gestión completa del contrato y cobertura extendida.', features: ['Todas las funciones de Seguro Estándar', 'Gestión del ciclo de vida completo del contrato', 'Garantía de renta extendida (3 meses)', 'Asistencia legal integral', 'Cobertura del proceso de desalojo'], ctaText: 'Optar por Premium', ctaLink: '/register?package=premium', highlight: false },
];

async function main() {
  console.log('Start seeding...');

  // Seed Admin User with hashed password
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminEmail = 'admin@hestia.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'staff', // Using 'staff' instead of 'ADMIN' based on our schema
    },
  });
  console.log(`Created/found admin user: ${adminUser.name} with email ${adminUser.email}`);

  // Seed additional test users
  const testUsers = [
    {
      email: 'broker@hestia.com',
      name: 'John Broker',
      password: hashedPassword,
      role: 'broker'
    },
    {
      email: 'tenant@hestia.com',
      name: 'Alice Tenant',
      password: hashedPassword,
      role: 'tenant'
    },
    {
      email: 'landlord@hestia.com',
      name: 'Bob Landlord',
      password: hashedPassword,
      role: 'landlord'
    }
  ];

  const createdUsers = [adminUser];
  for (const user of testUsers) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    });
    createdUsers.push(created);
    console.log(`Created/found user: ${created.name} with role ${created.role}`);
  }

  // Seed Packages
  console.log('Seeding packages...');
  for (const pkg of packagesData) {
    await prisma.package.upsert({
      where: { id: pkg.id },
      update: {
        name: pkg.name,
        price: parseFloat(pkg.price.replace('$', '')),
        description: pkg.description,
        features: JSON.stringify(pkg.features), // Store features as a JSON string
        ctaText: pkg.ctaText,
        ctaLink: pkg.ctaLink,
        highlight: pkg.highlight,
      },
      create: {
        id: pkg.id,
        name: pkg.name,
        price: parseFloat(pkg.price.replace('$', '')),
        description: pkg.description,
        features: JSON.stringify(pkg.features), // Store features as a JSON string
        ctaText: pkg.ctaText,
        ctaLink: pkg.ctaLink,
        highlight: pkg.highlight,
      },
    });
    console.log(`Created/updated package: ${pkg.name}`);
  }

  // Seed sample policies
  const [staff, broker, tenant, landlord] = createdUsers;
  
  console.log('Seeding policies...');
  const policies = [
    {
      brokerId: broker.id,
      tenantId: tenant.id,
      landlordId: landlord.id,
      propertyAddress: '123 Main St, New York, NY 10001',
      propertyType: 'apartment',
      status: 'active',
      premium: 150.00,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      payer: 'tenant',
      propertyData: JSON.stringify({
        sqft: 800,
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['parking', 'laundry', 'gym']
      }),
      coverageData: JSON.stringify({
        liability: 100000,
        personalProperty: 25000,
        additionalLiving: 5000
      })
    },
    {
      brokerId: broker.id,
      tenantId: tenant.id,
      landlordId: null,
      propertyAddress: '456 Oak Ave, Los Angeles, CA 90001',
      propertyType: 'house',
      status: 'pending',
      premium: 250.00,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-01-31'),
      payer: 'tenant',
      propertyData: JSON.stringify({
        sqft: 1500,
        bedrooms: 3,
        bathrooms: 2,
        amenities: ['garage', 'backyard']
      }),
      coverageData: JSON.stringify({
        liability: 200000,
        personalProperty: 50000,
        additionalLiving: 10000
      })
    }
  ];

  for (const policy of policies) {
    const created = await prisma.policy.create({
      data: policy
    });
    console.log(`Created policy for property: ${created.propertyAddress}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
