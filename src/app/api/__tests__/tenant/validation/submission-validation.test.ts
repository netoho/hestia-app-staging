import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { POST as submitTenantPolicy } from '../../../tenant/[token]/submit/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, mockedSendPolicySubmissionConfirmation, type TestPolicySetup } from '../test-utils'

describe('Submission Validation - POST /api/tenant/[token]/submit', () => {
  let testData: TestPolicySetup

  beforeEach(async () => {
    testData = await setupTestData()
    setupMocks()

    // Set up policy with completed steps and payment for most tests
    await TestDatabase.prisma.policy.update({
      where: { id: testData.testPolicy.id },
      data: {
        currentStep: 7,
        paymentStatus: 'COMPLETED',
        status: 'INVESTIGATION_IN_PROGRESS'
      }
    })

    // Create structured data models
    await TestDatabase.prisma.tenantProfile.create({
      data: {
        policyId: testData.testPolicy.id,
        nationality: 'MEXICAN',
        curp: 'AAAA000000AAAA00'
      }
    })

    await TestDatabase.prisma.tenantEmployment.create({
      data: {
        policyId: testData.testPolicy.id,
        employmentStatus: 'employed',
        industry: 'Technology',
        occupation: 'Software Engineer',
        companyName: 'Tech Corp',
        position: 'Senior Developer',
        incomeSource: 'salary',
        monthlyIncome: 50000,
        creditCheckConsent: true
      }
    })

    await TestDatabase.prisma.tenantReferences.create({
      data: {
        policyId: testData.testPolicy.id,
        personalReferenceName: 'John Doe',
        personalReferencePhone: '+1234567890'
      }
    })

    await TestDatabase.prisma.tenantDocuments.create({
      data: {
        policyId: testData.testPolicy.id,
        identificationCount: 1,
        incomeCount: 2,
        optionalCount: 0,
        incomeDocsHavePassword: 'NO'
      }
    })

    await TestDatabase.prisma.tenantGuarantor.create({
      data: {
        policyId: testData.testPolicy.id,
        name: 'John Guarantor',
        phone: '+1234567890',
        relationship: 'parent'
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  it('should submit policy successfully with all requirements met', async () => {
    // Add mock documents to the policy
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
    
    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()
    
    if (response.status !== 200) {
      console.log('Submit error:', data)
    }

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('submitted successfully')

    // Verify policy status was updated
    const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
      where: { id: testData.testPolicy.id }
    })
    expect(updatedPolicy?.status).toBe('CONTRACT_PENDING')
    expect(mockedSendPolicySubmissionConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantEmail: testData.testPolicy.tenantEmail
      })
    )
  })

  it('should fail if payment not completed', async () => {
    // Set payment status to pending
    await TestDatabase.prisma.policy.update({
      where: { id: testData.testPolicy.id },
      data: { paymentStatus: 'PENDING' }
    })

    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required documents')
    expect(data.missing).toContain('identification')
  })

  it('should fail if required steps not completed', async () => {
    // Set current step to 2 (incomplete) and remove structured data to simulate incomplete policy
    await TestDatabase.prisma.policy.update({
      where: { id: testData.testPolicy.id },
      data: { 
        currentStep: 2
      }
    })

    // Delete structured data to simulate incomplete application
    await TestDatabase.prisma.tenantProfile.deleteMany({
      where: { policyId: testData.testPolicy.id }
    })
    await TestDatabase.prisma.tenantEmployment.deleteMany({
      where: { policyId: testData.testPolicy.id }
    })
    await TestDatabase.prisma.tenantReferences.deleteMany({
      where: { policyId: testData.testPolicy.id }
    })

    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Incomplete application')
  })

  it('should fail if policy already submitted', async () => {
    // Mark policy as already submitted
    await TestDatabase.prisma.policy.update({
      where: { id: testData.testPolicy.id },
      data: { status: 'CONTRACT_PENDING' }
    })

    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Policy must be in progress to submit')
  })

  it('should fail with missing required documents', async () => {
    // Don't add documents, so it will fail with missing documents error
    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required documents')
    expect(data.missing).toContain('identification')
  })

  it('should fail with invalid token', async () => {
    const request = new Request('http://localhost:3000/api/tenant/test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await submitTenantPolicy(request, { 
      params: Promise.resolve({ token: 'invalid-token' }) 
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid or expired token')
  })
})