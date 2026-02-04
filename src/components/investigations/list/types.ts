import type {
  InvestigationVerdict,
  RiskLevel,
} from '@/prisma/generated/prisma-client/enums';

type InvestigatedActorType = 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
type ActorInvestigationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApproverType = 'BROKER' | 'LANDLORD';

export interface InvestigationListItem {
  id: string;
  actorType: InvestigatedActorType;
  actorId: string;
  actorName: string;
  findings: string | null;
  verdict: InvestigationVerdict | null;
  riskLevel: RiskLevel | null;
  status: ActorInvestigationStatus;
  submittedAt: Date | string | null;
  approvedAt: Date | string | null;
  approvedByType: ApproverType | null;
  documentsCount: number;
  createdAt: Date | string;
}
