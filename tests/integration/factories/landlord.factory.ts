/**
 * Landlord factory.
 *
 * Requires a policyId. The first landlord created on a policy should have
 * `isPrimary: true` (the project convention — see CLAUDE.md). Use the
 * `primaryLandlord` trait below.
 */
import { Factory } from 'fishery';
import { NationalityType, ActorVerificationStatus } from '@/prisma/generated/prisma-client/enums';
import type { Landlord } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type LandlordTransient = { policyId: string };

export const landlordFactory = Factory.define<Landlord, LandlordTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (landlord) => prisma.landlord.create({ data: landlord }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      isPrimary: false,
      isCompany: false,
      firstName: `Landlord${sequence}`,
      middleName: null,
      paternalLastName: 'Test',
      maternalLastName: 'Family',
      nationality: NationalityType.MEXICAN,
      rfc: null,
      curp: null,
      companyName: null,
      companyRfc: null,
      businessType: null,
      legalRepFirstName: null,
      legalRepMiddleName: null,
      legalRepPaternalLastName: null,
      legalRepMaternalLastName: null,
      legalRepPosition: null,
      legalRepRfc: null,
      legalRepCurp: null,
      legalRepPhone: null,
      legalRepEmail: null,
      email: `landlord-${sequence}-${Date.now()}@hestia.test`,
      phone: '5555555555',
      workPhone: null,
      personalEmail: null,
      workEmail: null,
      address: '',
      addressId: null,
      bankName: null,
      accountNumber: null,
      clabe: null,
      accountHolder: null,
      occupation: null,
      employerName: null,
      monthlyIncome: null,
      propertyDeedNumber: null,
      propertyRegistryFolio: null,
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
    } as Landlord;
  },
);

export const primaryLandlord = landlordFactory.params({ isPrimary: true });
