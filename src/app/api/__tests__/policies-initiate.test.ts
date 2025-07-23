import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { POST } from '../policies/initiate/route'
import { TestDatabase } from '../../../../tests/utils/testDatabase'
import { verifyAuth } from '@/lib/auth'
import { sendPolicyInvitation } from '@/lib/services/emailService'

// Mock authentication
vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn()
}))

// Mock email service  
vi.mock('@/lib/services/emailService', () => ({
  sendPolicyInvitation: vi.fn()
}))

// Mock fetch for packages API
const mockFetch = vi.fn()
global.fetch = mockFetch

// Get mocked functions
const mockedVerifyAuth = verifyAuth as any
const mockedSendPolicyInvitation = sendPolicyInvitation as any

describe('/api/policies/initiate', () => {
  let testUser: any
  let testPackage: any

  beforeEach(async () => {
    // Clean database before each test
    await TestDatabase.cleanDatabase()
    
    // Seed test data
    const data = await TestDatabase.seedTestData()
    testUser = data.admin
    testPackage = data.testPackage

    // Setup mocks
    mockedVerifyAuth.mockResolvedValue({
      success: true,
      user: {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        name: testUser.name
      }
    })

    mockedSendPolicyInvitation.mockResolvedValue(true)

    // Mock packages API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([testPackage])
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  describe('POST /api/policies/initiate', () => {
    it('should create a new policy successfully', async () => {
      const requestBody = {
        tenantEmail: 'tenant@example.com',
        tenantPhone: '+1234567890', 
        tenantName: 'John Tenant',
        propertyId: 'prop-123',
        propertyAddress: '123 Test Street',
        packageId: testPackage.id,
        price: 1500,
        investigationFee: 300,
        tenantPaymentPercent: 70,
        landlordPaymentPercent: 30,
        contractLength: 24
      }

      // Create NextRequest
      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.policy).toBeDefined()
      expect(data.policy.tenantEmail).toBe(requestBody.tenantEmail)
      expect(data.policy.status).toBe('INVESTIGATION_PENDING')
      expect(data.emailSent).toBe(true)

      // Verify policy was created in database
      const createdPolicy = await TestDatabase.prisma.policy.findUnique({
        where: { id: data.policy.id }
      })

      expect(createdPolicy).toBeDefined()
      expect(createdPolicy?.totalPrice).toBe(requestBody.price)
      expect(createdPolicy?.investigationFee).toBe(requestBody.investigationFee)
      expect(createdPolicy?.tenantPaymentPercent).toBe(requestBody.tenantPaymentPercent)
      expect(createdPolicy?.landlordPaymentPercent).toBe(requestBody.landlordPaymentPercent)
      expect(createdPolicy?.contractLength).toBe(requestBody.contractLength)
    })

    it('should fail with invalid payment percentages', async () => {
      const requestBody = {
        tenantEmail: 'tenant@example.com',
        packageId: testPackage.id,
        price: 1500,
        tenantPaymentPercent: 60,
        landlordPaymentPercent: 30, // Should be 40 to total 100%
      }

      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should fail with invalid email', async () => {
      const requestBody = {
        tenantEmail: 'invalid-email',
        packageId: testPackage.id,
        price: 1500,
      }

      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should fail with missing required fields', async () => {
      const requestBody = {
        // Missing tenantEmail and packageId
        price: 1500,
      }

      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should fail when user lacks permissions', async () => {
      // Mock unauthorized user
      mockedVerifyAuth.mockResolvedValue({
        success: true,
        user: {
          id: testUser.id,
          email: testUser.email,
          role: 'renter', // Not staff or admin
          name: testUser.name
        }
      })

      const requestBody = {
        tenantEmail: 'tenant@example.com',
        packageId: testPackage.id,
        price: 1500,
      }

      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('should fail when authentication fails', async () => {
      // Mock authentication failure
      mockedVerifyAuth.mockResolvedValue({
        success: false
      })

      const requestBody = {
        tenantEmail: 'tenant@example.com',
        packageId: testPackage.id,
        price: 1500,
      }

      const nextRequest = new Request('http://localhost:3000/api/policies/initiate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(nextRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})