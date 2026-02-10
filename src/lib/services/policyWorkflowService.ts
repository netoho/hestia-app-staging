import { BaseService } from './base/BaseService';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { logPolicyActivity } from './policyService';
import { ServiceError, ErrorCode } from './types/errors';

/**
 * Policy workflow state transitions
 * Simplified: COLLECTING_INFO → PENDING_APPROVAL → APPROVED → CANCELLED
 */
const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  COLLECTING_INFO: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'COLLECTING_INFO', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  CANCELLED: [],
};

class PolicyWorkflowService extends BaseService {
  /**
   * Validate if a status transition is allowed
   */
  isTransitionAllowed(fromStatus: PolicyStatus, toStatus: PolicyStatus): boolean {
    const allowedStatuses = ALLOWED_TRANSITIONS[fromStatus] || [];
    return allowedStatuses.includes(toStatus);
  }

  /**
   * Get allowed next statuses for a given status
   */
  getAllowedNextStatuses(currentStatus: PolicyStatus): PolicyStatus[] {
    return ALLOWED_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if all investigated actors have approved investigations.
   * Only checks tenant, joint obligors, and avals (landlords excluded).
   */
  async checkAllInvestigationsApproved(policyId: string): Promise<boolean> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        tenant: { select: { id: true } },
        jointObligors: { select: { id: true } },
        avals: { select: { id: true } },
      }
    });

    if (!policy) return false;

    // Collect all actor IDs that need investigation
    const actorChecks: { actorType: string; actorId: string }[] = [];

    if (policy.tenant) {
      actorChecks.push({ actorType: 'TENANT', actorId: policy.tenant.id });
    }
    for (const jo of policy.jointObligors) {
      actorChecks.push({ actorType: 'JOINT_OBLIGOR', actorId: jo.id });
    }
    for (const aval of policy.avals) {
      actorChecks.push({ actorType: 'AVAL', actorId: aval.id });
    }

    // No actors to investigate = not ready
    if (actorChecks.length === 0) return false;

    // Check each actor has at least one non-archived APPROVED investigation
    for (const check of actorChecks) {
      const approvedInvestigation = await this.prisma.actorInvestigation.findFirst({
        where: {
          policyId,
          actorType: check.actorType as 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL',
          actorId: check.actorId,
          status: 'APPROVED',
        }
      });

      if (!approvedInvestigation) return false;
    }

    return true;
  }

  /**
   * Validate requirements before transitioning to a status
   */
  private async validateStatusRequirements(
    policy: { id: string },
    newStatus: PolicyStatus
  ): Promise<{ valid: boolean; error?: string }> {
    switch (newStatus) {
      case 'PENDING_APPROVAL': {
        const allApproved = await this.checkAllInvestigationsApproved(policy.id);
        if (!allApproved) {
          return {
            valid: false,
            error: 'All investigated actors must have approved investigations',
          };
        }
        break;
      }

      case 'APPROVED':
        break;
    }

    return { valid: true };
  }

  /**
   * Transition policy to a new status with validation
   */
  async transitionPolicyStatus(
    policyId: string,
    newStatus: PolicyStatus,
    userId: string,
    notes?: string,
  ): Promise<{ success: boolean; policy?: { id: string; status: PolicyStatus }; error?: string }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true,
      }
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    // Check if transition is allowed
    if (!this.isTransitionAllowed(policy.status, newStatus)) {
      this.log('warn', `Invalid status transition from ${policy.status} to ${newStatus} for policy ${policyId}`);
      return {
        success: false,
        error: `Cannot transition from ${policy.status} to ${newStatus}`,
      };
    }

    // Additional validation based on status
    const validation = await this.validateStatusRequirements(policy, newStatus);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const updatedPolicy = await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: newStatus,
        ...(notes && { reviewNotes: notes }),
        ...(newStatus === 'APPROVED' && { approvedAt: new Date() }),
      },
    });

    // Log activity
    await logPolicyActivity({
      policyId,
      action: 'status_changed',
      description: `Status changed from ${policy.status} to ${newStatus}`,
      details: {
        fromStatus: policy.status,
        toStatus: newStatus,
        notes,
      },
      performedById: userId,
    });

    return { success: true, policy: updatedPolicy };
  }

  /**
   * Activate a policy (separate from status transition)
   * Sets activatedAt and calculates expiresAt from contractLength
   */
  async activatePolicy(
    policyId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, status: true, contractLength: true },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    if (policy.status !== 'APPROVED') {
      return { success: false, error: 'Policy must be approved before activation' };
    }

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + (policy.contractLength || 12));

    await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        activatedAt: new Date(),
        expiresAt: expirationDate,
      },
    });

    await logPolicyActivity({
      policyId,
      action: 'policy_activated',
      description: 'Policy activated',
      details: { expiresAt: expirationDate.toISOString() },
      performedById: userId,
    });

    return { success: true };
  }

  /**
   * Deactivate a policy (reset activatedAt)
   */
  async deactivatePolicy(
    policyId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, status: true, activatedAt: true },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    if (policy.status !== 'APPROVED') {
      return { success: false, error: 'Policy must be approved to deactivate' };
    }

    if (!policy.activatedAt) {
      return { success: false, error: 'Policy is not currently active' };
    }

    await this.prisma.policy.update({
      where: { id: policyId },
      data: { activatedAt: null, expiresAt: null },
    });

    await logPolicyActivity({
      policyId,
      action: 'policy_deactivated',
      description: 'Policy deactivated',
      performedById: userId,
    });

    return { success: true };
  }

  /**
   * Auto-transition policies in COLLECTING_INFO when all investigations approved
   */
  async autoTransitionPolicies(): Promise<void> {
    const collectingPolicies = await this.prisma.policy.findMany({
      where: { status: 'COLLECTING_INFO' },
      select: { id: true },
    });

    for (const policy of collectingPolicies) {
      const allApproved = await this.checkAllInvestigationsApproved(policy.id);
      if (allApproved) {
        await this.transitionPolicyStatus(
          policy.id,
          'PENDING_APPROVAL',
          'system',
          'Auto-transitioned: All actor investigations approved',
        );
      }
    }
  }

  /**
   * Get workflow progress for a policy
   */
  async getPolicyWorkflowProgress(policyId: string): Promise<{
    currentStatus: PolicyStatus;
    progress: number;
    steps: Array<{
      name: string;
      status: 'completed' | 'current' | 'pending';
      description?: string;
    }>;
    nextActions: string[];
  }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true,
      },
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const workflowSteps = [
      {
        name: 'Recopilación',
        statuses: ['COLLECTING_INFO'],
        description: 'Recopilación de información e investigación de actores',
      },
      {
        name: 'Aprobación',
        statuses: ['PENDING_APPROVAL'],
        description: 'Pendiente de aprobación',
      },
      {
        name: 'Aprobado',
        statuses: ['APPROVED'],
        description: 'Protección aprobada',
      },
    ];

    let currentStepIndex = 0;
    for (let i = 0; i < workflowSteps.length; i++) {
      if (workflowSteps[i].statuses.includes(policy.status)) {
        currentStepIndex = i;
        break;
      }
    }

    const progress = workflowSteps.length > 1
      ? Math.round((currentStepIndex / (workflowSteps.length - 1)) * 100)
      : 0;

    const steps = workflowSteps.map((step, index) => ({
      name: step.name,
      status: index < currentStepIndex ? 'completed' as const :
              index === currentStepIndex ? 'current' as const :
              'pending' as const,
      description: step.description,
    }));

    const nextActions: string[] = [];
    const allInvestigationsApproved = await this.checkAllInvestigationsApproved(policyId);

    switch (policy.status) {
      case 'COLLECTING_INFO':
        if (!allInvestigationsApproved) {
          nextActions.push('Completar investigaciones de actores');
        } else {
          nextActions.push('Mover a aprobación');
        }
        break;
      case 'PENDING_APPROVAL':
        nextActions.push('Aprobar protección');
        break;
      case 'APPROVED':
        if (!policy.activatedAt) {
          nextActions.push('Activar protección');
        }
        break;
    }

    return {
      currentStatus: policy.status,
      progress,
      steps,
      nextActions,
    };
  }
}

// Export singleton instance
export const policyWorkflowService = new PolicyWorkflowService();

// Export bound functions
export const isTransitionAllowed = policyWorkflowService.isTransitionAllowed.bind(policyWorkflowService);
export const getAllowedNextStatuses = policyWorkflowService.getAllowedNextStatuses.bind(policyWorkflowService);
export const checkAllInvestigationsApproved = policyWorkflowService.checkAllInvestigationsApproved.bind(policyWorkflowService);
export const transitionPolicyStatus = policyWorkflowService.transitionPolicyStatus.bind(policyWorkflowService);
export const activatePolicy = policyWorkflowService.activatePolicy.bind(policyWorkflowService);
export const deactivatePolicy = policyWorkflowService.deactivatePolicy.bind(policyWorkflowService);
export const autoTransitionPolicies = policyWorkflowService.autoTransitionPolicies.bind(policyWorkflowService);
export const getPolicyWorkflowProgress = policyWorkflowService.getPolicyWorkflowProgress.bind(policyWorkflowService);
