import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Profile Step - PUT /api/tenant/[token]/step/1', () => {
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

  it('should save step 1 profile data', async () => {
    const stepData = {
      nationality: 'MEXICAN',
      curp: 'ABCD123456HDFRLL01'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '1'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.currentStep).toBeGreaterThanOrEqual(2)

    // Verify data was saved in structured model
    const profileData = await TestDatabase.prisma.tenantProfile.findUnique({
      where: { policyId: testData.testPolicy.id }
    })
    expect(profileData?.nationality).toBe(stepData.nationality)
    expect(profileData?.curp).toBe(stepData.curp)
  })

  it('should fail with invalid nationality', async () => {
    const stepData = {
      nationality: 'invalid-nationality',
      curp: 'ABCD123456HDFRLL01'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '1'
      }) 
    })

    expect(response.status).not.toBe(200)
  })

  it('should fail with missing required fields', async () => {
    const stepData = {
      // Missing nationality - this is required
      curp: 'ABCD123456HDFRLL01'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '1'
      }) 
    })

    expect(response.status).not.toBe(200)
  })
})