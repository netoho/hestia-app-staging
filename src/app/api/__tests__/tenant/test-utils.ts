import { vi } from 'vitest'
import { TestDatabase } from '../../../../../tests/utils/testDatabase'

// Mock file upload service
vi.mock('@/lib/services/fileUploadService', () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn(),
  validateFile: vi.fn(() => ({ valid: true })),
  validatePolicyDocuments: vi.fn(() => Promise.resolve({ valid: true, missing: [] }))
}))

// Mock email service
vi.mock('@/lib/services/emailService', () => ({
  sendApplicationSubmitted: vi.fn(),
  sendPolicySubmissionConfirmation: vi.fn()
}))

// Mock payment service  
vi.mock('@/lib/services/paymentService', () => ({
  createPayment: vi.fn(),
  getPaymentStatus: vi.fn()
}))

import { uploadFile, validatePolicyDocuments } from '@/lib/services/fileUploadService'
import { sendApplicationSubmitted, sendPolicySubmissionConfirmation } from '@/lib/services/emailService' 
import { createPayment, getPaymentStatus } from '@/lib/services/paymentService'

export const mockedUploadFile = uploadFile as any
export const mockedSendApplicationSubmitted = sendApplicationSubmitted as any
export const mockedSendPolicySubmissionConfirmation = sendPolicySubmissionConfirmation as any
export const mockedCreatePayment = createPayment as any
export const mockedGetPaymentStatus = getPaymentStatus as any

export interface TestPolicySetup {
  testPolicy: any
  testUser: any
}

export async function setupTestData(): Promise<TestPolicySetup> {
  // Clean database and seed test data
  await TestDatabase.cleanDatabase()
  const data = await TestDatabase.seedTestData()
  const testUser = data.admin
  const testPolicy = data.policy

  // Set policy to INVESTIGATION_PENDING so step API works
  await TestDatabase.prisma.policy.update({
    where: { id: testPolicy.id },
    data: { status: 'INVESTIGATION_PENDING' }
  })

  return { testPolicy, testUser }
}

export function setupMocks() {
  // Setup mocks
  mockedUploadFile.mockResolvedValue({
    id: 'test-doc-id',
    fileName: 'test-document.pdf',
    fileUrl: 'https://example.com/test-document.pdf',
    fileSize: 1024,
    fileType: 'application/pdf'
  })

  mockedSendApplicationSubmitted.mockResolvedValue(true)
  mockedSendPolicySubmissionConfirmation.mockResolvedValue(true)
  
  mockedCreatePayment.mockResolvedValue({
    id: 'test-payment-id',
    stripeCheckoutUrl: 'https://checkout.stripe.com/test',
    status: 'PENDING'
  })

  mockedGetPaymentStatus.mockResolvedValue({
    status: 'COMPLETED',
    paymentMethod: 'card'
  })
}