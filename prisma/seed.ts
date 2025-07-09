import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const packagesData = [
  { id: 'basic', name: 'Escudo Básico', price: '$49', description: 'Servicios esenciales de investigación para asegurar la fiabilidad del inquilino.', features: ['Verificación de antecedentes del inquilino', 'Resumen de informe de crédito', 'Búsqueda de historial de desalojos'], ctaText: 'Comenzar', ctaLink: '/register?package=basic', highlight: false },
  { id: 'standard', name: 'Seguro Estándar', price: '$99', description: 'Protección integral que incluye soporte en el contrato y garantías iniciales.', features: ['Todas las funciones de Escudo Básico', 'Plantilla de contrato de arrendamiento personalizable', 'Garantía de pago de renta (1 mes)', 'Consulta legal básica'], ctaText: 'Elegir Estándar', ctaLink: '/register?package=standard', highlight: true },
  { id: 'premium', name: 'Fortaleza Premium', price: '$199', description: 'Tranquilidad total con gestión completa del contrato y cobertura extendida.', features: ['Todas las funciones de Seguro Estándar', 'Gestión del ciclo de vida completo del contrato', 'Garantía de renta extendida (3 meses)', 'Asistencia legal integral', 'Cobertura del proceso de desalojo'], ctaText: 'Optar por Premium', ctaLink: '/register?package=premium', highlight: false },
];

async function main() {
  console.log('Start seeding...');

  // Seed Admin User
  const adminEmail = 'admin@hestia.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      role: 'ADMIN',
    },
  });
  console.log(`Created/found admin user: ${adminUser.name} with email ${adminUser.email}`);

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
