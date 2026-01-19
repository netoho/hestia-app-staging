import prisma from '@/lib/prisma';
import { GuarantorType, PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { generateJointObligorToken, generateAvalToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from './index';
import { sendIncompleteActorInfoNotification } from '@/lib/services/notificationService';

// Statuses that allow guarantor type change
export const CHANGEABLE_STATUSES: PolicyStatus[] = [
  'DRAFT',
  'COLLECTING_INFO',
  'UNDER_INVESTIGATION',
  'PENDING_APPROVAL',
];

export interface NewJointObligorInput {
  email: string;
  phone: string;
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
}

export interface NewAvalInput {
  email: string;
  phone: string;
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
}

export interface ChangeGuarantorTypeInput {
  policyId: string;
  reason: string;
  newGuarantorType: GuarantorType;
  newJointObligors?: NewJointObligorInput[];
  newAvals?: NewAvalInput[];
  performedById: string;
}

export interface ChangeGuarantorTypeResult {
  success: boolean;
  error?: string;
}

/**
 * Change the guarantor type on a policy.
 * Archives all existing guarantors to history tables,
 * creates new guarantors based on the new type,
 * and sends notifications.
 */
export async function changeGuarantorType(
  input: ChangeGuarantorTypeInput
): Promise<ChangeGuarantorTypeResult> {
  // Get policy with full guarantor data for archiving
  const policy = await prisma.policy.findUnique({
    where: { id: input.policyId },
    select: {
      id: true,
      status: true,
      policyNumber: true,
      guarantorType: true,
      managedById: true,
      jointObligors: {
        select: {
          id: true,
          jointObligorType: true,
          firstName: true,
          middleName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
          email: true,
          phone: true,
          rfc: true,
          employmentStatus: true,
          occupation: true,
          employerName: true,
          monthlyIncome: true,
          verificationStatus: true,
          informationComplete: true,
          addressId: true,
          employerAddressId: true,
          guaranteePropertyAddressId: true,
        },
      },
      avals: {
        select: {
          id: true,
          avalType: true,
          firstName: true,
          middleName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
          email: true,
          phone: true,
          rfc: true,
          employmentStatus: true,
          occupation: true,
          employerName: true,
          monthlyIncome: true,
          verificationStatus: true,
          informationComplete: true,
          addressId: true,
          employerAddressId: true,
          guaranteePropertyAddressId: true,
        },
      },
      investigation: {
        select: { id: true },
      },
    },
  });

  if (!policy) {
    return { success: false, error: 'Policy not found' };
  }

  // Check if policy status allows change
  if (!CHANGEABLE_STATUSES.includes(policy.status)) {
    return {
      success: false,
      error: `Cannot change guarantor type on policy with status ${policy.status}`,
    };
  }

  // Check if the new type is the same as current
  if (policy.guarantorType === input.newGuarantorType) {
    return {
      success: false,
      error: 'New guarantor type is the same as current type',
    };
  }

  // Validate that new guarantors are provided when needed
  const needsJointObligors = input.newGuarantorType === 'JOINT_OBLIGOR' || input.newGuarantorType === 'BOTH';
  const needsAvals = input.newGuarantorType === 'AVAL' || input.newGuarantorType === 'BOTH';

  if (needsJointObligors && (!input.newJointObligors || input.newJointObligors.length === 0)) {
    return { success: false, error: 'At least one joint obligor is required' };
  }

  if (needsAvals && (!input.newAvals || input.newAvals.length === 0)) {
    return { success: false, error: 'At least one aval is required' };
  }

  const previousType = policy.guarantorType;
  const createdJointObligorIds: string[] = [];
  const createdAvalIds: string[] = [];

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Archive and delete all existing joint obligors
    for (const jo of policy.jointObligors) {
      // Archive to history
      await tx.jointObligorHistory.create({
        data: {
          policyId: input.policyId,
          jointObligorType: jo.jointObligorType,
          firstName: jo.firstName,
          middleName: jo.middleName,
          paternalLastName: jo.paternalLastName,
          maternalLastName: jo.maternalLastName,
          companyName: jo.companyName,
          email: jo.email,
          phone: jo.phone,
          rfc: jo.rfc,
          employmentStatus: jo.employmentStatus,
          occupation: jo.occupation,
          employerName: jo.employerName,
          monthlyIncome: jo.monthlyIncome,
          verificationStatus: jo.verificationStatus,
          informationComplete: jo.informationComplete,
          replacedById: input.performedById,
          replacementReason: input.reason,
        },
      });

      // Get document IDs and delete their DocumentValidation
      const joDocIds = await tx.actorDocument.findMany({
        where: { jointObligorId: jo.id },
        select: { id: true },
      });
      if (joDocIds.length > 0) {
        await tx.documentValidation.deleteMany({
          where: { documentId: { in: joDocIds.map((d) => d.id) } },
        });
      }

      // Unlink documents (soft delete - keep S3 files)
      await tx.actorDocument.updateMany({
        where: { jointObligorId: jo.id },
        data: { jointObligorId: null },
      });

      // Delete references
      await tx.personalReference.deleteMany({
        where: { jointObligorId: jo.id },
      });
      await tx.commercialReference.deleteMany({
        where: { jointObligorId: jo.id },
      });

      // Delete ActorSectionValidation
      await tx.actorSectionValidation.deleteMany({
        where: { actorType: 'jointObligor', actorId: jo.id },
      });

      // Delete PropertyAddress records
      const joAddressIds = [
        jo.addressId,
        jo.employerAddressId,
        jo.guaranteePropertyAddressId,
      ].filter((id): id is string => !!id);
      if (joAddressIds.length > 0) {
        await tx.propertyAddress.deleteMany({
          where: { id: { in: joAddressIds } },
        });
      }
    }

    // Delete all joint obligors
    if (policy.jointObligors.length > 0) {
      await tx.jointObligor.deleteMany({
        where: { policyId: input.policyId },
      });
    }

    // 2. Archive and delete all existing avals
    for (const aval of policy.avals) {
      // Archive to history
      await tx.avalHistory.create({
        data: {
          policyId: input.policyId,
          avalType: aval.avalType,
          firstName: aval.firstName,
          middleName: aval.middleName,
          paternalLastName: aval.paternalLastName,
          maternalLastName: aval.maternalLastName,
          companyName: aval.companyName,
          email: aval.email,
          phone: aval.phone,
          rfc: aval.rfc,
          employmentStatus: aval.employmentStatus,
          occupation: aval.occupation,
          employerName: aval.employerName,
          monthlyIncome: aval.monthlyIncome,
          verificationStatus: aval.verificationStatus,
          informationComplete: aval.informationComplete,
          replacedById: input.performedById,
          replacementReason: input.reason,
        },
      });

      // Get document IDs and delete their DocumentValidation
      const avalDocIds = await tx.actorDocument.findMany({
        where: { avalId: aval.id },
        select: { id: true },
      });
      if (avalDocIds.length > 0) {
        await tx.documentValidation.deleteMany({
          where: { documentId: { in: avalDocIds.map((d) => d.id) } },
        });
      }

      // Unlink documents (soft delete - keep S3 files)
      await tx.actorDocument.updateMany({
        where: { avalId: aval.id },
        data: { avalId: null },
      });

      // Delete references
      await tx.personalReference.deleteMany({
        where: { avalId: aval.id },
      });
      await tx.commercialReference.deleteMany({
        where: { avalId: aval.id },
      });

      // Delete ActorSectionValidation
      await tx.actorSectionValidation.deleteMany({
        where: { actorType: 'aval', actorId: aval.id },
      });

      // Delete PropertyAddress records
      const avalAddressIds = [
        aval.addressId,
        aval.employerAddressId,
        aval.guaranteePropertyAddressId,
      ].filter((id): id is string => !!id);
      if (avalAddressIds.length > 0) {
        await tx.propertyAddress.deleteMany({
          where: { id: { in: avalAddressIds } },
        });
      }
    }

    // Delete all avals
    if (policy.avals.length > 0) {
      await tx.aval.deleteMany({
        where: { policyId: input.policyId },
      });
    }

    // 3. Create new joint obligors if needed
    if (needsJointObligors && input.newJointObligors) {
      for (const jo of input.newJointObligors) {
        const created = await tx.jointObligor.create({
          data: {
            policyId: input.policyId,
            firstName: jo.firstName || '',
            paternalLastName: jo.paternalLastName || '',
            maternalLastName: jo.maternalLastName || '',
            email: jo.email,
            phone: jo.phone,
            nationality: 'MEXICAN',
          },
        });
        createdJointObligorIds.push(created.id);
      }
    }

    // 4. Create new avals if needed
    if (needsAvals && input.newAvals) {
      for (const aval of input.newAvals) {
        const created = await tx.aval.create({
          data: {
            policyId: input.policyId,
            firstName: aval.firstName || '',
            paternalLastName: aval.paternalLastName || '',
            maternalLastName: aval.maternalLastName || '',
            email: aval.email,
            phone: aval.phone,
            nationality: 'MEXICAN',
          },
        });
        createdAvalIds.push(created.id);
      }
    }

    // 5. Update policy guarantor type
    await tx.policy.update({
      where: { id: input.policyId },
      data: { guarantorType: input.newGuarantorType },
    });

    // 6. Delete investigation if exists
    if (policy.investigation) {
      await tx.investigation.delete({
        where: { id: policy.investigation.id },
      });
    }

    // 7. Revert policy status to COLLECTING_INFO if past that
    if (policy.status !== 'DRAFT' && policy.status !== 'COLLECTING_INFO') {
      await tx.policy.update({
        where: { id: input.policyId },
        data: { status: 'COLLECTING_INFO' },
      });
    }
  });

  // Generate tokens for new actors
  for (const joId of createdJointObligorIds) {
    await generateJointObligorToken(joId);
  }
  for (const avalId of createdAvalIds) {
    await generateAvalToken(avalId);
  }

  // Log activity
  await logPolicyActivity({
    policyId: input.policyId,
    action: 'guarantor_type_changed',
    description: `Guarantor type changed from ${previousType} to ${input.newGuarantorType}: ${input.reason}`,
    details: {
      previousType,
      newType: input.newGuarantorType,
      archivedJointObligors: policy.jointObligors.length,
      archivedAvals: policy.avals.length,
      newJointObligors: createdJointObligorIds.length,
      newAvals: createdAvalIds.length,
      reason: input.reason,
    },
    performedById: input.performedById,
    performedByType: 'user',
  });

  // Send invitations to new actors
  const actorsToNotify: string[] = [];
  if (createdJointObligorIds.length > 0) actorsToNotify.push('joint-obligor');
  if (createdAvalIds.length > 0) actorsToNotify.push('aval');

  if (actorsToNotify.length > 0) {
    await sendIncompleteActorInfoNotification({
      policyId: input.policyId,
      actors: actorsToNotify,
      resend: false,
      initiatorName: 'Sistema',
      initiatorId: input.performedById,
    });
  }

  return { success: true };
}
