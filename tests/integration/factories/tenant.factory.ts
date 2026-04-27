/**
 * Tenant factory.
 *
 * Requires a policyId. A Policy has at most one Tenant (Tenant.policyId is unique).
 */
import { Factory } from 'fishery';
import { TenantType, NationalityType, ActorVerificationStatus } from '@/prisma/generated/prisma-client/enums';
import type { Tenant } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type TenantTransient = { policyId: string };

export const tenantFactory = Factory.define<Tenant, TenantTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (tenant) => prisma.tenant.create({ data: tenant }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      tenantType: TenantType.INDIVIDUAL,
      firstName: `Tenant${sequence}`,
      middleName: null,
      paternalLastName: 'Test',
      maternalLastName: 'Family',
      nationality: NationalityType.MEXICAN,
      curp: null,
      rfc: null,
      passport: null,
      companyName: null,
      companyRfc: null,
      legalRepFirstName: null,
      legalRepMiddleName: null,
      legalRepPaternalLastName: null,
      legalRepMaternalLastName: null,
      legalRepId: null,
      legalRepPosition: null,
      legalRepRfc: null,
      legalRepPhone: null,
      legalRepEmail: null,
      companyAddress: null,
      email: `tenant-${sequence}-${Date.now()}@hestia.test`,
      phone: '5555555555',
      workPhone: null,
      personalEmail: null,
      workEmail: null,
      currentAddress: null,
      addressId: null,
      employmentStatus: null,
      occupation: null,
      employerName: null,
      employerAddress: null,
      employerAddressId: null,
      position: null,
      monthlyIncome: null,
      incomeSource: null,
      yearsAtJob: null,
      hasAdditionalIncome: false,
      additionalIncomeSource: null,
      additionalIncomeAmount: null,
      previousLandlordName: null,
      previousLandlordPhone: null,
      previousLandlordEmail: null,
      previousRentAmount: null,
      previousRentalAddress: null,
      previousRentalAddressId: null,
      rentalHistoryYears: null,
      numberOfOccupants: null,
      reasonForMoving: null,
      hasPets: false,
      petDescription: null,
      paymentMethod: null,
      requiresCFDI: false,
      cfdiData: null,
      accessToken: null,
      tokenExpiry: null,
      informationComplete: false,
      completedAt: null,
      verificationStatus: ActorVerificationStatus.PENDING,
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
      rejectedAt: null,
      additionalInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Tenant;
  },
);
