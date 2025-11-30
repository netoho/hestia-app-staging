import prisma from '@/lib/prisma';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { transitionPolicyStatus } from './policyWorkflowService';
import { logPolicyActivity } from './policyService';

/**
 * Service for managing policy status transitions
 */
export class PolicyStatusService {
  /**
   * Check if all actors have completed their information
   */
  async checkAllActorsComplete(policyId: string): Promise<{
    allComplete: boolean;
    pendingActors: string[];
    completedActors: string[];
  }> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        landlords: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        jointObligors: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        avals: { select: { id: true, informationComplete: true, firstName: true, companyName: true } }
      }
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    const pendingActors: string[] = [];
    const completedActors: string[] = [];

    // Check tenant
    if (policy.tenant) {
      const name = policy.tenant.companyName || policy.tenant.firstName || 'Tenant';
      if (policy.tenant.informationComplete) {
        completedActors.push(`Tenant: ${name}`);
      } else {
        pendingActors.push(`Tenant: ${name}`);
      }
    }

    // Check landlords
    for (const landlord of policy.landlords) {
      const name = landlord.companyName || landlord.firstName || 'Landlord';
      if (landlord.informationComplete) {
        completedActors.push(`Landlord: ${name}`);
      } else {
        pendingActors.push(`Landlord: ${name}`);
      }
    }

    // Check joint obligors
    for (const jo of policy.jointObligors) {
      const name = jo.companyName || jo.firstName || 'Joint Obligor';
      if (jo.informationComplete) {
        completedActors.push(`Joint Obligor: ${name}`);
      } else {
        pendingActors.push(`Joint Obligor: ${name}`);
      }
    }

    // Check avals
    for (const aval of policy.avals) {
      const name = aval.companyName || aval.firstName || 'Aval';
      if (aval.informationComplete) {
        completedActors.push(`Aval: ${name}`);
      } else {
        pendingActors.push(`Aval: ${name}`);
      }
    }

    return {
      allComplete: pendingActors.length === 0,
      pendingActors,
      completedActors
    };
  }

  /**
   * Check and transition policy status if all actors are complete
   */
  async checkAndTransition(
    policyId: string,
    performedBy: string = 'system',
    performedById?: string
  ): Promise<boolean> {
    const status = await this.checkAllActorsComplete(policyId);

    if (status.allComplete) {
      // Get current policy status
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: { status: true }
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      // Only transition if currently in COLLECTING_INFO status
      if (policy.status === PolicyStatus.COLLECTING_INFO) {
        await transitionPolicyStatus(
          policyId,
          PolicyStatus.UNDER_INVESTIGATION,
          performedBy,
          'All actor information completed'
        );

        await logPolicyActivity({
          policyId,
          action: 'status_transition',
          description: 'Policy transitioned to investigation phase',
          details: {
            fromStatus: PolicyStatus.COLLECTING_INFO,
            toStatus: PolicyStatus.UNDER_INVESTIGATION,
            reason: 'All actors completed their information',
            completedActors: status.completedActors
          },
          performedByType: performedBy,
          performedById
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Get policy progress information
   */
  async getPolicyProgress(policyId: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        landlords: true,
        jointObligors: true,
        avals: true,
        documents: { select: { id: true, type: true } }
      }
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    const actorStatus = await this.checkAllActorsComplete(policyId);

    // Count documents per actor
    const tenantDocs = await prisma.document.count({
      where: { tenantId: policy.tenant?.id }
    });

    const landlordDocs = await Promise.all(
      policy.landlords.map(l =>
        prisma.document.count({ where: { landlordId: l.id } })
      )
    );

    const joDocs = await Promise.all(
      policy.jointObligors.map(jo =>
        prisma.document.count({ where: { jointObligorId: jo.id } })
      )
    );

    const avalDocs = await Promise.all(
      policy.avals.map(a =>
        prisma.document.count({ where: { avalId: a.id } })
      )
    );

    return {
      status: policy.status,
      actorsComplete: actorStatus.allComplete,
      pendingActors: actorStatus.pendingActors,
      completedActors: actorStatus.completedActors,
      documents: {
        tenant: tenantDocs,
        landlords: landlordDocs,
        jointObligors: joDocs,
        avals: avalDocs,
        total: tenantDocs + landlordDocs.reduce((a, b) => a + b, 0) +
               joDocs.reduce((a, b) => a + b, 0) + avalDocs.reduce((a, b) => a + b, 0)
      },
      progress: {
        collectingInfo: actorStatus.allComplete ? 100 :
          Math.round((actorStatus.completedActors.length /
          (actorStatus.completedActors.length + actorStatus.pendingActors.length)) * 100),
        investigation: policy.status === PolicyStatus.UNDER_INVESTIGATION ? 'in_progress' :
                      policy.status === PolicyStatus.APPROVED ||
                      policy.status === PolicyStatus.REJECTED ? 100 : 0
      }
    };
  }

  /**
   * Force status transition (admin only)
   */
  async forceTransition(
    policyId: string,
    newStatus: PolicyStatus,
    reason: string,
    performedById: string
  ): Promise<void> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { status: true }
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    await transitionPolicyStatus(
      policyId,
      newStatus,
      'admin',
      reason
    );

    await logPolicyActivity({
      policyId,
      action: 'force_status_transition',
      description: `Status manually changed to ${newStatus}`,
      details: {
        fromStatus: policy.status,
        toStatus: newStatus,
        reason,
        forcedBy: 'admin'
      },
      performedByType: 'admin',
      performedById
    });
  }
}

// Export singleton instance
export const policyStatusService = new PolicyStatusService();
