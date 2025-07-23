import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { POST as uploadDocument } from '../../../tenant/[token]/upload/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupTestData, setupMocks, mockedUploadFile, type TestPolicySetup } from '../test-utils'

describe.skip('Document Upload - POST /api/tenant/[token]/upload', () => {
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

  // TODO: Fix FormData handling in test environment
  it('should upload document successfully', async () => {
    // Update mock to match expected parameters
    mockedUploadFile.mockResolvedValue({
      id: 'test-doc-id',
      category: 'identification',
      originalName: 'test-document.pdf',
      fileSize: 1024,
      uploadedAt: new Date()
    })

    // Mock the validateFile function to avoid file validation issues
    vi.mock('@/lib/services/fileUploadService', async () => {
      const actual = await vi.importActual('@/lib/services/fileUploadService')
      return {
        ...actual,
        uploadFile: vi.fn(),
        deleteFile: vi.fn(),
        listFiles: vi.fn(),
        validateFile: vi.fn().mockReturnValue({ valid: true })
      }
    })

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
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.document).toBeDefined()
    expect(data.document.originalName).toBe('test-document.pdf')
    expect(mockedUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: testData.testPolicy.id,
        category: 'identification',
        file: expect.objectContaining({
          originalName: 'test-document.pdf',
          mimeType: 'application/pdf'
        }),
        uploadedBy: 'tenant'
      })
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
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
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
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No file provided')
  })

  it('should fail with invalid category', async () => {
    const mockFile = new File(['test content'], 'test-document.pdf', {
      type: 'application/pdf'
    })

    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('category', 'invalid-category')

    const request = new Request('http://localhost:3000/api/tenant/test/upload', {
      method: 'POST',
      body: formData
    })

    const response = await uploadDocument(request, { 
      params: Promise.resolve({ token: testData.testPolicy.accessToken }) 
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid category')
  })
})