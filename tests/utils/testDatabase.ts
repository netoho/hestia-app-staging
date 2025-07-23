import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Create a separate Prisma client for tests
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

export class TestDatabase {
  static prisma = testPrisma

  /**
   * Clean all tables in the correct order (respecting foreign keys)
   */
  static async cleanDatabase() {
    try {
      const tablenames = await testPrisma.$queryRaw<
        Array<{ tablename: string }>
      >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')

      if (tables.length === 0) {
        console.log('No tables to clean')
        return
      }

      // TRUNCATE each table individually to avoid CASCADE issues
      for (const table of tables) {
        try {
          await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
        } catch (error) {
          console.log(`Failed to truncate ${table}:`, error)
        }
      }
    } catch (error) {
      console.log('Error cleaning database:', error)
    }
  }

  /**
   * Create a test user
   */
  static async createTestUser(overrides = {}) {
    const hashedPassword = await bcrypt.hash('testpassword123', 10)
    
    return await testPrisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'staff',
        ...overrides
      }
    })
  }

  /**
   * Create a test admin user
   */
  static async createTestAdmin() {
    return await this.createTestUser({
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin'
    })
  }

  /**
   * Create a test policy
   */
  static async createTestPolicy(userId: string, overrides = {}) {
    return await testPrisma.policy.create({
      data: {
        initiatedBy: userId,
        tenantEmail: 'tenant@test.com',
        tenantPhone: '+1234567890',
        status: 'DRAFT',
        currentStep: 1,
        packageId: 'test-package',
        packageName: 'Test Package',
        totalPrice: 1000,
        investigationFee: 200,
        tenantPaymentPercent: 100,
        landlordPaymentPercent: 0,
        contractLength: 12,
        accessToken: 'test-access-token',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ...overrides
      }
    })
  }

  /**
   * Create a test package
   */
  static async createTestPackage(overrides = {}) {
    return await testPrisma.package.create({
      data: {
        id: 'test-package',
        name: 'Test Package',
        price: 1000,
        description: 'Test package description',
        features: JSON.stringify(['Feature 1', 'Feature 2']),
        ctaText: 'Get Started',
        ctaLink: '/test',
        highlight: false,
        ...overrides
      }
    })
  }

  /**
   * Seed basic test data
   */
  static async seedTestData() {
    // Create test admin user
    const admin = await this.createTestAdmin()
    
    // Create test package
    const testPackage = await this.createTestPackage()
    
    // Create test policy
    const policy = await this.createTestPolicy(admin.id)
    
    return {
      admin,
      testPackage,
      policy
    }
  }

  /**
   * Disconnect from database
   */
  static async disconnect() {
    await testPrisma.$disconnect()
  }
}

export { testPrisma }
