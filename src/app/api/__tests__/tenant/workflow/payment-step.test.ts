import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Guarantor Step - PUT /api/tenant/[token]/step/5', () => {
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

  it('should save guarantor data (step 5)', async () => {
    const stepData = {
      name: 'John Guarantor',
      phone: '+1234567890',
      email: 'guarantor@example.com',
      relationship: 'parent',
      address: '123 Guarantor St'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/5', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '5'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.currentStep).toBeGreaterThanOrEqual(6)

    // Verify guarantor data was saved
    const guarantorData = await TestDatabase.prisma.tenantGuarantor.findUnique({
      where: { policyId: testData.testPolicy.id }
    })
    expect(guarantorData?.name).toBe(stepData.name)
    expect(guarantorData?.phone).toBe(stepData.phone)
    expect(guarantorData?.relationship).toBe(stepData.relationship)
  })

  it('should fail with missing guarantor name', async () => {
    const stepData = {
      phone: '+1234567890',
      relationship: 'parent'
      // Missing name
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/5', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '5'
      }) 
    })

    expect(response.status).not.toBe(200)
  })

  it('should fail with missing guarantor phone', async () => {
    const stepData = {
      name: 'John Guarantor',
      relationship: 'parent'
      // Missing phone
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/5', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '5'
      }) 
    })

    expect(response.status).not.toBe(200)
  })
})