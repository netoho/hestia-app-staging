/**
 * Demo Database Service
 * 
 * This service provides a persistent in-memory database for demo mode.
 * All operations are CRUD-capable and data persists throughout the session.
 * No external database connections required.
 */

import bcrypt from 'bcryptjs';
import { User, Package, InsurancePolicy, Policy, PolicyStatusType, Investigation, Contract, Incident, Payment, SystemConfig } from '@/lib/prisma-types';
import { isDemoMode } from '../env-check';

// Export both isDemoMode and DemoORM for convenience
export { isDemoMode };

// Generate unique IDs
let nextUserId = 1000;
let nextPolicyId = 1000;
let nextDocumentId = 1000;
let nextActivityId = 1000;
let nextInsurancePolicyId = 1000;
let nextInvestigationId = 1000;
let nextContractId = 1000;
let nextIncidentId = 1000;
let nextPaymentId = 1000;
let nextSystemConfigId = 1000;

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Initialize with seed data
const hashedPassword = bcrypt.hashSync('password123', 10);

// In-memory database tables
class DemoDatabase {
  private static instance: DemoDatabase;
  
  // Database tables
  public users: User[] = [];
  public packages: Package[] = [];
  public policies: Policy[] = [];
  public insurancePolicies: InsurancePolicy[] = [];
  public policyDocuments: any[] = [];
  public policyActivities: any[] = [];
  public payments: Payment[] = [];
  public investigations: Investigation[] = [];
  public contracts: Contract[] = [];
  public incidents: Incident[] = [];
  public systemConfigs: SystemConfig[] = [];
  
  private constructor() {
    this.initializeData();
  }
  
  public static getInstance(): DemoDatabase {
    if (!DemoDatabase.instance) {
      DemoDatabase.instance = new DemoDatabase();
    }
    return DemoDatabase.instance;
  }
  
  private initializeData() {
    // Initialize users from seed data
    this.users = [
      {
        id: 'demo-admin-id',
        email: 'admin@hestiaplp.com.mx',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'staff',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'demo-broker-id',
        email: 'broker@hestiaplp.com.mx',
        name: 'John Broker',
        password: hashedPassword,
        role: 'broker',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'demo-tenant-id',
        email: 'tenant@hestiaplp.com.mx',
        name: 'Alice Tenant',
        password: hashedPassword,
        role: 'tenant',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'demo-landlord-id',
        email: 'landlord@hestiaplp.com.mx',
        name: 'Bob Landlord',
        password: hashedPassword,
        role: 'landlord',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    // Initialize packages from seed data
    this.packages = [
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

    // Initialize policy applications from seed data
    this.policies = [
      {
        id: 'demo-policy-1',
        initiatedBy: 'demo-admin-id',
        reviewedBy: null,
        reviewedAt: null,
        tenantEmail: 'tenant@example.com',
        tenantPhone: '+1234567890',
        tenantName: 'Maria Rodriguez',
        propertyId: null,
        propertyAddress: 'Av. Reforma 123, Roma Norte, CDMX',
        status: 'ACTIVE' as PolicyStatusType,
        currentStep: 6,
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
        guarantorData: {
          name: 'Carlos Rodriguez',
          phone: '+1234567894',
          relationship: 'Father'
        },
        accessToken: 'demo-token-123',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        submittedAt: new Date('2024-01-15'),
        packageId: 'premium',
        packageName: 'Fortaleza Premium',
        totalPrice: 5500,
        investigationFee: 200,
        tenantPaymentPercent: 70,
        landlordPaymentPercent: 30,
        paymentStatus: 'COMPLETED' as any,
        investigationStartedAt: new Date('2024-01-02'),
        investigationCompletedAt: new Date('2024-01-03'),
        contractUploadedAt: new Date('2024-01-16'),
        contractSignedAt: new Date('2024-01-20'),
        policyActivatedAt: new Date('2024-02-01'),
        contractLength: 12,
        policyExpiresAt: new Date('2025-02-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: 'demo-policy-2',
        initiatedBy: 'demo-admin-id',
        reviewedBy: null,
        reviewedAt: null,
        tenantEmail: 'tenant2@example.com',
        tenantPhone: '+1234567892',
        tenantName: 'John Smith',
        propertyId: null,
        propertyAddress: 'Insurgentes Sur 456, Del Valle, CDMX',
        status: 'INVESTIGATION_IN_PROGRESS' as PolicyStatusType,
        currentStep: 4,
        profileData: {
          nationality: 'foreign',
          passport: 'AB1234567'
        },
        employmentData: {
          employmentStatus: 'employed',
          industry: 'Finance',
          companyName: 'Banking Corp',
          position: 'Financial Analyst',
          monthlyIncome: 35000,
          creditCheckConsent: true
        },
        referencesData: {
          personalReferenceName: 'Jane Smith',
          personalReferencePhone: '+1234567893'
        },
        documentsData: {
          identificationCount: 1,
          incomeCount: 1,
          optionalCount: 1,
          incomeDocsHavePassword: 'no'
        },
        guarantorData: null,
        accessToken: 'demo-token-456',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        submittedAt: new Date('2024-01-12'),
        packageId: 'standard',
        packageName: 'Seguro Estándar',
        totalPrice: 4100,
        investigationFee: 200,
        tenantPaymentPercent: 100,
        landlordPaymentPercent: 0,
        paymentStatus: 'PENDING' as any,
        investigationStartedAt: new Date('2024-01-11'),
        investigationCompletedAt: null,
        contractUploadedAt: null,
        contractSignedAt: null,
        policyActivatedAt: null,
        contractLength: 12,
        policyExpiresAt: null,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-12'),
      },
    ];

    // Initialize policy documents
    this.policyDocuments = [
      {
        id: 'demo-doc-1',
        policyId: 'demo-policy-1',
        category: 'identification',
        originalName: 'passport.pdf',
        storagePath: 'demo/passport.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
        uploadedAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'demo-doc-2',
        policyId: 'demo-policy-1',
        category: 'income',
        originalName: 'pay_stub_jan.pdf',
        storagePath: 'demo/pay_stub_jan.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedAt: new Date('2024-01-15T10:05:00'),
      },
      {
        id: 'demo-doc-3',
        policyId: 'demo-policy-1',
        category: 'income',
        originalName: 'pay_stub_feb.pdf',
        storagePath: 'demo/pay_stub_feb.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedAt: new Date('2024-01-15T10:10:00'),
      },
    ];

    // Initialize policy activities
    this.policyActivities = [
      {
        id: 'demo-activity-1',
        policyId: 'demo-policy-1',
        action: 'created',
        details: { initiatedBy: 'admin@hestiaplp.com.mx' },
        performedBy: 'demo-admin-id',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-01-01T09:00:00'),
      },
      {
        id: 'demo-activity-2',
        policyId: 'demo-policy-1',
        action: 'sent',
        details: { email: 'tenant@example.com' },
        performedBy: 'demo-admin-id',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2024-01-01T09:05:00'),
      },
      {
        id: 'demo-activity-3',
        policyId: 'demo-policy-1',
        action: 'step_completed',
        details: { step: 1 },
        performedBy: 'tenant',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2024-01-15T08:00:00'),
      },
      {
        id: 'demo-activity-4',
        policyId: 'demo-policy-1',
        action: 'step_completed',
        details: { step: 2 },
        performedBy: 'tenant',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2024-01-15T08:30:00'),
      },
      {
        id: 'demo-activity-5',
        policyId: 'demo-policy-1',
        action: 'step_completed',
        details: { step: 3 },
        performedBy: 'tenant',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2024-01-15T09:00:00'),
      },
      {
        id: 'demo-activity-6',
        policyId: 'demo-policy-1',
        action: 'document_uploaded',
        details: { fileName: 'passport.pdf', category: 'identification' },
        performedBy: 'tenant',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'demo-activity-7',
        policyId: 'demo-policy-1',
        action: 'submitted',
        details: { step: 4 },
        performedBy: 'tenant',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2024-01-15T10:15:00'),
      },
    ];

    // Initialize insurance policies
    this.insurancePolicies = [
      {
        id: 'demo-insurance-1',
        brokerId: 'demo-broker-id',
        tenantId: 'demo-tenant-id',
        landlordId: 'demo-landlord-id',
        propertyAddress: '123 Main St, Mexico City, CDMX',
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
    ];

    // Initialize system configuration
    this.systemConfigs = [
      {
        id: 'system-config-1',
        investigationFee: 200,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];
  }

  // Reset database to initial state
  public reset() {
    this.initializeData();
  }

  // Get current data (for compatibility with existing mock service)
  public getData() {
    return {
      users: this.users,
      packages: this.packages,
      policies: this.policies,
      insurancePolicies: this.insurancePolicies,
      policyDocuments: this.policyDocuments,
      policyActivities: this.policyActivities,
      payments: this.payments,
    };
  }

  // Payment methods
  public createPayment(data: any) {
    const newPayment = {
      id: generateId('payment'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.payments.push(newPayment);
    return newPayment;
  }

  public updatePaymentByStripeId(stripeId: string, data: any) {
    const payment = this.payments.find(p => 
      p.stripeIntentId === stripeId || p.stripeSessionId === stripeId
    );
    if (!payment) return null;
    
    Object.assign(payment, data, { updatedAt: new Date() });
    return payment;
  }

  public updatePayment(id: string, data: any) {
    const payment = this.payments.find(p => p.id === id);
    if (!payment) return null;
    
    Object.assign(payment, data, { updatedAt: new Date() });
    return payment;
  }

  public getPaymentsByPolicyId(policyId: string) {
    return this.payments.filter(p => p.policyId === policyId);
  }
}

// Export singleton instance
export const demoDb = DemoDatabase.getInstance();

// Export a simplified interface for payment service
export const demoDatabase = {
  createPayment: (data: any) => demoDb.createPayment(data),
  updatePaymentByStripeId: (stripeId: string, data: any) => demoDb.updatePaymentByStripeId(stripeId, data),
  updatePayment: (id: string, data: any) => demoDb.updatePayment(id, data),
  getPaymentsByPolicyId: (policyId: string) => demoDb.getPaymentsByPolicyId(policyId),
};

// Helper function to check if we should use demo database
export const useDemoDatabase = (): boolean => {
  return isDemoMode();
};

// Demo-aware database operations
export class DemoORM {
  // Users
  static async findManyUsers(where?: any, options?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    let results = [...demoDb.users];
    
    // Apply where conditions
    if (where) {
      if (where.role) {
        results = results.filter(u => u.role === where.role);
      }
      if (where.email) {
        if (where.email.contains) {
          const searchTerm = where.email.contains.toLowerCase();
          results = results.filter(u => u.email?.toLowerCase().includes(searchTerm));
        } else {
          results = results.filter(u => u.email === where.email);
        }
      }
      if (where.OR) {
        // Handle OR conditions for search
        const orResults = new Set();
        where.OR.forEach((condition: any) => {
          if (condition.name?.contains) {
            const searchTerm = condition.name.contains.toLowerCase();
            demoDb.users.filter(u => u.name?.toLowerCase().includes(searchTerm)).forEach(u => orResults.add(u));
          }
          if (condition.email?.contains) {
            const searchTerm = condition.email.contains.toLowerCase();
            demoDb.users.filter(u => u.email?.toLowerCase().includes(searchTerm)).forEach(u => orResults.add(u));
          }
        });
        results = Array.from(orResults) as User[];
      }
    }
    
    // Apply pagination
    if (options?.skip !== undefined && options?.take !== undefined) {
      results = results.slice(options.skip, options.skip + options.take);
    }
    
    return results;
  }

  static async findUniqueUser(where: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    if (where.id) {
      return demoDb.users.find(u => u.id === where.id) || null;
    }
    if (where.email) {
      return demoDb.users.find(u => u.email === where.email) || null;
    }
    return null;
  }

  static async createUser(data: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const newUser: User = {
      id: generateId('user'),
      email: data.email,
      name: data.name || null,
      password: data.password,
      role: data.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    demoDb.users.push(newUser);
    return newUser;
  }

  static async updateUser(where: any, data: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const index = demoDb.users.findIndex(u => u.id === where.id);
    if (index === -1) return null;
    
    const updatedUser = {
      ...demoDb.users[index],
      ...data,
      updatedAt: new Date(),
    };
    
    demoDb.users[index] = updatedUser;
    return updatedUser;
  }

  static async deleteUser(where: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const index = demoDb.users.findIndex(u => u.id === where.id);
    if (index === -1) return null;
    
    const deletedUser = demoDb.users[index];
    demoDb.users.splice(index, 1);
    return deletedUser;
  }

  static async countUsers(where?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    if (!where) return demoDb.users.length;
    
    let results = [...demoDb.users];
    
    if (where.role) {
      results = results.filter(u => u.role === where.role);
    }
    if (where.OR) {
      const orResults = new Set();
      where.OR.forEach((condition: any) => {
        if (condition.name?.contains) {
          const searchTerm = condition.name.contains.toLowerCase();
          demoDb.users.filter(u => u.name?.toLowerCase().includes(searchTerm)).forEach(u => orResults.add(u));
        }
        if (condition.email?.contains) {
          const searchTerm = condition.email.contains.toLowerCase();
          demoDb.users.filter(u => u.email?.toLowerCase().includes(searchTerm)).forEach(u => orResults.add(u));
        }
      });
      return orResults.size;
    }
    
    return results.length;
  }

  // Policies
  static async findManyPolicies(where?: any, options?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    let results = [...demoDb.policies];
    
    if (where?.status) {
      results = results.filter(p => p.status === where.status);
    }
    if (where?.paymentStatus) {
      results = results.filter(p => (p as any).paymentStatus === where.paymentStatus);
    }
    if (where?.tenantEmail?.contains) {
      const searchTerm = where.tenantEmail.contains.toLowerCase();
      results = results.filter(p => p.tenantEmail.toLowerCase().includes(searchTerm));
    }
    
    // Apply sorting
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    if (options?.skip !== undefined && options?.take !== undefined) {
      results = results.slice(options.skip, options.skip + options.take);
    }
    
    // Add relations if requested
    if (options?.include) {
      results = results.map(policy => {
        const enhanced: any = { ...policy };
        
        if (options.include.initiatedByUser) {
          enhanced.initiatedByUser = demoDb.users.find(u => u.id === policy.initiatedBy) || null;
        }
        if (options.include.reviewedByUser) {
          enhanced.reviewedByUser = policy.reviewedBy ? demoDb.users.find(u => u.id === policy.reviewedBy) || null : null;
        }
        if (options.include.documents) {
          enhanced.documents = demoDb.policyDocuments.filter(d => d.policyId === policy.id);
        }
        if (options.include.activities) {
          enhanced.activities = demoDb.policyActivities
            .filter(a => a.policyId === policy.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        
        return enhanced;
      });
    }
    
    return results;
  }

  static async findUniquePolicy(where: any, options?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    let policy = null;
    
    if (where.id) {
      policy = demoDb.policies.find(p => p.id === where.id) || null;
    }
    if (where.accessToken) {
      policy = demoDb.policies.find(p => p.accessToken === where.accessToken) || null;
    }
    
    if (!policy) return null;
    
    // Add relations if requested
    if (options?.include) {
      const enhanced: any = { ...policy };
      
      if (options.include.initiatedByUser) {
        const user = demoDb.users.find(u => u.id === policy.initiatedBy);
        enhanced.initiatedByUser = user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null;
      }
      if (options.include.reviewedByUser) {
        const user = policy.reviewedBy ? demoDb.users.find(u => u.id === policy.reviewedBy) : null;
        enhanced.reviewedByUser = user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null;
      }
      if (options.include.documents) {
        enhanced.documents = demoDb.policyDocuments
          .filter(d => d.policyId === policy.id)
          .map(doc => ({
            id: doc.id,
            category: doc.category,
            originalName: doc.originalName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
          }))
          .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      }
      if (options.include.activities) {
        enhanced.activities = demoDb.policyActivities
          .filter(a => a.policyId === policy.id)
          .map(activity => ({
            id: activity.id,
            action: activity.action,
            details: activity.details,
            performedBy: activity.performedBy,
            ipAddress: activity.ipAddress,
            createdAt: activity.createdAt,
          }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      
      return enhanced;
    }
    
    return policy;
  }

  static async createPolicy(data: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const newPolicy: Policy = {
      id: generateId('policy'),
      initiatedBy: data.initiatedBy,
      reviewedBy: data.reviewedBy || null,
      reviewedAt: data.reviewedAt || null,
      tenantEmail: data.tenantEmail,
      tenantPhone: data.tenantPhone || null,
      tenantName: data.tenantName || null,
      propertyId: data.propertyId || null,
      propertyAddress: data.propertyAddress || null,
      status: data.status || 'DRAFT',
      currentStep: data.currentStep || 0,
      profileData: data.profileData || null,
      employmentData: data.employmentData || null,
      referencesData: data.referencesData || null,
      documentsData: data.documentsData || null,
      guarantorData: data.guarantorData || null,
      accessToken: data.accessToken,
      tokenExpiry: data.tokenExpiry,
      submittedAt: data.submittedAt || null,
      reviewNotes: data.reviewNotes || null,
      reviewReason: data.reviewReason || null,
      
      // Payment configuration
      packageId: data.packageId || null,
      packageName: data.packageName || null,
      totalPrice: data.totalPrice || 0,
      investigationFee: data.investigationFee || 200,
      tenantPaymentPercent: data.tenantPaymentPercent || 100,
      landlordPaymentPercent: data.landlordPaymentPercent || 0,
      paymentStatus: data.paymentStatus || 'PENDING',
      
      // Lifecycle dates
      investigationStartedAt: data.investigationStartedAt || null,
      investigationCompletedAt: data.investigationCompletedAt || null,
      contractUploadedAt: data.contractUploadedAt || null,
      contractSignedAt: data.contractSignedAt || null,
      policyActivatedAt: data.policyActivatedAt || null,
      contractLength: data.contractLength || 12,
      policyExpiresAt: data.policyExpiresAt || null,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    demoDb.policies.push(newPolicy);
    return newPolicy;
  }

  static async updatePolicy(where: any, data: any, options?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const index = demoDb.policies.findIndex(p => p.id === where.id);
    if (index === -1) return null;
    
    const updatedPolicy = {
      ...demoDb.policies[index],
      ...data,
      updatedAt: new Date(),
    };
    
    demoDb.policies[index] = updatedPolicy;
    
    // Add relations if requested
    if (options?.include) {
      const enhanced: any = { ...updatedPolicy };
      
      if (options.include.initiatedByUser) {
        const user = demoDb.users.find(u => u.id === updatedPolicy.initiatedBy);
        enhanced.initiatedByUser = user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null;
      }
      if (options.include.reviewedByUser) {
        const user = updatedPolicy.reviewedBy ? demoDb.users.find(u => u.id === updatedPolicy.reviewedBy) : null;
        enhanced.reviewedByUser = user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null;
      }
      
      return enhanced;
    }
    
    return updatedPolicy;
  }

  static async countPolicies(where?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    if (!where) return demoDb.policies.length;
    
    let results = [...demoDb.policies];
    
    if (where.status) {
      results = results.filter(p => p.status === where.status);
    }
    if (where.paymentStatus) {
      results = results.filter(p => (p as any).paymentStatus === where.paymentStatus);
    }
    if (where.tenantEmail?.contains) {
      const searchTerm = where.tenantEmail.contains.toLowerCase();
      results = results.filter(p => p.tenantEmail.toLowerCase().includes(searchTerm));
    }
    
    return results.length;
  }

  // Packages
  static async findManyPackages() {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    return [...demoDb.packages];
  }

  // Policy Documents
  static async findFirstPolicyDocument(where: any, options?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const doc = demoDb.policyDocuments.find(d => 
      d.id === where.id && d.policyId === where.policyId
    );
    
    if (!doc) return null;
    
    if (options?.include?.policy) {
      const policy = demoDb.policies.find(p => p.id === doc.policyId);
      return {
        ...doc,
        policy: policy ? {
          id: policy.id,
          tenantEmail: policy.tenantEmail,
        } : null
      };
    }
    
    return doc;
  }

  // Policy Activities
  static async createPolicyActivity(data: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    const newActivity = {
      id: generateId('activity'),
      policyId: data.policyId,
      action: data.action,
      details: data.details || null,
      performedBy: data.performedBy,
      ipAddress: data.ipAddress || null,
      createdAt: new Date(),
    };
    
    demoDb.policyActivities.push(newActivity);
    return newActivity;
  }

  static async findManyDocuments(where?: any) {
    if (!useDemoDatabase()) throw new Error('Demo ORM used outside demo mode');
    
    if (!where) return demoDb.policyDocuments;
    
    return demoDb.policyDocuments.filter(doc => {
      for (const [key, value] of Object.entries(where)) {
        if (doc[key as keyof typeof doc] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}