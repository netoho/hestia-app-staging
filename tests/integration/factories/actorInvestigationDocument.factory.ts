/**
 * ActorInvestigationDocument factory.
 *
 * Requires the parent investigation via transient `investigationId`.
 * Defaults to a COMPLETE upload — override `uploadStatus` for the
 * pending-upload branch.
 */
import { Factory } from 'fishery';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import type { ActorInvestigationDocument } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type ActorInvestigationDocumentTransient = {
  investigationId: string;
};

export const actorInvestigationDocumentFactory = Factory.define<
  ActorInvestigationDocument,
  ActorInvestigationDocumentTransient
>(({ sequence, transientParams, onCreate }) => {
  onCreate(async (doc) => prisma.actorInvestigationDocument.create({ data: doc }));

  return {
    id: undefined as unknown as string,
    investigationId: transientParams.investigationId,
    fileName: `evidence-${sequence}.pdf`,
    originalName: `Evidence-${sequence}.pdf`,
    fileSize: 204800,
    mimeType: 'application/pdf',
    s3Key: `investigations/test/${sequence}.pdf`,
    s3Bucket: 'test-bucket',
    uploadStatus: DocumentUploadStatus.COMPLETE,
    createdAt: new Date(),
  } as ActorInvestigationDocument;
});

export const pendingInvestigationDocument = actorInvestigationDocumentFactory.params({
  uploadStatus: DocumentUploadStatus.PENDING,
});
