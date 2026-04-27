/**
 * TenantReceipt factory.
 *
 * Requires a tenantId + policyId via transient params. Defaults to a
 * RENT receipt with status=UPLOADED and uploadStatus=COMPLETE so it is
 * directly usable by getDownloadUrl + deleteReceipt happy paths.
 */
import { Factory } from 'fishery';
import {
  ReceiptType,
  ReceiptStatus,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';
import type { TenantReceipt } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type TenantReceiptTransient = {
  tenantId: string;
  policyId: string;
};

export const tenantReceiptFactory = Factory.define<TenantReceipt, TenantReceiptTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (r) => prisma.tenantReceipt.create({ data: r }));

    return {
      id: undefined as unknown as string,
      tenantId: transientParams.tenantId,
      policyId: transientParams.policyId,
      year: 2026,
      month: 1,
      receiptType: ReceiptType.RENT,
      status: ReceiptStatus.UPLOADED,
      fileName: `receipt-${sequence}.pdf`,
      originalName: `receipt-${sequence}.pdf`,
      fileSize: 1024,
      mimeType: 'application/pdf',
      s3Key: `receipts/test/${sequence}.pdf`,
      s3Bucket: 'test-bucket',
      uploadStatus: DocumentUploadStatus.COMPLETE,
      uploadedAt: new Date(),
      notApplicableNote: null,
      markedNotApplicableAt: null,
      otherCategory: '',
      otherDescription: null,
      uploadedByUserId: null,
      notes: null,
      amount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TenantReceipt;
  },
);

// Traits
export const uploadedReceipt = tenantReceiptFactory.params({
  status: ReceiptStatus.UPLOADED,
  uploadStatus: DocumentUploadStatus.COMPLETE,
});

export const notApplicableReceipt = tenantReceiptFactory.params({
  status: ReceiptStatus.NOT_APPLICABLE,
  fileName: null,
  originalName: null,
  fileSize: null,
  mimeType: null,
  s3Key: null,
  s3Bucket: null,
  uploadStatus: null,
  uploadedAt: null,
  notApplicableNote: 'No aplica este mes',
  markedNotApplicableAt: new Date(),
});

export const pendingUploadReceipt = tenantReceiptFactory.params({
  status: ReceiptStatus.UPLOADED,
  uploadStatus: DocumentUploadStatus.PENDING,
  uploadedAt: null,
});
