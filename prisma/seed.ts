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
  
  const adminEmail = 'admin@hestiaplp.com.mx';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'staff',
    },
  });
  console.log(`Created/found admin user: ${adminUser.name} with email ${adminUser.email}`);

  // Seed additional test users
  const testUsers = [
    {
      email: 'broker@hestiaplp.com.mx',
      name: 'John Broker',
      password: hashedPassword,
      role: 'broker'
    },
    {
      email: 'tenant@hestiaplp.com.mx',
      name: 'Alice Tenant',
      password: hashedPassword,
      role: 'tenant'
    },
    {
      email: 'landlord@hestiaplp.com.mx',
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

  // Seed sample insurance policies (using the renamed model)
  const [staff, broker, tenant, landlord] = createdUsers;
  
  console.log('Seeding insurance policies...');
  const insurancePolicies = [
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

  for (const insurancePolicy of insurancePolicies) {
    const created = await prisma.insurancePolicy.create({
      data: insurancePolicy
    });
    console.log(`Created insurance policy for property: ${created.propertyAddress}`);
  }

  // Seed SystemConfig first
  console.log('Seeding system configuration...');
  await prisma.systemConfig.upsert({
    where: { id: 'system-config-1' },
    update: { investigationFee: 200 },
    create: {
      id: 'system-config-1',
      investigationFee: 200
    }
  });
  console.log('Created/updated system configuration');

  // Seed sample policy applications (new Policy model with structured data)
  console.log('Seeding policy applications...');
  const samplePolicies = [
    {
      initiatedBy: staff.id,
      tenantEmail: 'tenant@example.com',
      tenantPhone: '+1234567890',
      tenantName: 'Maria Rodriguez',
      propertyAddress: 'Av. Reforma 123, Roma Norte, CDMX', 
      status: 'ACTIVE' as any,
      currentStep: 7,
      accessToken: 'sample-token-123',
      tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      submittedAt: new Date('2024-01-15'),
      packageId: 'premium',
      packageName: 'Fortaleza Premium',
      totalPrice: 5500,
      investigationFee: 200,
      tenantPaymentPercent: 70,
      landlordPaymentPercent: 30,
      investigationStartedAt: new Date('2024-01-02'),
      investigationCompletedAt: new Date('2024-01-03'),
      contractUploadedAt: new Date('2024-01-16'),
      contractSignedAt: new Date('2024-01-20'),
      policyActivatedAt: new Date('2024-02-01'),
      contractLength: 12,
      policyExpiresAt: new Date('2025-02-01')
    },
    {
      initiatedBy: staff.id,
      tenantEmail: 'tenant2@example.com',
      tenantPhone: '+1234567892',
      tenantName: 'John Smith',
      propertyAddress: 'Insurgentes Sur 456, Del Valle, CDMX',
      status: 'INVESTIGATION_IN_PROGRESS' as any,
      currentStep: 4,
      accessToken: 'sample-token-456',
      tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      submittedAt: new Date('2024-01-12'),
      packageId: 'standard',
      packageName: 'Seguro Estándar',
      totalPrice: 4100,
      investigationFee: 200,
      tenantPaymentPercent: 100,
      landlordPaymentPercent: 0,
      investigationStartedAt: new Date('2024-01-11')
    }
  ];

  const createdPolicies = [];
  for (const policy of samplePolicies) {
    const created = await prisma.policy.create({
      data: policy
    });
    createdPolicies.push(created);
    console.log(`Created policy application for tenant: ${created.tenantEmail}`);

    // Create structured data for each policy
    if (policy.tenantEmail === 'tenant@example.com') {
      // Create profile data for first policy
      await prisma.tenantProfile.create({
        data: {
          policyId: created.id,
          nationality: 'MEXICAN',
          curp: 'AAAA000000AAAA00'
        }
      });

      // Create employment data
      await prisma.tenantEmployment.create({
        data: {
          policyId: created.id,
          employmentStatus: 'employed',
          industry: 'Technology',
          occupation: 'Software Engineer',
          companyName: 'Tech Corp',
          position: 'Software Engineer',
          incomeSource: 'salary',
          monthlyIncome: 50000,
          creditCheckConsent: true
        }
      });

      // Create references data
      await prisma.tenantReferences.create({
        data: {
          policyId: created.id,
          personalReferenceName: 'John Doe',
          personalReferencePhone: '+1234567891'
        }
      });

      // Create documents data
      await prisma.tenantDocuments.create({
        data: {
          policyId: created.id,
          identificationCount: 1,
          incomeCount: 2,
          optionalCount: 0,
          incomeDocsHavePassword: 'NO'
        }
      });

      // Create guarantor data
      await prisma.tenantGuarantor.create({
        data: {
          policyId: created.id,
          name: 'Carlos Rodriguez',
          phone: '+1234567894',
          relationship: 'parent'
        }
      });
    } else if (policy.tenantEmail === 'tenant2@example.com') {
      // Create profile data for second policy
      await prisma.tenantProfile.create({
        data: {
          policyId: created.id,
          nationality: 'FOREIGN',
          passport: 'AB1234567'
        }
      });

      // Create employment data
      await prisma.tenantEmployment.create({
        data: {
          policyId: created.id,
          employmentStatus: 'employed',
          industry: 'Finance',
          occupation: 'Financial Analyst',
          companyName: 'Banking Corp',
          position: 'Financial Analyst',
          incomeSource: 'salary',
          monthlyIncome: 35000,
          creditCheckConsent: true
        }
      });

      // Create references data
      await prisma.tenantReferences.create({
        data: {
          policyId: created.id,
          personalReferenceName: 'Jane Smith',
          personalReferencePhone: '+1234567893'
        }
      });

      // Create documents data
      await prisma.tenantDocuments.create({
        data: {
          policyId: created.id,
          identificationCount: 1,
          incomeCount: 1,
          optionalCount: 1,
          incomeDocsHavePassword: 'NO'
        }
      });
    }
    
    // Add some sample activities
    await prisma.policyActivity.create({
      data: {
        policyId: created.id,
        action: 'created',
        details: { initiatedBy: staff.email },
        performedBy: staff.id
      }
    });
    
    if (created.status === 'INVESTIGATION_IN_PROGRESS') {
      await prisma.policyActivity.create({
        data: {
          policyId: created.id,
          action: 'investigation_started',
          details: { assignedTo: staff.id },
          performedBy: staff.id
        }
      });
    } else if (created.status === 'ACTIVE') {
      await prisma.policyActivity.create({
        data: {
          policyId: created.id,
          action: 'investigation_completed',
          details: { verdict: 'APPROVED' },
          performedBy: staff.id
        }
      });
      
      await prisma.policyActivity.create({
        data: {
          policyId: created.id,
          action: 'contract_uploaded',
          details: { version: 1 },
          performedBy: staff.id
        }
      });
      
      await prisma.policyActivity.create({
        data: {
          policyId: created.id,
          action: 'contract_signed',
          details: { signedAt: created.contractSignedAt },
          performedBy: 'tenant'
        }
      });
    }
  }

  // Seed investigations for policies that have them
  console.log('Seeding investigations...');
  for (const policy of createdPolicies) {
    if (policy.status === 'INVESTIGATION_IN_PROGRESS') {
      await prisma.investigation.create({
        data: {
          policyId: policy.id,
          assignedTo: staff.id,
          responseTimeHours: 8,
          notes: 'Investigation in progress. Waiting for additional documentation.'
        }
      });
      console.log(`Created investigation for policy: ${policy.id}`);
    } else if (policy.status === 'ACTIVE') {
      await prisma.investigation.create({
        data: {
          policyId: policy.id,
          verdict: 'APPROVED',
          riskLevel: 'LOW',
          assignedTo: staff.id,
          completedBy: staff.id,
          completedAt: policy.investigationCompletedAt,
          responseTimeHours: 24,
          notes: 'Investigation completed successfully. Tenant approved for rental.'
        }
      });
      console.log(`Created completed investigation for policy: ${policy.id}`);
    }
  }

  // Seed contracts for active policies
  console.log('Seeding contracts...');
  for (const policy of createdPolicies) {
    if (policy.status === 'ACTIVE' && policy.contractUploadedAt) {
      await prisma.contract.create({
        data: {
          policyId: policy.id,
          version: 1,
          fileUrl: '/demo/contracts/contract-v1.pdf',
          fileName: 'contrato-arrendamiento-v1.pdf',
          fileSize: 256000,
          mimeType: 'application/pdf',
          uploadedBy: staff.id,
          uploadedAt: policy.contractUploadedAt
        }
      });
      console.log(`Created contract for policy: ${policy.id}`);
    }
  }

  // Seed sample payments
  console.log('Seeding payments...');
  for (const policy of createdPolicies) {
    // Investigation fee payment
    await prisma.payment.create({
      data: {
        policyId: policy.id,
        amount: policy.investigationFee,
        type: 'INVESTIGATION_FEE',
        paidBy: 'TENANT',
        status: 'COMPLETED',
        method: 'STRIPE',
        paidAt: policy.investigationStartedAt || new Date(),
        description: 'Investigation fee payment'
      }
    });

    if (policy.status === 'ACTIVE') {
      // Remaining policy payment
      const remainingAmount = policy.totalPrice - policy.investigationFee;
      const tenantAmount = (remainingAmount * policy.tenantPaymentPercent) / 100;
      const landlordAmount = (remainingAmount * policy.landlordPaymentPercent) / 100;

      if (tenantAmount > 0) {
        await prisma.payment.create({
          data: {
            policyId: policy.id,
            amount: tenantAmount,
            type: 'POLICY',
            paidBy: 'TENANT',
            status: 'COMPLETED',
            method: 'STRIPE',
            paidAt: policy.contractSignedAt || new Date(),
            description: 'Policy payment - tenant portion'
          }
        });
      }

      if (landlordAmount > 0) {
        await prisma.payment.create({
          data: {
            policyId: policy.id,
            amount: landlordAmount,
            type: 'POLICY',
            paidBy: 'LANDLORD',
            status: 'COMPLETED',
            method: 'MANUAL',
            paidAt: policy.contractSignedAt || new Date(),
            description: 'Policy payment - landlord portion',
            reference: 'CASH-001'
          }
        });
      }
    }
    console.log(`Created payments for policy: ${policy.id}`);
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
