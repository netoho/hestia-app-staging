import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('References Step - PUT /api/tenant/[token]/step/3', () => {
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

  it('should save step 3 references data', async () => {
    const stepData = {
      personalReferenceName: 'John Doe',
      personalReferencePhone: '+1234567890',
      workReferenceName: 'Jane Smith',
      workReferencePhone: '+1234567891'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/3', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '3'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify references were saved in structured model
    const referencesData = await TestDatabase.prisma.tenantReferences.findUnique({
      where: { policyId: testData.testPolicy.id }
    })
    expect(referencesData?.personalReferenceName).toBe(stepData.personalReferenceName)
    expect(referencesData?.personalReferencePhone).toBe(stepData.personalReferencePhone)
    expect(referencesData?.workReferenceName).toBe(stepData.workReferenceName)
    expect(referencesData?.workReferencePhone).toBe(stepData.workReferencePhone)
  })

  it('should fail with missing personal reference name', async () => {
    const stepData = {
      personalReferencePhone: '+1234567890',
      workReferenceName: 'Jane Smith',
      workReferencePhone: '+1234567891'
      // Missing personalReferenceName
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/3', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '3'
      }) 
    })

    expect(response.status).not.toBe(200)
  })

  it('should accept valid references data with work references', async () => {
    const stepData = {
      personalReferenceName: 'John Doe',
      personalReferencePhone: '+1234567890',
      workReferenceName: 'Jane Smith',
      workReferencePhone: '+1234567891'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/3', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '3'
      }) 
    })

    expect(response.status).toBe(200)
  })

  it('should fail with empty personal reference name', async () => {
    const stepData = {
      personalReferenceName: '', // Empty name should fail
      personalReferencePhone: '+1234567890'
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/3', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '3'
      }) 
    })

    expect(response.status).not.toBe(200)
  })
})