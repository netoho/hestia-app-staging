import bcrypt from 'bcryptjs';
import { User, Package, InsurancePolicy, Policy, PolicyStatus } from '@/lib/prisma-types';

// Mock users from seed data
const hashedPassword = bcrypt.hashSync('password123', 10);

export const mockUsers: User[] = [
  {
    id: 'mock-admin-id',
    email: 'admin@hestiaplp.com.mx',
    name: 'Super Admin',
    password: hashedPassword,
    role: 'staff',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mock-broker-id',
    email: 'broker@hestiaplp.com.mx',
    name: 'John Broker',
    password: hashedPassword,
    role: 'broker',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mock-tenant-id',
    email: 'tenant@hestiaplp.com.mx',
    name: 'Alice Tenant',
    password: hashedPassword,
    role: 'tenant',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mock-landlord-id',
    email: 'landlord@hestiaplp.com.mx',
    name: 'Bob Landlord',
    password: hashedPassword,
    role: 'landlord',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock packages from seed data
export const mockPackages: Package[] = [
  {
    id: 'basic',
    name: 'Escudo Básico',
    price: 49,
    description: 'Servicios esenciales de investigación para asegurar la fiabilidad del inquilino.',
    features: JSON.stringify(['Verificación de antecedentes del inquilino', 'Resumen de informe de crédito', 'Búsqueda de historial de desalojos']),
    ctaText: 'Comenzar',
    ctaLink: '/register?package=basic',
    highlight: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'standard',
    name: 'Seguro Estándar',
    price: 99,
    description: 'Protección integral que incluye soporte en el contrato y garantías iniciales.',
    features: JSON.stringify(['Todas las funciones de Escudo Básico', 'Plantilla de contrato de arrendamiento personalizable', 'Garantía de pago de renta (1 mes)', 'Consulta legal básica']),
    ctaText: 'Elegir Estándar',
    ctaLink: '/register?package=standard',
    highlight: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'premium',
    name: 'Fortaleza Premium',
    price: 199,
    description: 'Tranquilidad total con gestión completa del contrato y cobertura extendida.',
    features: JSON.stringify(['Todas las funciones de Seguro Estándar', 'Gestión del ciclo de vida completo del contrato', 'Garantía de renta extendida (3 meses)', 'Asistencia legal integral', 'Cobertura del proceso de desalojo']),
    ctaText: 'Optar por Premium',
    ctaLink: '/register?package=premium',
    highlight: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock insurance policies from seed data
export const mockInsurancePolicies: InsurancePolicy[] = [
  {
    id: 'mock-insurance-1',
    brokerId: 'mock-broker-id',
    tenantId: 'mock-tenant-id',
    landlordId: 'mock-landlord-id',
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
    }),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mock-insurance-2',
    brokerId: 'mock-broker-id',
    tenantId: 'mock-tenant-id',
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
    }),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock policy documents
export const mockPolicyDocuments = [
  {
    id: 'mock-doc-1',
    policyId: 'mock-policy-1',
    category: 'identification',
    originalName: 'passport.pdf',
    storagePath: 'mock/passport.pdf',
    fileSize: 2048000,
    mimeType: 'application/pdf',
    uploadedAt: new Date('2024-01-15T10:00:00'),
  },
  {
    id: 'mock-doc-2',
    policyId: 'mock-policy-1',
    category: 'income',
    originalName: 'pay_stub_jan.pdf',
    storagePath: 'mock/pay_stub_jan.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    uploadedAt: new Date('2024-01-15T10:05:00'),
  },
  {
    id: 'mock-doc-3',
    policyId: 'mock-policy-1',
    category: 'income',
    originalName: 'pay_stub_feb.pdf',
    storagePath: 'mock/pay_stub_feb.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    uploadedAt: new Date('2024-01-15T10:10:00'),
  },
];

// Mock policy activities
export const mockPolicyActivities = [
  {
    id: 'mock-activity-1',
    policyId: 'mock-policy-1',
    action: 'created',
    details: { initiatedBy: 'admin@hestiaplp.com.mx' },
    performedBy: 'mock-admin-id',
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01T09:00:00'),
  },
  {
    id: 'mock-activity-2',
    policyId: 'mock-policy-1',
    action: 'sent',
    details: { email: 'tenant@example.com' },
    performedBy: 'mock-admin-id',
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01T09:05:00'),
  },
  {
    id: 'mock-activity-3',
    policyId: 'mock-policy-1',
    action: 'step_completed',
    details: { step: 1 },
    performedBy: 'tenant',
    ipAddress: '192.168.1.100',
    createdAt: new Date('2024-01-15T08:00:00'),
  },
  {
    id: 'mock-activity-4',
    policyId: 'mock-policy-1',
    action: 'step_completed',
    details: { step: 2 },
    performedBy: 'tenant',
    ipAddress: '192.168.1.100',
    createdAt: new Date('2024-01-15T08:30:00'),
  },
  {
    id: 'mock-activity-5',
    policyId: 'mock-policy-1',
    action: 'step_completed',
    details: { step: 3 },
    performedBy: 'tenant',
    ipAddress: '192.168.1.100',
    createdAt: new Date('2024-01-15T09:00:00'),
  },
  {
    id: 'mock-activity-6',
    policyId: 'mock-policy-1',
    action: 'document_uploaded',
    details: { fileName: 'passport.pdf', category: 'identification' },
    performedBy: 'tenant',
    ipAddress: '192.168.1.100',
    createdAt: new Date('2024-01-15T10:00:00'),
  },
  {
    id: 'mock-activity-7',
    policyId: 'mock-policy-1',
    action: 'submitted',
    details: { step: 4 },
    performedBy: 'tenant',
    ipAddress: '192.168.1.100',
    createdAt: new Date('2024-01-15T10:15:00'),
  },
];

// Mock policy applications from seed data
export const mockPolicies: Policy[] = [
  {
    id: 'mock-policy-1',
    initiatedBy: 'mock-admin-id',
    reviewedBy: null,
    reviewedAt: null,
    tenantEmail: 'tenant@example.com',
    tenantPhone: '+1234567890',
    propertyId: null,
    status: 'SUBMITTED' as PolicyStatus,
    currentStep: 4,
    profileData: {
      nationality: 'mexican',
      curp: 'AAAA000000AAAA00'
    },
    employmentData: {
      employmentStatus: 'employed',
      industry: 'Technology',
      companyName: 'Tech Corp',
      position: 'Software Engineer',
      monthlyIncome: 50000,
      creditCheckConsent: true
    },
    referencesData: {
      personalReferenceName: 'John Doe',
      personalReferencePhone: '+1234567891'
    },
    documentsData: {
      identificationCount: 1,
      incomeCount: 2,
      optionalCount: 0,
      incomeDocsHavePassword: 'no'
    },
    accessToken: 'sample-token-123',
    tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    submittedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

// Mock data service class
export class MockDataService {
  // Users
  static async getUsers() {
    return mockUsers;
  }

  static async getUserById(id: string) {
    return mockUsers.find(user => user.id === id) || null;
  }

  static async getUserByEmail(email: string) {
    return mockUsers.find(user => user.email === email) || null;
  }

  // Packages
  static async getPackages() {
    return mockPackages;
  }

  static async getPackageById(id: string) {
    return mockPackages.find(pkg => pkg.id === id) || null;
  }

  // Policies
  static async getPolicies() {
    // Return policies with full relations for list view
    return mockPolicies.map(policy => {
      const initiatedByUser = mockUsers.find(u => u.id === policy.initiatedBy);
      const reviewedByUser = policy.reviewedBy ? mockUsers.find(u => u.id === policy.reviewedBy) : null;
      const documents = mockPolicyDocuments.filter(d => d.policyId === policy.id);
      const activities = mockPolicyActivities.filter(a => a.policyId === policy.id);

      return {
        ...policy,
        documents,
        activities,
        initiatedByUser: initiatedByUser ? {
          id: initiatedByUser.id,
          email: initiatedByUser.email,
          name: initiatedByUser.name,
        } : null,
        reviewedByUser: reviewedByUser ? {
          id: reviewedByUser.id,
          email: reviewedByUser.email,
          name: reviewedByUser.name,
        } : null,
      };
    });
  }

  static async getPolicyById(id: string) {
    return mockPolicies.find(policy => policy.id === id) || null;
  }

  static async getPolicyByToken(token: string) {
    return mockPolicies.find(policy => policy.accessToken === token) || null;
  }

  // Insurance Policies
  static async getInsurancePolicies() {
    return mockInsurancePolicies;
  }

  static async getInsurancePolicyById(id: string) {
    return mockInsurancePolicies.find(policy => policy.id === id) || null;
  }

  // Authentication
  static async validateUser(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Search and filter
  static async searchUsers(query: string) {
    const lowerQuery = query.toLowerCase();
    return mockUsers.filter(user => 
      user.name?.toLowerCase().includes(lowerQuery) || 
      user.email.toLowerCase().includes(lowerQuery)
    );
  }

  static async filterPoliciesByStatus(status: PolicyStatus | 'all') {
    if (status === 'all') return mockPolicies;
    return mockPolicies.filter(policy => policy.status === status);
  }

  // Get policy with all relations (for details page)
  static async getPolicyWithRelations(id: string) {
    const policy = mockPolicies.find(p => p.id === id);
    if (!policy) return null;

    // Get related user data
    const initiatedByUser = mockUsers.find(u => u.id === policy.initiatedBy);
    const reviewedByUser = policy.reviewedBy ? mockUsers.find(u => u.id === policy.reviewedBy) : null;

    // Get related documents
    const documents = mockPolicyDocuments
      .filter(d => d.policyId === id)
      .map(doc => ({
        id: doc.id,
        category: doc.category,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
      }))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    // Get related activities
    const activities = mockPolicyActivities
      .filter(a => a.policyId === id)
      .map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        performedBy: activity.performedBy,
        ipAddress: activity.ipAddress,
        createdAt: activity.createdAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      ...policy,
      initiatedByUser: initiatedByUser ? {
        id: initiatedByUser.id,
        email: initiatedByUser.email,
        name: initiatedByUser.name,
      } : null,
      reviewedByUser: reviewedByUser ? {
        id: reviewedByUser.id,
        email: reviewedByUser.email,
        name: reviewedByUser.name,
      } : null,
      documents,
      activities,
    };
  }

  // Get policy documents
  static async getPolicyDocuments(policyId: string) {
    return mockPolicyDocuments.filter(doc => doc.policyId === policyId);
  }

  // Get policy activities
  static async getPolicyActivities(policyId: string) {
    return mockPolicyActivities.filter(activity => activity.policyId === policyId);
  }
}