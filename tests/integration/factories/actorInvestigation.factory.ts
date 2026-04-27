/**
 * ActorInvestigation factory.
 *
 * Requires policyId + actorType + actorId via transient params. Defaults
 * to a PENDING investigation submitted by 'system' (override the
 * `submittedBy` field with a real userId when the test needs it).
 */
import { Factory } from 'fishery';
import {
  InvestigatedActorType,
  ActorInvestigationStatus,
} from '@/prisma/generated/prisma-client/enums';
import type { ActorInvestigation } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type ActorInvestigationTransient = {
  policyId: string;
  actorType: InvestigatedActorType;
  actorId: string;
  submittedBy?: string;
};

export const actorInvestigationFactory = Factory.define<ActorInvestigation, ActorInvestigationTransient>(
  ({ transientParams, onCreate }) => {
    onCreate(async (inv) => prisma.actorInvestigation.create({ data: inv }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      actorType: transientParams.actorType,
      actorId: transientParams.actorId,
      findings: null,
      submittedBy: transientParams.submittedBy ?? 'system',
      submittedAt: null,
      status: ActorInvestigationStatus.PENDING,
      approvedBy: null,
      approvedByType: null,
      approvedAt: null,
      approvalNotes: null,
      rejectionReason: null,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      archiveComment: null,
      brokerToken: null,
      landlordToken: null,
      tokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ActorInvestigation;
  },
);

export const submittedInvestigation = actorInvestigationFactory.params({
  status: ActorInvestigationStatus.PENDING,
  submittedAt: new Date(),
  brokerToken: 'broker-token-test',
  landlordToken: 'landlord-token-test',
  tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  findings: 'Initial findings recorded for review.',
});

export const archivedInvestigation = actorInvestigationFactory.params({
  status: ActorInvestigationStatus.ARCHIVED,
  archivedAt: new Date(),
});

export const approvedInvestigation = actorInvestigationFactory.params({
  status: ActorInvestigationStatus.APPROVED,
  submittedAt: new Date(),
  approvedAt: new Date(),
  approvedByType: 'BROKER',
});
