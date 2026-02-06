type InvestigatedActorType = 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
type ActorInvestigationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApproverType = 'BROKER' | 'LANDLORD';

export interface InvestigationListItem {
  id: string;
  actorType: InvestigatedActorType;
  actorId: string;
  actorName: string;
  findings: string | null;
  status: ActorInvestigationStatus;
  submittedAt: Date | string | null;
  approvedAt: Date | string | null;
  approvedByType: ApproverType | null;
  approvalNotes?: string | null;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  documentsCount: number;
  createdAt: Date | string;
}
