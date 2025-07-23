import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Step Validation - PUT /api/tenant/[token]/step/[step]', () => {
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

  it('should fail with invalid step number', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test/step/10', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '10'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid step number')
  })

  it('should fail with invalid token', async () => {
    const request = new Request('http://localhost:3000/api/tenant/invalid/step/1', {
      method: 'PUT',
      body: JSON.stringify({ nationality: 'mexican' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: 'invalid-token',
        step: '1'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid or expired token')
  })

  it('should fail with step number zero', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test/step/0', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '0'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid step number')
  })

  it('should fail with negative step number', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test/step/-1', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '-1'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid step number')
  })

  it('should fail with non-numeric step', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test/step/abc', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: 'abc'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid step number')
  })

  it('should fail with expired token on step update', async () => {
    // Create policy with expired token
    const expiredPolicy = await TestDatabase.createTestPolicy(testData.testUser.id, {
      accessToken: 'expired-step-token',
      tokenExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    })

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify({ nationality: 'mexican' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: 'expired-step-token',
        step: '1'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid or expired token')
  })
})