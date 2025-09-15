import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const packagesData = [
  {
    id: 'basic',
    name: 'Protección Libertad',
    price: 3800,
    percentage: null,  // Flat fee, no percentage
    minAmount: null,   // No minimum since it's a flat fee
    shortDescription: null,  // Not needed for flat fee
    description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
    features: {
      'INVESTIGACIÓN': [
        'Estudio Socio - Económico',
        'Análisis de Buró de Crédito',
        'Investigación Judicial',
        'Análisis de Garantía'
      ],
      'CONTRATO DE ARRENDAMIENTO': [
        'Redacción y entrega de contrato',
        'Elaboración de documentos de garantía',
        'Asistencia de abogado a Firma'
      ]
    },
    ctaText: 'Comenzar',
    ctaLink: '/register?package=basic',
    highlight: false
  },
  {
    id: 'standard',
    name: 'Protección Esencial',
    price: 4100,
    percentage: 40,
    minAmount: 4100,
    shortDescription: null,
    description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
    features: {
      'INVESTIGACIÓN': [
        'Estudio Socio - Económico',
        'Análisis de Buró de Crédito',
        'Investigación Judicial',
        'Análisis de Garantía'
      ],
      'CONTRATO DE ARRENDAMIENTO': [
        'Redacción y entrega de contrato',
        'Elaboración de documentos de garantía',
        'Asistencia de abogado a Firma'
      ],
      'GESTIÓN DE INCIDENCIAS': [
        'Mediación entre las partes',
        'Asesoría legal',
        'Representación Legal en Juicio Civil'
      ]
    },
    ctaText: 'Elegir Esencial',
    ctaLink: '/register?package=standard',
    highlight: false
  },
  {
    id: 'premium',
    name: 'Protección Premium',
    price: 5500,
    percentage: 50,
    minAmount: 5500,
    shortDescription: null,
    description: 'Servicios esenciales de investigación para la fiabilidad en tu arrendamiento.',
    features: {
      'INVESTIGACIÓN': [
        'Estudio Socio - Económico',
        'Análisis de Buró de Crédito',
        'Investigación Judicial',
        'Análisis de Garantía'
      ],
      'CONTRATO DE ARRENDAMIENTO': [
        'Redacción y entrega de contrato',
        'Elaboración de documentos de garantía',
        'Asistencia de abogado a Firma'
      ],
      'GESTIÓN DE INCIDENCIAS': [
        'Mediación entre las partes',
        'Asesoría legal',
        'Representación Legal en Juicio Civil',
        'Representación Legal en Juicio Mercantil',
        'Desocupación y entrega de inmueble',
        'Juicio de extinción de dominio'
      ]
    },
    ctaText: 'Optar por Premium',
    ctaLink: '/register?package=premium',
    highlight: false
  },
];

async function main() {
  console.log('Start seeding...');

  // Seed Admin User with hashed password
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminEmail = 'admin@hestiaplp.com.mx';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN', // Changed to match enum
    },
  });
  console.log(`Created/found admin user: ${adminUser.name} with email ${adminUser.email}`);

  // Seed additional test users
  const testUsers = [
    {
      email: 'broker@hestiaplp.com.mx',
      name: 'John Broker',
      password: hashedPassword,
      role: 'BROKER' // Changed to match enum
    },
    {
      email: 'staff@hestiaplp.com.mx',
      name: 'Alice Staff',
      password: hashedPassword,
      role: 'STAFF' // Changed to match enum
    },
    {
      email: 'broker2@hestiaplp.com.mx',
      name: 'Bob Broker',
      password: hashedPassword,
      role: 'BROKER' // Changed to match enum
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
        price: pkg.price,
        description: pkg.description,
        features: JSON.stringify(pkg.features), // Store features as a JSON string
        ctaText: pkg.ctaText,
        ctaLink: pkg.ctaLink,
        highlight: pkg.highlight,
        percentage: pkg.percentage,
        minAmount: pkg.minAmount,
        shortDescription: pkg.shortDescription,
      },
      create: {
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        description: pkg.description,
        features: JSON.stringify(pkg.features), // Store features as a JSON string
        ctaText: pkg.ctaText,
        ctaLink: pkg.ctaLink,
        highlight: pkg.highlight,
        percentage: pkg.percentage,
        minAmount: pkg.minAmount,
        shortDescription: pkg.shortDescription,
      },
    });
    console.log(`Created/updated package: ${pkg.name}`);
  }

  // Seed sample policies with the new schema
  const [adminUserData, brokerUser, staffUser, broker2User] = createdUsers;

  console.log('Seeding sample policies...');

  // Delete existing sample policies first to avoid conflicts
  await prisma.policy.deleteMany({
    where: {
      policyNumber: {
        in: ['POL-2024-SAMPLE-001', 'POL-2024-ACTIVE-001']
      }
    }
  });

  // Create a sample policy with actors
  const samplePolicy = await prisma.policy.create({
    data: {
      policyNumber: 'POL-2024-SAMPLE-001',
      propertyAddress: 'Av. Reforma 123, Col. Centro, Ciudad de México',
      propertyType: 'APARTMENT',
      rentAmount: 15000,
      totalPrice: 6000,
      guarantorType: 'JOINT_OBLIGOR',
      createdById: brokerUser.id,
      status: 'DRAFT',
      // Create landlord
      landlord: {
        create: {
          fullName: 'Juan Pérez García',
          email: 'juan.perez@example.com',
          phone: '5512345678',
          rfc: 'PEGJ850101ABC',
          address: 'Av. Insurgentes 456, CDMX',
        }
      },
      // Create tenant
      tenant: {
        create: {
          fullName: 'María López Hernández',
          email: 'maria.lopez@example.com',
          phone: '5587654321',
          tenantType: 'INDIVIDUAL',
        }
      },
    },
    include: {
      landlord: true,
      tenant: true,
    }
  });
  console.log(`Created sample policy: ${samplePolicy.policyNumber}`);

  // Create a joint obligor for the policy if it doesn't exist
  const existingJointObligor = await prisma.jointObligor.findFirst({
    where: {
      policyId: samplePolicy.id,
      email: 'carlos.rodriguez@example.com'
    }
  });

  const jointObligor = existingJointObligor || await prisma.jointObligor.create({
    data: {
      policyId: samplePolicy.id,
      fullName: 'Carlos Rodríguez Martínez',
      email: 'carlos.rodriguez@example.com',
      phone: '5511223344',
      nationality: 'MEXICAN',
      curp: 'ROMC850101HDFXXX00',
      address: 'Calle Palmas 789, CDMX',
      employmentStatus: 'employed',
      occupation: 'Ingeniero',
      companyName: 'Tech Solutions SA de CV',
      position: 'Gerente',
      monthlyIncome: 45000,
      incomeSource: 'salary',
    }
  });
  console.log(`Created joint obligor: ${jointObligor.fullName}`);

  // Seed SystemConfig
  console.log('Seeding system configuration...');
  await prisma.systemConfig.upsert({
    where: { id: 'system-config-1' },
    update: { investigationFee: 200 },
    create: {
      id: 'system-config-1',
      investigationFee: 200,
      defaultTokenExpiry: 7,
    }
  });
  console.log('Created/updated system configuration');

  // Create another sample policy with different status
  console.log('Creating additional sample policies...');
  const activePolicy = await prisma.policy.create({
    data: {
      policyNumber: 'POL-2024-ACTIVE-001',
      propertyAddress: 'Polanco 789, Ciudad de México',
      propertyType: 'HOUSE',
      rentAmount: 35000,
      totalPrice: 14000,
      guarantorType: 'AVAL',
      createdById: brokerUser.id,
      status: 'ACTIVE',
      submittedAt: new Date('2024-01-15'),
      approvedAt: new Date('2024-01-20'),
      activatedAt: new Date('2024-02-01'),
      packageId: 'premium',
      // Create landlord
      landlord: {
        create: {
          fullName: 'Roberto Sánchez Villa',
          email: 'roberto.sanchez@example.com',
          phone: '5599887766',
          rfc: 'SAVR780202XYZ',
          address: 'Bosques de las Lomas, CDMX',
        }
      },
      // Create tenant
      tenant: {
        create: {
          fullName: 'Ana Martínez Torres',
          email: 'ana.martinez@example.com',
          phone: '5544332211',
          tenantType: 'INDIVIDUAL',
        }
      },
    },
    include: {
      landlord: true,
      tenant: true,
    }
  });
  console.log(`Created active policy: ${activePolicy.policyNumber}`);

  // Create an aval for the active policy if it doesn't exist
  const existingAval = await prisma.aval.findFirst({
    where: {
      policyId: activePolicy.id,
      email: 'pedro.gonzalez@example.com'
    }
  });

  const aval = existingAval || await prisma.aval.create({
    data: {
      policyId: activePolicy.id,
      fullName: 'Pedro González López',
      email: 'pedro.gonzalez@example.com',
      phone: '5566778899',
      nationality: 'MEXICAN',
      curp: 'GOLP900303HDFXXX00',
      address: 'Santa Fe, CDMX',
      employmentStatus: 'employed',
      occupation: 'Empresario',
      companyName: 'Inmobiliaria González',
      position: 'Director General',
      monthlyIncome: 150000,
      incomeSource: 'business',
      propertyAddress: 'Lomas de Chapultepec 123, CDMX',
      propertyValue: 8000000,
      propertyDeedNumber: 'DEED-2020-4567',
      propertyRegistry: 'Registro Público CDMX',
    }
  });
  console.log(`Created aval: ${aval.fullName}`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });