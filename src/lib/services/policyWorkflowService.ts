import { PolicyStatus } from '@prisma/client';
import prisma from '../prisma';
import { logPolicyActivity } from './policyService';
import { checkPolicyActorsComplete } from './actorTokenService';
import {req} from "agent-base";
import {request} from "node:http";

/**
 * Policy workflow state transitions
 * Defines which status transitions are allowed
 */
const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  DRAFT: ['COLLECTING_INFO', 'CANCELLED'],
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

/**
 * Validate if a status transition is allowed
 */
export function isTransitionAllowed(fromStatus: PolicyStatus, toStatus: PolicyStatus): boolean {
  const allowedStatuses = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowedStatuses.includes(toStatus);
}

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedNextStatuses(currentStatus: PolicyStatus): PolicyStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Transition policy to a new status with validation
 */
export async function transitionPolicyStatus(
  policyId: string,
  newStatus: PolicyStatus,
  userId: string,
  notes?: string,
  reason?: string,
): Promise<{ success: boolean; policy?: any; error?: string }> {
  // Get current policy
  const policy = await prisma.policy.findUnique({
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
  if (!isTransitionAllowed(policy.status, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${policy.status} to ${newStatus}`
    };
  }

  // Additional validation based on status
  const validation = await validateStatusRequirements(policy, newStatus);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Update policy status
  const updatedPolicy = await prisma.policy.update({
    where: { id: policyId },
    data: {
      status: newStatus,
      ...(notes && { reviewNotes: notes }),
      ...(reason && { rejectionReason: reason }),
      ...(newStatus === 'APPROVED' && { approvedAt: new Date() }),
      ...(newStatus === 'INVESTIGATION_REJECTED' && { rejectedAt: new Date() }),
      ...(newStatus === 'ACTIVE' && { activatedAt: new Date() }),
      ...(newStatus === 'COLLECTING_INFO' && { currentStep: 'actors' }),
      ...(newStatus === 'UNDER_INVESTIGATION' && { currentStep: 'investigation' }),
      ...(newStatus === 'CONTRACT_PENDING' && { currentStep: 'contract' })
    }
  });

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

  // Trigger side effects based on status
  await triggerStatusSideEffects(updatedPolicy, newStatus, userId);

  return { success: true, policy: updatedPolicy };
}

/**
 * Validate requirements before transitioning to a status
 */
async function validateStatusRequirements(
  policy: any,
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

    case 'APPROVED':
      // Check if investigation exists and is approved
      const investigation = await prisma.investigation.findUnique({
        where: { policyId: policy.id }
      });
      if (!investigation || investigation.verdict !== 'APPROVED') {
        return {
          valid: false,
          error: 'Investigation must be approved before policy approval'
        };
      }
      break;

    case 'CONTRACT_SIGNED':
      // Check if contract exists
      const contract = await prisma.contract.findFirst({
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
      const payment = await prisma.payment.findFirst({
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
async function triggerStatusSideEffects(
  policy: any,
  newStatus: PolicyStatus,
  userId: string
): Promise<void> {
  switch (newStatus) {
    case 'COLLECTING_INFO':
      // Generate and send actor tokens
      // This would trigger email sending
      break;

    case 'UNDER_INVESTIGATION':
      // Create investigation record
      await prisma.investigation.create({
        data: {
          policyId: policy.id,
          createdAt: new Date()
        }
      });
      break;

    case 'APPROVED':
      break;

    case 'CONTRACT_PENDING':
      break;

    case 'ACTIVE':
      // Set expiration date
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + (policy.contractLength || 12));

      await prisma.policy.update({
        where: { id: policy.id },
        data: { expiresAt: expirationDate }
      });
      break;

    case 'CANCELLED':
      break;
  }
}

/**
 * Auto-transition policies based on conditions
 */
export async function autoTransitionPolicies(): Promise<void> {
  // Auto-transition COLLECTING_INFO to UNDER_INVESTIGATION when actors are complete
  const collectingPolicies = await prisma.policy.findMany({
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
      await transitionPolicyStatus(
        policy.id,
        'UNDER_INVESTIGATION',
        'system',
        'Auto-transitioned: All actor information complete'
      );
    }
  }

  // Auto-expire policies
  const activePolicies = await prisma.policy.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lt: new Date()
      }
    }
  });

  for (const policy of activePolicies) {
    await transitionPolicyStatus(
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
export async function getPolicyWorkflowProgress(policyId: string): Promise<{
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
  const policy = await prisma.policy.findUnique({
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
    throw new Error('Policy not found');
  }

  // Define workflow steps
  const workflowSteps = [
    {
      name: 'Creación',
      statuses: ['DRAFT'],
      description: 'Póliza creada'
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
      description: 'Póliza activa'
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
      nextActions.push('Aprobar o rechazar póliza');
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
