import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { GET as getTenantPolicy } from '../tenant/[token]/route'
import { PUT as updateTenantStep } from '../tenant/[token]/step/[step]/route'
import { POST as submitTenantPolicy } from '../tenant/[token]/submit/route'
import { POST as uploadDocument } from '../tenant/[token]/upload/route'
import { TestDatabase } from '../../../../tests/utils/testDatabase'

// Mock file upload service
vi.mock('@/lib/services/fileUploadService', () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn()
}))

// Mock email service
vi.mock('@/lib/services/emailService', () => ({
  sendApplicationSubmitted: vi.fn()
}))

// Mock payment service  
vi.mock('@/lib/services/paymentService', () => ({
  createPayment: vi.fn(),
  getPaymentStatus: vi.fn()
}))

import { uploadFile } from '@/lib/services/fileUploadService'
import { sendApplicationSubmitted } from '@/lib/services/emailService' 
import { createPayment, getPaymentStatus } from '@/lib/services/paymentService'

const mockedUploadFile = uploadFile as any
const mockedSendApplicationSubmitted = sendApplicationSubmitted as any
const mockedCreatePayment = createPayment as any
const mockedGetPaymentStatus = getPaymentStatus as any

describe('Tenant Workflow API Tests', () => {
  let testPolicy: any
  let testUser: any

  beforeEach(async () => {
    // Clean database and seed test data
    await TestDatabase.cleanDatabase()
    const data = await TestDatabase.seedTestData()
    testUser = data.admin
    testPolicy = data.policy

    // Set policy to INVESTIGATION_PENDING so step API works
    await TestDatabase.prisma.policy.update({
      where: { id: testPolicy.id },
      data: { status: 'INVESTIGATION_PENDING' }
    })

    // Setup mocks
    mockedUploadFile.mockResolvedValue({
      id: 'test-doc-id',
      fileName: 'test-document.pdf',
      fileUrl: 'https://example.com/test-document.pdf',
      fileSize: 1024,
      fileType: 'application/pdf'
    })

    mockedSendApplicationSubmitted.mockResolvedValue(true)
    
    mockedCreatePayment.mockResolvedValue({
      id: 'test-payment-id',
      stripeCheckoutUrl: 'https://checkout.stripe.com/test',
      status: 'PENDING'
    })

    mockedGetPaymentStatus.mockResolvedValue({
      status: 'COMPLETED',
      paymentMethod: 'card'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  describe('GET /api/tenant/[token]', () => {
    it('should get policy details with valid token', async () => {
      const request = new Request('http://localhost:3000/api/tenant/test-access-token')
      
      const response = await getTenantPolicy(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(testPolicy.id)
      expect(data.tenantEmail).toBe(testPolicy.tenantEmail)
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
      const expiredPolicy = await TestDatabase.createTestPolicy(testUser.id, {
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

  describe('PUT /api/tenant/[token]/step/[step]', () => {
    it('should save step 1 profile data', async () => {
      const stepData = {
        nationality: 'mexican',
        curp: 'ABCD123456HDFRLL01'
      }

      const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
        method: 'PUT',
        body: JSON.stringify(stepData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await updateTenantStep(request, { 
        params: Promise.resolve({ 
          token: testPolicy.accessToken,
          step: '1'
        }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentStep).toBeGreaterThanOrEqual(2)

      // Verify data was saved in database
      const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
        where: { id: testPolicy.id }
      })
      expect(updatedPolicy?.profileData).toEqual(stepData)
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
          token: testPolicy.accessToken,
          step: '2'
        }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify data was saved
      const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
        where: { id: testPolicy.id }
      })
      expect(updatedPolicy?.employmentData).toEqual(stepData)
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
          token: testPolicy.accessToken,
          step: '3'
        }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify references were saved
      const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
        where: { id: testPolicy.id }
      })
      expect(updatedPolicy?.referencesData).toEqual(stepData)
    })

    it('should advance to payment step (step 5)', async () => {
      const request = new Request('http://localhost:3000/api/tenant/test/step/5', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await updateTenantStep(request, { 
        params: Promise.resolve({ 
          token: testPolicy.accessToken,
          step: '5'
        }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentStep).toBeGreaterThanOrEqual(5)
    })

    it('should fail with invalid step number', async () => {
      const request = new Request('http://localhost:3000/api/tenant/test/step/10', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await updateTenantStep(request, { 
        params: Promise.resolve({ 
          token: testPolicy.accessToken,
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
  })

  describe('POST /api/tenant/[token]/upload', () => {
    it('should upload document successfully', async () => {
      // Create a mock file
      const mockFile = new File(['test content'], 'test-document.pdf', {
        type: 'application/pdf'
      })

      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('category', 'identification')

      const request = new Request('http://localhost:3000/api/tenant/test/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadDocument(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.document).toBeDefined()
      expect(data.document.fileName).toBe('test-document.pdf')
      expect(mockedUploadFile).toHaveBeenCalledWith(
        expect.any(File),
        expect.stringContaining('policies'),
        'identification'
      )
    })

    it('should fail with invalid file type', async () => {
      const mockFile = new File(['test content'], 'test-document.exe', {
        type: 'application/exe'
      })

      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('category', 'identification')

      const request = new Request('http://localhost:3000/api/tenant/test/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadDocument(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    it('should fail with missing file', async () => {
      const formData = new FormData()
      formData.append('category', 'identification')

      const request = new Request('http://localhost:3000/api/tenant/test/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadDocument(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No file provided')
    })
  })

  describe('POST /api/tenant/[token]/submit', () => {
    beforeEach(async () => {
      // Set up policy with completed steps and payment
      await TestDatabase.prisma.policy.update({
        where: { id: testPolicy.id },
        data: {
          currentStep: 6,
          paymentStatus: 'COMPLETED',
          profileNationality: 'Mexican',
          employmentJobTitle: 'Engineer',
          referencesPersonalName: 'John Doe'
        }
      })
    })

    it('should submit policy successfully', async () => {
      const request = new Request('http://localhost:3000/api/tenant/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await submitTenantPolicy(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('submitted successfully')

      // Verify policy status was updated
      const updatedPolicy = await TestDatabase.prisma.policy.findUnique({
        where: { id: testPolicy.id }
      })
      expect(updatedPolicy?.status).toBe('SUBMITTED')
      expect(mockedSendApplicationSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmail: testPolicy.tenantEmail
        })
      )
    })

    it('should fail if payment not completed', async () => {
      // Set payment as pending
      await TestDatabase.prisma.policy.update({
        where: { id: testPolicy.id },
        data: { paymentStatus: 'PENDING' }
      })

      const request = new Request('http://localhost:3000/api/tenant/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await submitTenantPolicy(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('payment')
    })

    it('should fail if required steps not completed', async () => {
      // Set current step to 2 (incomplete)
      await TestDatabase.prisma.policy.update({
        where: { id: testPolicy.id },
        data: { 
          currentStep: 2,
          profileNationality: null // Missing required data
        }
      })

      const request = new Request('http://localhost:3000/api/tenant/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await submitTenantPolicy(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('incomplete')
    })

    it('should fail if policy already submitted', async () => {
      // Mark policy as already submitted
      await TestDatabase.prisma.policy.update({
        where: { id: testPolicy.id },
        data: { status: 'SUBMITTED' }
      })

      const request = new Request('http://localhost:3000/api/tenant/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await submitTenantPolicy(request, { 
        params: Promise.resolve({ token: testPolicy.accessToken }) 
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already submitted')
    })
  })

  describe('Integration - Complete Tenant Workflow', () => {
    it('should complete entire tenant workflow from start to submission', async () => {
      const token = testPolicy.accessToken

      // Step 1: Get initial policy data
      let request = new Request(`http://localhost:3000/api/tenant/${token}`)
      let response = await getTenantPolicy(request, { 
        params: Promise.resolve({ token }) 
      })
      expect(response.status).toBe(200)

      // Step 2: Complete profile step
      const profileData = {
        nationality: 'Mexican',
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
        jobTitle: 'Software Engineer',
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
        personalReference: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          relationship: 'Friend'
        }
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

      // Step 5: Complete payment step (advance to step 5)
      request = new Request(`http://localhost:3000/api/tenant/${token}/step/5`, {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })
      response = await updateTenantStep(request, { 
        params: Promise.resolve({ token, step: '5' }) 
      })
      expect(response.status).toBe(200)

      // Step 6: Upload document
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

      // Step 7: Mark payment as completed and advance to final step
      await TestDatabase.prisma.policy.update({
        where: { id: testPolicy.id },
        data: { 
          paymentStatus: 'COMPLETED',
          currentStep: 6
        }
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
        where: { id: testPolicy.id }
      })
      expect(finalPolicy?.status).toBe('SUBMITTED')
      expect(finalPolicy?.profileNationality).toBe('Mexican')
      expect(finalPolicy?.employmentJobTitle).toBe('Software Engineer')
      expect(finalPolicy?.referencesPersonalName).toBe('John Doe')
      expect(finalPolicy?.paymentStatus).toBe('COMPLETED')
    })
  })
})