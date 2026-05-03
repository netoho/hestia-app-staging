/**
 * Policy factory.
 *
 * Creating a Policy directly requires a real `createdById` (User) and a real
 * `packageId` (Package). Pass them via `transientParams` or persist via the
 * higher-order builders in `scenarios.ts`.
 */
import { Factory } from 'fishery';
import { GuarantorType, PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import type { Policy } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type PolicyTransient = {
  createdById: string;
  packageId?: string | null;
  /**
   * Override `managedById`. By default the factory mirrors production
   * behavior: when no override is given, leave it null (mirrors policies
   * created by ADMIN/STAFF and not yet assigned via the picker). For broker
   * scenarios, pass `managedById: brokerId` to simulate either self-creation
   * (auto-assign) or admin assignment.
   */
  managedById?: string | null;
};

export const policyFactory = Factory.define<Policy, PolicyTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (policy) => prisma.policy.create({ data: policy }));

    return {
      id: undefined as unknown as string,
      policyNumber: `POL-TEST-${sequence}-${Date.now()}`,
      internalCode: null,
      rentAmount: 15000,
      contractLength: 12,
      guarantorType: GuarantorType.NONE,
      packageId: transientParams.packageId ?? null,
      totalPrice: 4000,
      tenantPercentage: 100,
      landlordPercentage: 0,
      tenantPaymentMethod: null,
      tenantRequiresCFDI: false,
      tenantCFDIData: null,
      hasIVA: false,
      issuesTaxReceipts: false,
      securityDeposit: 1,
      maintenanceFee: null,
      maintenanceIncludedInRent: false,
      rentIncreasePercentage: null,
      paymentMethod: 'bank_transfer',
      createdById: transientParams.createdById,
      managedById: transientParams.managedById ?? null,
      status: PolicyStatus.COLLECTING_INFO,
      submittedAt: null,
      approvedAt: null,
      activatedAt: null,
      expiresAt: null,
      contractStartDate: null,
      contractEndDate: null,
      reviewNotes: null,
      cancelledAt: null,
      cancellationReason: null,
      cancellationComment: null,
      cancelledById: null,
      renewedToId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Policy;
  },
);

export const cancelledPolicy = policyFactory.params({ status: PolicyStatus.CANCELLED });
export const submittedPolicy = policyFactory.params({ status: PolicyStatus.SUBMITTED });
export const collectingInfoPolicy = policyFactory.params({ status: PolicyStatus.COLLECTING_INFO });
