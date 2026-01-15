import prisma from '@/lib/prisma';
import { TenantType, PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { renewToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from './index';
import {
  sendTenantReplacementNotification,
  sendIncompleteActorInfoNotification,
} from '@/lib/services/notificationService';

// Statuses that allow tenant replacement
export const REPLACEABLE_STATUSES: PolicyStatus[] = [
  'DRAFT',
  'COLLECTING_INFO',
  'UNDER_INVESTIGATION',
  'PENDING_APPROVAL',
];

export interface ReplaceTenantInput {
  policyId: string;
  replacementReason: string;
  newTenant: {
    tenantType: TenantType;
    email: string;
    phone: string;
    firstName?: string;
    companyName?: string;
  };
  replaceGuarantors: boolean;
  performedById: string;
}

export interface ReplaceTenantResult {
  success: boolean;
  error?: string;
}

/**
 * Replace tenant (and optionally guarantors) on a policy.
 * Archives old actor data to history tables, resets actor records,
 * and sends notifications.
 */
export async function replaceTenantOnPolicy(
  input: ReplaceTenantInput
): Promise<ReplaceTenantResult> {
  // Get policy with full tenant and guarantor data for archiving
  const policy = await prisma.policy.findUnique({
    where: { id: input.policyId },
    select: {
      id: true,
      status: true,
      policyNumber: true,
      guarantorType: true,
      managedById: true,
      tenant: {
        select: {
          id: true,
          tenantType: true,
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
          // Address IDs for cleanup
          addressId: true,
          employerAddressId: true,
          previousRentalAddressId: true,
        },
      },
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
          // Address IDs for cleanup
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
          // Address IDs for cleanup
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

  // Check if policy status allows replacement
  if (!REPLACEABLE_STATUSES.includes(policy.status)) {
    return {
      success: false,
      error: `Cannot replace tenant on policy with status ${policy.status}`,
    };
  }

  if (!policy.tenant) {
    return { success: false, error: 'No tenant found to replace' };
  }

  const currentTenant = policy.tenant;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Archive current tenant to TenantHistory
    await tx.tenantHistory.create({
      data: {
        policyId: input.policyId,
        tenantType: currentTenant.tenantType,
        firstName: currentTenant.firstName,
        middleName: currentTenant.middleName,
        paternalLastName: currentTenant.paternalLastName,
        maternalLastName: currentTenant.maternalLastName,
        companyName: currentTenant.companyName,
        email: currentTenant.email,
        phone: currentTenant.phone,
        rfc: currentTenant.rfc,
        employmentStatus: currentTenant.employmentStatus,
        occupation: currentTenant.occupation,
        employerName: currentTenant.employerName,
        monthlyIncome: currentTenant.monthlyIncome,
        verificationStatus: currentTenant.verificationStatus,
        informationComplete: currentTenant.informationComplete,
        replacedById: input.performedById,
        replacementReason: input.replacementReason,
      },
    });

    // 2. Get tenant document IDs and delete their validations
    const tenantDocIds = await tx.actorDocument.findMany({
      where: { tenantId: currentTenant.id },
      select: { id: true },
    });
    if (tenantDocIds.length > 0) {
      await tx.documentValidation.deleteMany({
        where: { documentId: { in: tenantDocIds.map((d) => d.id) } },
      });
    }

    // 3. Unlink tenant's documents (soft delete - keep S3 files)
    await tx.actorDocument.updateMany({
      where: { tenantId: currentTenant.id },
      data: { tenantId: null },
    });

    // 4. Delete tenant's references
    await tx.personalReference.deleteMany({
      where: { tenantId: currentTenant.id },
    });
    await tx.commercialReference.deleteMany({
      where: { tenantId: currentTenant.id },
    });

    // 5. Delete ActorSectionValidation for tenant
    await tx.actorSectionValidation.deleteMany({
      where: { actorType: 'tenant', actorId: currentTenant.id },
    });

    // 6. Delete PropertyAddress records
    const addressIds = [
      currentTenant.addressId,
      currentTenant.employerAddressId,
      currentTenant.previousRentalAddressId,
    ].filter((id): id is string => !!id);
    if (addressIds.length > 0) {
      await tx.propertyAddress.deleteMany({
        where: { id: { in: addressIds } },
      });
    }

    // 7. Reset tenant record with new data
    await tx.tenant.update({
      where: { id: currentTenant.id },
      data: {
        tenantType: input.newTenant.tenantType,
        email: input.newTenant.email,
        phone: input.newTenant.phone,
        firstName: input.newTenant.firstName || null,
        middleName: null,
        paternalLastName: null,
        maternalLastName: null,
        companyName:
          input.newTenant.tenantType === 'COMPANY'
            ? input.newTenant.companyName
            : null,
        companyRfc: null,
        rfc: null,
        curp: null,
        passport: null,
        nationality: 'MEXICAN',
        // Clear legal rep fields
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
        // Clear contact fields
        workPhone: null,
        personalEmail: null,
        workEmail: null,
        // Clear address
        currentAddress: null,
        addressId: null,
        // Clear employment
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
        // Clear rental history
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
        // Clear payment preferences
        paymentMethod: null,
        requiresCFDI: false,
        cfdiData: null,
        // Reset status
        informationComplete: false,
        completedAt: null,
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: null,
        rejectedAt: null,
        // Clear token (will regenerate after)
        accessToken: null,
        tokenExpiry: null,
        additionalInfo: null,
      },
    });

    // 8. If replaceGuarantors, archive and delete all guarantors
    if (input.replaceGuarantors) {
      // Archive and delete joint obligors
      for (const jo of policy.jointObligors) {
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
            replacementReason: input.replacementReason,
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

        // Unlink documents
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
      await tx.jointObligor.deleteMany({
        where: { policyId: input.policyId },
      });

      // Archive and delete avals
      for (const aval of policy.avals) {
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
            replacementReason: input.replacementReason,
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

        // Unlink documents
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
      await tx.aval.deleteMany({
        where: { policyId: input.policyId },
      });
    }

    // 9. Delete investigation if exists
    if (policy.investigation) {
      await tx.investigation.delete({
        where: { id: policy.investigation.id },
      });
    }

    // 10. Handle TENANT payments
    // Get tenant name for historical payments
    const tenantName = currentTenant.tenantType === 'COMPANY'
      ? currentTenant.companyName || 'Empresa'
      : `${currentTenant.firstName || ''} ${currentTenant.paternalLastName || ''}`.trim() || 'Inquilino';

    // Mark COMPLETED tenant payments with tenant name (for historical display)
    await tx.payment.updateMany({
      where: {
        policyId: input.policyId,
        paidBy: 'TENANT',
        status: 'COMPLETED',
        paidByTenantName: null,
      },
      data: { paidByTenantName: tenantName },
    });

    // Cancel ALL non-completed tenant payments
    await tx.payment.updateMany({
      where: {
        policyId: input.policyId,
        paidBy: 'TENANT',
        status: { in: ['PENDING', 'PROCESSING', 'PENDING_VERIFICATION'] },
      },
      data: { status: 'CANCELLED' },
    });

    // 11. Revert policy status to COLLECTING_INFO if past that
    if (policy.status !== 'DRAFT' && policy.status !== 'COLLECTING_INFO') {
      await tx.policy.update({
        where: { id: input.policyId },
        data: { status: 'COLLECTING_INFO' },
      });
    }
  });

  // Regenerate access token for tenant
  await renewToken('tenant', currentTenant.id);

  // Log activity
  await logPolicyActivity({
    policyId: input.policyId,
    action: 'tenant_replaced',
    description: `Tenant replaced${input.replaceGuarantors ? ' (including guarantors)' : ''}: ${input.replacementReason}`,
    details: {
      previousTenantEmail: currentTenant.email,
      newTenantEmail: input.newTenant.email,
      replaceGuarantors: input.replaceGuarantors,
      reason: input.replacementReason,
    },
    performedById: input.performedById,
    performedByType: 'user',
  });

  // Send notification to manager and admins
  await sendTenantReplacementNotification(input.policyId, policy.managedById);

  // Send access link email to the new tenant
  await sendIncompleteActorInfoNotification({
    policyId: input.policyId,
    actors: ['tenant'],
    resend: false,
    initiatorName: 'Sistema',
    initiatorId: input.performedById,
  });

  return { success: true };
}
