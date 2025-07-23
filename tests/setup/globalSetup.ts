import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

export default async function setup() {
  console.log('🗃️  Setting up test database...')
  
  // Load environment variables first
  dotenv.config({ path: '.env.test' })
  
  // Set test environment
  process.env.NODE_ENV = 'test'
  
  // Ensure we have the test database URL
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL environment variable is required')
  }
  
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  
  try {
    // First, generate the Prisma client with the test URL
    console.log('🔄 Generating Prisma client for test database...')
    execSync('npx prisma generate', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      }
    })
    
    // Push schema directly to database instead of using migrations  
    console.log('📦 Pushing schema to test database...')
    execSync('npx prisma db push --force-reset', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      }
    })
    
    // Verify database setup by checking if tables exist
    console.log('🔍 Verifying database setup...')
    
    // Create a new Prisma client specifically for the test database
    // We need to override the environment variable temporarily
    const originalUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    
    const testPrisma = new PrismaClient()
    
    try {
      // Test if User table exists
      await testPrisma.user.findMany({ take: 0 })
    } finally {
      await testPrisma.$disconnect()
      // Restore original DATABASE_URL
      process.env.DATABASE_URL = originalUrl
    }
    
    console.log('✅ Test database setup complete!')
    
  } catch (error: any) {
    console.error('❌ Test database setup failed:', error.message)
    if (error.stdout) console.error('STDOUT:', error.stdout.toString())
    if (error.stderr) console.error('STDERR:', error.stderr.toString())
    throw error
  }
}