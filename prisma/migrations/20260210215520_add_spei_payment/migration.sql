/*
  Warnings:

  - A unique constraint covering the columns `[speiPaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "speiBankName" TEXT,
ADD COLUMN     "speiClabe" TEXT,
ADD COLUMN     "speiFundedAmount" DOUBLE PRECISION,
ADD COLUMN     "speiHostedUrl" TEXT,
ADD COLUMN     "speiPaymentIntentId" TEXT,
ADD COLUMN     "speiReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_speiPaymentIntentId_key" ON "Payment"("speiPaymentIntentId");
