import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { GET as getTenantPolicy } from '../../../tenant/[token]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Token Validation - GET /api/tenant/[token]', () => {
  let testData: TestPolicySetup

  beforeEach(async () => {
    testData = await setupTestData()
    setupMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  it('should get policy details with valid token', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test-access-token')
    
    const response = await getTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe(testData.testPolicy.id)
    expect(data.tenantEmail).toBe(testData.testPolicy.tenantEmail)
    expect(data.currentStep).toBeDefined()
    expect(data.status).toBe('INVESTIGATION_PENDING')
  })

  it('should fail with invalid token', async () => {
    const request = new Request('http://localhost:3000/api/tenant/invalid-token')
    
    const response = await getTenantPolicy(request, { 
      params: Promise.resolve({ token: 'invalid-token' }) 
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid or expired token')
  })

  it('should fail with expired token', async () => {
    // Create policy with expired token
    const expiredPolicy = await TestDatabase.createTestPolicy(testData.testUser.id, {
      accessToken: 'expired-token',
      tokenExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    })

    const request = new Request('http://localhost:3000/api/tenant/expired-token')
    
    const response = await getTenantPolicy(request, { 
      params: Promise.resolve({ token: 'expired-token' }) 
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid or expired token')
  })
})