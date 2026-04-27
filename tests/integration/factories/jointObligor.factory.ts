/**
 * JointObligor factory.
 *
 * Requires a policyId.
 */
import { Factory } from 'fishery';
import {
  JointObligorType,
  NationalityType,
  ActorVerificationStatus,
} from '@/prisma/generated/prisma-client/enums';
import type { JointObligor } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type JointObligorTransient = { policyId: string };

export const jointObligorFactory = Factory.define<JointObligor, JointObligorTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (jo) => prisma.jointObligor.create({ data: jo }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      jointObligorType: JointObligorType.INDIVIDUAL,
      firstName: `Joint${sequence}`,
      middleName: null,
      paternalLastName: 'Test',
      maternalLastName: 'Obligor',
      nationality: NationalityType.MEXICAN,
      curp: null,
      rfc: null,
      passport: null,
      relationshipToTenant: null,
      companyName: null,
      companyRfc: null,
      legalRepFirstName: null,
      legalRepMiddleName: null,
      legalRepPaternalLastName: null,
      legalRepMaternalLastName: null,
      legalRepPosition: null,
      legalRepRfc: null,
      legalRepPhone: null,
      legalRepEmail: null,
      email: `jointobligor-${sequence}-${Date.now()}@hestia.test`,
      phone: '5555555555',
      workPhone: null,
      personalEmail: null,
      workEmail: null,
      address: null,
      addressId: null,
      employmentStatus: null,
      occupation: null,
      employerName: null,
      employerAddress: null,
      employerAddressId: null,
      position: null,
      monthlyIncome: null,
      incomeSource: null,
      guaranteeMethod: null,
      hasPropertyGuarantee: false,
      propertyAddress: null,
      guaranteePropertyAddressId: null,
      propertyValue: null,
      propertyDeedNumber: null,
      propertyRegistry: null,
      propertyTaxAccount: null,
      propertyUnderLegalProceeding: false,
      bankName: null,
      accountHolder: null,
      hasProperties: false,
      maritalStatus: null,
      spouseName: null,
      spouseRfc: null,
      spouseCurp: null,
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
    } as JointObligor;
  },
);
