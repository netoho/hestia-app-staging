import { BaseService } from './base/BaseService';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { logPolicyActivity } from './policyService';
import { checkPolicyActorsComplete } from './actorTokenService';
import { ServiceError, ErrorCode } from './types/errors';

/**
 * Policy workflow state transitions
 * Defines which status transitions are allowed
 */
const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  DRAFT: ['COLLECTING_INFO', 'CANCELLED', 'UNDER_INVESTIGATION'],
  COLLECTING_INFO: ['UNDER_INVESTIGATION', 'CANCELLED'],
  UNDER_INVESTIGATION: ['INVESTIGATION_REJECTED', 'PENDING_APPROVAL', 'CANCELLED'],
  INVESTIGATION_REJECTED: ['UNDER_INVESTIGATION', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'INVESTIGATION_REJECTED', 'CANCELLED'],
  APPROVED: ['CONTRACT_PENDING', 'CANCELLED'],
  CONTRACT_PENDING: ['CONTRACT_SIGNED', 'CANCELLED'],
  CONTRACT_SIGNED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: []
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
   * Check if all actors in a policy are verified (APPROVED)
   */
  async checkAllActorsVerified(policyId: string): Promise<boolean> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        landlords: { select: { verificationStatus: true } },
        tenant: { select: { verificationStatus: true } },
        jointObligors: { select: { verificationStatus: true } },
        avals: { select: { verificationStatus: true } },
      }
    });

    if (!policy) return false;

    return (
      policy.landlords.every(l => l.verificationStatus === 'APPROVED') &&
      (!policy.tenant || policy.tenant.verificationStatus === 'APPROVED') &&
      policy.jointObligors.every(jo => jo.verificationStatus === 'APPROVED') &&
      policy.avals.every(a => a.verificationStatus === 'APPROVED')
    );
  }

  /**
   * Validate requirements before transitioning to a status
   */
  private async validateStatusRequirements(
    policy: { id: string },
    newStatus: PolicyStatus
  ): Promise<{ valid: boolean; error?: string }> {
    switch (newStatus) {
      case 'UNDER_INVESTIGATION':
        // Check if all actor information is complete
        const actorsComplete = await checkPolicyActorsComplete(policy.id);
        if (!actorsComplete.allComplete) {
          return {
            valid: false,
            error: 'All actor information must be complete before investigation'
          };
        }
        break;

      case 'PENDING_APPROVAL':
        // Check if all actors are verified
        const allActorsVerified = await this.checkAllActorsVerified(policy.id);
        if (!allActorsVerified) {
          return {
            valid: false,
            error: 'All actors must be verified before pending approval'
          };
        }
        break;

      case 'APPROVED':
        // Check if investigation exists and is approved
        const investigation = await this.prisma.investigation.findUnique({
          where: { policyId: policy.id }
        });
        if (!investigation) {
          return {
            valid: false,
            error: 'No se encontró investigación para esta póliza. Contacte al administrador.'
          };
        }
        if (investigation.verdict === null) {
          return {
            valid: false,
            error: 'La investigación no tiene veredicto. Debe aprobar o rechazar la investigación primero.'
          };
        }
        if (investigation.verdict !== 'APPROVED') {
          return {
            valid: false,
            error: `La investigación tiene veredicto "${investigation.verdict}". Solo investigaciones aprobadas pueden continuar.`
          };
        }
        break;

      case 'CONTRACT_SIGNED':
        // Check if contract exists
        const contract = await this.prisma.contract.findFirst({
          where: {
            policyId: policy.id,
            isCurrent: true
          }
        });
        if (!contract) {
          return {
            valid: false,
            error: 'Contract must be uploaded before marking as signed'
          };
        }
        break;

      case 'ACTIVE':
        // Check if payment is complete
        const payment = await this.prisma.payment.findFirst({
          where: {
            policyId: policy.id,
            type: 'POLICY_PREMIUM',
            status: 'COMPLETED'
          }
        });
        if (!payment) {
          return {
            valid: false,
            error: 'Policy premium must be paid before activation'
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Trigger side effects when status changes
   */
  private async triggerStatusSideEffects(
    policy: { id: string; contractLength?: number | null },
    newStatus: PolicyStatus,
    _userId: string
  ): Promise<void> {
    switch (newStatus) {
      case 'COLLECTING_INFO':
        // Generate and send actor tokens
        // This would trigger email sending
        break;

      case 'UNDER_INVESTIGATION':
        // Investigation record is now created in the transaction above
        // to ensure atomic operation (policy status + investigation creation)
        break;

      case 'APPROVED':
        break;

      case 'CONTRACT_PENDING':
        break;

      case 'ACTIVE':
        // Set expiration date
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + (policy.contractLength || 12));

        await this.prisma.policy.update({
          where: { id: policy.id },
          data: { expiresAt: expirationDate }
        });
        break;

      case 'CANCELLED':
        break;
    }
  }

  /**
   * Transition policy to a new status with validation
   */
  async transitionPolicyStatus(
    policyId: string,
    newStatus: PolicyStatus,
    userId: string,
    notes?: string,
    reason?: string,
  ): Promise<{ success: boolean; policy?: { id: string; status: PolicyStatus }; error?: string }> {
    // Get current policy
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true
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
        error: `Cannot transition from ${policy.status} to ${newStatus}`
      };
    }

    // Additional validation based on status
    const validation = await this.validateStatusRequirements(policy, newStatus);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // For UNDER_INVESTIGATION, we need to create the investigation record in the same transaction
    // to prevent inconsistent state if the investigation creation fails
    let updatedPolicy;
    if (newStatus === 'UNDER_INVESTIGATION') {
      updatedPolicy = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.policy.update({
          where: { id: policyId },
          data: {
            status: newStatus,
            ...(notes && { reviewNotes: notes }),
            currentStep: 'investigation'
          }
        });

        // Create investigation record in the same transaction
        await tx.investigation.create({
          data: {
            policyId: policy.id,
            createdAt: new Date()
          }
        });

        return updated;
      });
    } else {
      updatedPolicy = await this.prisma.policy.update({
        where: { id: policyId },
        data: {
          status: newStatus,
          ...(notes && { reviewNotes: notes }),
          ...(reason && { rejectionReason: reason }),
          ...(newStatus === 'APPROVED' && { approvedAt: new Date() }),
          ...(newStatus === 'INVESTIGATION_REJECTED' && { rejectedAt: new Date() }),
          ...(newStatus === 'ACTIVE' && { activatedAt: new Date() }),
          ...(newStatus === 'COLLECTING_INFO' && { currentStep: 'actors' }),
          ...(newStatus === 'CONTRACT_PENDING' && { currentStep: 'contract' })
        }
      });
    }

    // Log activity
    await logPolicyActivity({
      policyId: policyId,
      action: 'status_changed',
      description: `Status changed from ${policy.status} to ${newStatus}`,
      details: {
        fromStatus: policy.status,
        toStatus: newStatus,
        notes,
        reason
      },
      performedById: userId,
    });

    // Trigger side effects based on status (except UNDER_INVESTIGATION which is handled above)
    await this.triggerStatusSideEffects(updatedPolicy, newStatus, userId);

    return { success: true, policy: updatedPolicy };
  }

  /**
   * Auto-transition policies based on conditions
   */
  async autoTransitionPolicies(): Promise<void> {
    // Auto-transition COLLECTING_INFO to UNDER_INVESTIGATION when actors are complete
    const collectingPolicies = await this.prisma.policy.findMany({
      where: { status: 'COLLECTING_INFO' },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true
      }
    });

    for (const policy of collectingPolicies) {
      const actorsComplete = await checkPolicyActorsComplete(policy.id);
      if (actorsComplete.allComplete) {
        await this.transitionPolicyStatus(
          policy.id,
          'UNDER_INVESTIGATION',
          'system',
          'Auto-transitioned: All actor information complete'
        );
      }
    }

    // Auto-expire policies
    const activePolicies = await this.prisma.policy.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date()
        }
      }
    });

    for (const policy of activePolicies) {
      await this.transitionPolicyStatus(
        policy.id,
        'EXPIRED',
        'system',
        'Auto-transitioned: Policy expired'
      );
    }
  }

  /**
   * Get workflow progress for a policy
   */
  async getPolicyWorkflowProgress(policyId: string): Promise<{
    currentStatus: PolicyStatus;
    currentStep: string;
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
        investigation: true,
        contracts: true,
        payments: true
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Define workflow steps
    const workflowSteps = [
      {
        name: 'Creación',
        statuses: ['DRAFT'],
        description: 'Protección creada'
      },
      {
        name: 'Recolección de Información',
        statuses: ['COLLECTING_INFO'],
        description: 'Recolectando información de actores'
      },
      {
        name: 'Investigación',
        statuses: ['UNDER_INVESTIGATION', 'INVESTIGATION_REJECTED'],
        description: 'En proceso de investigación'
      },
      {
        name: 'Aprobación',
        statuses: ['PENDING_APPROVAL', 'APPROVED'],
        description: 'Pendiente de aprobación'
      },
      {
        name: 'Contrato',
        statuses: ['CONTRACT_PENDING', 'CONTRACT_SIGNED'],
        description: 'Generación y firma de contrato'
      },
      {
        name: 'Activación',
        statuses: ['ACTIVE'],
        description: 'Protección activa'
      }
    ];

    // Determine current step and progress
    let currentStepIndex = 0;
    for (let i = 0; i < workflowSteps.length; i++) {
      if (workflowSteps[i].statuses.includes(policy.status)) {
        currentStepIndex = i;
        break;
      }
    }

    const progress = Math.round((currentStepIndex / (workflowSteps.length - 1)) * 100);

    // Build steps array with status
    const steps = workflowSteps.map((step, index) => ({
      name: step.name,
      status: index < currentStepIndex ? 'completed' as const :
              index === currentStepIndex ? 'current' as const :
              'pending' as const,
      description: step.description
    }));

    // Determine next actions
    const nextActions = [];
    const actorsComplete = await checkPolicyActorsComplete(policy.id);

    switch (policy.status) {
      case 'DRAFT':
        nextActions.push('Enviar invitaciones a actores');
        break;
      case 'COLLECTING_INFO':
        if (!actorsComplete.allComplete) {
          nextActions.push('Completar información de actores');
        } else {
          nextActions.push('Iniciar investigación');
        }
        break;
      case 'UNDER_INVESTIGATION':
        nextActions.push('Completar investigación');
        break;
      case 'INVESTIGATION_REJECTED':
        nextActions.push('Revisar y reiniciar investigación');
        break;
      case 'PENDING_APPROVAL':
        nextActions.push('Aprobar o rechazar protección');
        break;
      case 'APPROVED':
        nextActions.push('Generar contrato');
        break;
      case 'CONTRACT_PENDING':
        nextActions.push('Firmar contrato');
        break;
      case 'CONTRACT_SIGNED':
        nextActions.push('Procesar pago y activar');
        break;
    }

    return {
      currentStatus: policy.status,
      currentStep: policy.currentStep || 'initial',
      progress,
      steps,
      nextActions
    };
  }
}

// Export singleton instance
export const policyWorkflowService = new PolicyWorkflowService();

// Export legacy functions for backwards compatibility
export const isTransitionAllowed = policyWorkflowService.isTransitionAllowed.bind(policyWorkflowService);
export const getAllowedNextStatuses = policyWorkflowService.getAllowedNextStatuses.bind(policyWorkflowService);
export const checkAllActorsVerified = policyWorkflowService.checkAllActorsVerified.bind(policyWorkflowService);
export const transitionPolicyStatus = policyWorkflowService.transitionPolicyStatus.bind(policyWorkflowService);
export const autoTransitionPolicies = policyWorkflowService.autoTransitionPolicies.bind(policyWorkflowService);
export const getPolicyWorkflowProgress = policyWorkflowService.getPolicyWorkflowProgress.bind(policyWorkflowService);
