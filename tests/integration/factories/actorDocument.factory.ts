/**
 * ActorDocument factory.
 *
 * Requires the owning actor via transient params: at least one of
 * `tenantId`, `landlordId`, `jointObligorId`, or `avalId`. Defaults to a
 * COMPLETE upload of an IDENTIFICATION PDF — override `uploadStatus`,
 * `category`, or any S3/file field as needed.
 */
import { Factory } from 'fishery';
import {
  DocumentCategory,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';
import type { ActorDocument } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type ActorDocumentTransient = {
  tenantId?: string;
  landlordId?: string;
  jointObligorId?: string;
  avalId?: string;
};

export const actorDocumentFactory = Factory.define<ActorDocument, ActorDocumentTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (doc) => prisma.actorDocument.create({ data: doc }));

    return {
      id: undefined as unknown as string,
      category: DocumentCategory.IDENTIFICATION,
      documentType: 'INE',
      fileName: `ine-${sequence}.pdf`,
      originalName: `INE-${sequence}.pdf`,
      fileSize: 102400,
      mimeType: 'application/pdf',
      s3Key: `actors/test/identification/${sequence}.pdf`,
      s3Bucket: 'test-bucket',
      s3Region: 'us-east-1',
      landlordId: transientParams.landlordId ?? null,
      tenantId: transientParams.tenantId ?? null,
      jointObligorId: transientParams.jointObligorId ?? null,
      avalId: transientParams.avalId ?? null,
      uploadStatus: DocumentUploadStatus.COMPLETE,
      uploadedAt: new Date(),
      uploadedBy: 'self',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ActorDocument;
  },
);

export const pendingActorDocument = actorDocumentFactory.params({
  uploadStatus: DocumentUploadStatus.PENDING,
  uploadedAt: null,
});

export const incomeProofDocument = actorDocumentFactory.params({
  category: DocumentCategory.INCOME_PROOF,
  documentType: 'income_proof',
});

export const addressProofDocument = actorDocumentFactory.params({
  category: DocumentCategory.ADDRESS_PROOF,
  documentType: 'address_proof',
});

export const bankStatementDocument = actorDocumentFactory.params({
  category: DocumentCategory.BANK_STATEMENT,
  documentType: 'bank_statement',
});

export const propertyDeedDocument = actorDocumentFactory.params({
  category: DocumentCategory.PROPERTY_DEED,
  documentType: 'property_deed',
});

export const propertyTaxDocument = actorDocumentFactory.params({
  category: DocumentCategory.PROPERTY_TAX_STATEMENT,
  documentType: 'property_tax_statement',
});
