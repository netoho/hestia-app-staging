'use client';

import { useState, useMemo } from 'react';
import { Building, User, Users, Shield } from 'lucide-react';

interface Actor {
  id: string;
  fullName?: string;
  companyName?: string;
  informationComplete: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  documents?: any[];
  isPrimary?: boolean;
}

interface PolicyData {
  id: string;
  status: string;
  landlords?: Actor[];
  tenant?: Actor;
  jointObligors?: Actor[];
  avals?: Actor[];
}

export interface VerificationChecklist {
  infoComplete: boolean;
  docsVerified: boolean;
  referencesChecked: boolean;
}

export interface ActorWithChecklist {
  actor: Actor;
  actorType: string;
  displayName: string;
  icon: typeof Building;
  checklist: VerificationChecklist;
}

interface DialogState {
  open: boolean;
  actorType: string;
  actorId: string;
  actorName: string;
}

const defaultChecklist: VerificationChecklist = {
  infoComplete: false,
  docsVerified: false,
  referencesChecked: false,
};

const emptyDialogState: DialogState = {
  open: false,
  actorType: '',
  actorId: '',
  actorName: '',
};

interface UseApprovalWorkflowProps {
  policy: PolicyData;
  onApprove: (actorType: string, actorId: string) => Promise<void>;
  onReject: (actorType: string, actorId: string, reason: string) => Promise<void>;
  onApprovePolicy: () => Promise<void>;
}

export function useApprovalWorkflow({
  policy,
  onApprove,
  onReject,
  onApprovePolicy,
}: UseApprovalWorkflowProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<DialogState>(emptyDialogState);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialog, setApproveDialog] = useState<DialogState>(emptyDialogState);
  const [approvePolicyDialog, setApprovePolicyDialog] = useState(false);
  const [selectedActors, setSelectedActors] = useState<Set<string>>(new Set());
  const [checklists, setChecklists] = useState<Record<string, VerificationChecklist>>({});

  // Build actor list with metadata
  const actorsList = useMemo((): ActorWithChecklist[] => {
    const actors: ActorWithChecklist[] = [];

    // Add all landlords
    policy.landlords?.forEach((landlord, index) => {
      actors.push({
        actor: landlord,
        actorType: 'landlord',
        displayName: `${landlord.fullName || landlord.companyName || 'Arrendador'}${landlord.isPrimary ? ' (Principal)' : ` (Co-propietario ${index})`}`,
        icon: Building,
        checklist: checklists[landlord.id] || defaultChecklist,
      });
    });

    // Add tenant
    if (policy.tenant) {
      actors.push({
        actor: policy.tenant,
        actorType: 'tenant',
        displayName: policy.tenant.fullName || policy.tenant.companyName || 'Inquilino',
        icon: User,
        checklist: checklists[policy.tenant.id] || defaultChecklist,
      });
    }

    // Add joint obligors
    policy.jointObligors?.forEach((jo, index) => {
      actors.push({
        actor: jo,
        actorType: 'jointObligor',
        displayName: `${jo.fullName || jo.companyName || 'Obligado Solidario'} ${index > 0 ? `(${index + 1})` : ''}`.trim(),
        icon: Users,
        checklist: checklists[jo.id] || defaultChecklist,
      });
    });

    // Add avals
    policy.avals?.forEach((aval, index) => {
      actors.push({
        actor: aval,
        actorType: 'aval',
        displayName: `${aval.fullName || aval.companyName || 'Aval'} ${index > 0 ? `(${index + 1})` : ''}`.trim(),
        icon: Shield,
        checklist: checklists[aval.id] || defaultChecklist,
      });
    });

    return actors;
  }, [policy, checklists]);

  // Check if all actors are approved
  const allActorsApproved = useMemo(() => {
    return actorsList.every((a) => a.actor.verificationStatus === 'APPROVED');
  }, [actorsList]);

  // Update checklist for an actor
  const updateChecklist = (actorId: string, field: keyof VerificationChecklist, value: boolean) => {
    setChecklists((prev) => ({
      ...prev,
      [actorId]: {
        ...(prev[actorId] || defaultChecklist),
        [field]: value,
      },
    }));
  };

  // Handle approve action
  const handleApprove = async () => {
    if (!approveDialog.actorType || !approveDialog.actorId) return;

    setProcessing(approveDialog.actorId);
    try {
      await onApprove(approveDialog.actorType, approveDialog.actorId);
      setApproveDialog(emptyDialogState);
    } finally {
      setProcessing(null);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    if (!rejectDialog.actorType || !rejectDialog.actorId || !rejectionReason.trim()) return;

    setProcessing(rejectDialog.actorId);
    try {
      await onReject(rejectDialog.actorType, rejectDialog.actorId, rejectionReason);
      setRejectDialog(emptyDialogState);
      setRejectionReason('');
    } finally {
      setProcessing(null);
    }
  };

  // Handle policy approval
  const handleApprovePolicy = async () => {
    setProcessing('policy');
    try {
      await onApprovePolicy();
      setApprovePolicyDialog(false);
    } finally {
      setProcessing(null);
    }
  };

  // Toggle actor selection
  const toggleActorSelection = (actorId: string) => {
    setSelectedActors((prev) => {
      const next = new Set(prev);
      if (next.has(actorId)) {
        next.delete(actorId);
      } else {
        next.add(actorId);
      }
      return next;
    });
  };

  // Open approve dialog
  const openApproveDialog = (actorType: string, actorId: string, actorName: string) => {
    setApproveDialog({ open: true, actorType, actorId, actorName });
  };

  // Open reject dialog
  const openRejectDialog = (actorType: string, actorId: string, actorName: string) => {
    setRejectDialog({ open: true, actorType, actorId, actorName });
  };

  // Close approve dialog
  const closeApproveDialog = () => {
    setApproveDialog(emptyDialogState);
  };

  // Close reject dialog
  const closeRejectDialog = () => {
    setRejectDialog(emptyDialogState);
    setRejectionReason('');
  };

  return {
    // State
    processing,
    actorsList,
    allActorsApproved,
    selectedActors,

    // Dialogs
    approveDialog,
    rejectDialog,
    rejectionReason,
    approvePolicyDialog,

    // Actions
    updateChecklist,
    handleApprove,
    handleReject,
    handleApprovePolicy,
    toggleActorSelection,

    // Dialog controls
    openApproveDialog,
    openRejectDialog,
    closeApproveDialog,
    closeRejectDialog,
    setRejectionReason,
    setApprovePolicyDialog,
  };
}
