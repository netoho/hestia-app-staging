import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Employment Step - PUT /api/tenant/[token]/step/2', () => {
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

  it('should save step 2 employment data', async () => {
    const stepData = {
      employmentStatus: 'employed',
      industry: 'technology',
      occupation: 'software-engineer',
      companyName: 'Tech Corp',
      position: 'Senior Developer',
      incomeSource: 'salary',
      monthlyIncome: 50000,
      creditCheckConsent: true
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/2', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '2'
      }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify data was saved in structured model
    const employmentData = await TestDatabase.prisma.tenantEmployment.findUnique({
      where: { policyId: testData.testPolicy.id }
    })
    expect(employmentData?.employmentStatus).toBe(stepData.employmentStatus)
    expect(employmentData?.industry).toBe(stepData.industry)
    expect(employmentData?.companyName).toBe(stepData.companyName)
    expect(employmentData?.monthlyIncome).toBe(stepData.monthlyIncome)
  })

  it('should fail with invalid employment status', async () => {
    const stepData = {
      employmentStatus: 'invalid-status',
      industry: 'technology',
      occupation: 'software-engineer',
      companyName: 'Tech Corp',
      position: 'Senior Developer',
      incomeSource: 'salary',
      monthlyIncome: 50000,
      creditCheckConsent: true
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/2', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '2'
      }) 
    })

    expect(response.status).not.toBe(200)
  })

  it('should fail with missing credit check consent', async () => {
    const stepData = {
      employmentStatus: 'employed',
      industry: 'technology',
      occupation: 'software-engineer',
      companyName: 'Tech Corp',
      position: 'Senior Developer',
      incomeSource: 'salary',
      monthlyIncome: 50000
      // Missing creditCheckConsent
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/2', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '2'
      }) 
    })

    expect(response.status).not.toBe(200)
  })

  it('should fail with negative monthly income', async () => {
    const stepData = {
      employmentStatus: 'employed',
      industry: 'technology',
      occupation: 'software-engineer',
      companyName: 'Tech Corp',
      position: 'Senior Developer',
      incomeSource: 'salary',
      monthlyIncome: -1000, // Invalid negative income
      creditCheckConsent: true
    }

    const request = new Request('http://localhost:3000/api/tenant/test/step/2', {
      method: 'PUT',
      body: JSON.stringify(stepData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testData.testPolicy.accessToken,
        step: '2'
      }) 
    })

    expect(response.status).not.toBe(200)
  })
})