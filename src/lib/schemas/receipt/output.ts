/**
 * Output schemas for receipt.* tRPC procedures.
 *
 * The receipt router serves the monthly tenant-receipt portal — a tenant
 * uploads proof of monthly payments (rent, utilities, maintenance) for an
 * active policy. Most procedures are dual-auth (token OR session) and the
 * frontend renders dozens of fields per receipt, so locking the contract
 * here protects the busiest customer-facing flow.
 */

import { z } from 'zod';
import {
  ReceiptType,
  ReceiptStatus,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
export const TenantReceiptShape = z.object({
  id: z.string(),
  tenantId: z.string(),
  policyId: z.string(),
  year: z.number(),
  month: z.number(),
  receiptType: z.nativeEnum(ReceiptType),
  status: z.nativeEnum(ReceiptStatus),
  fileName: z.string().nullable(),
  originalName: z.string().nullable(),
  fileSize: z.number().nullable(),
  mimeType: z.string().nullable(),
  s3Key: z.string().nullable(),
  s3Bucket: z.string().nullable(),
  uploadStatus: z.nativeEnum(DocumentUploadStatus).nullable(),
  uploadedAt: z.date().nullable(),
  notApplicableNote: z.string().nullable(),
  markedNotApplicableAt: z.date().nullable(),
  otherCategory: z.string(),
  otherDescription: z.string().nullable(),
  uploadedByUserId: z.string().nullable(),
  notes: z.string().nullable(),
  amount: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ReceiptConfigShape = z.object({
  id: z.string(),
  policyId: z.string(),
  effectiveYear: z.number(),
  effectiveMonth: z.number(),
  receiptTypes: z.array(z.nativeEnum(ReceiptType)),
  createdById: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

const PropertyAddressShallow = z
  .object({
    id: z.string(),
  })
  .passthrough()
  .nullable();

const ReceiptConfigSummaryShape = z.object({
  effectiveYear: z.number(),
  effectiveMonth: z.number(),
  receiptTypes: z.array(z.nativeEnum(ReceiptType)),
});

// ===========================================================================
// receipt.requestMagicLink
// ===========================================================================
export const ReceiptRequestMagicLinkOutput = z.object({
  success: z.literal(true),
});
export type ReceiptRequestMagicLinkOutput = z.infer<typeof ReceiptRequestMagicLinkOutput>;

// ===========================================================================
// receipt.getPortalData
// ===========================================================================
const PortalPolicyShape = z.object({
  policyId: z.string(),
  policyNumber: z.string(),
  tenantId: z.string(),
  rentAmount: z.number(),
  contractLength: z.number(),
  propertyAddress: PropertyAddressShallow,
  requiredReceiptTypes: z.array(z.nativeEnum(ReceiptType)),
  receiptConfigs: z.array(ReceiptConfigSummaryShape),
  receipts: z.array(TenantReceiptShape),
  activatedAt: z.date().nullable(),
});

export const ReceiptGetPortalDataOutput = z.object({
  tenantName: z.string(),
  tenantEmail: z.string(),
  policies: z.array(PortalPolicyShape),
});
export type ReceiptGetPortalDataOutput = z.infer<typeof ReceiptGetPortalDataOutput>;

// ===========================================================================
// receipt.getUploadUrl
// ===========================================================================
export const ReceiptGetUploadUrlOutput = z.object({
  success: z.literal(true),
  uploadUrl: z.string(),
  receiptId: z.string(),
  s3Key: z.string(),
  expiresIn: z.number(),
});
export type ReceiptGetUploadUrlOutput = z.infer<typeof ReceiptGetUploadUrlOutput>;

// ===========================================================================
// receipt.confirmUpload / receipt.markNotApplicable
// ===========================================================================
export const ReceiptUploadResultOutput = z.object({
  success: z.literal(true),
  receipt: TenantReceiptShape,
});
export type ReceiptUploadResultOutput = z.infer<typeof ReceiptUploadResultOutput>;

// ===========================================================================
// receipt.undoNotApplicable / receipt.deleteReceipt
// ===========================================================================
export const ReceiptDeleteOutput = z.object({
  success: z.literal(true),
});
export type ReceiptDeleteOutput = z.infer<typeof ReceiptDeleteOutput>;

// ===========================================================================
// receipt.getDownloadUrl / receipt.getDownloadUrlAdmin
// ===========================================================================
export const ReceiptGetDownloadUrlOutput = z.object({
  success: z.literal(true),
  downloadUrl: z.string(),
  fileName: z.string().nullable(),
  expiresIn: z.number(),
});
export type ReceiptGetDownloadUrlOutput = z.infer<typeof ReceiptGetDownloadUrlOutput>;

// ===========================================================================
// receipt.listByPolicy (admin)
// ===========================================================================
const TenantSummaryShape = z
  .object({
    id: z.string(),
    firstName: z.string().nullable(),
    paternalLastName: z.string().nullable(),
    companyName: z.string().nullable(),
  })
  .nullable();

export const ReceiptListByPolicyOutput = z.object({
  receipts: z.array(TenantReceiptShape),
  requiredTypes: z.array(z.nativeEnum(ReceiptType)),
  receiptConfigs: z.array(ReceiptConfigSummaryShape),
  tenant: TenantSummaryShape,
  policyNumber: z.string(),
  activatedAt: z.date().nullable(),
  rentAmount: z.number(),
  contractLength: z.number(),
  propertyAddress: z.unknown().nullable(),
});
export type ReceiptListByPolicyOutput = z.infer<typeof ReceiptListByPolicyOutput>;

// ===========================================================================
// receipt.getConfig (admin)
// ===========================================================================
const ReceiptConfigHistoryEntry = z.object({
  id: z.string(),
  effectiveYear: z.number(),
  effectiveMonth: z.number(),
  receiptTypes: z.array(z.nativeEnum(ReceiptType)),
  notes: z.string().nullable(),
  createdAt: z.date(),
  createdByName: z.string().nullable(),
});

export const ReceiptGetConfigOutput = z.object({
  currentTypes: z.array(z.nativeEnum(ReceiptType)),
  computedDefaults: z.array(z.nativeEnum(ReceiptType)),
  history: z.array(ReceiptConfigHistoryEntry),
});
export type ReceiptGetConfigOutput = z.infer<typeof ReceiptGetConfigOutput>;

// ===========================================================================
// receipt.updateConfig (admin)
// ===========================================================================
export const ReceiptUpdateConfigOutput = z.object({
  success: z.literal(true),
  config: ReceiptConfigShape,
});
export type ReceiptUpdateConfigOutput = z.infer<typeof ReceiptUpdateConfigOutput>;
