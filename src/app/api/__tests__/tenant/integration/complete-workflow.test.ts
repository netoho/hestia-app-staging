import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { GET as getTenantPolicy } from '../../../tenant/[token]/route'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { POST as submitTenantPolicy } from '../../../tenant/[token]/submit/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, type TestPolicySetup } from '../test-utils'

describe('Integration - Complete Tenant Workflow', () => {
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

  it('should complete entire tenant workflow from start to submission', async () => {
    const token = testData.testPolicy.accessToken

    // Step 1: Get initial policy data
    let request = new Request(`http://localhost:3000/api/tenant/${token}`)
    let response = await getTenantPolicy(request, { 
      params: Promise.resolve({ token }) 
    })
    expect(response.status).toBe(200)

    // Step 2: Complete profile step
    const profileData = {
      nationality: 'MEXICAN', // uppercase as per new enum
      curp: 'ABCD123456HDFRLL01'
    }
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/1`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '1' }) 
    })
    expect(response.status).toBe(200)

    // Step 3: Complete employment step  
    const employmentData = {
      employmentStatus: 'employed',
      industry: 'Technology',
      occupation: 'software-engineer',
      companyName: 'Tech Corp',
      position: 'Software Engineer',
      incomeSource: 'payroll',
      monthlyIncome: 50000,
      creditCheckConsent: true
    }
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/2`, {
      method: 'PUT',
      body: JSON.stringify(employmentData),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '2' }) 
    })
    expect(response.status).toBe(200)

    // Step 4: Complete references step
    const referencesData = {
      personalReferenceName: 'John Doe',
      personalReferencePhone: '+1234567890',
      workReferenceName: 'Jane Smith',
      workReferencePhone: '+1234567891'
    }
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/3`, {
      method: 'PUT',
      body: JSON.stringify(referencesData),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '3' }) 
    })
    expect(response.status).toBe(200)

    // Step 4: Complete documents step
    const documentsData = {
      identificationCount: 1,
      incomeCount: 2,
      optionalCount: 0,
      incomeDocsHavePassword: 'NO'
    }
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/4`, {
      method: 'PUT',
      body: JSON.stringify(documentsData),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '4' }) 
    })
    expect(response.status).toBe(200)

    // Step 5: Complete guarantor step
    const guarantorData = {
      name: 'John Guarantor',
      phone: '+1234567890',
      relationship: 'parent'
    }
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/5`, {
      method: 'PUT',
      body: JSON.stringify(guarantorData),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '5' }) 
    })
    expect(response.status).toBe(200)

    // Step 6: Upload document - SKIPPED due to FormData issues in test env
    // TODO: Fix FormData handling in test environment
    /*
    const mockFile = new File(['test content'], 'id-document.pdf', {
      type: 'application/pdf'
    })
    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('category', 'identification')
    
    request = new Request(`http://localhost:3000/api/tenant/${token}/upload`, {
      method: 'POST',
      body: formData
    })
    response = await uploadDocument(request, { 
      params: Promise.resolve({ token }) 
    })
    expect(response.status).toBe(200)
    */

    // Step 7: Mark payment as completed and advance to final step
    await TestDatabase.prisma.policy.update({
      where: { id: testData.testPolicy.id },
      data: { 
        paymentStatus: 'COMPLETED',
        currentStep: 7
      }
    })
    
    // Add mock documents for validation
    await TestDatabase.prisma.policyDocument.createMany({
      data: [
        {
          policyId: testData.testPolicy.id,
          category: 'identification',
          fileName: 'test-id.pdf',
          originalName: 'id.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          storageUrl: 'mock://test-id.pdf',
          uploadedBy: 'tenant'
        },
        {
          policyId: testData.testPolicy.id,
          category: 'income',
          fileName: 'test-income.pdf',
          originalName: 'income.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          storageUrl: 'mock://test-income.pdf',
          uploadedBy: 'tenant'
        }
      ]
    })

    // Step 8: Submit policy
    request = new Request(`http://localhost:3000/api/tenant/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token }) 
    })
    expect(response.status).toBe(200)

    // Verify final state
    const finalPolicy = await TestDatabase.prisma.policy.findUnique({
      where: { id: testData.testPolicy.id },
      include: {
        profileData: true,
        employmentData: true,
        referencesData: true,
        documentsData: true,
        guarantorData: true
      }
    })
    expect(finalPolicy?.status).toBe('CONTRACT_PENDING')
    expect(finalPolicy?.profileData?.nationality).toBe('MEXICAN')
    expect(finalPolicy?.employmentData?.position).toBe('Software Engineer')
    expect(finalPolicy?.referencesData?.personalReferenceName).toBe('John Doe')
    expect(finalPolicy?.documentsData?.identificationCount).toBe(1)
    expect(finalPolicy?.guarantorData?.name).toBe('John Guarantor')
    expect(finalPolicy?.paymentStatus).toBe('COMPLETED')
  })

  it('should handle step progression correctly', async () => {
    const token = testData.testPolicy.accessToken

    // Get initial state
    let request = new Request(`http://localhost:3000/api/tenant/${token}`)
    let response = await getTenantPolicy(request, { 
      params: Promise.resolve({ token }) 
    })
    let data = await response.json()
    const initialStep = data.currentStep

    // Complete profile step
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/1`, {
      method: 'PUT',
      body: JSON.stringify({ nationality: 'MEXICAN', curp: 'ABCD123456HDFRLL01' }),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '1' }) 
    })
    data = await response.json()
    expect(data.currentStep).toBeGreaterThan(initialStep)

    // Complete employment step
    request = new Request(`http://localhost:3000/api/tenant/${token}/step/2`, {
      method: 'PUT',
      body: JSON.stringify({
        employmentStatus: 'employed',
        industry: 'technology',
        occupation: 'software-engineer',
        companyName: 'Tech Corp',
        position: 'Senior Developer',
        incomeSource: 'payroll',
        monthlyIncome: 50000,
        creditCheckConsent: true
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    response = await updateTenantStep(request, { 
      params: Promise.resolve({ token, step: '2' }) 
    })
    data = await response.json()
    expect(data.currentStep).toBeGreaterThanOrEqual(2)

    // Verify data persistence across steps
    const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
      where: { id: testData.testPolicy.id },
      include: {
        profileData: true,
        employmentData: true
      }
    })
    expect(updatedPolicy?.profileData).toMatchObject({ nationality: 'MEXICAN' })
    expect(updatedPolicy?.employmentData).toMatchObject({ companyName: 'Tech Corp' })
  })

  it('should maintain data integrity throughout workflow', async () => {
    const token = testData.testPolicy.accessToken
    
    // Save data to each step
    const steps = [
      {
        step: 1,
        data: { nationality: 'MEXICAN', curp: 'ABCD123456HDFRLL01' }
      },
      {
        step: 2,
        data: {
          employmentStatus: 'employed',
          industry: 'technology',
          occupation: 'software-engineer',
          companyName: 'Tech Corp',
          position: 'Senior Developer',
          incomeSource: 'payroll',
          monthlyIncome: 75000,
          creditCheckConsent: true
        }
      },
      {
        step: 3,
        data: {
          personalReferenceName: 'Alice Johnson',
          personalReferencePhone: '+1234567890',
          workReferenceName: 'Bob Smith',
          workReferencePhone: '+1234567891'
        }
      }
    ]

    // Complete all steps
    for (const { step, data } of steps) {
      const request = new Request(`http://localhost:3000/api/tenant/${token}/step/${step}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      })
      const response = await updateTenantStep(request, { 
        params: Promise.resolve({ token, step: step.toString() }) 
      })
      expect(response.status).toBe(200)
    }

    // Verify all data is still intact
    const finalPolicy = await TestDatabase.prisma.policy.findUnique({
      where: { id: testData.testPolicy.id },
      include: {
        profileData: true,
        employmentData: true,
        referencesData: true
      }
    })

    expect(finalPolicy?.profileData).toMatchObject(steps[0].data)
    expect(finalPolicy?.employmentData).toMatchObject(steps[1].data)
    expect(finalPolicy?.referencesData).toMatchObject(steps[2].data)
  })
})