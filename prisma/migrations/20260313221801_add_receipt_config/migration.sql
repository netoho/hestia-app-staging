/*
  Warnings:

  - A unique constraint covering the columns `[policyId,year,month,receiptType,otherCategory]` on the table `TenantReceipt` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TenantReceipt_policyId_year_month_receiptType_key";

-- AlterTable
ALTER TABLE "TenantReceipt" ADD COLUMN     "otherCategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "otherDescription" TEXT,
ADD COLUMN     "uploadedByUserId" TEXT;

-- CreateTable
CREATE TABLE "ReceiptConfig" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "effectiveMonth" INTEGER NOT NULL,
    "receiptTypes" "ReceiptType"[],
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptConfig_policyId_idx" ON "ReceiptConfig"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptConfig_policyId_effectiveYear_effectiveMonth_key" ON "ReceiptConfig"("policyId", "effectiveYear", "effectiveMonth");

-- CreateIndex
CREATE UNIQUE INDEX "TenantReceipt_policyId_year_month_receiptType_otherCategory_key" ON "TenantReceipt"("policyId", "year", "month", "receiptType", "otherCategory");

-- AddForeignKey
ALTER TABLE "ReceiptConfig" ADD CONSTRAINT "ReceiptConfig_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
