/**
 * Aval factory.
 *
 * Requires a policyId. Avals typically guarantee with property
 * (hasPropertyGuarantee defaults true in Prisma).
 */
import { Factory } from 'fishery';
import {
  AvalType,
  NationalityType,
  ActorVerificationStatus,
} from '@/prisma/generated/prisma-client/enums';
import type { Aval } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type AvalTransient = { policyId: string };

export const avalFactory = Factory.define<Aval, AvalTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (aval) => prisma.aval.create({ data: aval }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      avalType: AvalType.INDIVIDUAL,
      firstName: `Aval${sequence}`,
      middleName: null,
      paternalLastName: 'Test',
      maternalLastName: 'Guarantor',
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
      email: `aval-${sequence}-${Date.now()}@hestia.test`,
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
      propertyAddress: null,
      guaranteePropertyAddressId: null,
      propertyValue: null,
      propertyDeedNumber: null,
      propertyRegistry: null,
      propertyTaxAccount: null,
      propertyUnderLegalProceeding: false,
      maritalStatus: null,
      spouseName: null,
      spouseRfc: null,
      spouseCurp: null,
      guaranteeMethod: null,
      hasPropertyGuarantee: true,
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
    } as Aval;
  },
);
