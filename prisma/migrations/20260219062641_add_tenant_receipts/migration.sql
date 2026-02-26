-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'CABLE_TV', 'PHONE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('UPLOADED', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "PropertyDetails" ADD COLUMN     "cableTVIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "electricityIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gasIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internetIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waterIncludedInRent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TenantReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "receiptType" "ReceiptType" NOT NULL,
    "status" "ReceiptStatus" NOT NULL,
    "fileName" TEXT,
    "originalName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "s3Key" TEXT,
    "s3Bucket" TEXT,
    "uploadStatus" "DocumentUploadStatus",
    "uploadedAt" TIMESTAMP(3),
    "notApplicableNote" TEXT,
    "markedNotApplicableAt" TIMESTAMP(3),
    "notes" TEXT,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "policyId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantReceipt_s3Key_key" ON "TenantReceipt"("s3Key");

-- CreateIndex
CREATE INDEX "TenantReceipt_tenantId_year_month_idx" ON "TenantReceipt"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "TenantReceipt_policyId_idx" ON "TenantReceipt"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantReceipt_policyId_year_month_receiptType_key" ON "TenantReceipt"("policyId", "year", "month", "receiptType");

-- CreateIndex
CREATE INDEX "ReminderLog_reminderType_sentAt_idx" ON "ReminderLog"("reminderType", "sentAt");

-- CreateIndex
CREATE INDEX "ReminderLog_policyId_idx" ON "ReminderLog"("policyId");

-- AddForeignKey
ALTER TABLE "TenantReceipt" ADD CONSTRAINT "TenantReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReceipt" ADD CONSTRAINT "TenantReceipt_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
