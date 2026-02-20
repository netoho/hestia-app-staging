import { BaseService } from './base/BaseService';
import { PolicyStatus, PaymentStatus } from "@/prisma/generated/prisma-client/enums";
import { logPolicyActivity } from './policyService';
import { sendPolicyStatusUpdate } from './emailService';
import { sendPolicyPendingApprovalNotification } from './notificationService';
import { ServiceError, ErrorCode } from './types/errors';

/**
 * Policy workflow state transitions
 * COLLECTING_INFO → PENDING_APPROVAL → ACTIVE → EXPIRED | CANCELLED
 */
const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  COLLECTING_INFO: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTIVE', 'COLLECTING_INFO', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: ['CANCELLED'],
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
   * Check if all active payments for a policy are settled (COMPLETED).
   * Returns true if no active payments exist or all are COMPLETED.
   */
  async areAllPaymentsSettled(policyId: string): Promise<boolean> {
    const activePayments = await this.prisma.payment.findMany({
      where: {
        policyId,
        status: { notIn: [PaymentStatus.CANCELLED, PaymentStatus.FAILED] },
      },
      select: { status: true, id: true },
    });

    if (activePayments.length === 0) return true;
    console.log(activePayments);
    return activePayments.every(p => p.status === PaymentStatus.COMPLETED);
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

      case 'ACTIVE': {
        const settled = await this.areAllPaymentsSettled(policy.id);
        if (!settled) {
          return {
            valid: false,
            error: 'Todos los pagos deben estar completados antes de activar la protección',
          };
        }
        break;
      }
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

    // Calculate expiresAt when transitioning to ACTIVE
    let expiresAt: Date | undefined;
    if (newStatus === 'ACTIVE') {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (policy.contractLength || 12));
    }

    const updatedPolicy = await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: newStatus,
        ...(notes && { reviewNotes: notes }),
        ...(newStatus === 'PENDING_APPROVAL' && { submittedAt: new Date() }),
        ...(newStatus === 'ACTIVE' && {
          approvedAt: new Date(),
          activatedAt: new Date(),
          expiresAt,
        }),
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

    // Send email notification on ACTIVE
    if (newStatus === 'ACTIVE' && policy.tenant?.email) {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      sendPolicyStatusUpdate({
        tenantEmail: policy.tenant.email,
        tenantName: policy.tenant.firstName ?? undefined,
        status: 'approved',
        reviewerName: reviewer?.name ?? 'Equipo Hestia',
      }).catch((err) => console.error('Failed to send approval email:', err));
    }

    // Notify admins when policy reaches PENDING_APPROVAL
    if (newStatus === 'PENDING_APPROVAL') {
      sendPolicyPendingApprovalNotification(policyId)
        .catch((err) => console.error('Failed to send pending approval notification:', err));
    }

    return { success: true, policy: updatedPolicy };
  }

  /**
   * Auto-transition policy to PENDING_APPROVAL if all investigations are approved.
   * Called after investigation approval or actor completion.
   */
  async tryAutoTransition(
    policyId: string,
    performedBy: string = 'system',
    performedById?: string,
  ): Promise<boolean> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { status: true }
    });

    if (!policy) return false;

    // Only transition if currently in COLLECTING_INFO
    if (policy.status !== PolicyStatus.COLLECTING_INFO) {
      return false;
    }

    const allApproved = await this.checkAllInvestigationsApproved(policyId);
    if (!allApproved) {
      return false;
    }

    await this.transitionPolicyStatus(
      policyId,
      PolicyStatus.PENDING_APPROVAL,
      performedById ?? performedBy,
      'All actor investigations approved',
    );

    await logPolicyActivity({
      policyId,
      action: 'status_transition',
      description: 'Policy transitioned to pending approval',
      details: {
        fromStatus: PolicyStatus.COLLECTING_INFO,
        toStatus: PolicyStatus.PENDING_APPROVAL,
        reason: 'All actor investigations approved',
      },
      performedByType: performedBy,
      performedById,
    });

    return true;
  }

  /**
   * Expire all ACTIVE policies whose expiresAt has passed.
   * Called by daily cron job.
   */
  async expireActivePolicies(): Promise<{ expired: number; errors: string[] }> {
    const now = new Date();
    const errors: string[] = [];

    const expiredPolicies = await this.prisma.policy.findMany({
      where: {
        status: PolicyStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: { id: true, policyNumber: true },
    });

    let expired = 0;
    for (const policy of expiredPolicies) {
      try {
        await this.prisma.policy.update({
          where: { id: policy.id },
          data: { status: PolicyStatus.EXPIRED },
        });

        await logPolicyActivity({
          policyId: policy.id,
          action: 'status_changed',
          description: 'Policy expired automatically',
          details: {
            fromStatus: PolicyStatus.ACTIVE,
            toStatus: PolicyStatus.EXPIRED,
            reason: 'Contract period ended',
          },
          performedByType: 'system',
        });

        expired++;
      } catch (error) {
        const msg = `Policy ${policy.policyNumber}: ${error instanceof Error ? error.message : error}`;
        console.error(`[POLICY-EXPIRY] ${msg}`);
        errors.push(msg);
      }
    }

    return { expired, errors };
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
        name: 'Activa',
        statuses: ['ACTIVE'],
        description: 'Protección activa',
      },
    ];

    let currentStepIndex = 0;
    for (let i = 0; i < workflowSteps.length; i++) {
      if (workflowSteps[i].statuses.includes(policy.status)) {
        currentStepIndex = i;
        break;
      }
    }

    // EXPIRED = fully completed
    if (policy.status === 'EXPIRED') {
      currentStepIndex = workflowSteps.length;
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
        nextActions.push('Aprobar y activar protección');
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
export const tryAutoTransition = policyWorkflowService.tryAutoTransition.bind(policyWorkflowService);
export const expireActivePolicies = policyWorkflowService.expireActivePolicies.bind(policyWorkflowService);
export const getPolicyWorkflowProgress = policyWorkflowService.getPolicyWorkflowProgress.bind(policyWorkflowService);
