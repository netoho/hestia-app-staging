import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { PUT as updateTenantStep } from '../../../tenant/[token]/step/[step]/route'
import { TestDatabase } from '../../../../../../tests/utils/testDatabase'
import { setupMocks } from '../test-utils'

describe('Company Profile Step - PUT /api/tenant/[token]/step/1', () => {
  let testUser: any
  let testPolicy: any

  beforeEach(async () => {
    // Clean database and create test data
    await TestDatabase.cleanDatabase()
    setupMocks()
    
    // Create test admin user
    testUser = await TestDatabase.createTestAdmin()
    
    // Create company policy for testing
    testPolicy = await TestDatabase.createTestPolicy(testUser.id, {
      tenantType: 'company',
      tenantEmail: 'company@test.com',
      companyName: 'Test Company S.A. de C.V.',
      companyRfc: 'TCO890123456',
      legalRepresentativeName: 'Juan Pérez García',
      status: 'INVESTIGATION_PENDING' // Required for step API to work
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  it('should save step 1 company profile data with legal representative', async () => {
    const companyProfileData = {
      legalRepNationality: 'mexican' as const,
      legalRepCurp: 'PEGJ890123HDFRZN01',
      legalRepFullName: 'Juan Pérez García',
      companyTaxAddress: 'Av. Reforma 123, Col. Centro, CDMX, CP 06000',
      companyTaxRegime: '601 - General de Ley Personas Morales'
    };

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(companyProfileData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testPolicy.accessToken,
        step: '1'
      }) 
    })
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.currentStep).toBeGreaterThanOrEqual(2)

    // Verify data was saved to database
    const companyProfile = await TestDatabase.prisma.companyProfile.findUnique({
      where: { policyId: testPolicy.id },
      include: { legalRepresentative: true }
    });

    expect(companyProfile).toBeTruthy();
    expect(companyProfile!.taxAddress).toBe(companyProfileData.companyTaxAddress);
    expect(companyProfile!.taxRegime).toBe(companyProfileData.companyTaxRegime);
    expect(companyProfile!.legalRepresentative).toBeTruthy();
    expect(companyProfile!.legalRepresentative!.fullName).toBe(companyProfileData.legalRepFullName);
    expect(companyProfile!.legalRepresentative!.nationality).toBe('MEXICAN');
    expect(companyProfile!.legalRepresentative!.curp).toBe(companyProfileData.legalRepCurp);
  })

  it('should save foreign legal representative with passport', async () => {
    const companyProfileData = {
      legalRepNationality: 'foreign' as const,
      legalRepPassport: 'A12345678',
      legalRepFullName: 'John Smith',
      companyTaxAddress: 'Av. Americas 456, Col. Centro, GDL, CP 44100',
      companyTaxRegime: '601 - General de Ley Personas Morales'
    };

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(companyProfileData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testPolicy.accessToken,
        step: '1'
      }) 
    })
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify data was saved to database
    const companyProfile = await TestDatabase.prisma.companyProfile.findUnique({
      where: { policyId: testPolicy.id },
      include: { legalRepresentative: true }
    });

    expect(companyProfile).toBeTruthy();
    expect(companyProfile!.legalRepresentative).toBeTruthy();
    expect(companyProfile!.legalRepresentative!.fullName).toBe(companyProfileData.legalRepFullName);
    expect(companyProfile!.legalRepresentative!.nationality).toBe('FOREIGN');
    expect(companyProfile!.legalRepresentative!.passport).toBe(companyProfileData.legalRepPassport);
    expect(companyProfile!.legalRepresentative!.curp).toBeNull();
  })

  it('should fail with missing legal representative name', async () => {
    const invalidData = {
      legalRepNationality: 'mexican' as const,
      legalRepCurp: 'PEGJ890123HDFRZN01',
      companyTaxAddress: 'Av. Reforma 123, Col. Centro, CDMX, CP 06000',
      companyTaxRegime: '601 - General de Ley Personas Morales'
      // Missing legalRepFullName
    };

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(invalidData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testPolicy.accessToken,
        step: '1'
      }) 
    })

    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBe('Invalid data')
    expect(result.details).toBeDefined()
  })

  it('should fail with missing tax address', async () => {
    const invalidData = {
      legalRepNationality: 'mexican' as const,
      legalRepCurp: 'PEGJ890123HDFRZN01',
      legalRepFullName: 'Juan Pérez García',
      companyTaxRegime: '601 - General de Ley Personas Morales'
      // Missing companyTaxAddress
    };

    const request = new Request('http://localhost:3000/api/tenant/test/step/1', {
      method: 'PUT',
      body: JSON.stringify(invalidData),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await updateTenantStep(request, { 
      params: Promise.resolve({ 
        token: testPolicy.accessToken,
        step: '1'
      }) 
    })

    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBe('Invalid data')
  })
});